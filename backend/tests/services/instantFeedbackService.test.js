// Using Jest's built-in expect instead of chai
const sinon = require('sinon');
const instantFeedbackService = require('../../src/services/instantFeedbackService');
const syntaxValidationService = require('../../src/services/syntaxValidationService');
const liveVulnerabilityDetector = require('../../src/services/liveVulnerabilityDetector');
const codeCompletionEngine = require('../../src/services/codeCompletionEngine');
const { setupTestEnvironment, cleanupTestEnvironment, mockContracts, testUtils } = require('../setup');

describe('Instant Feedback Service', () => {
  let syntaxStub;
  let vulnerabilityStub;
  let completionStub;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    syntaxStub = sinon.stub(syntaxValidationService, 'validateSyntax');
    vulnerabilityStub = sinon.stub(liveVulnerabilityDetector, 'performLiveDetection');
    completionStub = sinon.stub(codeCompletionEngine, 'getCompletions');
  });

  afterEach(() => {
    sinon.restore();
    // Cleanup the service to prevent open handles
    if (instantFeedbackService.cleanup) {
      instantFeedbackService.cleanup();
    }
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', async () => {
      await instantFeedbackService.initialize();
      
      const status = instantFeedbackService.getStatus();
      
      expect(status).toHaveProperty('activeSessions');
      expect(status).toHaveProperty('totalFeedbackRequests');
      expect(status).toHaveProperty('averageResponseTime');
      expect(status).toHaveProperty('enabledFeatures');
    });

    it('should initialize with custom configuration', async () => {
      const config = {
        enableSyntaxValidation: true,
        enableVulnerabilityDetection: true,
        enableCodeCompletion: true,
        responseTimeThreshold: 100
      };

      await instantFeedbackService.initialize(config);
      
      const status = instantFeedbackService.getStatus();
      expect(status.enabledFeatures).toContain('syntaxValidation');
      expect(status.enabledFeatures).toContain('vulnerabilityDetection');
    });
  });

  describe('Feedback Session Management', () => {
    beforeEach(async () => {
      await instantFeedbackService.initialize();
    });

    it('should start feedback session', () => {
      const userId = 'test-user-123';
      const sessionConfig = {
        enableSyntaxValidation: true,
        enableVulnerabilityDetection: true,
        enableCodeCompletion: true,
        alertLevel: 'medium'
      };

      const sessionId = instantFeedbackService.startFeedbackSession(userId, sessionConfig);

      expect(sessionId).toEqual(expect.any(String));
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should end feedback session', () => {
      const userId = 'test-user-123';
      
      const sessionId = instantFeedbackService.startFeedbackSession(userId);
      const result = instantFeedbackService.endFeedbackSession(sessionId);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('sessionId', sessionId);
    });

    it('should get session info', () => {
      const userId = 'test-user-123';
      
      const sessionId = instantFeedbackService.startFeedbackSession(userId, {
        enableSyntaxValidation: true
      });
      
      const sessionInfo = instantFeedbackService.getSessionInfo(sessionId);

      expect(sessionInfo).toHaveProperty('userId', userId);
      expect(sessionInfo).toHaveProperty('startedAt');
      expect(sessionInfo).toHaveProperty('configuration');
    });
  });

  describe('Code Change Processing', () => {
    beforeEach(async () => {
      await instantFeedbackService.initialize({
        enableSyntaxValidation: true,
        enableVulnerabilityDetection: true,
        enableCodeCompletion: true
      });
    });

    it('should process code changes with syntax validation', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 5, column: 10 },
        changeType: 'edit'
      };

      syntaxStub.resolves({
        isValid: true,
        errors: [],
        warnings: [
          {
            line: 3,
            column: 5,
            message: 'Consider adding visibility modifier',
            severity: 'warning'
          }
        ]
      });

      const result = await instantFeedbackService.processCodeChange(changeData);

      expect(result).toHaveProperty('instant');
      expect(result.instant).toHaveProperty('syntaxValidation');
      expect(result.instant.syntaxValidation).toHaveProperty('isValid', true);
      expect(result.instant.syntaxValidation.warnings).toHaveLength(1);
    });

    it('should detect syntax errors', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Invalid.sol',
        content: 'invalid solidity code',
        cursorPosition: { line: 1, column: 1 }
      };

      syntaxStub.resolves({
        isValid: false,
        errors: [
          {
            line: 1,
            column: 1,
            message: 'Syntax error: unexpected token',
            severity: 'error',
            code: 'SYNTAX_ERROR'
          }
        ],
        warnings: []
      });

      const result = await instantFeedbackService.processCodeChange(changeData);

      expect(result.instant.syntaxValidation.isValid).toBe(false);
      expect(result.instant.syntaxValidation.errors).toHaveLength(1);
      expect(result.instant.syntaxValidation.errors[0]).toHaveProperty('code', 'SYNTAX_ERROR');
    });

    it('should provide code completion suggestions', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 5, column: 10 },
        triggerCharacter: '.'
      };

      completionStub.resolves({
        suggestions: [
          {
            label: 'transfer',
            kind: 'function',
            detail: 'function transfer(address to, uint256 amount)',
            insertText: 'transfer($1, $2)',
            priority: 8
          }
        ],
        context: 'member_access'
      });

      const result = await instantFeedbackService.processCodeChange(changeData);

      expect(result.instant).toHaveProperty('codeCompletion');
      expect(result.instant.codeCompletion.suggestions).toHaveLength(1);
      expect(result.instant.codeCompletion.suggestions[0]).toHaveProperty('label', 'transfer');
    });

    it('should detect vulnerabilities in real-time', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Vulnerable.sol',
        content: mockContracts.vulnerable,
        cursorPosition: { line: 8, column: 1 }
      };

      vulnerabilityStub.resolves({
        alerts: [
          {
            type: 'vulnerability',
            severity: 'high',
            message: 'Reentrancy vulnerability detected',
            line: 8,
            quickFix: 'Use checks-effects-interactions pattern'
          }
        ]
      });

      const result = await instantFeedbackService.processCodeChange(changeData);

      expect(result.instant).toHaveProperty('vulnerabilityAlerts');
      expect(result.instant.vulnerabilityAlerts).toHaveLength(1);
      expect(result.instant.vulnerabilityAlerts[0]).toHaveProperty('severity', 'high');
    });
  });

  describe('Quick Hints and Tips', () => {
    beforeEach(async () => {
      await instantFeedbackService.initialize();
    });

    it('should provide context-aware hints', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 5, column: 10 }
      };

      const hints = await instantFeedbackService.generateQuickHints(changeData);

      expect(hints).toBeInstanceOf(Array);
      if (hints.length > 0) {
        expect(hints[0]).toHaveProperty('type');
        expect(hints[0]).toHaveProperty('message');
        expect(hints[0]).toHaveProperty('priority');
      }
    });

    it('should provide gas optimization tips', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.complex,
        cursorPosition: { line: 10, column: 5 }
      };

      const tips = await instantFeedbackService.generateGasOptimizationTips(changeData);

      expect(tips).toBeInstanceOf(Array);
      if (tips.length > 0) {
        expect(tips[0]).toHaveProperty('type', 'gas_optimization');
        expect(tips[0]).toHaveProperty('suggestion');
        expect(tips[0]).toHaveProperty('estimatedSavings');
      }
    });

    it('should provide security best practices', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.vulnerable,
        cursorPosition: { line: 8, column: 1 }
      };

      const practices = await instantFeedbackService.generateSecurityTips(changeData);

      expect(practices).toBeInstanceOf(Array);
      if (practices.length > 0) {
        expect(practices[0]).toHaveProperty('type', 'security');
        expect(practices[0]).toHaveProperty('recommendation');
        expect(practices[0]).toHaveProperty('severity');
      }
    });
  });

  describe('Performance and Responsiveness', () => {
    beforeEach(async () => {
      await instantFeedbackService.initialize({
        responseTimeThreshold: 50
      });
    });

    it('should respond within time threshold', async () => {
      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 1, column: 1 }
      };

      syntaxStub.resolves({ isValid: true, errors: [], warnings: [] });

      const startTime = Date.now();
      await instantFeedbackService.processCodeChange(changeData);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(100); // Allow some margin for test execution
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        sessionId: `session-${i}`,
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: i + 1, column: 1 }
      }));

      syntaxStub.resolves({ isValid: true, errors: [], warnings: [] });

      const promises = requests.map(request => 
        instantFeedbackService.processCodeChange(request)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('instant');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await instantFeedbackService.initialize();
    });

    it('should handle syntax validation errors gracefully', async () => {
      syntaxStub.rejects(new Error('Syntax validation service unavailable'));

      const changeData = {
        sessionId: 'session-123',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 1, column: 1 }
      };

      const result = await instantFeedbackService.processCodeChange(changeData);

      expect(result).toHaveProperty('instant');
      expect(result.instant.syntaxValidation).toHaveProperty('error');
    });

    it('should handle invalid session IDs', async () => {
      const changeData = {
        sessionId: 'invalid-session',
        filePath: 'contracts/Token.sol',
        content: mockContracts.simple,
        cursorPosition: { line: 1, column: 1 }
      };

      try {
        await instantFeedbackService.processCodeChange(changeData);
        throw new Error('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Invalid session');
      }
    });
  });
});
