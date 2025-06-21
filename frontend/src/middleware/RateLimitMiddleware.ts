import { RateLimitInfo, RateLimitError } from '../types/vulnerability';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

export interface RequestRecord {
  timestamp: number;
  success: boolean;
}

export class RateLimitMiddleware {
  private config: RateLimitConfig;
  private requestHistory: Map<string, RequestRecord[]> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: () => 'default',
      ...config
    };

    // Clean up old records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async checkRateLimit(request?: any): Promise<RateLimitInfo> {
    const key = this.config.keyGenerator!(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create request history for this key
    let history = this.requestHistory.get(key) || [];
    
    // Filter out requests outside the current window
    history = history.filter(record => record.timestamp > windowStart);
    
    // Count requests based on configuration
    const relevantRequests = history.filter(record => {
      if (this.config.skipSuccessfulRequests && record.success) {
        return false;
      }
      if (this.config.skipFailedRequests && !record.success) {
        return false;
      }
      return true;
    });

    const currentCount = relevantRequests.length;
    const remaining = Math.max(0, this.config.maxRequests - currentCount);
    const resetTime = windowStart + this.config.windowMs;

    const rateLimitInfo: RateLimitInfo = {
      limit: this.config.maxRequests,
      remaining,
      resetTime
    };

    if (currentCount >= this.config.maxRequests) {
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      rateLimitInfo.retryAfter = retryAfter;
      
      throw new RateLimitError('Rate limit exceeded', rateLimitInfo);
    }

    return rateLimitInfo;
  }

  recordRequest(success: boolean, request?: any): void {
    const key = this.config.keyGenerator!(request);
    const now = Date.now();

    let history = this.requestHistory.get(key) || [];
    history.push({
      timestamp: now,
      success
    });

    // Keep only recent records
    const windowStart = now - this.config.windowMs;
    history = history.filter(record => record.timestamp > windowStart);

    this.requestHistory.set(key, history);
  }

  getRateLimitInfo(request?: any): RateLimitInfo {
    const key = this.config.keyGenerator!(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const history = this.requestHistory.get(key) || [];
    const relevantRequests = history.filter(record => {
      if (record.timestamp <= windowStart) return false;
      if (this.config.skipSuccessfulRequests && record.success) return false;
      if (this.config.skipFailedRequests && !record.success) return false;
      return true;
    });

    const currentCount = relevantRequests.length;
    const remaining = Math.max(0, this.config.maxRequests - currentCount);
    const resetTime = windowStart + this.config.windowMs;

    return {
      limit: this.config.maxRequests,
      remaining,
      resetTime
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs * 2; // Keep some extra history

    for (const [key, history] of this.requestHistory.entries()) {
      const filteredHistory = history.filter(record => record.timestamp > cutoff);
      
      if (filteredHistory.length === 0) {
        this.requestHistory.delete(key);
      } else {
        this.requestHistory.set(key, filteredHistory);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requestHistory.clear();
  }

  reset(key?: string): void {
    if (key) {
      this.requestHistory.delete(key);
    } else {
      this.requestHistory.clear();
    }
  }

  getStats(): { totalKeys: number; totalRequests: number } {
    let totalRequests = 0;
    
    for (const history of this.requestHistory.values()) {
      totalRequests += history.length;
    }

    return {
      totalKeys: this.requestHistory.size,
      totalRequests
    };
  }
}

// Predefined rate limit configurations
export const RateLimitPresets = {
  // Conservative limits for free tier
  FREE_TIER: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    skipSuccessfulRequests: false
  },

  // Standard limits for paid tier
  STANDARD_TIER: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    skipSuccessfulRequests: false
  },

  // Premium limits for enterprise
  PREMIUM_TIER: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    skipSuccessfulRequests: false
  },

  // Burst protection
  BURST_PROTECTION: {
    maxRequests: 5,
    windowMs: 1000, // 1 second
    skipSuccessfulRequests: false
  }
};

// IP-based rate limiting
export class IPRateLimitMiddleware extends RateLimitMiddleware {
  constructor(config: Omit<RateLimitConfig, 'keyGenerator'>) {
    super({
      ...config,
      keyGenerator: (request: any) => {
        // In a browser environment, we can't get real IP
        // Use a combination of user agent and other fingerprinting
        const userAgent = navigator.userAgent;
        const language = navigator.language;
        const platform = navigator.platform;
        const screenResolution = `${screen.width}x${screen.height}`;
        
        // Create a simple fingerprint
        const fingerprint = btoa(`${userAgent}-${language}-${platform}-${screenResolution}`);
        return fingerprint.substring(0, 16); // Truncate for storage efficiency
      }
    });
  }
}

// User-based rate limiting (requires authentication)
export class UserRateLimitMiddleware extends RateLimitMiddleware {
  constructor(config: Omit<RateLimitConfig, 'keyGenerator'>) {
    super({
      ...config,
      keyGenerator: (request: any) => {
        // Extract user ID from request or auth context
        return request?.userId || request?.user?.id || 'anonymous';
      }
    });
  }
}

// API key based rate limiting
export class APIKeyRateLimitMiddleware extends RateLimitMiddleware {
  constructor(config: Omit<RateLimitConfig, 'keyGenerator'>) {
    super({
      ...config,
      keyGenerator: (request: any) => {
        return request?.apiKey || 'no-key';
      }
    });
  }
}
