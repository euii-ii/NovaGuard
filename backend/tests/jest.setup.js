// Jest setup file to configure global test environment
const { setupServiceMocks } = require('./mocks/serviceMocks');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMITING = 'true';
process.env.JWT_SECRET = 'test-secret-key';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'sqlite::memory:';

// Disable rate limiting completely for tests
process.env.RATE_LIMIT_ANONYMOUS_POINTS = '999999';
process.env.RATE_LIMIT_AUTH_POINTS = '999999';
process.env.RATE_LIMIT_PREMIUM_POINTS = '999999';
process.env.RATE_LIMIT_API_POINTS = '999999';
process.env.RATE_LIMIT_HEAVY_POINTS = '999999';
process.env.RATE_LIMIT_BURST_POINTS = '999999';

// Setup service mocks before any tests run
beforeAll(() => {
  setupServiceMocks();
});

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to silence console output during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};