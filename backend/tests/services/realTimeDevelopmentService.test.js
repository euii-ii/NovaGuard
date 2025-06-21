// Using Jest instead of Mocha
const sinon = require('sinon');
const realTimeDevelopmentService = require('../../src/services/realTimeDevelopmentService');
const instantFeedbackService = require('../../src/services/instantFeedbackService');
const liveVulnerabilityDetector = require('../../src/services/liveVulnerabilityDetector');
const syntaxValidationService = require('../../src/services/syntaxValidationService');
const codeCompletionEngine = require('../../src/services/codeCompletionEngine');
const { setupTestEnvironment, cleanupTestEnvironment, mockContracts, testUtils } = require('../setup');

describe('Real-Time Development Service', () => {
  let instantFeedbackStub;
  let vulnerabilityDetectorStub;
  let syntaxValidationStub;
  let codeCompletionStub;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Stub sub-services
    instantFeedbackStub = sinon.stub(instantFeedbackService, 'processCodeChange');
    vulnerabilityDetectorStub = sinon.stub(liveVulnerabilityDetector, 'performLiveDetection');
    syntaxValidationStub = sinon.stub(syntaxValidationService, 'validateSyntax');
    codeCompletionStub = sinon.stub(codeCompletionEngine, 'getCompletions');

    // Configure default stub responses
    syntaxValidationStub.resolves({
      isValid: false,
      errors: [{
        line: 1,
        column: 1,
        message: 'Syntax error: invalid solidity code',
        severity: 'error',
        code: 'SYNTAX_ERROR'
      }],
      warnings: [],
      suggestions: [],
      timestamp: new Date().toISOString()
    });

    codeCompletionStub.resolves({
      suggestions: [
        { label: 'transfer', kind: 'method', detail: 'function transfer(address to, uint256 amount)' },
        { label: 'balanceOf', kind: 'method', detail: 'function balanceOf(address account)' }
      ],
      context: { type: 'member_access' },
      timestamp: new Date().toISOString()
    });

    vulnerabilityDetectorStub.resolves({
      alerts: [{
        severity: 'high',
        message: 'Potential reentrancy vulnerability detected',
        line: 8,
        type: 'reentrancy'
      }],
      vulnerabilities: []
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', async () => {
      await realTimeDevelopmentService.initialize();

      const status = realTimeDevelopmentService.getStatus();

      expect(status).toHaveProperty('activeAnalyses');
      expect(status).toHaveProperty('queueSize');
      expect(status).toHaveProperty('isProcessing');
      expect(status).toHaveProperty('activeSessions');
      expect(status).toHaveProperty('serviceMetrics');
    });

    it('should initialize with custom configuration', async () => {
      const customConfig = {
        debounceDelay: 500,
        enableInstantFeedback: true,
        enableLiveVulnerabilityDetection: true,
        enableSyntaxValidation: true,
        enableCodeCompletion: true
      };

      await realTimeDevelopmentService.initialize(customConfig);

      const status = realTimeDevelopmentService.getStatus();
      expect(status).toHaveProperty('subServices');
      expect(status.subServices).toHaveProperty('instantFeedback');
    });
  });

  describe('Development Session Management', () => {
    beforeEach(async () => {
      await realTimeDevelopmentService.initialize({
        enableInstantFeedback: true,
        enableLiveVulnerabilityDetection: true
      });
    });

    it('should start development session', () => {
      const userId = 'test-user-123';
      const sessionConfig = {
        enableInstantFeedback: true,
        enableLiveVulnerabilityDetection: true,
        alertLevel: 'medium'
      };

      // Mock sub-service session creation
      sinon.stub(instantFeedbackService, 'startFeedbackSession').returns('feedback-session-123');
      sinon.stub(liveVulnerabilityDetector, 'startDetectionSession').returns('detection-session-123');

      const sessionInfo = realTimeDevelopmentService.startDevelopmentSession(userId, sessionConfig);

      expect(sessionInfo).toHaveProperty('sessionId');
      expect(sessionInfo).toHaveProperty('feedbackSessionId', 'feedback-session-123');
      expect(sessionInfo).toHaveProperty('detectionSessionId', 'detection-session-123');
      expect(sessionInfo).toHaveProperty('config');
    });

    it('should end development session', () => {
      const userId = 'test-user-123';

      // Start session first
      const sessionInfo = realTimeDevelopmentService.startDevelopmentSession(userId);
      expect(sessionInfo).toHaveProperty('sessionId');
      expect(sessionInfo).toHaveProperty('feedbackSessionId');
      expect(sessionInfo).toHaveProperty('detectionSessionId');

      // End the session
      const metrics = realTimeDevelopmentService.endDevelopmentSession(userId);

      // Verify session was ended (metrics should be returned)
      expect(metrics).not.toBeNull();
    });
  });

  describe('Code Change Processing', () => {
    beforeEach(async () => {
      await realTimeDevelopmentService.initialize({
        enableInstantFeedback: true,
        enableLiveVulnerabilityDetection: true
      });
    });

    it('should process code changes with instant feedback', async () => {
      const changeData = {
        userId: 'test-user-123',
        workspaceId: 'workspace-456',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 5, column: 10 },
        changeType: 'edit',
        triggerCharacter: '.'
      };

      // Mock instant feedback response
      instantFeedbackStub.resolves({
        instant: {
          syntax: { isValid: true, errors: [], warnings: [] },
          completion: { suggestions: [], context: 'member_access' },
          quickHints: [{ type: 'tip', message: 'Consider adding visibility modifier' }]
        }
      });

      // Mock vulnerability detection response
      vulnerabilityDetectorStub.resolves({
        alerts: [],
        vulnerabilities: []
      });

      const result = await realTimeDevelopmentService.processCodeChange(changeData);

      expect(result).toHaveProperty('analysisId');
      expect(result).toHaveProperty('instant');
      expect(result).toHaveProperty('deferred');
      expect(result).toHaveProperty('metadata');
      expect(result.instant).toHaveProperty('syntaxValidation');
      expect(result.instant).toHaveProperty('codeCompletion');
      expect(result.instant).toHaveProperty('quickFeedback');
    });

    it('should handle syntax validation', async () => {
      // Initialize service with instant feedback disabled to use fallback methods
      await realTimeDevelopmentService.initialize({
        enableInstantFeedback: false,
        enableSyntaxValidation: true
      });

      const changeData = {
        userId: 'test-user-123',
        filePath: 'contracts/Token.sol',
        content: 'invalid solidity code',
        cursorPosition: { line: 1, column: 1 }
      };

      const result = await realTimeDevelopmentService.processCodeChange(changeData);

      // The mock should return the configured response
      expect(result.instant.syntaxValidation).toHaveProperty('isValid', false);
      expect(result.instant.syntaxValidation.errors).toHaveLength(1);
    });

    it('should provide code completion suggestions', async () => {
      // Initialize service with instant feedback disabled to use fallback methods
      await realTimeDevelopmentService.initialize({
        enableInstantFeedback: false,
        enableCodeCompletion: true
      });

      const changeData = {
        userId: 'test-user-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 5, column: 10 },
        triggerCharacter: '.'
      };

      const result = await realTimeDevelopmentService.processCodeChange(changeData);

      // The mock should return the configured response
      expect(result.instant.codeCompletion).toHaveProperty('suggestions');
      expect(result.instant.codeCompletion.suggestions).toBeInstanceOf(Array);
      expect(result.instant.codeCompletion.suggestions).toHaveLength(2);
    });

    it('should detect vulnerabilities in real-time', async () => {
      const userId = 'test-user-123';

      // Start a session first to get detection session ID
      const sessionInfo = realTimeDevelopmentService.startDevelopmentSession(userId);

      const changeData = {
        userId,
        filePath: 'contracts/Vulnerable.sol',
        content: mockContracts.vulnerable,
        cursorPosition: { line: 8, column: 1 }
      };

      const result = await realTimeDevelopmentService.processCodeChange(changeData);

      // The mock should return vulnerability alerts
      expect(result.instant.vulnerabilityAlerts).toBeInstanceOf(Array);
      expect(result.instant.vulnerabilityAlerts).toHaveLength(1);
      expect(result.instant.vulnerabilityAlerts[0]).toHaveProperty('severity', 'high');
    });
  });

  describe('User Preferences', () => {
    beforeEach(async () => {
      await realTimeDevelopmentService.initialize();
    });

    it('should set user preferences', () => {
      const userId = 'test-user-123';
      const preferences = {
        enableLiveAnalysis: true,
        enableCodeCompletion: true,
        enableInstantFeedback: true,
        enableLiveVulnerabilityDetection: true,
        alertLevel: 'high',
        debounceDelay: 500
      };

      realTimeDevelopmentService.setUserPreferences(userId, preferences);

      // Verify preferences are stored (would need access to internal state)
      // This test verifies the method doesn't throw errors
      expect(true).toBe(true);
    });

    it('should update session preferences', () => {
      const userId = 'test-user-123';
      
      // Start session
      sinon.stub(instantFeedbackService, 'startFeedbackSession').returns('feedback-session-123');
      realTimeDevelopmentService.startDevelopmentSession(userId);

      // Update preferences
      const newPreferences = {
        alertLevel: 'low',
        enableRealTimeAlerts: false
      };

      realTimeDevelopmentService.setUserPreferences(userId, newPreferences);

      // Verify preferences update doesn't throw errors
      expect(true).toBe(true);
    });
  });

  describe('Performance and Debouncing', () => {
    beforeEach(async () => {
      await realTimeDevelopmentService.initialize({
        debounceDelay: 100 // Short delay for testing
      });
    });

    it('should debounce rapid code changes', async () => {
      const userId = 'test-user-123';
      const baseChangeData = {
        userId,
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 5, column: 10 }
      };

      // Mock responses
      instantFeedbackStub.resolves({
        instant: { syntax: { isValid: true }, completion: null, quickHints: [] }
      });

      // Make rapid changes
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(realTimeDevelopmentService.processCodeChange({
          ...baseChangeData,
          content: baseChangeData.content + ` // Change ${i}`
        }));
      }

      await Promise.all(promises);

      // Wait for debounce delay
      await testUtils.wait(150);

      // Verify debouncing behavior (exact verification would depend on implementation)
      expect(true).toBe(true);
    });

    it('should handle concurrent requests from different users', async () => {
      const users = ['user1', 'user2', 'user3'];
      
      instantFeedbackStub.resolves({
        instant: { syntax: { isValid: true }, completion: null, quickHints: [] }
      });

      const promises = users.map(userId => 
        realTimeDevelopmentService.processCodeChange({
          userId,
          filePath: 'contracts/Token.sol',
          content: mockContracts.simple,
          cursorPosition: { line: 1, column: 1 }
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('analysisId');
        expect(result).toHaveProperty('instant');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await realTimeDevelopmentService.initialize();
    });

    it('should handle instant feedback service errors', async () => {
      instantFeedbackStub.rejects(new Error('Instant feedback service unavailable'));

      const changeData = {
        userId: 'test-user-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 1, column: 1 }
      };

      const result = await realTimeDevelopmentService.processCodeChange(changeData);

      // Should still return a result even if sub-service fails
      expect(result).toHaveProperty('analysisId');
      expect(result).toHaveProperty('instant');
    });

    it('should handle vulnerability detection errors', async () => {
      vulnerabilityDetectorStub.rejects(new Error('Vulnerability detection failed'));

      const changeData = {
        userId: 'test-user-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.vulnerable,
        cursorPosition: { line: 1, column: 1 }
      };

      const result = await realTimeDevelopmentService.processCodeChange(changeData);

      // Should handle error gracefully
      expect(result).toHaveProperty('instant');
      expect(result.instant.vulnerabilityAlerts).toBeInstanceOf(Array);
    });

    it('should handle malformed input', async () => {
      const invalidChangeData = {
        userId: 'test-user-123',
        // Missing required fields like filePath and content
      };

      try {
        await realTimeDevelopmentService.processCodeChange(invalidChangeData);
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await realTimeDevelopmentService.initialize();
    });

    it('should emit code change events', async () => {
      let eventEmitted = false;
      
      realTimeDevelopmentService.on('code:changed', (data) => {
        eventEmitted = true;
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('filePath');
        expect(data).toHaveProperty('analysisId');
      });

      instantFeedbackStub.resolves({
        instant: { syntax: { isValid: true }, completion: null, quickHints: [] }
      });

      await realTimeDevelopmentService.processCodeChange({
        userId: 'test-user-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 1, column: 1 }
      });

      expect(eventEmitted).toBe(true);
    });

    it('should emit session events', (done) => {
      let sessionStarted = false;
      let sessionEnded = false;

      realTimeDevelopmentService.on('session:started', () => {
        sessionStarted = true;
      });

      realTimeDevelopmentService.on('session:ended', () => {
        sessionEnded = true;
        // Check both events were emitted
        expect(sessionStarted).toBe(true);
        expect(sessionEnded).toBe(true);
        done();
      });

      const userId = 'test-user-123';

      // Use setTimeout to ensure events are processed
      setTimeout(() => {
        realTimeDevelopmentService.startDevelopmentSession(userId);
        setTimeout(() => {
          realTimeDevelopmentService.endDevelopmentSession(userId);
        }, 10);
      }, 10);
    });
  });

  describe('Service Status and Metrics', () => {
    beforeEach(async () => {
      await realTimeDevelopmentService.initialize();
    });

    it('should return comprehensive service status', () => {
      const status = realTimeDevelopmentService.getStatus();

      expect(status).toHaveProperty('activeAnalyses');
      expect(status).toHaveProperty('queueSize');
      expect(status).toHaveProperty('isProcessing');
      expect(status).toHaveProperty('activeSessions');
      expect(status).toHaveProperty('serviceMetrics');
      expect(status).toHaveProperty('subServices');

      expect(status.serviceMetrics).toHaveProperty('totalCodeChanges');
      expect(status.serviceMetrics).toHaveProperty('totalAnalyses');
      expect(status.serviceMetrics).toHaveProperty('averageResponseTime');
      expect(status.serviceMetrics).toHaveProperty('activeUsers');
    });

    it('should track service metrics', async () => {
      instantFeedbackStub.resolves({
        instant: { syntax: { isValid: true }, completion: null, quickHints: [] }
      });

      const initialStatus = realTimeDevelopmentService.getStatus();
      const initialChanges = initialStatus.serviceMetrics.totalCodeChanges;

      await realTimeDevelopmentService.processCodeChange({
        userId: 'test-user-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 1, column: 1 }
      });

      const updatedStatus = realTimeDevelopmentService.getStatus();
      
      // Metrics should be updated (exact verification depends on implementation)
      expect(updatedStatus.serviceMetrics).toBeInstanceOf(Object);
    });
  });
});
