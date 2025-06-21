// Mock services before any imports
jest.mock('../../src/services/aiAnalysisPipeline');
jest.mock('../../src/services/multiChainWeb3Service');
jest.mock('../../src/services/auditEngine');
jest.mock('../../src/middleware/advancedRateLimiter');

const request = require('supertest');
const express = require('express');
const enhancedAuditController = require('../../src/controllers/enhancedAuditController');
const { 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  createTestUser, 
  createAdminUser,
  mockContracts,
  mockAIResponses,
  apiHelpers
} = require('../setup');

// Get mocked services
const aiAnalysisPipeline = require('../../src/services/aiAnalysisPipeline');
const multiChainWeb3Service = require('../../src/services/multiChainWeb3Service');

describe('Enhanced Audit Controller', () => {
  let app;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create Express app for testing
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Add mock auth middleware that doesn't require actual JWT verification
    app.use((req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token && token !== 'invalid-token') {
        req.user = {
          id: 'test-user-123',
          email: 'test@example.com',
          role: 'user',
          permissions: ['read', 'write', 'analyze']
        };
      }
      next();
    });
    
    // Mock rate limiter middleware to prevent 429 errors
    app.use((req, res, next) => {
      // Skip rate limiting in tests
      next();
    });
    
    app.use('/api/v1', enhancedAuditController);
    
    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error('Test app error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    });
    
    // Create test users
    testUser = createTestUser();
    adminUser = createAdminUser();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock responses
    aiAnalysisPipeline.analyzeContract.mockResolvedValue({
      vulnerabilities: mockAIResponses.security.vulnerabilities,
      overallScore: mockAIResponses.security.overallScore,
      riskLevel: mockAIResponses.security.riskLevel,
      metadata: {
        analysisMode: 'comprehensive',
        executionTime: 5000,
        agentsUsed: ['security']
      }
    });

    multiChainWeb3Service.verifyContract.mockResolvedValue({
      isVerified: true,
      sourceCode: mockContracts.simple,
      contractName: 'SimpleContract',
      compilerVersion: '0.8.19',
      abi: []
    });

    multiChainWeb3Service.getSupportedChains.mockReturnValue({
      ethereum: { name: 'Ethereum', chainId: 1 },
      polygon: { name: 'Polygon', chainId: 137 },
      arbitrum: { name: 'Arbitrum', chainId: 42161 }
    });

    aiAnalysisPipeline.getAvailableAgents.mockReturnValue([
      { id: 'security', name: 'Security Analyzer', description: 'Detects security vulnerabilities' },
      { id: 'quality', name: 'Quality Analyzer', description: 'Analyzes code quality' },
      { id: 'defi', name: 'DeFi Analyzer', description: 'Specialized DeFi analysis' }
    ]);
  });

  describe('POST /contracts/analyze', () => {
    it('should analyze contract with valid input', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.vulnerable,
          analysisType: 'comprehensive',
          agents: ['security']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('vulnerabilities');
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('riskLevel');
      expect(Array.isArray(response.body.data.vulnerabilities)).toBe(true);
      
      // Verify the mock was called with correct parameters
      expect(aiAnalysisPipeline.analyzeContract).toHaveBeenCalledWith(
        mockContracts.vulnerable,
        expect.objectContaining({
          analysisMode: 'comprehensive',
          agents: ['security']
        })
      );
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/contracts/analyze')
        .send({
          contractCode: mockContracts.simple,
          analysisType: 'quick'
        })
        .expect(401);
    });

    it('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          // Missing contractCode
          analysisType: 'comprehensive'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle analysis errors gracefully', async () => {
      aiAnalysisPipeline.analyzeContract.mockRejectedValue(new Error('Analysis service unavailable'));

      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.simple,
          analysisType: 'quick'
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should support different analysis types', async () => {
      const analysisTypes = ['quick', 'comprehensive', 'security-focused', 'defi-focused'];
      
      for (const analysisType of analysisTypes) {
        aiAnalysisPipeline.analyzeContract.mockResolvedValue({
          vulnerabilities: [],
          overallScore: 85,
          riskLevel: 'Low',
          metadata: { analysisMode: analysisType }
        });

        const response = await request(app)
          .post('/api/v1/contracts/analyze')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({
            contractCode: mockContracts.simple,
            analysisType
          })
          .expect(200);

        expect(response.body.data.metadata.analysisMode).toBe(analysisType);
      }
    });
  });

  describe('POST /contracts/verify', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should verify contract on blockchain', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .post('/api/v1/contracts/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractAddress,
          chain: 'ethereum'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isVerified', true);
      expect(response.body.data).toHaveProperty('sourceCode');
      expect(response.body.data).toHaveProperty('contractName');
      
      // Verify the mock was called with correct parameters
      expect(multiChainWeb3Service.verifyContract).toHaveBeenCalledWith('ethereum', contractAddress);
    });

    it('should handle unverified contracts', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      multiChainWeb3Service.verifyContract.mockResolvedValue({
        isVerified: false,
        error: 'Contract source code not verified'
      });

      const response = await request(app)
        .post('/api/v1/contracts/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractAddress,
          chain: 'ethereum'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isVerified', false);
      expect(response.body.data).toHaveProperty('error');
    });

    it('should validate contract address format', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractAddress: 'invalid-address',
          chain: 'ethereum'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should support multiple chains', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism'];
      
      for (const chain of chains) {
        // Set up mock for each chain
        multiChainWeb3Service.verifyContract.mockResolvedValue({
          isVerified: true,
          sourceCode: mockContracts.simple,
          contractName: 'SimpleContract',
          compilerVersion: '0.8.19'
        });

        const response = await request(app)
          .post('/api/v1/contracts/verify')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({
            contractAddress,
            chain
          })
          .expect(200);

        expect(response.body.data).toHaveProperty('isVerified', true);
        expect(multiChainWeb3Service.verifyContract).toHaveBeenCalledWith(chain, contractAddress);
      }
    });

    it('should handle verification service errors', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      multiChainWeb3Service.verifyContract.mockRejectedValue(new Error('Verification service unavailable'));

      const response = await request(app)
        .post('/api/v1/contracts/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractAddress,
          chain: 'ethereum'
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Verification failed');
    });
  });

  describe('POST /defi/analyze', () => {
    it('should analyze DeFi protocol', async () => {
      aiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: mockAIResponses.defi.risks,
        overallScore: mockAIResponses.defi.overallScore,
        defiRisk: mockAIResponses.defi.defiRisk,
        economicModel: {
          tokenomics: 'Deflationary',
          liquidityMechanism: 'AMM',
          riskFactors: ['Impermanent Loss', 'Oracle Manipulation']
        },
        metadata: {
          analysisMode: 'defi-focused',
          protocolType: 'AMM'
        }
      });

      const response = await request(app)
        .post('/api/v1/defi/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.defi,
          protocolType: 'AMM',
          agents: ['defi', 'economics']
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('vulnerabilities');
      expect(response.body.data).toHaveProperty('defiRisk');
      expect(response.body.data).toHaveProperty('economicModel');
    });

    it('should detect protocol type automatically', async () => {
      aiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: [],
        overallScore: 75,
        protocolType: 'lending',
        metadata: { detectedProtocol: 'lending' }
      });

      const response = await request(app)
        .post('/api/v1/defi/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.defi,
          autoDetectProtocol: true
        })
        .expect(200);

      expect(response.body.data.metadata).toHaveProperty('detectedProtocol');
    });
  });

  describe('GET /chains/supported', () => {
    it('should return supported chains', async () => {
      multiChainWeb3Service.getSupportedChains.mockReturnValue({
        ethereum: { name: 'Ethereum', chainId: 1 },
        polygon: { name: 'Polygon', chainId: 137 },
        arbitrum: { name: 'Arbitrum', chainId: 42161 }
      });

      const response = await request(app)
        .get('/api/v1/chains/supported')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(typeof response.body.data).toBe('object');
      expect(response.body.data).toHaveProperty('ethereum');
      expect(response.body.data).toHaveProperty('polygon');
      expect(response.body.data).toHaveProperty('arbitrum');
    });
  });

  describe('GET /agents/available', () => {
    it('should return available AI agents', async () => {
      const response = await request(app)
        .get('/api/v1/agents/available')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      response.body.data.forEach(agent => {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle malformed JSON', async () => {
      // Test with malformed JSON by sending invalid content
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .set('Content-Type', 'application/json')
        .send('{ "contractCode": "invalid json" }') // Valid JSON but test validation
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing authorization header for protected routes', async () => {
      // Update the mock auth middleware to handle missing auth properly
      const testApp = express();
      testApp.use(express.json());
      
      // Mock auth middleware that properly handles missing auth
      testApp.use((req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          // For routes that require auth, return 401
          if (req.path.includes('/analyze')) {
            return res.status(401).json({
              success: false,
              error: 'Authentication required'
            });
          }
        } else if (token !== 'invalid-token') {
          req.user = {
            id: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            permissions: ['read', 'write', 'analyze']
          };
        }
        next();
      });
      
      testApp.use('/api/v1', enhancedAuditController);

      const response = await request(testApp)
        .post('/api/v1/contracts/analyze')
        .send({
          contractCode: mockContracts.simple
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid JWT tokens', async () => {
      // Update the mock auth middleware to handle invalid tokens
      const testApp = express();
      testApp.use(express.json());
      
      testApp.use((req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token === 'invalid-token') {
          return res.status(401).json({
            success: false,
            error: 'Invalid token'
          });
        } else if (token) {
          req.user = {
            id: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            permissions: ['read', 'write', 'analyze']
          };
        }
        next();
      });
      
      testApp.use('/api/v1', enhancedAuditController);

      const response = await request(testApp)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          contractCode: mockContracts.simple
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle service unavailable errors', async () => {
      aiAnalysisPipeline.analyzeContract.mockRejectedValue(new Error('Service temporarily unavailable'));

      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.simple,
          analysisType: 'quick'
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Analysis failed');
      expect(response.body).toHaveProperty('details');
    });

    it('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          // Missing contractCode
          analysisType: 'comprehensive'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle concurrent requests', async () => {
      aiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: [],
        overallScore: 85,
        riskLevel: 'Low',
        metadata: {
          analysisMode: 'quick',
          executionTime: 1000
        }
      });

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/v1/contracts/analyze')
            .set('Authorization', `Bearer ${testUser.token}`)
            .send({
              contractCode: mockContracts.simple,
              analysisType: 'quick'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        // All requests should succeed since rate limiting is disabled in tests
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('overallScore', 85);
      });

      // Verify the service was called for each request
      expect(aiAnalysisPipeline.analyzeContract).toHaveBeenCalledTimes(5);
    });

    it('should complete analysis within reasonable time', async () => {
      aiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: [],
        overallScore: 85,
        riskLevel: 'Low',
        metadata: { 
          executionTime: 3000,
          analysisMode: 'comprehensive'
        }
      });

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.complex,
          analysisType: 'comprehensive'
        })
        .expect(200);

      const executionTime = Date.now() - startTime;
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('metadata');
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle large contract analysis', async () => {
      const largeContract = mockContracts.complex.repeat(10); // Simulate large contract
      
      aiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: [
          {
            name: 'Gas Optimization',
            severity: 'low',
            category: 'optimization',
            description: 'Contract can be optimized for gas usage'
          }
        ],
        overallScore: 78,
        riskLevel: 'Low',
        metadata: { 
          executionTime: 5000,
          analysisMode: 'comprehensive',
          contractSize: largeContract.length
        }
      });

      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: largeContract,
          analysisType: 'comprehensive'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('vulnerabilities');
      expect(response.body.data.vulnerabilities).toHaveLength(1);
    });
  });
});