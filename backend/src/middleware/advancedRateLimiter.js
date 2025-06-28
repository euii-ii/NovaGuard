const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

/**
 * Advanced Rate Limiter with multiple strategies
 * Provides sophisticated rate limiting for different user types and endpoints
 */
class AdvancedRateLimiter {
  constructor() {
    this.limiters = this.initializeLimiters();
    this.endpointLimits = this.initializeEndpointLimits();
  }

  /**
   * Initialize different rate limiters
   * @returns {Object} Rate limiter instances
   */
  initializeLimiters() {
    const redisUrl = process.env.REDIS_URL;
    const LimiterClass = redisUrl ? RateLimiterRedis : RateLimiterMemory;
    
    const baseConfig = redisUrl ? { storeClient: redisUrl } : {};

    return {
      // Anonymous users - strict limits
      anonymous: new LimiterClass({
        ...baseConfig,
        keyPrefix: 'rl_anon',
        points: parseInt(process.env.RATE_LIMIT_ANONYMOUS_POINTS) || 10, // 10 requests
        duration: parseInt(process.env.RATE_LIMIT_ANONYMOUS_DURATION) || 60, // per 60 seconds
        blockDuration: parseInt(process.env.RATE_LIMIT_ANONYMOUS_BLOCK) || 300, // block for 5 minutes
      }),

      // Authenticated users - moderate limits
      authenticated: new LimiterClass({
        ...baseConfig,
        keyPrefix: 'rl_auth',
        points: parseInt(process.env.RATE_LIMIT_AUTH_POINTS) || 100, // 100 requests
        duration: parseInt(process.env.RATE_LIMIT_AUTH_DURATION) || 60, // per 60 seconds
        blockDuration: parseInt(process.env.RATE_LIMIT_AUTH_BLOCK) || 60, // block for 1 minute
      }),

      // Premium users - higher limits
      premium: new LimiterClass({
        ...baseConfig,
        keyPrefix: 'rl_premium',
        points: parseInt(process.env.RATE_LIMIT_PREMIUM_POINTS) || 500, // 500 requests
        duration: parseInt(process.env.RATE_LIMIT_PREMIUM_DURATION) || 60, // per 60 seconds
        blockDuration: parseInt(process.env.RATE_LIMIT_PREMIUM_BLOCK) || 30, // block for 30 seconds
      }),

      // API keys - very high limits
      apiKey: new LimiterClass({
        ...baseConfig,
        keyPrefix: 'rl_api',
        points: parseInt(process.env.RATE_LIMIT_API_POINTS) || 1000, // 1000 requests
        duration: parseInt(process.env.RATE_LIMIT_API_DURATION) || 60, // per 60 seconds
        blockDuration: parseInt(process.env.RATE_LIMIT_API_BLOCK) || 10, // block for 10 seconds
      }),

      // Heavy operations (contract analysis) - special limits
      heavyOps: new LimiterClass({
        ...baseConfig,
        keyPrefix: 'rl_heavy',
        points: parseInt(process.env.RATE_LIMIT_HEAVY_POINTS) || 5, // 5 requests
        duration: parseInt(process.env.RATE_LIMIT_HEAVY_DURATION) || 300, // per 5 minutes
        blockDuration: parseInt(process.env.RATE_LIMIT_HEAVY_BLOCK) || 600, // block for 10 minutes
      }),

      // Burst protection - short-term high-frequency protection
      burst: new LimiterClass({
        ...baseConfig,
        keyPrefix: 'rl_burst',
        points: parseInt(process.env.RATE_LIMIT_BURST_POINTS) || 20, // 20 requests
        duration: parseInt(process.env.RATE_LIMIT_BURST_DURATION) || 10, // per 10 seconds
        blockDuration: parseInt(process.env.RATE_LIMIT_BURST_BLOCK) || 60, // block for 1 minute
      })
    };
  }

  /**
   * Initialize endpoint-specific rate limits
   * @returns {Object} Endpoint limit configurations
   */
  initializeEndpointLimits() {
    return {
      '/api/v1/contracts/analyze': {
        limiterType: 'heavyOps',
        customPoints: 3, // Override default points for this endpoint
        description: 'Contract analysis endpoint'
      },
      '/api/v1/contracts/analyze-address': {
        limiterType: 'heavyOps',
        customPoints: 5,
        description: 'Address analysis endpoint'
      },
      '/api/v1/ai/multi-agent-analysis': {
        limiterType: 'heavyOps',
        customPoints: 2, // Most expensive operation
        description: 'Multi-agent AI analysis'
      },
      '/api/v1/defi/analyze': {
        limiterType: 'heavyOps',
        customPoints: 4,
        description: 'DeFi analysis endpoint'
      },
      '/api/v1/chains/supported': {
        limiterType: 'authenticated',
        customPoints: 1,
        description: 'Chain information endpoint'
      },
      '/api/v1/agents/available': {
        limiterType: 'authenticated',
        customPoints: 1,
        description: 'Agent information endpoint'
      }
    };
  }

  /**
   * Get appropriate rate limiter for user
   * @param {Object} user - User object from JWT
   * @returns {string} Limiter type
   */
  getUserLimiterType(user) {
    if (!user || user.id === 'anonymous') {
      return 'anonymous';
    }

    if (user.tokenType === 'api-key') {
      return 'apiKey';
    }

    switch (user.role) {
      case 'premium':
      case 'enterprise':
        return 'premium';
      case 'user':
      case 'developer':
        return 'authenticated';
      default:
        return 'anonymous';
    }
  }

  /**
   * Create rate limiting middleware
   * @param {Object} options - Rate limiting options
   * @returns {Function} Express middleware
   */
  createRateLimitMiddleware(options = {}) {
    return async (req, res, next) => {
      try {
        // Skip rate limiting in test environment
        if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITING === 'true') {
          return next();
        }

        const endpoint = req.route?.path || req.path;
        const endpointConfig = this.endpointLimits[endpoint];
        
        // Determine which limiters to apply
        const limitersToApply = [];
        
        // Always apply burst protection
        limitersToApply.push({
          limiter: this.limiters.burst,
          key: `burst_${req.ip}`,
          type: 'burst'
        });

        // Apply user-specific limiter
        const userLimiterType = this.getUserLimiterType(req.user);
        const userKey = req.user?.id || req.ip;
        
        limitersToApply.push({
          limiter: this.limiters[userLimiterType],
          key: `${userLimiterType}_${userKey}`,
          type: userLimiterType
        });

        // Apply endpoint-specific limiter if configured
        if (endpointConfig) {
          const endpointLimiter = this.limiters[endpointConfig.limiterType];
          if (endpointLimiter) {
            limitersToApply.push({
              limiter: endpointLimiter,
              key: `${endpointConfig.limiterType}_${endpoint}_${userKey}`,
              type: endpointConfig.limiterType,
              points: endpointConfig.customPoints
            });
          }
        }

        // Check all applicable limiters
        const limitResults = await Promise.allSettled(
          limitersToApply.map(({ limiter, key, points }) => 
            limiter.consume(key, points || 1)
          )
        );

        // Check if any limiter was exceeded
        const failedLimiter = limitResults.findIndex(result => result.status === 'rejected');
        
        if (failedLimiter !== -1) {
          const failedLimiterInfo = limitersToApply[failedLimiter];
          const error = limitResults[failedLimiter].reason;
          
          logger.warn('Rate limit exceeded', {
            userId: req.user?.id || 'anonymous',
            userRole: req.user?.role || 'anonymous',
            limiterType: failedLimiterInfo.type,
            endpoint,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            remainingPoints: error.remainingPoints,
            msBeforeNext: error.msBeforeNext
          });

          const retryAfter = Math.round(error.msBeforeNext / 1000) || 1;
          
          res.set({
            'Retry-After': retryAfter,
            'X-RateLimit-Limit': error.totalHits,
            'X-RateLimit-Remaining': error.remainingPoints || 0,
            'X-RateLimit-Reset': new Date(Date.now() + error.msBeforeNext)
          });

          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${retryAfter} seconds.`,
            retryAfter,
            limiterType: failedLimiterInfo.type
          });
        }

        // Add rate limit headers for successful requests
        const primaryResult = limitResults[1]; // User-specific limiter result
        if (primaryResult.status === 'fulfilled') {
          const resRateLimiter = primaryResult.value;
          res.set({
            'X-RateLimit-Limit': resRateLimiter.totalHits,
            'X-RateLimit-Remaining': resRateLimiter.remainingPoints,
            'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext)
          });
        }

        next();

      } catch (error) {
        logger.error('Rate limiter error', {
          error: error.message,
          endpoint: req.path,
          userId: req.user?.id,
          ip: req.ip
        });

        // Don't block requests on rate limiter errors
        next();
      }
    };
  }

  /**
   * Create endpoint-specific rate limiter
   * @param {string} endpoint - Endpoint path
   * @param {Object} customConfig - Custom configuration
   * @returns {Function} Express middleware
   */
  createEndpointLimiter(endpoint, customConfig = {}) {
    return this.createRateLimitMiddleware({
      endpoint,
      ...customConfig
    });
  }

  /**
   * Get rate limit status for a user
   * @param {Object} user - User object
   * @param {string} ip - IP address
   * @returns {Object} Rate limit status
   */
  async getRateLimitStatus(user, ip) {
    try {
      const userLimiterType = this.getUserLimiterType(user);
      const userKey = user?.id || ip;
      const limiter = this.limiters[userLimiterType];
      
      const status = await limiter.get(`${userLimiterType}_${userKey}`);
      
      return {
        limiterType: userLimiterType,
        remainingPoints: status?.remainingPoints || limiter.points,
        totalPoints: limiter.points,
        msBeforeNext: status?.msBeforeNext || 0,
        resetTime: status ? new Date(Date.now() + status.msBeforeNext) : null
      };
    } catch (error) {
      logger.error('Failed to get rate limit status', { error: error.message });
      return null;
    }
  }

  /**
   * Reset rate limit for a user (admin function)
   * @param {Object} user - User object
   * @param {string} ip - IP address
   * @returns {boolean} Success status
   */
  async resetRateLimit(user, ip) {
    try {
      const userLimiterType = this.getUserLimiterType(user);
      const userKey = user?.id || ip;
      
      await this.limiters[userLimiterType].delete(`${userLimiterType}_${userKey}`);
      await this.limiters.burst.delete(`burst_${ip}`);
      
      logger.info('Rate limit reset', {
        userId: user?.id,
        userRole: user?.role,
        limiterType: userLimiterType,
        ip
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to reset rate limit', { error: error.message });
      return false;
    }
  }
}

module.exports = new AdvancedRateLimiter();
