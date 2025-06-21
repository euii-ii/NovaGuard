const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import controllers
const enhancedAuditController = require('../../src/controllers/enhancedAuditController');
const realTimeDevelopmentController = require('../../src/controllers/realTimeDevelopmentController');
const collaborativeToolsController = require('../../src/controllers/collaborativeToolsController');
const chainIDEController = require('../../src/controllers/chainIDEController');

// Import services for stubbing
const aiAnalysisPipeline = require('../../src/services/aiAnalysisPipeline');
const multiChainWeb3Service = require('../../src/services/multiChainWeb3Service');
const realTimeDevelopmentService = require('../../src/services/realTimeDevelopmentService');
const teamCollaborationService = require('../../src/services/teamCollaborationService');

const { 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  createTestUser, 
  createAdminUser,
  mockContracts,
  mockAIResponses,
  testUtils
} = require('../setup');

describe('API Integration Tests', () => {
  let app;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    await setupTestEnvironment();
    
    // Create Express app with all routes
    app = express();
    
    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Routes
    app.use('/api/v1/contracts', enhancedAuditController);
    app.use('/api/v1/ai', enhancedAuditController);
    app.use('/api/v1/defi', enhancedAuditController);
    app.use('/api/v1/chains', enhancedAuditController);
    app.use('/api/v1/agents', enhancedAuditController);
    app.use('/api/v1/realtime', realTimeDevelopmentController);
    app.use('/api/v1/collaboration', collaborativeToolsController);
    app.use('/api/v1/chainide', chainIDEController);
    
    // Error handling middleware
    app.use((error, req, res, next) => {
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
    // Reset all stubs before each test
    jest.restoreAllMocks();
  });

  describe('Enhanced Audit API', () => {
    beforeEach(() => {
      // Stub AI analysis service
      jest.spyOn(aiAnalysisPipeline, 'analyzeContract').mockResolvedValue({
        vulnerabilities: mockAIResponses.security.vulnerabilities,
        overallScore: mockAIResponses.security.overallScore,
        riskLevel: mockAIResponses.security.riskLevel,
        metadata: {
          analysisMode: 'comprehensive',
          executionTime: 5000,
          agentsUsed: ['security']
        }
      });
    });

    it('should perform complete audit workflow', async () => {
      // Step 1: Analyze contract
      const analysisResponse = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.vulnerable,
          analysisType: 'comprehensive',
          agents: ['security', 'quality']
        })
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.data).toHaveProperty('vulnerabilities');
      expect(analysisResponse.body.data).toHaveProperty('overallScore');

      // Step 2: Get available agents
      const agentsResponse = await request(app)
        .get('/api/v1/agents/available')
        .expect(200);

      expect(agentsResponse.body.success).toBe(true);
      expect(Array.isArray(agentsResponse.body.data)).toBe(true);

      // Step 3: Get supported chains
      jest.spyOn(multiChainWeb3Service, 'getSupportedChains').mockReturnValue({
        ethereum: { name: 'Ethereum', chainId: 1 },
        polygon: { name: 'Polygon', chainId: 137 }
      });

      const chainsResponse = await request(app)
        .get('/api/v1/chains/supported')
        .expect(200);

      expect(chainsResponse.body.success).toBe(true);
      expect(typeof chainsResponse.body.data).toBe('object');
    });

    it('should handle DeFi-specific analysis', async () => {
      jest.restoreAllMocks();
      jest.spyOn(aiAnalysisPipeline, 'analyzeContract').mockResolvedValue({
        vulnerabilities: mockAIResponses.defi.risks,
        overallScore: mockAIResponses.defi.overallScore,
        defiRisk: mockAIResponses.defi.defiRisk,
        economicModel: {
          tokenomics: 'Deflationary',
          liquidityMechanism: 'AMM'
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

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('defiRisk');
      expect(response.body.data).toHaveProperty('economicModel');
    });

    it('should verify contracts on blockchain', async () => {
      jest.spyOn(multiChainWeb3Service, 'verifyContract').mockResolvedValue({
        isVerified: true,
        sourceCode: mockContracts.simple,
        contractName: 'SimpleContract',
        compilerVersion: '0.8.19'
      });

      const response = await request(app)
        .post('/api/v1/contracts/verify')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractAddress: testUtils.randomAddress(),
          chain: 'ethereum'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isVerified', true);
      expect(response.body.data).toHaveProperty('sourceCode');
    });
  });

  describe('Real-Time Development API', () => {
    beforeEach(() => {
      // Stub real-time development service
      jest.spyOn(realTimeDevelopmentService, 'processCodeChange').mockResolvedValue({
        analysisId: 'analysis-123',
        instant: {
          syntaxValidation: { isValid: true, errors: [], warnings: [] },
          codeCompletion: { suggestions: [], context: 'unknown' },
          quickFeedback: [],
          vulnerabilityAlerts: []
        },
        deferred: {
          liveAnalysis: null,
          smartSuggestions: null
        },
        metadata: {
          changeType: 'edit',
          processingTime: 150
        }
      });

      jest.spyOn(realTimeDevelopmentService, 'startDevelopmentSession').mockReturnValue({
        userId: testUser.user.id,
        feedbackSessionId: 'feedback-123',
        detectionSessionId: 'detection-123',
        startedAt: new Date().toISOString()
      });

      jest.spyOn(realTimeDevelopmentService, 'getStatus').mockReturnValue({
        activeSessions: 1,
        activeAnalyses: 0,
        queueSize: 0,
        serviceMetrics: {
          totalCodeChanges: 5,
          totalAnalyses: 3,
          averageResponseTime: 200,
          activeUsers: 1
        }
      });
    });

    it('should handle real-time code analysis workflow', async () => {
      // Step 1: Start development session
      const sessionResponse = await request(app)
        .post('/api/v1/realtime/session/start')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          enableInstantFeedback: true,
          enableLiveVulnerabilityDetection: true,
          alertLevel: 'medium'
        })
        .expect(200);

      expect(sessionResponse.body.success).toBe(true);
      expect(sessionResponse.body.data.sessionInfo).toHaveProperty('feedbackSessionId');

      // Step 2: Analyze code changes
      const analysisResponse = await request(app)
        .post('/api/v1/realtime/code/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          filePath: 'contracts/Token.sol',
          content: mockContracts.simple,
          cursorPosition: { line: 5, column: 10 },
          changeType: 'edit'
        })
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.data).toHaveProperty('analysisId');
      expect(analysisResponse.body.data).toHaveProperty('instant');

      // Step 3: Get service status
      const statusResponse = await request(app)
        .get('/api/v1/realtime/status')
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toHaveProperty('activeSessions');
    });

    it('should provide code completion', async () => {
      jest.spyOn(realTimeDevelopmentService, 'getCodeCompletion').mockResolvedValue({
        suggestions: [
          {
            label: 'transfer',
            kind: 'function',
            detail: 'function transfer(address to, uint256 amount)',
            insertText: 'transfer()'
          }
        ],
        context: { type: 'member_access' }
      });

      const response = await request(app)
        .post('/api/v1/realtime/completion')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          content: mockContracts.simple,
          position: { line: 5, column: 10 },
          filePath: 'contracts/Token.sol',
          triggerCharacter: '.'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should validate syntax in real-time', async () => {
      jest.spyOn(realTimeDevelopmentService, 'validateSyntax').mockResolvedValue({
        isValid: false,
        errors: [
          {
            line: 1,
            column: 1,
            message: 'Syntax error: unexpected token',
            severity: 'error'
          }
        ],
        warnings: []
      });

      const response = await request(app)
        .post('/api/v1/realtime/validate')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          content: 'invalid solidity code',
          filePath: 'contracts/Invalid.sol'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid', false);
      expect(response.body.data.errors).toHaveLength(1);
    });
  });

  describe('Collaborative Tools API', () => {
    beforeEach(() => {
      // Stub team collaboration service
      jest.spyOn(teamCollaborationService, 'createTeam').mockResolvedValue({
        id: 'team-123',
        name: 'Test Team',
        description: 'A test team',
        createdBy: testUser.user.id,
        createdAt: new Date().toISOString(),
        members: new Map([[testUser.user.id, { role: 'owner' }]]),
        settings: { requireCodeReview: true }
      });

      jest.spyOn(teamCollaborationService, 'startTeamAnalysis').mockResolvedValue({
        sessionId: 'analysis-session-123',
        teamId: 'team-123',
        status: 'active',
        config: { analysisType: 'comprehensive' },
        progress: { totalProjects: 2, analyzedProjects: 0 }
      });

      jest.spyOn(teamCollaborationService, 'startCodeReview').mockResolvedValue({
        id: 'review-123',
        teamId: 'team-123',
        title: 'Test Review',
        status: 'pending',
        reviewers: new Map([['reviewer-123', { status: 'pending' }]]),
        metrics: { linesChanged: 50 }
      });
    });

    it('should handle team collaboration workflow', async () => {
      // Step 1: Create team
      const teamResponse = await request(app)
        .post('/api/v1/collaboration/teams')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Team',
          description: 'A team for testing',
          teamType: 'development',
          visibility: 'private'
        })
        .expect(201);

      expect(teamResponse.body.success).toBe(true);
      expect(teamResponse.body.data.team).toHaveProperty('id');
      expect(teamResponse.body.data.team).toHaveProperty('name', 'Test Team');

      // Step 2: Start team analysis
      const analysisResponse = await request(app)
        .post('/api/v1/collaboration/teams/team-123/analysis')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          analysisType: 'comprehensive',
          includeAllProjects: true,
          agents: ['security', 'quality']
        })
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.data).toHaveProperty('sessionId');

      // Step 3: Start code review
      const reviewResponse = await request(app)
        .post('/api/v1/collaboration/teams/team-123/reviews')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Security Review',
          description: 'Please review for security issues',
          filePaths: ['contracts/Token.sol'],
          codeChanges: {
            'contracts/Token.sol': {
              content: mockContracts.simple,
              additions: 30,
              deletions: 5
            }
          },
          priority: 'high'
        })
        .expect(201);

      expect(reviewResponse.body.success).toBe(true);
      expect(reviewResponse.body.data).toHaveProperty('reviewId');
    });

    it('should handle real-time code reviews', async () => {
      jest.spyOn(teamCollaborationService, 'startRealtimeReview').mockResolvedValue({
        sessionId: 'rt-review-123',
        title: 'Real-time Review',
        template: { name: 'Security Review', estimatedTime: 30 },
        status: 'active'
      });

      const response = await request(app)
        .post('/api/v1/collaboration/realtime-reviews')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Real-time Security Review',
          description: 'Live review session',
          codeChanges: {
            'contracts/Token.sol': { content: mockContracts.simple }
          },
          templateId: 'security_review'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('template');
    });
  });

  describe('ChainIDE Integration API', () => {
    beforeEach(() => {
      // Stub ChainIDE service methods
      jest.spyOn(require('../../src/services/chainIDEIntegrationService'), 'createWorkspace').mockResolvedValue({
        workspaceId: 'workspace-123',
        name: 'Test Workspace',
        createdAt: new Date().toISOString(),
        collaborators: [testUser.user.id]
      });
    });

    it('should integrate with ChainIDE', async () => {
      const response = await request(app)
        .post('/api/v1/chainide/workspaces')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Workspace',
          template: 'solidity',
          visibility: 'private'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('workspaceId');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle authentication errors', async () => {
      await request(app)
        .post('/api/v1/contracts/analyze')
        .send({
          contractCode: mockContracts.simple
        })
        .expect(401);
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          // Missing required contractCode
          analysisType: 'comprehensive'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle service errors gracefully', async () => {
      jest.spyOn(aiAnalysisPipeline, 'analyzeContract').mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: mockContracts.simple,
          analysisType: 'quick'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('failed');
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle large payloads', async () => {
      const largeContract = mockContracts.simple.repeat(1000); // Very large contract

      jest.spyOn(aiAnalysisPipeline, 'analyzeContract').mockResolvedValue({
        vulnerabilities: [],
        overallScore: 85,
        riskLevel: 'Low'
      });

      const response = await request(app)
        .post('/api/v1/contracts/analyze')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          contractCode: largeContract,
          analysisType: 'quick'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      jest.spyOn(aiAnalysisPipeline, 'analyzeContract').mockResolvedValue({
        vulnerabilities: [],
        overallScore: 85,
        riskLevel: 'Low'
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
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
        expect([200, 429]).toContain(response.status); // Success or rate limited
      });
    });

    it('should complete requests within reasonable time', async () => {
      jest.spyOn(aiAnalysisPipeline, 'analyzeContract').mockResolvedValue({
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

  describe('API Documentation and Capabilities', () => {
    it('should return API capabilities', async () => {
      const response = await request(app)
        .get('/api/v1/realtime/capabilities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('instantFeedback');
      expect(response.body.data).toHaveProperty('codeCompletion');
      expect(response.body.data).toHaveProperty('liveVulnerabilityDetection');
    });

    it('should return collaboration capabilities', async () => {
      const response = await request(app)
        .get('/api/v1/collaboration/capabilities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('teamCollaboration');
      expect(response.body.data).toHaveProperty('realtimeCodeReview');
      expect(response.body.data).toHaveProperty('workspaceAnalytics');
    });
  });
});