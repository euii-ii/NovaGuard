/**
 * Mock for advancedRateLimiter middleware
 * Used in tests to prevent rate limiting during testing
 */

const mockRateLimiter = {
  // Mock the createRateLimitMiddleware method
  createRateLimitMiddleware: jest.fn(() => {
    return (req, res, next) => {
      // Skip rate limiting in tests
      next();
    };
  }),

  // Mock the createEndpointLimiter method
  createEndpointLimiter: jest.fn(() => {
    return (req, res, next) => {
      // Skip rate limiting in tests
      next();
    };
  }),

  // Mock the getRateLimitStatus method
  getRateLimitStatus: jest.fn().mockResolvedValue({
    limiterType: 'authenticated',
    remainingPoints: 100,
    totalPoints: 100,
    msBeforeNext: 0,
    resetTime: null
  }),

  // Mock the resetRateLimit method
  resetRateLimit: jest.fn().mockResolvedValue(true),

  // Mock the getUserLimiterType method
  getUserLimiterType: jest.fn((user) => {
    if (!user || user.id === 'anonymous') {
      return 'anonymous';
    }
    return 'authenticated';
  }),

  // Mock limiters object
  limiters: {
    anonymous: {
      consume: jest.fn().mockResolvedValue({ remainingPoints: 10 }),
      get: jest.fn().mockResolvedValue({ remainingPoints: 10 }),
      delete: jest.fn().mockResolvedValue(true)
    },
    authenticated: {
      consume: jest.fn().mockResolvedValue({ remainingPoints: 100 }),
      get: jest.fn().mockResolvedValue({ remainingPoints: 100 }),
      delete: jest.fn().mockResolvedValue(true)
    },
    premium: {
      consume: jest.fn().mockResolvedValue({ remainingPoints: 500 }),
      get: jest.fn().mockResolvedValue({ remainingPoints: 500 }),
      delete: jest.fn().mockResolvedValue(true)
    },
    heavyOps: {
      consume: jest.fn().mockResolvedValue({ remainingPoints: 5 }),
      get: jest.fn().mockResolvedValue({ remainingPoints: 5 }),
      delete: jest.fn().mockResolvedValue(true)
    },
    burst: {
      consume: jest.fn().mockResolvedValue({ remainingPoints: 20 }),
      get: jest.fn().mockResolvedValue({ remainingPoints: 20 }),
      delete: jest.fn().mockResolvedValue(true)
    }
  },

  // Mock endpoint limits
  endpointLimits: {
    '/api/v1/contracts/analyze': {
      limiterType: 'heavyOps',
      customPoints: 3,
      description: 'Contract analysis endpoint'
    },
    '/api/v1/contracts/analyze-address': {
      limiterType: 'heavyOps',
      customPoints: 5,
      description: 'Address analysis endpoint'
    }
  }
};

module.exports = mockRateLimiter;
