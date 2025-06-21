const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Real-Time Code Review Service
 * Manages real-time collaborative code review sessions
 */
class RealTimeCodeReviewService extends EventEmitter {
  constructor() {
    super();
    this.reviewSessions = new Map();
    this.reviewTemplates = new Map();
    this.isInitialized = false;
    this.config = {
      maxConcurrentReviews: 10,
      maxParticipants: 8,
      sessionTimeout: 3600000, // 1 hour
      enableAIAssistance: true,
      enableRealTimeComments: true
    };

    this.initializeTemplates();
  }

  /**
   * Initialize review templates
   */
  initializeTemplates() {
    const templates = [
      {
        id: 'security_review',
        name: 'Security Review',
        description: 'Comprehensive security-focused code review',
        estimatedTime: 45,
        checklist: [
          'Access control mechanisms',
          'Input validation',
          'Reentrancy protection',
          'Integer overflow/underflow',
          'External call safety',
          'State variable visibility',
          'Function visibility',
          'Gas optimization opportunities'
        ],
        aiAgents: ['security', 'quality'],
        priority: 'high'
      },
      {
        id: 'quality_review',
        name: 'Code Quality Review',
        description: 'Focus on code quality, maintainability, and best practices',
        estimatedTime: 30,
        checklist: [
          'Code structure and organization',
          'Naming conventions',
          'Documentation quality',
          'Error handling',
          'Code reusability',
          'Performance considerations',
          'Testing coverage'
        ],
        aiAgents: ['quality'],
        priority: 'medium'
      },
      {
        id: 'defi_review',
        name: 'DeFi Protocol Review',
        description: 'Specialized review for DeFi protocols and mechanisms',
        estimatedTime: 60,
        checklist: [
          'Liquidity mechanisms',
          'Price oracle security',
          'Flash loan protection',
          'MEV resistance',
          'Governance mechanisms',
          'Token economics',
          'Cross-protocol interactions'
        ],
        aiAgents: ['security', 'defi', 'economics'],
        priority: 'high'
      },
      {
        id: 'quick_review',
        name: 'Quick Review',
        description: 'Fast review for minor changes and bug fixes',
        estimatedTime: 15,
        checklist: [
          'Syntax correctness',
          'Basic security checks',
          'Logic correctness',
          'Impact assessment'
        ],
        aiAgents: ['quality'],
        priority: 'low'
      }
    ];

    templates.forEach(template => {
      this.reviewTemplates.set(template.id, template);
    });
  }

  /**
   * Initialize the service
   * @param {Object} options - Configuration options
   */
  async initialize(options = {}) {
    try {
      this.config = { ...this.config, ...options };
      this.isInitialized = true;
      
      logger.info('Real-time code review service initialized', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        config: this.config
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize real-time code review service', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Start a real-time review session
   * @param {Object} reviewData - Review session data
   * @returns {Promise<Object>} Review session object
   */
  async startRealtimeReview(reviewData) {
    try {
      const {
        title,
        description,
        codeChanges,
        templateId = 'quality_review',
        priority = 'medium',
        deadline,
        requestedReviewers = [],
        teamId,
        initiatedBy
      } = reviewData;

      if (!title || !codeChanges || !initiatedBy) {
        throw new Error('Title, code changes, and initiator are required');
      }

      if (this.reviewSessions.size >= this.config.maxConcurrentReviews) {
        throw new Error('Maximum concurrent reviews reached');
      }

      const template = this.reviewTemplates.get(templateId);
      if (!template) {
        throw new Error('Invalid review template');
      }

      const sessionId = uuidv4();
      const reviewSession = {
        sessionId,
        title,
        description: description || '',
        codeChanges,
        template,
        priority,
        deadline,
        teamId,
        initiatedBy,
        status: 'active',
        createdAt: new Date().toISOString(),
        participants: new Map([[initiatedBy, { 
          role: 'initiator', 
          joinedAt: new Date().toISOString(),
          status: 'active'
        }]]),
        comments: [],
        checklist: template.checklist.map(item => ({
          id: uuidv4(),
          item,
          completed: false,
          completedBy: null,
          completedAt: null,
          notes: ''
        })),
        aiAnalysis: null,
        metrics: {
          linesChanged: this.calculateLinesChanged(codeChanges),
          filesChanged: Object.keys(codeChanges).length,
          complexity: 'unknown'
        },
        timeline: [{
          event: 'session_created',
          timestamp: new Date().toISOString(),
          userId: initiatedBy,
          data: { templateId, priority }
        }]
      };

      this.reviewSessions.set(sessionId, reviewSession);

      // Start AI analysis if enabled
      if (this.config.enableAIAssistance) {
        this.startAIAnalysis(sessionId, codeChanges, template.aiAgents);
      }

      logger.info('Real-time review session started', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        title,
        templateId,
        initiatedBy
      });

      this.emit('reviewStarted', { sessionId, reviewSession });
      return reviewSession;
    } catch (error) {
      logger.error('Failed to start real-time review', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Join a review session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {Object} userInfo - User information
   * @returns {Promise<Object>} Join result
   */
  async joinReviewSession(sessionId, userId, userInfo = {}) {
    try {
      const session = this.reviewSessions.get(sessionId);
      if (!session) {
        throw new Error('Review session not found');
      }

      if (session.status !== 'active') {
        throw new Error('Review session is not active');
      }

      if (session.participants.size >= this.config.maxParticipants) {
        throw new Error('Review session is full');
      }

      if (session.participants.has(userId)) {
        throw new Error('User already in session');
      }

      session.participants.set(userId, {
        role: 'reviewer',
        joinedAt: new Date().toISOString(),
        status: 'active',
        ...userInfo
      });

      session.timeline.push({
        event: 'participant_joined',
        timestamp: new Date().toISOString(),
        userId,
        data: { participantCount: session.participants.size }
      });

      logger.info('User joined review session', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        userId,
        participantCount: session.participants.size
      });

      this.emit('participantJoined', { sessionId, userId, session });

      return {
        sessionId,
        participantCount: session.participants.size,
        role: 'reviewer',
        session: {
          title: session.title,
          template: session.template.name,
          checklist: session.checklist,
          metrics: session.metrics
        }
      };
    } catch (error) {
      logger.error('Failed to join review session', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add comment to review session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Comment object
   */
  async addComment(sessionId, userId, commentData) {
    try {
      const session = this.reviewSessions.get(sessionId);
      if (!session) {
        throw new Error('Review session not found');
      }

      if (!session.participants.has(userId)) {
        throw new Error('User not in review session');
      }

      const {
        content,
        filePath,
        lineNumber,
        type = 'general',
        severity = 'info',
        suggestedFix
      } = commentData;

      const comment = {
        id: uuidv4(),
        content,
        filePath,
        lineNumber,
        type,
        severity,
        suggestedFix,
        userId,
        createdAt: new Date().toISOString(),
        resolved: false,
        resolvedBy: null,
        resolvedAt: null
      };

      session.comments.push(comment);
      session.timeline.push({
        event: 'comment_added',
        timestamp: new Date().toISOString(),
        userId,
        data: { commentId: comment.id, type, severity }
      });

      logger.info('Comment added to review session', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        commentId: comment.id,
        userId,
        type,
        severity
      });

      this.emit('commentAdded', { sessionId, comment, session });
      return comment;
    } catch (error) {
      logger.error('Failed to add comment', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Complete checklist item
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {string} itemId - Checklist item ID
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated checklist item
   */
  async completeChecklistItem(sessionId, userId, itemId, notes = '') {
    try {
      const session = this.reviewSessions.get(sessionId);
      if (!session) {
        throw new Error('Review session not found');
      }

      if (!session.participants.has(userId)) {
        throw new Error('User not in review session');
      }

      const item = session.checklist.find(item => item.id === itemId);
      if (!item) {
        throw new Error('Checklist item not found');
      }

      item.completed = true;
      item.completedBy = userId;
      item.completedAt = new Date().toISOString();
      item.notes = notes;

      session.timeline.push({
        event: 'checklist_item_completed',
        timestamp: new Date().toISOString(),
        userId,
        data: { itemId, item: item.item }
      });

      logger.info('Checklist item completed', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        itemId,
        userId,
        item: item.item
      });

      this.emit('checklistItemCompleted', { sessionId, item, session });
      return item;
    } catch (error) {
      logger.error('Failed to complete checklist item', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        itemId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Complete review session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {Object} summary - Review summary
   * @returns {Promise<Object>} Completion result
   */
  async completeReview(sessionId, userId, summary) {
    try {
      const session = this.reviewSessions.get(sessionId);
      if (!session) {
        throw new Error('Review session not found');
      }

      if (!session.participants.has(userId)) {
        throw new Error('User not in review session');
      }

      const participant = session.participants.get(userId);
      if (participant.role !== 'initiator') {
        throw new Error('Only session initiator can complete review');
      }

      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      session.completedBy = userId;
      session.summary = summary;

      const completedItems = session.checklist.filter(item => item.completed).length;
      const totalItems = session.checklist.length;
      const completionRate = (completedItems / totalItems) * 100;

      session.metrics.completionRate = completionRate;
      session.metrics.totalComments = session.comments.length;
      session.metrics.duration = Date.now() - new Date(session.createdAt).getTime();

      session.timeline.push({
        event: 'review_completed',
        timestamp: new Date().toISOString(),
        userId,
        data: { completionRate, totalComments: session.comments.length }
      });

      logger.info('Review session completed', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        userId,
        completionRate,
        duration: session.metrics.duration
      });

      this.emit('reviewCompleted', { sessionId, session });
      return {
        sessionId,
        status: 'completed',
        metrics: session.metrics,
        summary: session.summary
      };
    } catch (error) {
      logger.error('Failed to complete review', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start AI analysis for review session
   * @param {string} sessionId - Session ID
   * @param {Object} codeChanges - Code changes
   * @param {Array} agents - AI agents to use
   */
  async startAIAnalysis(sessionId, codeChanges, agents) {
    try {
      // Placeholder for AI analysis integration
      // This would integrate with your existing AI analysis pipeline
      const analysis = {
        status: 'completed',
        agents: agents,
        findings: [],
        suggestions: [],
        completedAt: new Date().toISOString()
      };

      const session = this.reviewSessions.get(sessionId);
      if (session) {
        session.aiAnalysis = analysis;
        session.timeline.push({
          event: 'ai_analysis_completed',
          timestamp: new Date().toISOString(),
          data: { agents, findingsCount: analysis.findings.length }
        });

        this.emit('aiAnalysisCompleted', { sessionId, analysis });
      }
    } catch (error) {
      logger.error('AI analysis failed', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        sessionId,
        error: error.message
      });
    }
  }

  /**
   * Calculate lines changed in code changes
   * @param {Object} codeChanges - Code changes object
   * @returns {number} Number of lines changed
   */
  calculateLinesChanged(codeChanges) {
    let totalLines = 0;
    for (const [filePath, changes] of Object.entries(codeChanges)) {
      if (typeof changes === 'string') {
        totalLines += changes.split('\n').length;
      } else if (changes.content) {
        totalLines += changes.content.split('\n').length;
      }
    }
    return totalLines;
  }

  /**
   * Get review session
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Review session or null
   */
  getReviewSession(sessionId) {
    return this.reviewSessions.get(sessionId) || null;
  }

  /**
   * Get active review sessions
   * @returns {Array} Array of active review sessions
   */
  getActiveReviewSessions() {
    return Array.from(this.reviewSessions.values())
      .filter(session => session.status === 'active');
  }

  /**
   * Get review templates
   * @returns {Array} Array of review templates
   */
  getReviewTemplates() {
    return Array.from(this.reviewTemplates.values());
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeReviews: this.reviewSessions.size,
      maxConcurrentReviews: this.config.maxConcurrentReviews,
      availableTemplates: this.reviewTemplates.size,
      config: this.config
    };
  }

  /**
   * Cleanup service resources
   */
  async cleanup() {
    try {
      this.reviewSessions.clear();
      this.removeAllListeners();
      this.isInitialized = false;
      
      logger.info('Real-time code review service cleaned up', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService'
      });
    } catch (error) {
      logger.error('Failed to cleanup real-time code review service', {
        service: 'smart-contract-auditor',
        component: 'realTimeCodeReviewService',
        error: error.message
      });
    }
  }
}

// Create singleton instance
const realTimeCodeReviewService = new RealTimeCodeReviewService();

module.exports = realTimeCodeReviewService;