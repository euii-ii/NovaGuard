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

// Import mocks
const {
  mockAiAnalysisPipeline,
  mockMultiChainWeb3Service,
  mockJwtAuth
} = require('../mocks/serviceMocks');

describe('Enhanced Audit Controller', () => {
  let app;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
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
    
    app.use('/api/v1', enhancedAuditController);
    
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
  });

  describe('POST /contracts/analyze', () => {
    it('should analyze contract with valid input', async () => {
      mockAiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: mockAIResponses.security.vulnerabilities,
        overallScore: mockAIResponses.security.overallScore,
        riskLevel: mockAIResponses.security.riskLevel,
        metadata: {
          analysisMode: 'comprehensive',
          executionTime: 5000,
          agentsUsed: ['security']
        }
      });

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
      mockAiAnalysisPipeline.analyzeContract.mockRejectedValue(new Error('Analysis service unavailable'));

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
        mockAiAnalysisPipeline.analyzeContract.mockResolvedValue({
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
    it('should verify contract on blockchain', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockMultiChainWeb3Service.verifyContract.mockResolvedValue({
        isVerified: true,
        sourceCode: mockContracts.simple,
        contractName: 'SimpleContract',
        compilerVersion: '0.8.19',
        abi: []
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
      expect(response.body.data).toHaveProperty('isVerified', true);
      expect(response.body.data).toHaveProperty('sourceCode');
      expect(response.body.data).toHaveProperty('contractName');
    });

    it('should handle unverified contracts', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockMultiChainWeb3Service.verifyContract.mockResolvedValue({
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
      
      mockMultiChainWeb3Service.verifyContract.mockResolvedValue({
        isVerified: true,
        sourceCode: mockContracts.simple
      });

      for (const chain of chains) {
        const response = await request(app)
          .post('/api/v1/contracts/verify')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({
            contractAddress,
            chain
          })
          .expect(200);

        expect(response.body.data).toHaveProperty('isVerified', true);
      }
    });
  });

  describe('POST /defi/analyze', () => {
    it('should analyze DeFi protocol', async () => {
      mockAiAnalysisPipeline.analyzeContract.mockResolvedValue({
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
      mockAiAnalysisPipeline.analyzeContract.mockResolvedValue({
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
      mockMultiChainWeb3Service.getSupportedChains.mockReturnValue({
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
      mockAiAnalysisPipeline.getAvailableAgents.mockReturnValue([
        { id: 'security', name: 'Security Analyzer', description: 'Detects security vulnerabilities' },
        { id: 'quality', name: 'Quality Analyzer', description: 'Analyzes code quality' },
        { id: 'defi', name: 'DeFi Analyzer', description: 'Specialized DeFi analysis' }
      ]);

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
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .send({
          contractCode: mockContracts.simple
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          contractCode: mockContracts.simple
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      mockAiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: [],
        overallScore: 85,
        riskLevel: 'Low'
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
      
      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
      });
    });

    it('should complete analysis within reasonable time', async () => {
      mockAiAnalysisPipeline.analyzeContract.mockResolvedValue({
        vulnerabilities: [],
        overallScore: 85,
        riskLevel: 'Low',
        metadata: { executionTime: 3000 }
      });

      const startTime = Date.now();
      
      await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.complex,
          analysisType: 'comprehensive'
        })
        .expect(200);

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});