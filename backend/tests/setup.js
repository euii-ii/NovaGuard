// Set test environment variables before any other modules are loaded
process.env.NODE_ENV = 'test';
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DISABLE_RATE_LIMITING = 'true';
process.env.DATABASE_URL = 'sqlite::memory:';

// Disable rate limiting completely for tests
process.env.RATE_LIMIT_ANONYMOUS_POINTS = '999999';
process.env.RATE_LIMIT_AUTH_POINTS = '999999';
process.env.RATE_LIMIT_PREMIUM_POINTS = '999999';
process.env.RATE_LIMIT_API_POINTS = '999999';
process.env.RATE_LIMIT_HEAVY_POINTS = '999999';
process.env.RATE_LIMIT_BURST_POINTS = '999999';

// Fix EventEmitter memory leak warnings
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 20; // Increase default max listeners
process.setMaxListeners(20); // Increase process max listeners

// Setup service mocks before importing anything else
const { setupServiceMocks, resetServiceMocks } = require('./mocks/serviceMocks');
// Only setup mocks if not testing specific services
if (!process.env.TESTING_SERVICES) {
  setupServiceMocks();
}

// Import test libraries
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Test configuration
const testConfig = {
  jwt: {
    secret: 'test-secret-key',
    expiresIn: '1h'
  },
  openRouter: {
    apiKey: 'test-api-key',
    baseUrl: 'https://openrouter.ai/api/v1'
  }
};

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  try {
    // Set additional test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = testConfig.jwt.secret;
    process.env.OPENROUTER_API_KEY = testConfig.openRouter.apiKey;
    process.env.DATABASE_URL = 'sqlite::memory:';
    process.env.DISABLE_RATE_LIMITING = 'true';

    console.log('Test environment setup complete');

  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
}

/**
 * Cleanup test environment
 */
async function cleanupTestEnvironment() {
  try {
    // Cleanup services that might have open handles
    const servicesToCleanup = [
      'instantFeedbackService',
      'chainIDEIntegrationService',
      'realTimeDevelopmentService',
      'teamCollaborationService',
      'realTimeMonitoringService'
    ];

    for (const serviceName of servicesToCleanup) {
      try {
        const service = require(`../src/services/${serviceName}`);
        if (service && typeof service.cleanup === 'function') {
          service.cleanup();
        }
        // Remove all listeners if it's an EventEmitter
        if (service && typeof service.removeAllListeners === 'function') {
          service.removeAllListeners();
        }
      } catch (error) {
        // Service might not exist or have cleanup method, ignore
      }
    }

    // Clear any remaining timers
    if (global.gc) {
      global.gc();
    }

    // Reset all mocks
    resetServiceMocks();

    console.log('Test environment cleanup complete');

  } catch (error) {
    console.error('Failed to cleanup test environment:', error);
    // Don't throw error to prevent test failures
  }
}

/**
 * Create test user and JWT token
 */
function createTestUser(userData = {}) {
  const defaultUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    permissions: ['read', 'write', 'analyze']
  };
  
  const user = { ...defaultUser, ...userData };
  const token = jwt.sign(user, testConfig.jwt.secret, {
    expiresIn: testConfig.jwt.expiresIn,
    audience: 'api-users',
    issuer: 'smart-contract-auditor'
  });
  
  return { user, token };
}

/**
 * Create admin test user
 */
function createAdminUser() {
  return createTestUser({
    id: 'admin-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    permissions: ['read', 'write', 'analyze', 'admin', 'manage_users']
  });
}

/**
 * Mock contract code samples for testing
 */
const mockContracts = {
  simple: `
    pragma solidity ^0.8.0;
    
    contract SimpleContract {
        uint256 public value;
        
        function setValue(uint256 _value) public {
            value = _value;
        }
        
        function getValue() public view returns (uint256) {
            return value;
        }
    }
  `,
  
  vulnerable: `
    pragma solidity ^0.8.0;
    
    contract VulnerableContract {
        mapping(address => uint256) public balances;
        
        function withdraw(uint256 amount) public {
            require(balances[msg.sender] >= amount);
            msg.sender.call{value: amount}("");
            balances[msg.sender] -= amount;
        }
        
        function deposit() public payable {
            balances[msg.sender] += msg.value;
        }
    }
  `,
  
  defi: `
    pragma solidity ^0.8.0;
    
    interface IERC20 {
        function transfer(address to, uint256 amount) external returns (bool);
        function transferFrom(address from, address to, uint256 amount) external returns (bool);
        function balanceOf(address account) external view returns (uint256);
    }
    
    contract SimpleAMM {
        IERC20 public tokenA;
        IERC20 public tokenB;
        uint256 public reserveA;
        uint256 public reserveB;
        
        constructor(address _tokenA, address _tokenB) {
            tokenA = IERC20(_tokenA);
            tokenB = IERC20(_tokenB);
        }
        
        function addLiquidity(uint256 amountA, uint256 amountB) external {
            tokenA.transferFrom(msg.sender, address(this), amountA);
            tokenB.transferFrom(msg.sender, address(this), amountB);
            reserveA += amountA;
            reserveB += amountB;
        }
        
        function swap(uint256 amountIn, bool aToB) external {
            if (aToB) {
                uint256 amountOut = (amountIn * reserveB) / (reserveA + amountIn);
                tokenA.transferFrom(msg.sender, address(this), amountIn);
                tokenB.transfer(msg.sender, amountOut);
                reserveA += amountIn;
                reserveB -= amountOut;
            } else {
                uint256 amountOut = (amountIn * reserveA) / (reserveB + amountIn);
                tokenB.transferFrom(msg.sender, address(this), amountIn);
                tokenA.transfer(msg.sender, amountOut);
                reserveB += amountIn;
                reserveA -= amountOut;
            }
        }
    }
  `,
  
  complex: `
    pragma solidity ^0.8.0;
    
    import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
    import "@openzeppelin/contracts/access/Ownable.sol";
    
    contract ComplexContract is ReentrancyGuard, Ownable {
        mapping(address => uint256) public balances;
        mapping(address => mapping(address => uint256)) public allowances;
        
        event Transfer(address indexed from, address indexed to, uint256 value);
        event Approval(address indexed owner, address indexed spender, uint256 value);
        
        function transfer(address to, uint256 amount) external nonReentrant returns (bool) {
            require(to != address(0), "Transfer to zero address");
            require(balances[msg.sender] >= amount, "Insufficient balance");
            
            balances[msg.sender] -= amount;
            balances[to] += amount;
            
            emit Transfer(msg.sender, to, amount);
            return true;
        }
        
        function approve(address spender, uint256 amount) external returns (bool) {
            allowances[msg.sender][spender] = amount;
            emit Approval(msg.sender, spender, amount);
            return true;
        }
        
        function transferFrom(address from, address to, uint256 amount) external nonReentrant returns (bool) {
            require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
            require(balances[from] >= amount, "Insufficient balance");
            
            allowances[from][msg.sender] -= amount;
            balances[from] -= amount;
            balances[to] += amount;
            
            emit Transfer(from, to, amount);
            return true;
        }
        
        function mint(address to, uint256 amount) external onlyOwner {
            balances[to] += amount;
            emit Transfer(address(0), to, amount);
        }
    }
  `
};

/**
 * Mock AI analysis responses
 */
const mockAIResponses = {
  security: {
    vulnerabilities: [
      {
        name: 'Reentrancy Vulnerability',
        severity: 'high',
        category: 'reentrancy',
        description: 'External call before state change allows reentrancy attacks',
        affectedLines: [8, 9, 10],
        recommendation: 'Use checks-effects-interactions pattern or ReentrancyGuard'
      }
    ],
    overallScore: 65,
    riskLevel: 'Medium'
  },
  
  quality: {
    issues: [
      {
        name: 'Missing Input Validation',
        severity: 'medium',
        category: 'validation',
        description: 'Function parameters should be validated',
        affectedLines: [6],
        recommendation: 'Add require statements for input validation'
      }
    ],
    overallScore: 78,
    codeQuality: 'Good'
  },
  
  defi: {
    risks: [
      {
        name: 'Price Manipulation Risk',
        severity: 'high',
        category: 'oracle',
        description: 'AMM vulnerable to price manipulation attacks',
        affectedLines: [25, 32],
        recommendation: 'Implement price impact limits and slippage protection'
      }
    ],
    overallScore: 55,
    defiRisk: 'High'
  }
};

/**
 * Test utilities
 */
const testUtils = {
  // Wait for a specified time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random test data
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  
  // Generate random address
  randomAddress: () => '0x' + Math.random().toString(16).substring(2, 42).padStart(40, '0'),
  
  // Generate random hash
  randomHash: () => '0x' + Math.random().toString(16).substring(2, 66).padStart(64, '0'),
  
  // Validate response structure
  validateResponse: (response, expectedFields) => {
    expectedFields.forEach(field => {
      if (!response.hasOwnProperty(field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    });
  }
};

/**
 * API test helpers
 */
const apiHelpers = {
  // Make authenticated request
  authenticatedRequest: (app, method, url, token, data = null) => {
    const req = request(app)[method](url).set('Authorization', `Bearer ${token}`);
    return data ? req.send(data) : req;
  },
  
  // Test API endpoint
  testEndpoint: async (app, method, url, expectedStatus = 200, token = null, data = null) => {
    let req = request(app)[method](url);
    
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    
    if (data) {
      req = req.send(data);
    }
    
    const response = await req.expect(expectedStatus);
    return response;
  }
};

module.exports = {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestUser,
  createAdminUser,
  mockContracts,
  mockAIResponses,
  testUtils,
  apiHelpers,
  testConfig
};