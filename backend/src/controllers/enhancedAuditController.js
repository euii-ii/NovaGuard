const express = require('express');
const Joi = require('joi');
const auditEngine = require('../services/auditEngine');
const aiAnalysisPipeline = require('../services/aiAnalysisPipeline');
const teamCollaborationService = require('../services/teamCollaborationService');
const jwtAuth = require('../middleware/jwtAuth');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Apply rate limiting to all routes
router.use(advancedRateLimiter.createRateLimitMiddleware());

// Validation schemas
const comprehensiveAuditSchema = Joi.object({
  contractCode: Joi.string().optional().min(10).max(1000000),
  contractAddress: Joi.string().optional().pattern(/^0x[a-fA-F0-9]{40}$/),
  analysisOptions: Joi.object({
    enableTeamReview: Joi.boolean().default(false),
    depth: Joi.string().valid('quick', 'comprehensive', 'deep').default('comprehensive'),
    includeGasOptimization: Joi.boolean().default(true),
    includeBestPractices: Joi.boolean().default(true),
    enableAIAnalysis: Joi.boolean().default(true)
  }).default({})
}).or('contractCode', 'contractAddress');

const contractAnalysisSchema = Joi.object({
  contractCode: Joi.string().required().min(10).max(1000000),
  analysisType: Joi.string().valid('quick', 'comprehensive', 'deep').default('comprehensive'),
  agents: Joi.array().items(Joi.string()).default(['security']),
  options: Joi.object().default({})
});

const contractVerificationSchema = Joi.object({
  contractAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
  chain: Joi.string().required()
});

const defiAnalysisSchema = Joi.object({
  contractCode: Joi.string().required().min(10).max(1000000),
  protocolType: Joi.string().valid('dex', 'lending', 'yield', 'staking', 'bridge').optional(),
  agents: Joi.array().items(Joi.string()).default(['defi', 'economics']),
  autoDetectProtocol: Joi.boolean().default(false)
});

const teamAuditReviewSchema = Joi.object({
  auditId: Joi.string().required(),
  teamId: Joi.string().required(),
  reviewConfig: Joi.object().default({})
});

/**
 * POST /contracts/analyze
 * Analyze smart contract code
 */
router.post('/contracts/analyze', jwtAuth.authenticate, async (req, res) => {
  try {
    const { error, value } = contractAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractCode, analysisType, agents, options } = value;

    // Perform AI analysis using the pipeline
    const analysisResult = await aiAnalysisPipeline.analyzeContract(contractCode, {
      analysisMode: analysisType,
      agents,
      ...options
    });

    res.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    logger.error('Contract analysis failed', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      details: error.message
    });
  }
});

/**
 * POST /contracts/verify
 * Verify contract on blockchain
 */
router.post('/contracts/verify', jwtAuth.authenticate, async (req, res) => {
  try {
    const { error, value } = contractVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractAddress, chain } = value;

    // Use multiChainWeb3Service for verification
    const multiChainWeb3Service = require('../services/multiChainWeb3Service');
    const verificationResult = await multiChainWeb3Service.verifyContract(chain, contractAddress);
    
    res.json({
      success: true,
      data: verificationResult
    });

  } catch (error) {
    logger.error('Contract verification failed', {
      error: error.message,
      contractAddress: req.body.contractAddress
    });

    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

/**
* POST /api/v1/enhanced-audit/comprehensive
* Start comprehensive audit with AI analysis
*/
router.post('/comprehensive', jwtAuth.optionalAuth, async (req, res) => {
  try {
    const { error, value } = comprehensiveAuditSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractCode, contractAddress, analysisOptions } = value;

    // Initialize audit with enhanced options
    const auditConfig = {
      enableAIAnalysis: true,
      enableTeamReview: analysisOptions.enableTeamReview || false,
      analysisDepth: analysisOptions.depth || 'comprehensive',
      includeGasOptimization: analysisOptions.includeGasOptimization || true,
      includeBestPractices: analysisOptions.includeBestPractices || true,
      ...analysisOptions
    };

    // Start the audit
    const auditResult = await auditEngine.performComprehensiveAudit(
      contractCode || contractAddress,
      auditConfig
    );

    // If team review is enabled, create a team review session
    if (auditConfig.enableTeamReview && req.user?.teamId) {
      const reviewSession = await teamCollaborationService.startCodeReview(
        req.user.teamId,
        req.user.id,
        {
          title: `Security Audit Review - ${auditResult.contractName || 'Contract'}`,
          description: 'Please review the automated audit results and provide feedback',
          auditResults: auditResult,
          priority: auditResult.riskLevel === 'High' ? 'high' : 'medium'
        }
      );
      auditResult.reviewSessionId = reviewSession.id;
    }

    res.json({
      success: true,
      auditId: auditResult.auditId,
      results: auditResult,
      message: 'Comprehensive audit completed successfully'
    });

  } catch (error) {
    logger.error('Enhanced audit failed', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Audit failed',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/enhanced-audit/results/:auditId
 * Get audit results with AI insights
 */
router.get('/results/:auditId', jwtAuth.optionalAuth, async (req, res) => {
  try {
    const { auditId } = req.params;
    const { includeAIInsights = true } = req.query;

    const auditResults = await auditEngine.getAuditResults(auditId);
    
    if (!auditResults) {
      return res.status(404).json({
        success: false,
        error: 'Audit results not found'
      });
    }

    // Add AI insights if requested
    if (includeAIInsights) {
      const aiInsights = await aiAnalysisPipeline.generateInsights(auditResults);
      auditResults.aiInsights = aiInsights;
    }

    res.json({
      success: true,
      results: auditResults
    });

  } catch (error) {
    logger.error('Failed to get audit results', {
      error: error.message,
      auditId: req.params.auditId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit results'
    });
  }
});

/**
 * POST /api/v1/enhanced-audit/team-review
 * Start team-based audit review
 */
router.post('/team-review', jwtAuth.authenticate, async (req, res) => {
  try {
    const { error, value } = teamAuditReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { auditId, teamId, reviewConfig } = value;

    // Get audit results
    const auditResults = await auditEngine.getAuditResults(auditId);
    if (!auditResults) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found'
      });
    }

    // Start team review
    const reviewSession = await teamCollaborationService.startCodeReview(
      teamId,
      req.user.id,
      {
        title: `Team Audit Review - ${auditResults.contractName}`,
        description: 'Collaborative review of automated audit findings',
        auditResults,
        reviewType: 'security_audit',
        priority: auditResults.riskLevel === 'High' ? 'high' : 'medium',
        ...reviewConfig
      }
    );

    res.json({
      success: true,
      reviewSessionId: reviewSession.id,
      message: 'Team audit review started successfully'
    });

  } catch (error) {
    logger.error('Failed to start team audit review', {
      error: error.message,
      auditId: req.body.auditId,
      teamId: req.body.teamId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to start team review'
    });
  }
});

/**
 * GET /api/v1/enhanced-audit/history
 * Get audit history with analytics
 */
router.get('/history', jwtAuth.authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, filter = {} } = req.query;
    const userId = req.user?.id;

    const history = await auditEngine.getAuditHistory({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      filter
    });

    res.json({
      success: true,
      history: history.audits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.total,
        pages: Math.ceil(history.total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to get audit history', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit history'
    });
  }
});

/**
 * GET /api/v1/enhanced-audit/report/:auditId
 * Generate audit report
 */
router.get('/report/:auditId', jwtAuth.optionalAuth, async (req, res) => {
  try {
    const { auditId } = req.params;
    const { format = 'json', includeRecommendations = true } = req.query;

    const auditResults = await auditEngine.getAuditResults(auditId);
    if (!auditResults) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found'
      });
    }

    const report = await auditEngine.generateReport(auditResults, {
      format,
      includeRecommendations: includeRecommendations === 'true',
      includeAIInsights: true
    });

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="audit-report-${auditId}.pdf"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
    }

    res.send(report);

  } catch (error) {
    logger.error('Failed to generate audit report', {
      error: error.message,
      auditId: req.params.auditId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * GET /chains/supported
 * Get supported blockchain chains
 */
router.get('/chains/supported', async (req, res) => {
  try {
    const multiChainWeb3Service = require('../services/multiChainWeb3Service');
    const supportedChains = multiChainWeb3Service.getSupportedChains();

    res.json({
      success: true,
      data: supportedChains
    });
  } catch (error) {
    logger.error('Failed to get supported chains', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get supported chains'
    });
  }
});

/**
 * GET /agents/available
 * Get available AI agents
 */
router.get('/agents/available', async (req, res) => {
  try {
    const availableAgents = aiAnalysisPipeline.getAvailableAgents();

    res.json({
      success: true,
      data: availableAgents
    });
  } catch (error) {
    logger.error('Failed to get available agents', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get available agents'
    });
  }
});

/**
 * POST /defi/analyze
 * Analyze DeFi protocol
 */
router.post('/defi/analyze', jwtAuth.authenticate, async (req, res) => {
  try {
    const { error, value } = defiAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractCode, protocolType, agents, autoDetectProtocol } = value;

    // Perform DeFi-specific analysis
    const analysisResult = await aiAnalysisPipeline.analyzeContract(contractCode, {
      analysisMode: 'comprehensive',
      agents,
      protocolType,
      autoDetectProtocol
    });

    // Add DeFi-specific metadata
    if (autoDetectProtocol) {
      analysisResult.metadata = {
        ...analysisResult.metadata,
        detectedProtocol: protocolType || 'unknown'
      };
    }

    res.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    logger.error('DeFi analysis failed', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'DeFi analysis failed',
      details: error.message
    });
  }
});

module.exports = router;