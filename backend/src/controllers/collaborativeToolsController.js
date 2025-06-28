const express = require('express');
const Joi = require('joi');
const teamCollaborationService = require('../services/teamCollaborationService');
const realTimeCodeReviewService = require('../services/realTimeCodeReviewService');
const sharedWorkspaceAnalytics = require('../services/sharedWorkspaceAnalytics');
const collaborativeWorkspaceManager = require('../services/collaborativeWorkspaceManager');
const supabaseAuth = require('../middleware/supabaseAuth');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication and rate limiting
router.use(supabaseAuth.optionalAuth);
router.use(advancedRateLimiter.createRateLimitMiddleware());

// Validation schemas
const teamCreateSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(500),
  teamType: Joi.string().valid('development', 'security', 'research', 'mixed').default('development'),
  visibility: Joi.string().valid('private', 'public', 'team').default('private'),
  initialMembers: Joi.array().items(Joi.object({
    userId: Joi.string().required(),
    role: Joi.string().valid('owner', 'admin', 'lead', 'senior', 'developer', 'junior', 'reviewer', 'viewer').default('developer')
  })).optional(),
  settings: Joi.object().optional()
});

const teamAnalysisSchema = Joi.object({
  analysisType: Joi.string().valid('quick', 'comprehensive', 'security-focused', 'quality-focused').default('comprehensive'),
  includeAllProjects: Joi.boolean().default(true),
  selectedProjects: Joi.array().items(Joi.string()).optional(),
  agents: Joi.array().items(Joi.string().valid('security', 'quality', 'economics', 'defi', 'crossChain', 'mev')).default(['security', 'quality']),
  generateReport: Joi.boolean().default(true)
});

const codeReviewSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().optional().max(1000),
  filePaths: Joi.array().items(Joi.string()).required(),
  codeChanges: Joi.object().required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  requestedReviewers: Joi.array().items(Joi.string()).optional(),
  deadline: Joi.date().optional()
});

const reviewCommentSchema = Joi.object({
  content: Joi.string().required().min(1).max(1000),
  filePath: Joi.string().optional(),
  lineNumber: Joi.number().integer().min(1).optional(),
  type: Joi.string().valid('general', 'suggestion', 'issue', 'question', 'security').default('general'),
  severity: Joi.string().valid('info', 'warning', 'error', 'critical').default('info'),
  suggestedFix: Joi.string().optional()
});

const reviewDecisionSchema = Joi.object({
  decision: Joi.string().valid('approve', 'request_changes', 'comment').required(),
  summary: Joi.string().required().min(1).max(1000),
  overallRating: Joi.number().integer().min(1).max(10).optional(),
  securityRating: Joi.number().integer().min(1).max(10).optional(),
  qualityRating: Joi.number().integer().min(1).max(10).optional()
});

const realtimeReviewSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  description: Joi.string().optional().max(1000),
  codeChanges: Joi.object().required(),
  templateId: Joi.string().valid('security_review', 'quality_review', 'defi_review', 'quick_review').default('quality_review'),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  deadline: Joi.date().optional(),
  requestedReviewers: Joi.array().items(Joi.string()).optional()
});

/**
 * POST /api/v1/collaboration/teams
 * Create a new team
 */
router.post('/teams',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = teamCreateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const team = await teamCollaborationService.createTeam({
        ...value,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: {
          team: {
            id: team.id,
            name: team.name,
            description: team.description,
            teamType: team.teamType,
            visibility: team.visibility,
            createdAt: team.createdAt,
            memberCount: team.members.size,
            settings: team.settings
          },
          message: 'Team created successfully'
        }
      });

      logger.info('Team created via API', {
        teamId: team.id,
        userId: req.user.id,
        name: team.name,
        memberCount: team.members.size
      });

    } catch (error) {
      logger.error('Failed to create team', { 
        error: error.message,
        userId: req.user.id 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to create team',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/collaboration/teams/:teamId/analysis
 * Start team analysis session
 */
router.post('/teams/:teamId/analysis',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { teamId } = req.params;
      const { error, value } = teamAnalysisSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const analysisSession = await teamCollaborationService.startTeamAnalysis(
        teamId,
        req.user.id,
        value
      );

      res.json({
        success: true,
        data: {
          sessionId: analysisSession.sessionId,
          status: analysisSession.status,
          config: analysisSession.config,
          progress: analysisSession.progress,
          message: 'Team analysis started successfully'
        }
      });

      logger.info('Team analysis started via API', {
        teamId,
        sessionId: analysisSession.sessionId,
        userId: req.user.id,
        analysisType: value.analysisType
      });

    } catch (error) {
      logger.error('Failed to start team analysis', { 
        teamId: req.params.teamId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to start team analysis',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/collaboration/teams/:teamId/reviews
 * Start code review session
 */
router.post('/teams/:teamId/reviews',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { teamId } = req.params;
      const { error, value } = codeReviewSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const codeReview = await teamCollaborationService.startCodeReview(
        teamId,
        req.user.id,
        value
      );

      res.status(201).json({
        success: true,
        data: {
          reviewId: codeReview.id,
          title: codeReview.title,
          status: codeReview.status,
          priority: codeReview.priority,
          reviewers: Array.from(codeReview.reviewers.keys()),
          metrics: codeReview.metrics,
          message: 'Code review started successfully'
        }
      });

      logger.info('Code review started via API', {
        teamId,
        reviewId: codeReview.id,
        userId: req.user.id,
        title: codeReview.title,
        reviewerCount: codeReview.reviewers.size
      });

    } catch (error) {
      logger.error('Failed to start code review', { 
        teamId: req.params.teamId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to start code review',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/collaboration/reviews/:reviewId/comments
 * Add comment to code review
 */
router.post('/reviews/:reviewId/comments',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { error, value } = reviewCommentSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const comment = await teamCollaborationService.addReviewComment(
        reviewId,
        req.user.id,
        value
      );

      res.status(201).json({
        success: true,
        data: { comment }
      });

      logger.info('Review comment added via API', {
        reviewId,
        commentId: comment.id,
        userId: req.user.id,
        type: comment.type,
        severity: comment.severity
      });

    } catch (error) {
      logger.error('Failed to add review comment', { 
        reviewId: req.params.reviewId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to add review comment',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/collaboration/reviews/:reviewId/decision
 * Submit review decision
 */
router.post('/reviews/:reviewId/decision',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { error, value } = reviewDecisionSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const result = await teamCollaborationService.submitReviewDecision(
        reviewId,
        req.user.id,
        value
      );

      res.json({
        success: true,
        data: result
      });

      logger.info('Review decision submitted via API', {
        reviewId,
        userId: req.user.id,
        decision: value.decision,
        allCompleted: result.allCompleted
      });

    } catch (error) {
      logger.error('Failed to submit review decision', { 
        reviewId: req.params.reviewId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to submit review decision',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/collaboration/realtime-reviews
 * Start real-time code review session
 */
router.post('/realtime-reviews',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = realtimeReviewSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const reviewSession = await realTimeCodeReviewService.startRealtimeReview({
        ...value,
        teamId: req.body.teamId, // Optional team context
        initiatedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: {
          sessionId: reviewSession.sessionId,
          title: reviewSession.title,
          template: reviewSession.template.name,
          status: reviewSession.status,
          estimatedTime: reviewSession.template.estimatedTime,
          message: 'Real-time review session started successfully'
        }
      });

      logger.info('Real-time review session started via API', {
        sessionId: reviewSession.sessionId,
        userId: req.user.id,
        title: reviewSession.title,
        template: reviewSession.template.id
      });

    } catch (error) {
      logger.error('Failed to start real-time review', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to start real-time review',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/collaboration/realtime-reviews/:sessionId/join
 * Join real-time review session
 */
router.post('/realtime-reviews/:sessionId/join',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userInfo = {
        name: req.user.name || 'Unknown User',
        avatar: req.user.avatar || null
      };

      const result = await realTimeCodeReviewService.joinReviewSession(
        sessionId,
        req.user.id,
        userInfo
      );

      res.json({
        success: true,
        data: result
      });

      logger.info('User joined real-time review session via API', {
        sessionId,
        userId: req.user.id,
        participantCount: result.participantCount
      });

    } catch (error) {
      logger.error('Failed to join real-time review session', { 
        sessionId: req.params.sessionId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to join review session',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/v1/collaboration/workspaces/:workspaceId/analytics
 * Get workspace analytics
 */
router.get('/workspaces/:workspaceId/analytics',
  supabaseAuth.authenticate,
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const {
        timeRange = '7d',
        includeUserBreakdown = 'true',
        includeFileAnalysis = 'true',
        includeCollaboration = 'true',
        includeQualityMetrics = 'true'
      } = req.query;

      const options = {
        timeRange,
        includeUserBreakdown: includeUserBreakdown === 'true',
        includeFileAnalysis: includeFileAnalysis === 'true',
        includeCollaboration: includeCollaboration === 'true',
        includeQualityMetrics: includeQualityMetrics === 'true'
      };

      const report = await sharedWorkspaceAnalytics.generateWorkspaceReport(
        workspaceId,
        options
      );

      res.json({
        success: true,
        data: report
      });

      logger.info('Workspace analytics report generated via API', {
        workspaceId,
        timeRange,
        userId: req.user.id
      });

    } catch (error) {
      logger.error('Failed to generate workspace analytics', { 
        workspaceId: req.params.workspaceId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate workspace analytics',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/v1/collaboration/workspaces/:workspaceId/realtime-metrics
 * Get real-time workspace metrics
 */
router.get('/workspaces/:workspaceId/realtime-metrics',
  supabaseAuth.authenticate,
  (req, res) => {
    try {
      const { workspaceId } = req.params;
      const metrics = sharedWorkspaceAnalytics.getRealTimeMetrics(workspaceId);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Failed to get real-time metrics', { 
        workspaceId: req.params.workspaceId,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get real-time metrics'
      });
    }
  }
);

/**
 * GET /api/v1/collaboration/status
 * Get collaborative tools service status
 */
router.get('/status', (req, res) => {
  try {
    const status = {
      teamCollaboration: teamCollaborationService.getStatus(),
      realtimeCodeReview: realTimeCodeReviewService.getStatus(),
      workspaceAnalytics: sharedWorkspaceAnalytics.getStatus(),
      collaborativeWorkspace: collaborativeWorkspaceManager.getStatus(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get collaborative tools status', { 
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get service status'
    });
  }
});

/**
 * GET /api/v1/collaboration/capabilities
 * Get collaborative tools capabilities
 */
router.get('/capabilities', (req, res) => {
  try {
    const capabilities = {
      teamCollaboration: {
        enabled: true,
        features: ['team-management', 'role-based-permissions', 'team-analysis', 'code-reviews'],
        maxTeamSize: 50,
        supportedRoles: ['owner', 'admin', 'lead', 'senior', 'developer', 'junior', 'reviewer', 'viewer'],
        analysisTypes: ['quick', 'comprehensive', 'security-focused', 'quality-focused']
      },
      realtimeCodeReview: {
        enabled: true,
        features: ['live-collaboration', 'ai-assistance', 'template-based-reviews', 'real-time-comments'],
        reviewTemplates: ['security_review', 'quality_review', 'defi_review', 'quick_review'],
        maxConcurrentReviews: 10,
        aiAgents: ['security', 'quality', 'economics', 'defi']
      },
      workspaceAnalytics: {
        enabled: true,
        features: ['activity-tracking', 'collaboration-metrics', 'code-quality-trends', 'real-time-metrics'],
        timeRanges: ['1d', '7d', '30d', '90d'],
        metricsRetention: '90 days',
        realTimeUpdates: true
      },
      sharedWorkspaces: {
        enabled: true,
        features: ['collaborative-editing', 'shared-projects', 'team-workspaces', 'permission-management'],
        maxConcurrentUsers: 10,
        supportedFileTypes: ['.sol', '.vy', '.js', '.ts', '.json', '.md']
      }
    };

    res.json({
      success: true,
      data: capabilities
    });

  } catch (error) {
    logger.error('Failed to get capabilities', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get capabilities'
    });
  }
});

module.exports = router;
