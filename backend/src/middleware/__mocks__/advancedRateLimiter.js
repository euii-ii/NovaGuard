// Mock for advancedRateLimiter middleware
module.exports = {
  createRateLimitMiddleware: jest.fn(() => (req, res, next) => {
    // Skip rate limiting in tests
    next();
  }),
  
  createEndpointLimiter: jest.fn(() => (req, res, next) => {
    // Skip rate limiting in tests
    next();
  }),
  
  getRateLimitStatus: jest.fn().mockResolvedValue({
    limiterType: 'authenticated',
    remainingPoints: 100,
    totalPoints: 100,
    msBeforeNext: 0,
    resetTime: null
  }),
  
  resetRateLimit: jest.fn().mockResolvedValue(true)
};