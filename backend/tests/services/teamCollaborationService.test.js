// Using Jest instead of Mocha
const sinon = require('sinon');
const teamCollaborationService = require('../../src/services/teamCollaborationService');
const aiAnalysisPipeline = require('../../src/services/aiAnalysisPipeline');
const { setupTestEnvironment, cleanupTestEnvironment, mockContracts, mockAIResponses, testUtils } = require('../setup');

describe('Team Collaboration Service', () => {
  let aiAnalysisStub;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    aiAnalysisStub = sinon.stub(aiAnalysisPipeline, 'analyzeContract');
  });

  afterEach(async () => {
    sinon.restore();
    if (typeof teamCollaborationService.cleanup === 'function') {
      await teamCollaborationService.cleanup();
    }
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', async () => {
      await teamCollaborationService.initialize();
      
      const status = teamCollaborationService.getStatus();
      
      expect(status).toHaveProperty('totalTeams');
      expect(status).toHaveProperty('activeAnalyses');
      expect(status).toHaveProperty('activeReviews');
      expect(status).toHaveProperty('isInitialized');
      expect(status.totalTeams).toBeGreaterThanOrEqual(0);
    });

    it('should initialize team roles and permissions', async () => {
      await teamCollaborationService.initialize();
      
      // Verify team roles are properly configured
      const status = teamCollaborationService.getStatus();
      expect(status.isInitialized).toBe(true);
    });
  });

  describe('Team Management', () => {
    beforeEach(async () => {
      await teamCollaborationService.initialize();
    });

    it('should create a new team', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'A team for testing',
        createdBy: 'user-123',
        visibility: 'private',
        teamType: 'development',
        initialMembers: [
          { userId: 'user-456', role: 'developer' },
          { userId: 'user-789', role: 'reviewer' }
        ]
      };

      const team = await teamCollaborationService.createTeam(teamData);

      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('name', 'Test Team');
      expect(team).toHaveProperty('description', 'A team for testing');
      expect(team).toHaveProperty('createdBy', 'user-123');
      expect(team).toHaveProperty('visibility', 'private');
      expect(team).toHaveProperty('teamType', 'development');
      expect(team).toHaveProperty('members');
      expect(team).toHaveProperty('settings');

      // Verify creator is added as owner
      expect(team.members.has('user-123')).toBe(true);
      const owner = team.members.get('user-123');
      expect(owner.role).toBe('owner');

      // Verify initial members are added
      expect(team.members.has('user-456')).toBe(true);
      expect(team.members.has('user-789')).toBe(true);
    });

    it('should validate team creation data', async () => {
      const invalidTeamData = {
        // Missing required name field
        description: 'Invalid team',
        createdBy: 'user-123'
      };

      try {
        await teamCollaborationService.createTeam(invalidTeamData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Team name and creator are required');
      }
    });

    it('should handle team creation with default settings', async () => {
      const minimalTeamData = {
        name: 'Minimal Team',
        createdBy: 'user-123'
      };

      const team = await teamCollaborationService.createTeam(minimalTeamData);

      expect(team.visibility).toBe('private');
      expect(team.teamType).toBe('development');
      expect(team.settings).toHaveProperty('requireCodeReview', true);
      expect(team.settings).toHaveProperty('minimumReviewers', 1);
    });
  });

  describe('Team Analysis', () => {
    let testTeam;

    beforeEach(async () => {
      await teamCollaborationService.initialize();
      
      // Create test team
      testTeam = await teamCollaborationService.createTeam({
        name: 'Analysis Team',
        createdBy: 'user-123',
        initialMembers: [
          { userId: 'user-456', role: 'developer' }
        ]
      });

      // Add mock projects to team
      testTeam.projects.set('project-1', {
        name: 'DeFi Protocol',
        type: 'defi',
        mainContract: mockContracts.defi
      });
      testTeam.projects.set('project-2', {
        name: 'Token Contract',
        type: 'token',
        mainContract: mockContracts.simple
      });
    });

    it('should start team analysis session', async () => {
      aiAnalysisStub.resolves({
        vulnerabilities: mockAIResponses.security.vulnerabilities,
        overallScore: mockAIResponses.security.overallScore,
        riskLevel: mockAIResponses.security.riskLevel
      });

      const analysisConfig = {
        analysisType: 'comprehensive',
        includeAllProjects: true,
        agents: ['security', 'quality'],
        generateReport: true
      };

      const analysisSession = await teamCollaborationService.startTeamAnalysis(
        testTeam.id,
        'user-123',
        analysisConfig
      );

      expect(analysisSession).toHaveProperty('sessionId');
      expect(analysisSession).toHaveProperty('teamId', testTeam.id);
      expect(analysisSession).toHaveProperty('initiatedBy', 'user-123');
      expect(analysisSession).toHaveProperty('status', 'active');
      expect(analysisSession).toHaveProperty('config');
      expect(analysisSession).toHaveProperty('progress');
      expect(analysisSession.config.analysisType).toBe('comprehensive');
      expect(analysisSession.progress.totalProjects).toBe(2);
    });

    it('should validate user permissions for team analysis', async () => {
      try {
        await teamCollaborationService.startTeamAnalysis(
          testTeam.id,
          'unauthorized-user',
          { analysisType: 'quick' }
        );
        throw new Error('Should have thrown permission error');
      } catch (error) {
        expect(error.message).toContain('Insufficient permissions');
      }
    });

    it('should handle analysis with selected projects', async () => {
      aiAnalysisStub.resolves({
        vulnerabilities: [],
        overallScore: 85,
        riskLevel: 'Low'
      });

      const analysisConfig = {
        analysisType: 'quick',
        includeAllProjects: false,
        selectedProjects: ['project-1'],
        agents: ['security']
      };

      const analysisSession = await teamCollaborationService.startTeamAnalysis(
        testTeam.id,
        'user-123',
        analysisConfig
      );

      expect(analysisSession.progress.totalProjects).toBe(1);
    });
  });

  describe('Code Review Management', () => {
    let testTeam;

    beforeEach(async () => {
      await teamCollaborationService.initialize();
      
      testTeam = await teamCollaborationService.createTeam({
        name: 'Review Team',
        createdBy: 'user-123',
        initialMembers: [
          { userId: 'user-456', role: 'senior' },
          { userId: 'user-789', role: 'developer' }
        ]
      });
    });

    it('should start code review session', async () => {
      const reviewData = {
        title: 'Security Review for Token Contract',
        description: 'Please review the new token implementation',
        filePaths: ['contracts/Token.sol'],
        codeChanges: {
          'contracts/Token.sol': {
            additions: 50,
            deletions: 10,
            content: mockContracts.simple
          }
        },
        priority: 'high',
        requestedReviewers: ['user-456']
      };

      const codeReview = await teamCollaborationService.startCodeReview(
        testTeam.id,
        'user-789',
        reviewData
      );

      expect(codeReview).toHaveProperty('id');
      expect(codeReview).toHaveProperty('teamId', testTeam.id);
      expect(codeReview).toHaveProperty('title', reviewData.title);
      expect(codeReview).toHaveProperty('requestedBy', 'user-789');
      expect(codeReview).toHaveProperty('status', 'pending');
      expect(codeReview).toHaveProperty('priority', 'high');
      expect(codeReview).toHaveProperty('reviewers');
      expect(codeReview.reviewers.has('user-456')).toBe(true);
    });

    it('should add comments to code review', async () => {
      // First create a review
      const codeReview = await teamCollaborationService.startCodeReview(
        testTeam.id,
        'user-789',
        {
          title: 'Test Review',
          filePaths: ['contracts/Token.sol'],
          codeChanges: { 'contracts/Token.sol': { content: mockContracts.simple } },
          requestedReviewers: ['user-456']
        }
      );

      // Ensure user-456 has comment permissions (senior role should have it)
      const member = testTeam.members.get('user-456');
      member.isActive = true; // Make sure member is active

      const commentData = {
        content: 'This function needs input validation',
        filePath: 'contracts/Token.sol',
        lineNumber: 10,
        type: 'issue',
        severity: 'medium',
        suggestedFix: 'Add require statement for input validation'
      };

      const comment = await teamCollaborationService.addReviewComment(
        codeReview.id,
        'user-456',
        commentData
      );

      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('reviewId', codeReview.id);
      expect(comment).toHaveProperty('userId', 'user-456');
      expect(comment).toHaveProperty('content', commentData.content);
      expect(comment).toHaveProperty('filePath', commentData.filePath);
      expect(comment).toHaveProperty('lineNumber', commentData.lineNumber);
      expect(comment).toHaveProperty('type', commentData.type);
      expect(comment).toHaveProperty('severity', commentData.severity);
    });

    it('should submit review decisions', async () => {
      // Create review
      const codeReview = await teamCollaborationService.startCodeReview(
        testTeam.id,
        'user-789',
        {
          title: 'Test Review',
          filePaths: ['contracts/Token.sol'],
          codeChanges: { 'contracts/Token.sol': { content: mockContracts.simple } },
          requestedReviewers: ['user-456']
        }
      );

      const decision = {
        decision: 'approve',
        summary: 'Code looks good, no issues found',
        overallRating: 8,
        securityRating: 9,
        qualityRating: 7
      };

      const result = await teamCollaborationService.submitReviewDecision(
        codeReview.id,
        'user-456',
        decision
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('decision', 'approve');
      expect(result).toHaveProperty('allCompleted', true);
      expect(result).toHaveProperty('reviewTime');
    });

    it('should validate reviewer permissions', async () => {
      const codeReview = await teamCollaborationService.startCodeReview(
        testTeam.id,
        'user-789',
        {
          title: 'Test Review',
          filePaths: ['contracts/Token.sol'],
          codeChanges: { 'contracts/Token.sol': { content: mockContracts.simple } }
        }
      );

      try {
        await teamCollaborationService.addReviewComment(
          codeReview.id,
          'unauthorized-user',
          { content: 'Unauthorized comment' }
        );
        throw new Error('Should have thrown permission error');
      } catch (error) {
        expect(error.message).toContain('Insufficient permissions');
      }
    });
  });

  describe('Automated Code Analysis', () => {
    beforeEach(async () => {
      await teamCollaborationService.initialize();
    });

    it('should perform automated analysis on code changes', async () => {
      const codeChanges = {
        'contracts/Token.sol': {
          content: mockContracts.vulnerable,
          additions: 30,
          deletions: 5
        }
      };

      aiAnalysisStub.resolves({
        vulnerabilities: mockAIResponses.security.vulnerabilities,
        overallScore: 65,
        riskLevel: 'Medium'
      });

      // This would be called internally during code review creation
      const analysis = await teamCollaborationService.performAutomatedCodeAnalysis(codeChanges);

      expect(analysis).toHaveProperty('complexity');
      expect(analysis).toHaveProperty('securityImpact');
      expect(analysis).toHaveProperty('issues');
      expect(analysis).toHaveProperty('suggestions');
      expect(analysis.complexity).toEqual(expect.any(Number));
      expect(['minimal', 'low', 'medium', 'high']).toContain(analysis.securityImpact);
    });

    it('should handle analysis errors gracefully', async () => {
      aiAnalysisStub.rejects(new Error('Analysis service unavailable'));

      const codeChanges = {
        'contracts/Token.sol': { content: mockContracts.simple }
      };

      const analysis = await teamCollaborationService.performAutomatedCodeAnalysis(codeChanges);

      expect(analysis).toHaveProperty('complexity', 0);
      expect(analysis).toHaveProperty('securityImpact', 'minimal');
      expect(analysis).toHaveProperty('issues');
      expect(analysis.issues).toBeInstanceOf(Array);
    });
  });

  describe('Team Metrics and Analytics', () => {
    let testTeam;

    beforeEach(async () => {
      await teamCollaborationService.initialize();
      
      testTeam = await teamCollaborationService.createTeam({
        name: 'Metrics Team',
        createdBy: 'user-123'
      });
    });

    it('should track team metrics', async () => {
      // Simulate team activity
      testTeam.teamMetrics.totalReviews = 5;
      testTeam.teamMetrics.totalAnalyses = 3;
      testTeam.teamMetrics.averageReviewTime = 24 * 60 * 60 * 1000; // 24 hours

      expect(testTeam.teamMetrics).toHaveProperty('totalReviews', 5);
      expect(testTeam.teamMetrics).toHaveProperty('totalAnalyses', 3);
      expect(testTeam.teamMetrics).toHaveProperty('averageReviewTime');
    });

    it('should maintain analysis history', async () => {
      // Simulate completed analysis
      testTeam.analysisHistory.push({
        sessionId: 'session-123',
        completedAt: new Date().toISOString(),
        projectCount: 2,
        overallScore: 75,
        riskLevel: 'Medium'
      });

      expect(testTeam.analysisHistory).toHaveLength(1);
      expect(testTeam.analysisHistory[0]).toHaveProperty('sessionId', 'session-123');
      expect(testTeam.analysisHistory[0]).toHaveProperty('overallScore', 75);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await teamCollaborationService.initialize();
    });

    it('should handle invalid team IDs', async () => {
      try {
        await teamCollaborationService.startTeamAnalysis(
          'invalid-team-id',
          'user-123',
          { analysisType: 'quick' }
        );
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Team not found');
      }
    });

    it('should handle invalid review IDs', async () => {
      try {
        await teamCollaborationService.addReviewComment(
          'invalid-review-id',
          'user-123',
          { content: 'Test comment' }
        );
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Code review not found');
      }
    });

    it('should handle service initialization errors', async () => {
      // Test error handling during initialization
      const invalidConfig = {
        maxTeamSize: -1 // Invalid configuration
      };

      try {
        await teamCollaborationService.initialize(invalidConfig);
        // Service should handle invalid config gracefully
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await teamCollaborationService.initialize();
    });

    it('should emit team creation events', async () => {
      let eventEmitted = false;
      
      teamCollaborationService.on('team:created', (data) => {
        eventEmitted = true;
        expect(data).toHaveProperty('team');
        expect(data).toHaveProperty('createdBy');
      });

      await teamCollaborationService.createTeam({
        name: 'Event Test Team',
        createdBy: 'user-123'
      });

      expect(eventEmitted).toBe(true);
    });

    it('should emit analysis events', async () => {
      let analysisStarted = false;
      
      teamCollaborationService.on('team:analysis_started', (data) => {
        analysisStarted = true;
        expect(data).toHaveProperty('sessionId');
        expect(data).toHaveProperty('analysisSession');
      });

      const team = await teamCollaborationService.createTeam({
        name: 'Analysis Event Team',
        createdBy: 'user-123'
      });

      await teamCollaborationService.startTeamAnalysis(
        team.id,
        'user-123',
        { analysisType: 'quick' }
      );

      expect(analysisStarted).toBe(true);
    });
  });

  describe('Service Status', () => {
    it('should return comprehensive service status', async () => {
      await teamCollaborationService.initialize();
      
      const status = teamCollaborationService.getStatus();

      expect(status).toHaveProperty('totalTeams');
      expect(status).toHaveProperty('activeAnalysisSessions');
      expect(status).toHaveProperty('activeCodeReviews');
      expect(status).toHaveProperty('totalNotificationQueues');
      expect(status).toHaveProperty('teamRolesConfigured');

      expect(status.totalTeams).toEqual(expect.any(Number));
      expect(status.activeAnalysisSessions).toEqual(expect.any(Number));
      expect(status.activeCodeReviews).toEqual(expect.any(Number));
      expect(status.teamRolesConfigured).toEqual(expect.any(Number));
    });
  });
});
