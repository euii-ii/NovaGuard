const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Instant Feedback Service
 * Provides real-time feedback for code changes
 */
class InstantFeedbackService extends EventEmitter {
  constructor() {
    super();
    this.activeSessions = new Map();
    this.feedbackCache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the instant feedback service
   * @param {Object} config - Service configuration
   */
  async initialize(config = {}) {
    try {
      this.config = {
        debounceDelay: config.debounceDelay || 500,
        enableInstantValidation: config.enableInstantValidation !== false,
        enableSmartSuggestions: config.enableSmartSuggestions !== false,
        enableContextualHelp: config.enableContextualHelp !== false,
        enablePerformanceHints: config.enablePerformanceHints !== false,
        ...config
      };

      this.isInitialized = true;
      logger.info('Instant feedback service initialized', this.config);
    } catch (error) {
      logger.error('Failed to initialize instant feedback service', { error: error.message });
      throw error;
    }
  }

  /**
   * Start feedback session for a user
   * @param {string} userId - User identifier
   * @param {Object} sessionConfig - Session configuration
   * @returns {string} Session ID
   */
  startFeedbackSession(userId, sessionConfig = {}) {
    const sessionId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      sessionId,
      userId,
      startedAt: new Date().toISOString(),
      config: sessionConfig,
      metrics: {
        feedbackCount: 0,
        validationCount: 0,
        suggestionCount: 0
      }
    };

    this.activeSessions.set(sessionId, session);
    
    logger.info('Feedback session started', { userId, sessionId });
    return sessionId;
  }

  /**
   * End feedback session
   * @param {string} sessionId - Session ID
   */
  endFeedbackSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      this.activeSessions.delete(sessionId);
      
      logger.info('Feedback session ended', { 
        sessionId, 
        duration: Date.now() - new Date(session.startedAt).getTime() 
      });
    }
  }

  /**
   * Process code change and provide instant feedback
   * @param {string} sessionId - Session ID
   * @param {Object} changeData - Code change data
   * @returns {Object} Instant feedback
   */
  async processCodeChange(sessionId, changeData) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid session ID');
      }

      const { filePath, content, cursorPosition, changeType, triggerCharacter } = changeData;

      const feedback = {
        instant: {
          syntax: null,
          completion: null,
          quickHints: []
        },
        deferred: {
          analysis: null,
          suggestions: []
        },
        timestamp: new Date().toISOString()
      };

      // Instant syntax validation
      if (this.config.enableInstantValidation) {
        feedback.instant.syntax = await this.validateSyntaxInstant(content);
      }

      // Code completion
      if (cursorPosition && triggerCharacter) {
        feedback.instant.completion = await this.getInstantCompletion(content, cursorPosition, triggerCharacter);
      }

      // Quick hints
      feedback.instant.quickHints = this.getQuickHints(content, changeType);

      session.metrics.feedbackCount++;
      this.emit('feedback:instant', { sessionId, feedback });

      return feedback;

    } catch (error) {
      logger.error('Failed to process code change', { sessionId, error: error.message });
      return {
        instant: { syntax: null, completion: null, quickHints: [] },
        deferred: { analysis: null, suggestions: [] },
        error: error.message
      };
    }
  }

  /**
   * Validate syntax instantly
   * @param {string} content - Code content
   * @returns {Object} Syntax validation result
   */
  async validateSyntaxInstant(content) {
    try {
      // Basic syntax validation
      const errors = [];
      const warnings = [];

      // Check for basic Solidity syntax
      if (!content.includes('pragma solidity')) {
        warnings.push({
          line: 1,
          message: 'Missing pragma directive',
          severity: 'warning'
        });
      }

      // Check for unmatched braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push({
          line: content.split('\n').length,
          message: 'Unmatched braces',
          severity: 'error'
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Instant syntax validation failed', { error: error.message });
      return {
        isValid: false,
        errors: [{ line: 0, message: 'Validation failed', severity: 'error' }],
        warnings: []
      };
    }
  }

  /**
   * Get instant code completion
   * @param {string} content - Code content
   * @param {Object} cursorPosition - Cursor position
   * @param {string} triggerCharacter - Trigger character
   * @returns {Object} Completion suggestions
   */
  async getInstantCompletion(content, cursorPosition, triggerCharacter) {
    try {
      const suggestions = [];

      // Basic Solidity keywords
      const keywords = [
        'function', 'modifier', 'event', 'struct', 'enum', 'contract', 'interface', 'library',
        'public', 'private', 'internal', 'external', 'pure', 'view', 'payable',
        'uint256', 'address', 'bool', 'string', 'bytes32'
      ];

      if (triggerCharacter === '.') {
        // Member access suggestions
        suggestions.push(
          { label: 'call', kind: 'method', detail: 'Low-level call' },
          { label: 'delegatecall', kind: 'method', detail: 'Delegate call' },
          { label: 'transfer', kind: 'method', detail: 'Transfer Ether' },
          { label: 'send', kind: 'method', detail: 'Send Ether' }
        );
      } else {
        // Keyword suggestions
        keywords.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: 'keyword',
            detail: `Solidity ${keyword}`
          });
        });
      }

      return {
        suggestions: suggestions.slice(0, 10), // Limit to 10 suggestions
        context: { triggerCharacter, position: cursorPosition },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Instant completion failed', { error: error.message });
      return { suggestions: [], context: {}, error: error.message };
    }
  }

  /**
   * Get quick hints for code changes
   * @param {string} content - Code content
   * @param {string} changeType - Type of change
   * @returns {Array} Quick hints
   */
  getQuickHints(content, changeType) {
    const hints = [];

    try {
      // Security hints
      if (content.includes('.call(')) {
        hints.push({
          type: 'security',
          message: 'Consider using ReentrancyGuard for external calls',
          severity: 'warning'
        });
      }

      if (content.includes('tx.origin')) {
        hints.push({
          type: 'security',
          message: 'Avoid using tx.origin, use msg.sender instead',
          severity: 'error'
        });
      }

      // Gas optimization hints
      if (content.includes('for (') && content.includes('.length')) {
        hints.push({
          type: 'optimization',
          message: 'Cache array length to save gas',
          severity: 'info'
        });
      }

      // Best practice hints
      if (content.includes('function ') && !content.includes('///')) {
        hints.push({
          type: 'documentation',
          message: 'Consider adding NatSpec documentation',
          severity: 'info'
        });
      }

    } catch (error) {
      logger.error('Failed to generate quick hints', { error: error.message });
    }

    return hints;
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeSessions: this.activeSessions.size,
      cacheSize: this.feedbackCache.size,
      config: this.config
    };
  }

  /**
   * Cleanup service resources
   */
  cleanup() {
    this.activeSessions.clear();
    this.feedbackCache.clear();
    this.removeAllListeners();
    this.isInitialized = false;
    
    logger.info('Instant feedback service cleaned up');
  }
}

module.exports = new InstantFeedbackService();