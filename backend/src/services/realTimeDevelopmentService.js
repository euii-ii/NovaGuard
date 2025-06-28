const EventEmitter = require('events');
const aiAnalysisPipeline = require('./aiAnalysisPipeline');
const contractParser = require('./contractParser');
const codeCompletionEngine = require('./codeCompletionEngine');
const syntaxValidationService = require('./syntaxValidationService');
const instantFeedbackService = require('./instantFeedbackService');
const liveVulnerabilityDetector = require('./liveVulnerabilityDetector');
const llmService = require('./llmService');
const logger = require('../utils/logger');

/**
 * Real-Time Development Service
 * Provides instant feedback, live code analysis, and development assistance
 */
class RealTimeDevelopmentService extends EventEmitter {
  constructor() {
    super();
    this.activeAnalyses = new Map();
    this.codeCompletionCache = new Map();
    this.syntaxValidationCache = new Map();
    this.liveAnalysisQueue = [];
    this.isProcessing = false;
    this.debounceTimers = new Map();
    this.userPreferences = new Map();
    this.userSessions = new Map(); // Track user development sessions
    this.serviceMetrics = {
      totalCodeChanges: 0,
      totalAnalyses: 0,
      averageResponseTime: 0,
      activeUsers: 0
    };
    this.isInitialized = false;
  }

  /**
   * Initialize real-time development service
   * @param {Object} config - Service configuration
   */
  async initialize(config = {}) {
    try {
      this.config = {
        debounceDelay: config.debounceDelay || 1000, // 1 second
        maxQueueSize: config.maxQueueSize || 100,
        enableSyntaxValidation: config.enableSyntaxValidation !== false,
        enableLiveAnalysis: config.enableLiveAnalysis !== false,
        enableCodeCompletion: config.enableCodeCompletion !== false,
        enableSmartSuggestions: config.enableSmartSuggestions !== false,
        enableInstantFeedback: config.enableInstantFeedback !== false,
        enableLiveVulnerabilityDetection: config.enableLiveVulnerabilityDetection !== false,
        ...config
      };

      // Initialize sub-services
      if (this.config.enableInstantFeedback) {
        try {
          if (typeof instantFeedbackService.initialize === 'function') {
            await instantFeedbackService.initialize({
              debounceDelay: this.config.debounceDelay,
              enableInstantValidation: this.config.enableSyntaxValidation,
              enableSmartSuggestions: this.config.enableSmartSuggestions,
              enableContextualHelp: true,
              enablePerformanceHints: true
            });
            logger.info('Instant feedback service initialized');
          }
        } catch (error) {
          logger.warn('Failed to initialize instant feedback service', { error: error.message });
        }
      }

      // Start processing queue
      this.startQueueProcessor();

      // Set up event listeners for integrated services
      this.setupServiceEventListeners();

      this.isInitialized = true;
      logger.info('Real-Time Development Service initialized', this.config);

    } catch (error) {
      logger.error('Failed to initialize Real-Time Development Service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process code change in real-time
   * @param {Object} changeData - Code change information
   * @returns {Object} Real-time analysis result
   */
  async processCodeChange(changeData) {
    try {
      const {
        userId,
        workspaceId,
        filePath,
        content,
        cursorPosition,
        changeType = 'edit',
        triggerCharacter = null,
        timestamp = new Date().toISOString()
      } = changeData;

      const analysisId = this.generateAnalysisId();

      // Enhanced result structure
      const result = {
        analysisId,
        timestamp,
        instant: {
          syntaxValidation: null,
          codeCompletion: null,
          quickFeedback: null,
          vulnerabilityAlerts: []
        },
        deferred: {
          liveAnalysis: null,
          smartSuggestions: null,
          detailedVulnerabilities: null
        },
        metadata: {
          changeType,
          triggerCharacter,
          processingTime: 0
        }
      };

      const startTime = Date.now();

      // Instant feedback using integrated service
      if (this.config.enableInstantFeedback) {
        const feedbackSessionId = this.getFeedbackSessionId(userId);
        if (feedbackSessionId) {
          try {
            const feedback = await instantFeedbackService.processCodeChange(feedbackSessionId, {
              filePath,
              content,
              cursorPosition,
              changeType,
              triggerCharacter
            });

            if (feedback && feedback.instant) {
              result.instant.syntaxValidation = feedback.instant.syntax;
              result.instant.codeCompletion = feedback.instant.completion;
              result.instant.quickFeedback = feedback.instant.quickHints;
            }
          } catch (error) {
            logger.error('Instant feedback service failed', { error: error.message });
            // Continue with fallback services
          }
        }
      }
      
      // Fallback to individual services if instant feedback is disabled or failed
      if (!this.config.enableInstantFeedback || !result.instant.syntaxValidation) {
        // Fallback to individual services
        if (this.config.enableSyntaxValidation) {
          result.instant.syntaxValidation = await this.validateSyntax(content, filePath);
        }

        if (this.config.enableCodeCompletion && cursorPosition) {
          result.instant.codeCompletion = await this.getCodeCompletion(
            content,
            cursorPosition,
            filePath
          );
        }
      }

      // Live vulnerability detection
      if (this.config.enableLiveVulnerabilityDetection) {
        const detectionSessionId = this.getDetectionSessionId(userId);
        if (detectionSessionId) {
          try {
            const detection = await liveVulnerabilityDetector.performLiveDetection(detectionSessionId, {
              content,
              filePath,
              changeType
            });

            result.instant.vulnerabilityAlerts = detection.alerts;
            result.deferred.detailedVulnerabilities = detection.vulnerabilities;
          } catch (error) {
            logger.error('Live vulnerability detection failed', { error: error.message });
          }
        }
      }

      // Debounced operations
      const debounceKey = `${userId}:${filePath}`;
      this.clearDebounceTimer(debounceKey);

      this.setDebounceTimer(debounceKey, async () => {
        try {
          // Deferred analysis
          if (this.config.enableLiveAnalysis) {
            result.deferred.liveAnalysis = await this.performLiveAnalysis({
              analysisId,
              userId,
              workspaceId,
              filePath,
              content,
              changeType
            });
          }

          // Smart suggestions
          if (this.config.enableSmartSuggestions) {
            result.deferred.smartSuggestions = await this.getSmartSuggestions(
              content,
              cursorPosition,
              filePath,
              userId
            );
          }

          // Emit deferred results
          this.emit('code:analysis_deferred', {
            userId,
            workspaceId,
            filePath,
            analysisId,
            deferred: result.deferred
          });

        } catch (error) {
          logger.error('Deferred analysis failed', { error: error.message });
        }
      });

      result.metadata.processingTime = Date.now() - startTime;

      // Update service metrics
      this.serviceMetrics.totalCodeChanges++;
      this.serviceMetrics.averageResponseTime = 
        (this.serviceMetrics.averageResponseTime + result.metadata.processingTime) / 2;

      this.emit('code:changed', {
        userId,
        workspaceId,
        filePath,
        analysisId,
        result
      });

      return result;

    } catch (error) {
      logger.error('Failed to process code change', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate Solidity syntax in real-time
   * @param {string} content - Contract code
   * @param {string} filePath - File path
   * @returns {Object} Syntax validation result
   */
  async validateSyntax(content, filePath) {
    try {
      // Use enhanced syntax validation service
      return await syntaxValidationService.validateSyntax(content, filePath);
    } catch (error) {
      logger.error('Syntax validation failed', { error: error.message });
      return {
        isValid: false,
        errors: [{
          line: 0,
          column: 0,
          message: 'Syntax validation failed',
          severity: 'error',
          code: 'VALIDATION_ERROR'
        }],
        warnings: [],
        suggestions: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get code completion suggestions
   * @param {string} content - Contract code
   * @param {Object} cursorPosition - Cursor position
   * @param {string} filePath - File path
   * @returns {Object} Code completion suggestions
   */
  async getCodeCompletion(content, cursorPosition, filePath) {
    try {
      // Use enhanced code completion engine
      return await codeCompletionEngine.getCompletions(content, cursorPosition, filePath);
    } catch (error) {
      logger.error('Code completion failed', { error: error.message });
      return {
        suggestions: [],
        context: { type: 'unknown' },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get smart suggestions based on code context
   * @param {string} content - Contract code
   * @param {Object} cursorPosition - Cursor position
   * @param {string} filePath - File path
   * @param {string} userId - User identifier
   * @returns {Object} Smart suggestions
   */
  async getSmartSuggestions(content, cursorPosition, filePath, userId) {
    try {
      const suggestions = {
        security: [],
        optimization: [],
        bestPractices: [],
        patterns: [],
        timestamp: new Date().toISOString()
      };

      // Analyze code for common patterns and issues
      const patterns = this.analyzeCodePatterns(content);

      // Security suggestions
      if (patterns.hasReentrancyRisk) {
        suggestions.security.push({
          type: 'security',
          message: 'Consider using ReentrancyGuard to prevent reentrancy attacks',
          line: patterns.reentrancyLine,
          severity: 'high',
          fix: 'Add "nonReentrant" modifier to external functions'
        });
      }

      if (patterns.hasUncheckedCalls) {
        suggestions.security.push({
          type: 'security',
          message: 'Unchecked external calls detected',
          line: patterns.uncheckedCallLine,
          severity: 'medium',
          fix: 'Check return values of external calls'
        });
      }

      // Gas optimization suggestions
      if (patterns.hasInefficiientLoops) {
        suggestions.optimization.push({
          type: 'gas',
          message: 'Loop can be optimized for gas efficiency',
          line: patterns.loopLine,
          severity: 'low',
          fix: 'Consider caching array length or using different data structure'
        });
      }

      // Best practice suggestions
      if (patterns.missingNatSpec) {
        suggestions.bestPractices.push({
          type: 'documentation',
          message: 'Consider adding NatSpec documentation',
          line: patterns.functionLine,
          severity: 'info',
          fix: 'Add @notice, @param, and @return tags'
        });
      }

      // Pattern suggestions based on user preferences
      const userPrefs = this.userPreferences.get(userId) || {};
      if (userPrefs.suggestDesignPatterns) {
        suggestions.patterns = this.getDesignPatternSuggestions(content, patterns);
      }

      return suggestions;

    } catch (error) {
      logger.error('Smart suggestions failed', { error: error.message });
      return {
        security: [],
        optimization: [],
        bestPractices: [],
        patterns: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Queue live analysis for processing
   * @param {Object} analysisData - Analysis data
   */
  queueLiveAnalysis(analysisData) {
    if (this.liveAnalysisQueue.length >= this.config.maxQueueSize) {
      // Remove oldest item
      this.liveAnalysisQueue.shift();
    }

    this.liveAnalysisQueue.push({
      ...analysisData,
      queuedAt: new Date().toISOString()
    });

    this.processQueue();
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }
    this.queueProcessor = setInterval(() => {
      this.processQueue();
    }, 500); // Process every 500ms
  }

  /**
   * Stop queue processor
   */
  stopQueueProcessor() {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
  }

  /**
   * Process analysis queue
   */
  async processQueue() {
    if (this.isProcessing || this.liveAnalysisQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const analysisData = this.liveAnalysisQueue.shift();
      await this.performLiveAnalysis(analysisData);
    } catch (error) {
      logger.error('Queue processing failed', { error: error.message });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Perform live analysis
   * @param {Object} analysisData - Analysis data
   */
  async performLiveAnalysis(analysisData) {
    try {
      const {
        analysisId,
        userId,
        workspaceId,
        filePath,
        content,
        changeType
      } = analysisData;

      // Quick security analysis using LLM service directly to avoid circular calls
      const quickAnalysis = await llmService.analyzeSecurityVulnerabilities(content, {
        contractName: filePath?.split('/').pop()?.replace('.sol', '') || 'Contract',
        analysisMode: 'quick'
      });

      const result = {
        analysisId,
        type: 'live_analysis',
        filePath,
        quickScan: {
          vulnerabilities: quickAnalysis.vulnerabilities || [],
          overallScore: quickAnalysis.overallScore || 100,
          riskLevel: quickAnalysis.riskLevel || 'Low',
          executionTime: quickAnalysis.metadata?.executionTime || 0
        },
        timestamp: new Date().toISOString()
      };

      this.emit('analysis:completed', {
        userId,
        workspaceId,
        result
      });

      logger.debug('Live analysis completed', {
        analysisId,
        filePath,
        vulnerabilities: result.quickScan.vulnerabilities.length,
        score: result.quickScan.overallScore
      });

    } catch (error) {
      logger.error('Live analysis failed', { 
        analysisId: analysisData.analysisId,
        error: error.message 
      });
    }
  }

  /**
   * Set user preferences for real-time features
   * @param {string} userId - User identifier
   * @param {Object} preferences - User preferences
   */
  setUserPreferences(userId, preferences) {
    this.userPreferences.set(userId, {
      enableLiveAnalysis: preferences.enableLiveAnalysis !== false,
      enableCodeCompletion: preferences.enableCodeCompletion !== false,
      enableSmartSuggestions: preferences.enableSmartSuggestions !== false,
      enableInstantFeedback: preferences.enableInstantFeedback !== false,
      enableLiveVulnerabilityDetection: preferences.enableLiveVulnerabilityDetection !== false,
      suggestDesignPatterns: preferences.suggestDesignPatterns || false,
      analysisAgents: preferences.analysisAgents || ['security'],
      debounceDelay: preferences.debounceDelay || this.config.debounceDelay,
      alertLevel: preferences.alertLevel || 'medium',
      realTimeAlerts: preferences.realTimeAlerts !== false,
      ...preferences
    });

    // Update sub-service sessions if they exist
    this.updateUserSessions(userId, preferences);
  }

  /**
   * Start development session for user
   * @param {string} userId - User identifier
   * @param {Object} sessionConfig - Session configuration
   * @returns {Object} Session information
   */
  startDevelopmentSession(userId, sessionConfig = {}) {
    try {
      const sessionId = this.generateSessionId();

      // Start instant feedback session
      let feedbackSessionId = null;
      if (this.config.enableInstantFeedback) {
        feedbackSessionId = instantFeedbackService.startFeedbackSession(userId, sessionConfig);
      }

      // Start live vulnerability detection session
      let detectionSessionId = null;
      if (this.config.enableLiveVulnerabilityDetection) {
        detectionSessionId = liveVulnerabilityDetector.startDetectionSession(userId, {
          enablePatternDetection: true,
          enableRuleBasedDetection: true,
          enableAIDetection: true,
          alertLevel: sessionConfig.alertLevel || 'high',
          realTimeAlerts: sessionConfig.realTimeAlerts !== false
        });
      }

      const session = {
        sessionId,
        userId,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        feedbackSessionId,
        detectionSessionId,
        config: sessionConfig,
        metrics: {
          codeChanges: 0,
          analyses: 0,
          completions: 0,
          validations: 0
        }
      };

      this.userSessions.set(sessionId, session);
      this.serviceMetrics.activeUsers = this.userSessions.size;

      logger.info('Development session started', {
        userId,
        feedbackSessionId,
        detectionSessionId
      });

      this.emit('session:started', { userId, sessionId, session });

      return {
        sessionId,
        feedbackSessionId,
        detectionSessionId,
        config: sessionConfig
      };

    } catch (error) {
      logger.error('Failed to start development session', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * End development session for user
   * @param {string} userId - User identifier
   * @returns {Object} Session metrics
   */
  endDevelopmentSession(userId) {
    try {
      const session = Array.from(this.userSessions.values())
        .find(s => s.userId === userId);

      if (!session) {
        return null;
      }

      const duration = Date.now() - new Date(session.startedAt).getTime();

      // End sub-service sessions
      if (session.feedbackSessionId) {
        instantFeedbackService.endFeedbackSession(session.feedbackSessionId);
      }

      if (session.detectionSessionId) {
        liveVulnerabilityDetector.endDetectionSession(session.detectionSessionId);
      }

      this.userSessions.delete(session.sessionId);
      this.serviceMetrics.activeUsers = this.userSessions.size;

      const metrics = {
        ...session.metrics,
        duration,
        endedAt: new Date().toISOString()
      };

      logger.info('Development session ended', {
        userId,
        duration
      });

      this.emit('session:ended', { userId, sessionId: session.sessionId, metrics });

      return metrics;

    } catch (error) {
      logger.error('Failed to end development session', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get feedback session ID for user
   * @param {string} userId - User identifier
   * @returns {string|null} Feedback session ID
   */
  getFeedbackSessionId(userId) {
    const session = Array.from(this.userSessions.values())
      .find(s => s.userId === userId);
    return session?.feedbackSessionId || null;
  }

  /**
   * Get detection session ID for user
   * @param {string} userId - User identifier
   * @returns {string|null} Detection session ID
   */
  getDetectionSessionId(userId) {
    const session = Array.from(this.userSessions.values())
      .find(s => s.userId === userId);
    return session?.detectionSessionId || null;
  }

  /**
   * Update user sessions with new preferences
   * @param {string} userId - User identifier
   * @param {Object} preferences - User preferences
   */
  updateUserSessions(userId, preferences) {
    const session = Array.from(this.userSessions.values())
      .find(s => s.userId === userId);

    if (session) {
      session.config = { ...session.config, ...preferences };
      session.lastActivity = new Date().toISOString();
    }
  }

  /**
   * Analyze code patterns
   * @param {string} content - Contract code
   * @returns {Object} Pattern analysis
   */
  analyzeCodePatterns(content) {
    const patterns = {
      hasReentrancyRisk: false,
      hasUncheckedCalls: false,
      hasInefficiientLoops: false,
      missingNatSpec: false,
      reentrancyLine: 0,
      uncheckedCallLine: 0,
      loopLine: 0,
      functionLine: 0
    };

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for reentrancy patterns
      if (line.includes('.call(') && !line.includes('require(')) {
        patterns.hasReentrancyRisk = true;
        patterns.reentrancyLine = lineNumber;
      }

      // Check for unchecked calls
      if (line.includes('.call(') || line.includes('.send(') || line.includes('.transfer(')) {
        patterns.hasUncheckedCalls = true;
        patterns.uncheckedCallLine = lineNumber;
      }

      // Check for inefficient loops
      if (line.includes('for (') && line.includes('.length')) {
        patterns.hasInefficiientLoops = true;
        patterns.loopLine = lineNumber;
      }

      // Check for missing NatSpec
      if (line.includes('function ') && !lines[index - 1]?.includes('///')) {
        patterns.missingNatSpec = true;
        patterns.functionLine = lineNumber;
      }
    });

    return patterns;
  }

  /**
   * Get design pattern suggestions
   * @param {string} content - Contract code
   * @param {Object} patterns - Code patterns
   * @returns {Array} Design pattern suggestions
   */
  getDesignPatternSuggestions(content, patterns) {
    const suggestions = [];

    if (patterns.hasReentrancyRisk) {
      suggestions.push({
        pattern: 'ReentrancyGuard',
        description: 'Use OpenZeppelin ReentrancyGuard to prevent reentrancy attacks',
        implementation: 'Add "nonReentrant" modifier to vulnerable functions'
      });
    }

    if (content.includes('mapping(') && content.includes('struct')) {
      suggestions.push({
        pattern: 'Factory Pattern',
        description: 'Consider using factory pattern for creating multiple instances',
        implementation: 'Create a factory contract to manage instances'
      });
    }

    return suggestions;
  }

  /**
   * Setup service event listeners
   */
  setupServiceEventListeners() {
    // Listen to instant feedback events
    if (this.config.enableInstantFeedback) {
      instantFeedbackService.on('feedback:instant', (data) => {
        this.emit('feedback:instant', data);
      });

      instantFeedbackService.on('feedback:deferred', (data) => {
        this.emit('feedback:deferred', data);
      });
    }

    // Listen to vulnerability detection events
    if (this.config.enableLiveVulnerabilityDetection) {
      liveVulnerabilityDetector.on('detection:alerts', (data) => {
        this.emit('vulnerability:alerts', data);
      });

      liveVulnerabilityDetector.on('detection:completed', (data) => {
        this.emit('vulnerability:completed', data);
      });
    }
  }

  /**
   * Clear debounce timer
   * @param {string} key - Timer key
   */
  clearDebounceTimer(key) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
      this.debounceTimers.delete(key);
    }
  }

  /**
   * Set debounce timer
   * @param {string} key - Timer key
   * @param {Function} callback - Callback function
   */
  setDebounceTimer(key, callback) {
    const timer = setTimeout(callback, this.config.debounceDelay);
    this.debounceTimers.set(key, timer);
  }

  /**
   * Generate unique analysis ID
   * @returns {string} Analysis ID
   */
  generateAnalysisId() {
    return `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `dev_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear caches
   */
  clearCaches() {
    this.codeCompletionCache.clear();
    this.syntaxValidationCache.clear();
    logger.info('Real-time development service caches cleared');
  }

  /**
   * Get user preferences
   * @param {string} userId - User identifier
   * @returns {Object} User preferences
   */
  getUserPreferences(userId) {
    return this.userPreferences.get(userId) || {};
  }

  /**
   * Get active sessions
   * @returns {Array} Active sessions
   */
  getActiveSessions() {
    return Array.from(this.userSessions.values());
  }

  /**
   * Get session by user ID
   * @param {string} userId - User identifier
   * @returns {Object|null} User session
   */
  getSessionByUserId(userId) {
    return Array.from(this.userSessions.values())
      .find(session => session.userId === userId) || null;
  }

  /**
   * Helper methods
   */
  generateCacheKey(content) {
    return require('crypto').createHash('md5').update(content).digest('hex');
  }

  analyzeCompletionContext(textBefore, textAfter) {
    // Simplified context analysis
    if (textBefore.includes('function ')) {
      return { type: 'function_call', partial: textBefore.split(' ').pop() };
    } else if (textBefore.includes('.')) {
      return { type: 'member_access', object: textBefore.split('.')[0] };
    } else if (/\b(uint|int|bool|address|string)\s*$/.test(textBefore)) {
      return { type: 'type', partial: textBefore.trim() };
    } else {
      return { type: 'keyword', partial: textBefore.split(/\s+/).pop() };
    }
  }

  // Placeholder methods for completion suggestions
  getFunctionCompletions(content, context) { return []; }
  getVariableCompletions(content, context) { return []; }
  getTypeCompletions(context) { return []; }
  getKeywordCompletions(context) { return []; }
  getSmartContractCompletions(content, context) { return []; }
  getBasicSyntaxSuggestions(content) { return []; }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      activeAnalyses: this.activeAnalyses.size,
      queueSize: this.liveAnalysisQueue.length,
      isProcessing: this.isProcessing,
      cacheSize: this.codeCompletionCache.size + this.syntaxValidationCache.size,
      activeUsers: this.userPreferences.size,
      activeSessions: this.userSessions.size,
      serviceMetrics: this.serviceMetrics,
      subServices: {
        instantFeedback: this.config.enableInstantFeedback ? instantFeedbackService.getStatus() : null,
        liveVulnerabilityDetection: this.config.enableLiveVulnerabilityDetection ? liveVulnerabilityDetector.getStatus() : null,
        codeCompletion: codeCompletionEngine.getStats(),
        syntaxValidation: syntaxValidationService.getStats()
      }
    };
  }

  /**
   * Cleanup service resources
   */
  cleanup() {
    this.stopQueueProcessor();
    this.clearCaches();
    
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // End all active sessions
    this.userSessions.forEach((session, sessionId) => {
      if (session.feedbackSessionId) {
        try {
          instantFeedbackService.endFeedbackSession(session.feedbackSessionId);
        } catch (error) {
          logger.error('Error ending feedback session', { error: error.message });
        }
      }
      
      if (session.detectionSessionId) {
        try {
          liveVulnerabilityDetector.endDetectionSession(session.detectionSessionId);
        } catch (error) {
          logger.error('Error ending detection session', { error: error.message });
        }
      }
    });
    
    this.userSessions.clear();
    this.userPreferences.clear();
    this.activeAnalyses.clear();
    this.liveAnalysisQueue.length = 0;
    
    logger.info('Real-time development service cleaned up');
  }
}

module.exports = new RealTimeDevelopmentService();
