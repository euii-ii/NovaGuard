const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// Rate limiter configurations
const rateLimiters = {
  // General API rate limiter
  general: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900, // Per 15 minutes (900 seconds)
    blockDuration: 900, // Block for 15 minutes if limit exceeded
  }),

  // Strict rate limiter for audit endpoints
  audit: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 10, // 10 audits per hour
    duration: 3600, // 1 hour
    blockDuration: 3600, // Block for 1 hour
  }),

  // Very strict rate limiter for resource-intensive operations
  intensive: new RateLimiterMemory({
    keyGenerator: (req) => req.ip,
    points: 3, // 3 requests per hour
    duration: 3600, // 1 hour
    blockDuration: 7200, // Block for 2 hours
  }),
};

/**
 * General rate limiting middleware
 */
const generalRateLimit = async (req, res, next) => {
  try {
    await rateLimiters.general.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      remainingPoints,
      msBeforeNext,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000),
      remainingRequests: remainingPoints,
    });
  }
};

/**
 * Audit-specific rate limiting middleware
 */
const auditRateLimit = async (req, res, next) => {
  try {
    await rateLimiters.audit.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn('Audit rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      remainingPoints,
      msBeforeNext,
    });

    res.status(429).json({
      error: 'Audit Rate Limit Exceeded',
      message: 'You have exceeded the audit rate limit. Please wait before submitting another audit request.',
      retryAfter: Math.round(msBeforeNext / 1000),
      remainingAudits: remainingPoints,
      limits: {
        auditsPerHour: 10,
        currentWindow: '1 hour',
      },
    });
  }
};

/**
 * Intensive operation rate limiting middleware
 */
const intensiveRateLimit = async (req, res, next) => {
  try {
    await rateLimiters.intensive.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 0;
    
    logger.warn('Intensive operation rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      remainingPoints,
      msBeforeNext,
    });

    res.status(429).json({
      error: 'Resource Limit Exceeded',
      message: 'You have exceeded the limit for resource-intensive operations.',
      retryAfter: Math.round(msBeforeNext / 1000),
      remainingRequests: remainingPoints,
      limits: {
        requestsPerHour: 3,
        currentWindow: '1 hour',
      },
    });
  }
};

/**
 * Create custom rate limiter
 */
const createCustomRateLimit = (options) => {
  const limiter = new RateLimiterMemory({
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    points: options.points || 60,
    duration: options.duration || 3600,
    blockDuration: options.blockDuration || 3600,
  });

  return async (req, res, next) => {
    try {
      await limiter.consume(req.ip);
      next();
    } catch (rejRes) {
      const remainingPoints = rejRes.remainingPoints || 0;
      const msBeforeNext = rejRes.msBeforeNext || 0;
      
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        remainingPoints,
        msBeforeNext,
        limiterName: options.name || 'custom',
      });

      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.round(msBeforeNext / 1000),
        remainingRequests: remainingPoints,
      });
    }
  };
};

/**
 * Rate limiter middleware factory
 */
const rateLimiterMiddleware = (type = 'general') => {
  switch (type) {
    case 'audit':
      return auditRateLimit;
    case 'intensive':
      return intensiveRateLimit;
    case 'general':
    default:
      return generalRateLimit;
  }
};

// Apply audit rate limiting to audit endpoints
const applyAuditRateLimit = (req, res, next) => {
  if (req.path.includes('/audit/contract') || req.path.includes('/audit/address')) {
    return auditRateLimit(req, res, next);
  }
  return next();
};

// Apply intensive rate limiting to resource-heavy endpoints
const applyIntensiveRateLimit = (req, res, next) => {
  const intensiveEndpoints = [
    '/audit/verify-integrity',
    '/audit/statistics',
  ];
  
  if (intensiveEndpoints.some(endpoint => req.path.includes(endpoint))) {
    return intensiveRateLimit(req, res, next);
  }
  return next();
};

module.exports = generalRateLimit;
