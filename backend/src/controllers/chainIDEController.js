const express = require('express');
const Joi = require('joi');
const chainIDEIntegrationService = require('../services/chainIDEIntegrationService');
const collaborativeWorkspaceManager = require('../services/collaborativeWorkspaceManager');
const realTimeDevelopmentService = require('../services/realTimeDevelopmentService');
const jwtAuth = require('../middleware/jwtAuth');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication and rate limiting
router.use(jwtAuth.optionalAuth);
router.use(advancedRateLimiter.createRateLimitMiddleware());

// Validation schemas
const workspaceCreateSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(500),
  projectType: Joi.string().valid('smart-contract', 'dapp', 'defi', 'nft').default('smart-contract'),
  visibility: Joi.string().valid('private', 'public', 'team').default('private'),
  collaborators: Joi.array().items(Joi.object({
    userId: Joi.string().required(),
    role: Joi.string().valid('viewer', 'collaborator', 'admin').default('collaborator'),
    permissions: Joi.array().items(Joi.string()).optional()
  })).optional(),
  settings: Joi.object().optional()
});

const codeChangeSchema = Joi.object({
  filePath: Joi.string().required(),
  content: Joi.string().required(),
  cursorPosition: Joi.object({
    line: Joi.number().integer().min(0),
    column: Joi.number().integer().min(0)
  }).optional(),
  changeType: Joi.string().valid('edit', 'save', 'auto-save').default('edit')
});

const fileUpdateSchema = Joi.object({
  filePath: Joi.string().required(),
  content: Joi.string().required(),
  operation: Joi.string().valid('create', 'update', 'delete').default('update'),
  metadata: Joi.object().optional()
});

const commentSchema = Joi.object({
  filePath: Joi.string().required(),
  lineNumber: Joi.number().integer().min(1).required(),
  content: Joi.string().required().min(1).max(1000),
  type: Joi.string().valid('general', 'suggestion', 'issue', 'question').default('general'),
  parentCommentId: Joi.string().optional()
});

/**
 * GET /api/v1/chainide/status
 * Get ChainIDE integration service status
 */
router.get('/status', (req, res) => {
  try {
    const status = {
      chainIDEService: chainIDEIntegrationService.getStatus(),
      workspaceManager: collaborativeWorkspaceManager.getStatus(),
      realTimeDevelopment: realTimeDevelopmentService.getStatus(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get ChainIDE status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get service status'
    });
  }
});

/**
 * POST /api/v1/chainide/workspaces
 * Create a new collaborative workspace
 */
router.post('/workspaces', 
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = workspaceCreateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const workspace = await collaborativeWorkspaceManager.createWorkspace({
        ...value,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: {
          workspace: collaborativeWorkspaceManager.sanitizeWorkspaceForUser(workspace, req.user.id),
          message: 'Workspace created successfully'
        }
      });

      logger.info('Workspace created via API', {
        workspaceId: workspace.id,
        userId: req.user.id,
        name: workspace.name
      });

    } catch (error) {
      logger.error('Failed to create workspace', { 
        error: error.message,
        userId: req.user.id 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to create workspace',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/chainide/workspaces/:workspaceId/join
 * Join a collaborative workspace
 */
router.post('/workspaces/:workspaceId/join',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const sessionInfo = {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        ideVersion: req.get('X-ChainIDE-Version')
      };

      const result = await collaborativeWorkspaceManager.joinWorkspace(
        workspaceId,
        req.user.id,
        sessionInfo
      );

      res.json({
        success: true,
        data: result
      });

      logger.info('User joined workspace via API', {
        workspaceId,
        userId: req.user.id,
        sessionId: result.sessionId
      });

    } catch (error) {
      logger.error('Failed to join workspace', { 
        workspaceId: req.params.workspaceId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to join workspace',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/chainide/code/analyze
 * Real-time code analysis
 */
router.post('/code/analyze',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = codeChangeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const result = await realTimeDevelopmentService.processCodeChange({
        ...value,
        userId: req.user.id,
        workspaceId: req.body.workspaceId
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Real-time code analysis failed', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Code analysis failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/chainide/workspaces/:workspaceId/files
 * Update file in workspace
 */
router.post('/workspaces/:workspaceId/files',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { error, value } = fileUpdateSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const result = await collaborativeWorkspaceManager.updateFile(
        workspaceId,
        req.user.id,
        value
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to update file', { 
        workspaceId: req.params.workspaceId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to update file',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/chainide/workspaces/:workspaceId/comments
 * Add comment to workspace
 */
router.post('/workspaces/:workspaceId/comments',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { error, value } = commentSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const comment = await collaborativeWorkspaceManager.addComment(
        workspaceId,
        req.user.id,
        value
      );

      res.status(201).json({
        success: true,
        data: { comment }
      });

    } catch (error) {
      logger.error('Failed to add comment', { 
        workspaceId: req.params.workspaceId,
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(400).json({
        success: false,
        error: 'Failed to add comment',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/v1/chainide/workspaces/:workspaceId/stats
 * Get workspace statistics
 */
router.get('/workspaces/:workspaceId/stats',
  jwtAuth.authenticate,
  (req, res) => {
    try {
      const { workspaceId } = req.params;
      const stats = collaborativeWorkspaceManager.getWorkspaceStats(workspaceId);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found'
        });
      }

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Failed to get workspace stats', { 
        workspaceId: req.params.workspaceId,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get workspace statistics'
      });
    }
  }
);

/**
 * POST /api/v1/chainide/preferences
 * Set user preferences for real-time features
 */
router.post('/preferences',
  jwtAuth.authenticate,
  (req, res) => {
    try {
      const preferences = req.body;
      
      realTimeDevelopmentService.setUserPreferences(req.user.id, preferences);

      res.json({
        success: true,
        message: 'Preferences updated successfully'
      });

      logger.info('User preferences updated', {
        userId: req.user.id,
        preferences: Object.keys(preferences)
      });

    } catch (error) {
      logger.error('Failed to update preferences', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
    }
  }
);

/**
 * GET /api/v1/chainide/sdk
 * Get ChainIDE Plugin SDK
 */
router.get('/sdk', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sdkPath = path.join(__dirname, '../sdk/chainIDEPluginSDK.js');
    
    if (fs.existsSync(sdkPath)) {
      const sdkContent = fs.readFileSync(sdkPath, 'utf8');
      
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Content-Disposition', 'attachment; filename="chainIDEPluginSDK.js"');
      res.send(sdkContent);
    } else {
      res.status(404).json({
        success: false,
        error: 'SDK not found'
      });
    }

  } catch (error) {
    logger.error('Failed to serve SDK', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to serve SDK'
    });
  }
});

/**
 * GET /api/v1/chainide/capabilities
 * Get ChainIDE integration capabilities
 */
router.get('/capabilities', (req, res) => {
  try {
    const capabilities = {
      realTimeAnalysis: {
        enabled: true,
        supportedLanguages: ['solidity'],
        analysisTypes: ['syntax', 'security', 'gas', 'best-practices'],
        agents: ['security', 'quality', 'economics', 'defi', 'crossChain', 'mev']
      },
      collaboration: {
        enabled: true,
        features: ['shared-workspaces', 'real-time-editing', 'comments', 'cursor-tracking'],
        maxConcurrentUsers: 10,
        supportedFileTypes: ['.sol', '.vy', '.js', '.ts', '.json']
      },
      codeCompletion: {
        enabled: true,
        contextAware: true,
        smartSuggestions: true,
        supportedTriggers: ['.', ' ', '(', '{']
      },
      plugins: {
        enabled: true,
        builtInPlugins: ['security-analyzer', 'gas-optimizer', 'defi-analyzer'],
        customPluginSupport: true,
        sdkVersion: '1.0.0'
      },
      chains: Object.keys(require('../services/multiChainWeb3Service').getSupportedChains())
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
