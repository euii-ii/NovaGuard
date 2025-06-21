const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Team Collaboration Service
 * Manages team-based collaborative development and code reviews
 */
class TeamCollaborationService extends EventEmitter {
  constructor() {
    super();
    this.teams = new Map();
    this.activeAnalyses = new Map();
    this.codeReviews = new Map();
    this.isInitialized = false;
    this.config = {
      maxTeamSize: 50,
      maxConcurrentReviews: 10,
      enableRealTimeNotifications: true,
      enableTeamAnalytics: true,
      autoAssignReviewers: true
    };
  }

  /**
   * Initialize the team collaboration service
   * @param {Object} options - Configuration options
   */
  async initialize(options = {}) {
    try {
      this.config = { ...this.config, ...options };
      this.isInitialized = true;
      
      logger.info('Team collaboration service initialized', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        config: this.config
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize team collaboration service', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Create a new team
   * @param {Object} teamData - Team creation data
   * @returns {Promise<Object>} Created team object
   */
  async createTeam(teamData) {
    try {
      const { name, description, createdBy, settings = {} } = teamData;
      
      if (!name || !createdBy) {
        throw new Error('Team name and creator are required');
      }

      const teamId = uuidv4();
      const team = {
        id: teamId,
        name,
        description: description || '',
        createdBy,
        createdAt: new Date().toISOString(),
        members: new Map([[createdBy, { role: 'owner', joinedAt: new Date().toISOString() }]]),
        settings: {
          requireCodeReview: true,
          autoAssignReviewers: this.config.autoAssignReviewers,
          ...settings
        },
        stats: {
          totalAnalyses: 0,
          totalReviews: 0,
          activeMembers: 1
        }
      };

      this.teams.set(teamId, team);

      logger.info('Team created successfully', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        teamId,
        teamName: name,
        createdBy
      });

      this.emit('teamCreated', { team });
      return team;
    } catch (error) {
      logger.error('Failed to create team', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add member to team
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID to add
   * @param {string} role - Member role
   * @returns {Promise<Object>} Updated team object
   */
  async addTeamMember(teamId, userId, role = 'member') {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (team.members.size >= this.config.maxTeamSize) {
        throw new Error('Team has reached maximum size');
      }

      team.members.set(userId, {
        role,
        joinedAt: new Date().toISOString()
      });

      team.stats.activeMembers = team.members.size;

      logger.info('Team member added', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        teamId,
        userId,
        role
      });

      this.emit('memberAdded', { teamId, userId, role });
      return team;
    } catch (error) {
      logger.error('Failed to add team member', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start team analysis session
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID starting the analysis
   * @param {Object} analysisConfig - Analysis configuration
   * @returns {Promise<Object>} Analysis session object
   */
  async startTeamAnalysis(teamId, userId, analysisConfig) {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const sessionId = uuidv4();
      const analysisSession = {
        sessionId,
        teamId,
        status: 'active',
        startedAt: new Date().toISOString(),
        config: {
          analysisType: 'comprehensive',
          includeAllMembers: true,
          ...analysisConfig
        },
        progress: {
          totalProjects: analysisConfig.projects?.length || 0,
          analyzedProjects: 0,
          currentProject: null
        },
        results: [],
        participants: Array.from(team.members.keys())
      };

      this.activeAnalyses.set(sessionId, analysisSession);
      team.stats.totalAnalyses++;

      logger.info('Team analysis started', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        sessionId,
        teamId,
        participants: analysisSession.participants.length
      });

      this.emit('analysisStarted', { sessionId, teamId, analysisSession });
      return analysisSession;
    } catch (error) {
      logger.error('Failed to start team analysis', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start code review session
   * @param {string} teamId - Team ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} Code review object
   */
  async startCodeReview(teamId, reviewData) {
    try {
      const team = this.teams.get(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (this.codeReviews.size >= this.config.maxConcurrentReviews) {
        throw new Error('Maximum concurrent reviews reached');
      }

      const reviewId = uuidv4();
      const { title, description, code, author, requestedReviewers = [] } = reviewData;

      // Auto-assign reviewers if enabled and none specified
      let reviewers = new Map();
      if (requestedReviewers.length > 0) {
        requestedReviewers.forEach(userId => {
          if (team.members.has(userId)) {
            reviewers.set(userId, { status: 'pending', assignedAt: new Date().toISOString() });
          }
        });
      } else if (this.config.autoAssignReviewers) {
        // Auto-assign available team members (excluding author)
        const availableReviewers = Array.from(team.members.keys())
          .filter(userId => userId !== author)
          .slice(0, 2); // Assign up to 2 reviewers

        availableReviewers.forEach(userId => {
          reviewers.set(userId, { status: 'pending', assignedAt: new Date().toISOString() });
        });
      }

      const codeReview = {
        id: reviewId,
        teamId,
        title,
        description: description || '',
        code,
        author,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewers,
        comments: [],
        metrics: {
          linesChanged: code ? code.split('\n').length : 0,
          complexity: 'unknown'
        },
        timeline: [{
          event: 'created',
          timestamp: new Date().toISOString(),
          userId: author
        }]
      };

      this.codeReviews.set(reviewId, codeReview);
      team.stats.totalReviews++;

      logger.info('Code review started', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        reviewId,
        teamId,
        author,
        reviewersCount: reviewers.size
      });

      this.emit('reviewStarted', { reviewId, teamId, codeReview });
      return codeReview;
    } catch (error) {
      logger.error('Failed to start code review', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get team by ID
   * @param {string} teamId - Team ID
   * @returns {Object|null} Team object or null if not found
   */
  getTeam(teamId) {
    return this.teams.get(teamId) || null;
  }

  /**
   * Get teams for user
   * @param {string} userId - User ID
   * @returns {Array} Array of teams the user belongs to
   */
  getUserTeams(userId) {
    const userTeams = [];
    for (const [teamId, team] of this.teams) {
      if (team.members.has(userId)) {
        userTeams.push({
          ...team,
          members: Array.from(team.members.entries()).map(([id, data]) => ({ id, ...data }))
        });
      }
    }
    return userTeams;
  }

  /**
   * Get active analysis sessions
   * @param {string} teamId - Optional team ID filter
   * @returns {Array} Array of active analysis sessions
   */
  getActiveAnalyses(teamId = null) {
    const analyses = Array.from(this.activeAnalyses.values());
    return teamId ? analyses.filter(analysis => analysis.teamId === teamId) : analyses;
  }

  /**
   * Get code reviews
   * @param {string} teamId - Optional team ID filter
   * @param {string} status - Optional status filter
   * @returns {Array} Array of code reviews
   */
  getCodeReviews(teamId = null, status = null) {
    let reviews = Array.from(this.codeReviews.values());
    
    if (teamId) {
      reviews = reviews.filter(review => review.teamId === teamId);
    }
    
    if (status) {
      reviews = reviews.filter(review => review.status === status);
    }
    
    return reviews;
  }

  /**
   * Add comment to code review
   * @param {string} reviewId - Review ID
   * @param {string} userId - User ID adding comment
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment object
   */
  async addReviewComment(reviewId, userId, commentData) {
    try {
      const review = this.codeReviews.get(reviewId);
      if (!review) {
        throw new Error('Code review not found');
      }

      const { content, filePath, lineNumber, type = 'general', severity = 'info', suggestedFix } = commentData;
      
      const commentId = uuidv4();
      const comment = {
        id: commentId,
        reviewId,
        userId,
        content,
        filePath,
        lineNumber,
        type,
        severity,
        suggestedFix,
        createdAt: new Date().toISOString(),
        resolved: false
      };

      review.comments.push(comment);
      review.timeline.push({
        event: 'comment_added',
        timestamp: new Date().toISOString(),
        userId,
        commentId
      });

      logger.info('Review comment added', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        reviewId,
        commentId,
        userId,
        type,
        severity
      });

      this.emit('commentAdded', { reviewId, comment });
      return comment;
    } catch (error) {
      logger.error('Failed to add review comment', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Submit review decision
   * @param {string} reviewId - Review ID
   * @param {string} userId - User ID submitting decision
   * @param {Object} decisionData - Decision data
   * @returns {Promise<Object>} Review decision result
   */
  async submitReviewDecision(reviewId, userId, decisionData) {
    try {
      const review = this.codeReviews.get(reviewId);
      if (!review) {
        throw new Error('Code review not found');
      }

      if (!review.reviewers.has(userId)) {
        throw new Error('User is not assigned as reviewer');
      }

      const { decision, summary, overallRating, securityRating, qualityRating } = decisionData;
      
      // Update reviewer status
      review.reviewers.set(userId, {
        ...review.reviewers.get(userId),
        status: 'completed',
        decision,
        summary,
        ratings: {
          overall: overallRating,
          security: securityRating,
          quality: qualityRating
        },
        completedAt: new Date().toISOString()
      });

      review.timeline.push({
        event: 'decision_submitted',
        timestamp: new Date().toISOString(),
        userId,
        decision
      });

      // Check if all reviewers have completed
      const allCompleted = Array.from(review.reviewers.values())
        .every(reviewer => reviewer.status === 'completed');

      if (allCompleted) {
        review.status = 'completed';
        review.completedAt = new Date().toISOString();
        
        // Calculate overall review result
        const decisions = Array.from(review.reviewers.values()).map(r => r.decision);
        const hasRequestChanges = decisions.includes('request_changes');
        const hasApprovals = decisions.includes('approve');
        
        review.finalResult = hasRequestChanges ? 'changes_requested' : 
                           hasApprovals ? 'approved' : 'commented';
      }

      const result = {
        reviewId,
        decision,
        allCompleted,
        finalResult: review.finalResult || null,
        remainingReviewers: Array.from(review.reviewers.entries())
          .filter(([_, data]) => data.status === 'pending')
          .map(([id, _]) => id)
      };

      logger.info('Review decision submitted', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        reviewId,
        userId,
        decision,
        allCompleted
      });

      this.emit('decisionSubmitted', { reviewId, userId, decision, result });
      
      if (allCompleted) {
        this.emit('reviewCompleted', { reviewId, review });
      }

      return result;
    } catch (error) {
      logger.error('Failed to submit review decision', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform automated code analysis
   * @param {Object} codeChanges - Code changes to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async performAutomatedCodeAnalysis(codeChanges) {
    try {
      const analysisId = uuidv4();
      const analysis = {
        id: analysisId,
        timestamp: new Date().toISOString(),
        codeChanges,
        results: {
          complexity: this._calculateComplexity(codeChanges),
          securityIssues: this._findSecurityIssues(codeChanges),
          qualityMetrics: this._calculateQualityMetrics(codeChanges),
          suggestions: this._generateSuggestions(codeChanges)
        },
        status: 'completed'
      };

      logger.info('Automated code analysis completed', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        analysisId,
        complexity: analysis.results.complexity,
        securityIssues: analysis.results.securityIssues.length
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to perform automated code analysis', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate code complexity
   * @private
   */
  _calculateComplexity(codeChanges) {
    // Simple complexity calculation based on code structure
    const lines = Object.values(codeChanges).join('\n').split('\n');
    const functions = lines.filter(line => line.includes('function')).length;
    const conditions = lines.filter(line => 
      line.includes('if') || line.includes('for') || line.includes('while')
    ).length;
    
    return {
      cyclomatic: Math.max(1, conditions + 1),
      lines: lines.length,
      functions,
      rating: conditions > 10 ? 'high' : conditions > 5 ? 'medium' : 'low'
    };
  }

  /**
   * Find potential security issues
   * @private
   */
  _findSecurityIssues(codeChanges) {
    const issues = [];
    const code = Object.values(codeChanges).join('\n');
    
    // Basic security pattern matching
    const patterns = [
      { pattern: /tx\.origin/g, issue: 'Use of tx.origin', severity: 'high' },
      { pattern: /block\.timestamp/g, issue: 'Timestamp dependence', severity: 'medium' },
      { pattern: /selfdestruct/g, issue: 'Self-destruct usage', severity: 'high' },
      { pattern: /delegatecall/g, issue: 'Delegate call usage', severity: 'medium' }
    ];

    patterns.forEach(({ pattern, issue, severity }) => {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          type: issue,
          severity,
          count: matches.length,
          description: `Found ${matches.length} occurrence(s) of ${issue.toLowerCase()}`
        });
      }
    });

    return issues;
  }

  /**
   * Calculate quality metrics
   * @private
   */
  _calculateQualityMetrics(codeChanges) {
    const code = Object.values(codeChanges).join('\n');
    const lines = code.split('\n');
    
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || line.trim().startsWith('*')
    ).length;
    
    const codeLines = lines.filter(line => 
      line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')
    ).length;

    return {
      commentRatio: codeLines > 0 ? (commentLines / codeLines) * 100 : 0,
      averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length,
      totalLines: lines.length,
      codeLines,
      commentLines,
      rating: commentLines / codeLines > 0.2 ? 'good' : 'needs_improvement'
    };
  }

  /**
   * Generate code suggestions
   * @private
   */
  _generateSuggestions(codeChanges) {
    const suggestions = [];
    const code = Object.values(codeChanges).join('\n');
    
    // Basic suggestion patterns
    if (code.includes('require(') && !code.includes('require(') > 3) {
      suggestions.push({
        type: 'validation',
        message: 'Consider adding more input validation with require statements',
        priority: 'medium'
      });
    }

    if (!code.includes('event ')) {
      suggestions.push({
        type: 'events',
        message: 'Consider adding events for important state changes',
        priority: 'low'
      });
    }

    return suggestions;
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalTeams: this.teams.size,
      activeAnalyses: this.activeAnalyses.size,
      activeReviews: this.codeReviews.size,
      config: this.config
    };
  }

  /**
   * Cleanup service resources
   */
  async cleanup() {
    try {
      this.teams.clear();
      this.activeAnalyses.clear();
      this.codeReviews.clear();
      this.removeAllListeners();
      this.isInitialized = false;
      
      logger.info('Team collaboration service cleaned up', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService'
      });
    } catch (error) {
      logger.error('Failed to cleanup team collaboration service', {
        service: 'smart-contract-auditor',
        component: 'teamCollaborationService',
        error: error.message
      });
    }
  }
}

// Create singleton instance
const teamCollaborationService = new TeamCollaborationService();

module.exports = teamCollaborationService;