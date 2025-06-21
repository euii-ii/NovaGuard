const express = require('express');
const Joi = require('joi');
const realTimeDevelopmentService = require('../services/realTimeDevelopmentService');
const instantFeedbackService = require('../services/instantFeedbackService');
const liveVulnerabilityDetector = require('../services/liveVulnerabilityDetector');
const codeCompletionEngine = require('../services/codeCompletionEngine');
const syntaxValidationService = require('../services/syntaxValidationService');
const jwtAuth = require('../middleware/jwtAuth');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication and rate limiting
router.use(jwtAuth.optionalAuth);
router.use(advancedRateLimiter.createRateLimitMiddleware());

// Validation schemas
const codeChangeSchema = Joi.object({
  filePath: Joi.string().required(),
  content: Joi.string().required(),
  cursorPosition: Joi.object({
    line: Joi.number().integer().min(0).required(),
    column: Joi.number().integer().min(0).required()
  }).optional(),
  changeType: Joi.string().valid('edit', 'save', 'auto-save', 'paste', 'delete').default('edit'),
  triggerCharacter: Joi.string().length(1).optional(),
  workspaceId: Joi.string().optional()
});

const completionRequestSchema = Joi.object({
  content: Joi.string().required(),
  position: Joi.object({
    line: Joi.number().integer().min(0).required(),
    column: Joi.number().integer().min(0).required()
  }).required(),
  filePath: Joi.string().required(),
  triggerCharacter: Joi.string().length(1).optional()
});

const validationRequestSchema = Joi.object({
  content: Joi.string().required(),
  filePath: Joi.string().required()
});

const sessionConfigSchema = Joi.object({
  enableInstantFeedback: Joi.boolean().default(true),
  enableLiveVulnerabilityDetection: Joi.boolean().default(true),
  enableAIDetection: Joi.boolean().default(false),
  alertLevel: Joi.string().valid('low', 'medium', 'high', 'all').default('medium'),
  realTimeAlerts: Joi.boolean().default(true)
});

const preferencesSchema = Joi.object({
  enableLiveAnalysis: Joi.boolean().default(true),
  enableCodeCompletion: Joi.boolean().default(true),
  enableSmartSuggestions: Joi.boolean().default(true),
  enableInstantFeedback: Joi.boolean().default(true),
  enableLiveVulnerabilityDetection: Joi.boolean().default(true),
  suggestDesignPatterns: Joi.boolean().default(false),
  analysisAgents: Joi.array().items(Joi.string()).default(['security']),
  debounceDelay: Joi.number().integer().min(100).max(5000).default(1000),
  alertLevel: Joi.string().valid('low', 'medium', 'high', 'all').default('medium'),
  realTimeAlerts: Joi.boolean().default(true)
});

/**
 * POST /api/v1/realtime/code/analyze
 * Process code change and provide real-time analysis
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
        userId: req.user.id
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
 * POST /api/v1/realtime/completion
 * Get code completion suggestions
 */
router.post('/completion',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = completionRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const completions = await codeCompletionEngine.getCompletions(
        value.content,
        value.position,
        value.filePath
      );

      res.json({
        success: true,
        data: completions
      });

    } catch (error) {
      logger.error('Code completion failed', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Code completion failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/realtime/validate
 * Validate Solidity syntax
 */
router.post('/validate',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = validationRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const validation = await syntaxValidationService.validateSyntax(
        value.content,
        value.filePath
      );

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Syntax validation failed', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Syntax validation failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/realtime/session/start
 * Start a development session
 */
router.post('/session/start',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = sessionConfigSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      const sessionInfo = realTimeDevelopmentService.startDevelopmentSession(
        req.user.id,
        value
      );

      res.json({
        success: true,
        data: {
          sessionInfo,
          message: 'Development session started successfully'
        }
      });

      logger.info('Development session started via API', {
        userId: req.user.id,
        sessionConfig: value
      });

    } catch (error) {
      logger.error('Failed to start development session', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to start development session',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/realtime/session/end
 * End a development session
 */
router.post('/session/end',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      realTimeDevelopmentService.endDevelopmentSession(req.user.id);

      res.json({
        success: true,
        message: 'Development session ended successfully'
      });

      logger.info('Development session ended via API', {
        userId: req.user.id
      });

    } catch (error) {
      logger.error('Failed to end development session', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to end development session',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/realtime/preferences
 * Set user preferences for real-time features
 */
router.post('/preferences',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const { error, value } = preferencesSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }

      realTimeDevelopmentService.setUserPreferences(req.user.id, value);

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: { preferences: value }
      });

      logger.info('User preferences updated via API', {
        userId: req.user.id,
        preferences: Object.keys(value)
      });

    } catch (error) {
      logger.error('Failed to update preferences', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/v1/realtime/status
 * Get real-time development service status
 */
router.get('/status', (req, res) => {
  try {
    const status = realTimeDevelopmentService.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get real-time development status', { 
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get service status'
    });
  }
});

/**
 * GET /api/v1/realtime/capabilities
 * Get real-time development capabilities
 */
router.get('/capabilities', (req, res) => {
  try {
    const capabilities = {
      instantFeedback: {
        enabled: true,
        features: ['syntax-validation', 'quick-hints', 'contextual-help', 'performance-tips'],
        debounceDelay: 500,
        supportedLanguages: ['solidity']
      },
      codeCompletion: {
        enabled: true,
        contextAware: true,
        smartSuggestions: true,
        triggerCharacters: ['.', '(', ' ', '{'],
        maxSuggestions: 50
      },
      liveVulnerabilityDetection: {
        enabled: true,
        detectionMethods: ['pattern-based', 'rule-based', 'ai-powered'],
        severityLevels: ['low', 'medium', 'high'],
        realTimeAlerts: true,
        supportedCategories: [
          'reentrancy', 'access-control', 'arithmetic', 'timestamp-dependency',
          'unchecked-calls', 'delegatecall', 'selfdestruct'
        ]
      },
      syntaxValidation: {
        enabled: true,
        realTime: true,
        errorTypes: ['syntax', 'semantic', 'style'],
        quickFixes: true,
        cacheEnabled: true
      },
      liveAnalysis: {
        enabled: true,
        agents: ['security', 'quality', 'economics', 'defi'],
        analysisTypes: ['quick', 'comprehensive'],
        debounced: true
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

/**
 * GET /api/v1/realtime/metrics
 * Get real-time development metrics
 */
router.get('/metrics',
  jwtAuth.authenticate,
  (req, res) => {
    try {
      const status = realTimeDevelopmentService.getStatus();
      const metrics = {
        service: status.serviceMetrics,
        user: {
          activeSessions: status.activeSessions,
          activeAnalyses: status.activeAnalyses,
          queueSize: status.queueSize
        },
        subServices: status.subServices,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Failed to get metrics', { 
        userId: req.user.id,
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics'
      });
    }
  }
);

module.exports = router;
