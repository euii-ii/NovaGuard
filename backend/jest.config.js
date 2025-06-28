module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js', '<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/tests/jest.teardown.js',
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/utils/logger.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1,
  verbose: false,
  silent: false,
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  // Fix ES module compatibility issues with Chai
  transformIgnorePatterns: [
    'node_modules/(?!(chai|@babel))'
  ],
  // Map chai to its CommonJS version
  moduleNameMapper: {
    '^chai$': '<rootDir>/node_modules/chai/lib/chai.js'
  }
};