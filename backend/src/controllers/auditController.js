const express = require('express');
const Joi = require('joi');
const auditEngine = require('../services/auditEngine');
const aiAnalysisPipeline = require('../services/aiAnalysisPipeline');
const multiChainWeb3Service = require('../services/multiChainWeb3Service');
const defiAnalysisEngine = require('../services/defiAnalysisEngine');
const jwtAuth = require('../middleware/jwtAuth');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');
const _teeMonitor = require('../services/teeMonitor');
const logger = require('../utils/logger');

const router = express.Router();

// Apply rate limiting to all routes
router.use(advancedRateLimiter.createRateLimitMiddleware());

// Enhanced validation schemas
const contractAnalysisSchema = Joi.object({
  contractCode: Joi.string().required().min(10).max(1000000),
  contractName: Joi.string().optional().max(100),
  chain: Joi.string().valid(
    'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'zksync',
    'sepolia', 'mumbai'
  ).default('ethereum'),
  agents: Joi.array().items(
    Joi.string().valid('security', 'quality', 'economics', 'defi', 'crossChain', 'mev')
  ).optional(),
  analysisMode: Joi.string().valid('quick', 'comprehensive', 'defi-focused').default('comprehensive'),
  priority: Joi.string().valid('low', 'normal', 'high').default('normal')
});

const addressAnalysisSchema = Joi.object({
  contractAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
  chain: Joi.string().valid(
    'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'zksync',
    'sepolia', 'mumbai'
  ).default('ethereum'),
  agents: Joi.array().items(
    Joi.string().valid('security', 'quality', 'economics', 'defi', 'crossChain', 'mev')
  ).optional(),
  analysisMode: Joi.string().valid('quick', 'comprehensive', 'defi-focused').default('comprehensive'),
  includeCrossChain: Joi.boolean().default(true)
});

const multiAgentAnalysisSchema = Joi.object({
  contractCode: Joi.string().required().min(10).max(1000000),
  agents: Joi.array().items(
    Joi.string().valid('security', 'quality', 'economics', 'defi', 'crossChain', 'mev')
  ).required().min(1),
  analysisMode: Joi.string().valid('parallel', 'sequential').default('parallel'),
  aggregationStrategy: Joi.string().valid('weighted', 'consensus', 'best-of').default('weighted')
});

/**
 * POST /api/v1/contracts/analyze
 * Enhanced multi-chain contract analysis with AI agents
 */
router.post('/analyze', async (req, res) => {
  try {
    const { error, value } = contractAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractCode, contractName, chain, agents, analysisMode, priority } = value;

    logger.info('Enhanced contract analysis requested', {
      codeLength: contractCode.length,
      chain,
      agents,
      analysisMode,
      ip: req.ip
    });

    // Use the enhanced audit engine with AI pipeline
    const auditResult = await auditEngine.auditContract(contractCode, {
      contractName,
      chain,
      agents,
      analysisMode,
      priority,
      contractData: { chain }
    });

    res.json({
      success: true,
      data: {
        ...auditResult,
        analysisType: 'enhanced-multi-agent',
        supportedChains: Object.keys(multiChainWeb3Service.getSupportedChains())
      }
    });

  } catch (error) {
    logger.error('Enhanced contract analysis failed', { 
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/contracts/analyze-address
 * Multi-chain contract analysis by address
 */
router.post('/analyze-address', async (req, res) => {
  try {
    const { error, value } = addressAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractAddress, chain, agents, analysisMode, includeCrossChain } = value;

    logger.info('Multi-chain address analysis requested', {
      contractAddress,
      chain,
      agents,
      includeCrossChain,
      ip: req.ip
    });

    // Use enhanced audit engine with multi-chain support
    const auditResult = await auditEngine.auditContractByAddress(contractAddress, chain, {
      agents,
      analysisMode,
      includeCrossChain,
      useMultiChain: true
    });

    res.json({
      success: true,
      data: {
        ...auditResult,
        analysisType: 'multi-chain-address',
        chainInfo: multiChainWeb3Service.chainConfigs[chain]
      }
    });

  } catch (error) {
    logger.error('Multi-chain address analysis failed', { 
      error: error.message,
      contractAddress: req.body.contractAddress,
      chain: req.body.chain,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Address analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/ai/multi-agent-analysis
 * Direct multi-agent AI analysis
 */
router.post('/multi-agent-analysis', async (req, res) => {
  try {
    const { error, value } = multiAgentAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractCode, agents, analysisMode, aggregationStrategy } = value;

    logger.info('Multi-agent AI analysis requested', {
      codeLength: contractCode.length,
      agents,
      analysisMode,
      ip: req.ip
    });

    // Use AI analysis pipeline directly
    const analysisResult = await aiAnalysisPipeline.analyzeContract({
      contractCode,
      agents,
      analysisMode,
      aggregationStrategy
    });

    res.json({
      success: true,
      data: {
        ...analysisResult,
        analysisType: 'direct-multi-agent'
      }
    });

  } catch (error) {
    logger.error('Multi-agent AI analysis failed', { 
      error: error.message,
      agents: req.body.agents,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'AI analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/defi/analyze
 * DeFi-specific protocol analysis
 */
router.post('/defi-analyze', async (req, res) => {
  try {
    const { error, value } = contractAnalysisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { contractCode, contractName, chain } = value;

    logger.info('DeFi-specific analysis requested', {
      codeLength: contractCode.length,
      chain,
      ip: req.ip
    });

    // Parse contract first
    const contractParser = require('../services/contractParser');
    const parseResult = await contractParser.parseContract(contractCode);

    // Get contract data
    const contractData = {
      sourceCode: { sourceCode: contractCode },
      chain,
      address: 'analysis-only'
    };

    // Run DeFi-specific analysis
    const defiAnalysis = await defiAnalysisEngine.analyzeDeFiContract(contractData, parseResult);

    res.json({
      success: true,
      data: {
        ...defiAnalysis,
        analysisType: 'defi-specialized',
        contractInfo: {
          name: contractName,
          chain,
          functions: parseResult.functions?.length || 0,
          events: parseResult.events?.length || 0
        }
      }
    });

  } catch (error) {
    logger.error('DeFi analysis failed', { 
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'DeFi analysis failed',
      message: error.message
    });
  }
});



/**
 * GET /api/v1/chains/supported
 * Get all supported blockchain networks
 */
router.get('/chains/supported',
  jwtAuth.optionalAuth,
  (req, res) => {
    try {
      const supportedChains = multiChainWeb3Service.getSupportedChains();

      res.json({
        success: true,
        data: {
          chains: supportedChains,
          totalChains: Object.keys(supportedChains).length,
          mainnetChains: Object.values(supportedChains).filter(c => c.type === 'mainnet').length,
          layer2Chains: Object.values(supportedChains).filter(c => c.type === 'layer2').length,
          testnetChains: Object.values(supportedChains).filter(c => c.type === 'testnet').length,
          userAccess: {
            userId: req.user?.id,
            role: req.user?.role,
            canAccessTestnets: req.user?.role !== 'anonymous'
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get supported chains', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve supported chains'
      });
    }
  }
);

/**
 * GET /api/v1/agents/available
 * Get available AI agents and their capabilities
 */
router.get('/agents/available',
  jwtAuth.optionalAuth,
  (req, res) => {
    try {
      const llmService = require('../services/llmService');
      const modelInfo = llmService.getModelInfo();

      res.json({
        success: true,
        data: {
          availableAgents: {
            security: 'Core security vulnerability detection and exploit prevention',
            quality: 'Code quality analysis and gas optimization recommendations',
            economics: 'Economic security, tokenomics analysis, and incentive mechanism review',
            defi: 'DeFi protocol-specific vulnerability detection (AMM, lending, yield farming)',
            crossChain: 'Cross-chain bridge security and multi-chain vulnerability analysis',
            mev: 'MEV extraction detection, frontrunning, and sandwich attack analysis'
          },
          modelConfiguration: modelInfo,
          analysisCapabilities: {
            parallelAnalysis: true,
            crossChainSupport: true,
            defiSpecialization: true,
            realTimeMonitoring: false, // To be implemented in Phase 4
            confidenceScoring: true,
            consensusAggregation: true
          },
          userAccess: {
            userId: req.user?.id,
            role: req.user?.role,
            availableAgents: this.getAvailableAgentsForUser(req.user),
            maxConcurrentAgents: this.getMaxAgentsForUser(req.user)
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get agent information', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent information'
      });
    }
  }
);

/**
 * GET /api/v1/user/rate-limit-status
 * Get current rate limit status for authenticated user
 */
router.get('/user/rate-limit-status',
  jwtAuth.authenticate,
  async (req, res) => {
    try {
      const status = await advancedRateLimiter.getRateLimitStatus(req.user, req.ip);

      res.json({
        success: true,
        data: {
          rateLimitStatus: status,
          userInfo: {
            userId: req.user.id,
            role: req.user.role,
            permissions: req.user.permissions
          },
          recommendations: this.getRateLimitRecommendations(status)
        }
      });
    } catch (error) {
      logger.error('Failed to get rate limit status', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limit status'
      });
    }
  }
);

/**
 * POST /api/v1/auth/api-key
 * Generate API key for service-to-service authentication (admin only)
 */
router.post('/auth/api-key',
  jwtAuth.authenticate,
  jwtAuth.authorize(['admin', 'enterprise']),
  async (req, res) => {
    try {
      const { serviceName, permissions } = req.body;

      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: 'Service name is required'
        });
      }

      const apiKey = jwtAuth.createApiKey({
        name: serviceName,
        permissions: permissions || ['read', 'analyze'],
        createdBy: req.user.id
      });

      logger.info('API key created', {
        serviceName,
        permissions,
        createdBy: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          apiKey,
          serviceName,
          permissions,
          expiresIn: '1 year',
          usage: 'Include in Authorization header as: Bearer <api-key>'
        }
      });

    } catch (error) {
      logger.error('Failed to create API key', {
        error: error.message,
        userId: req.user.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create API key'
      });
    }
  }
);

/**
 * Helper methods
 */
router.getAvailableAgentsForUser = function(user) {
  if (!user || user.role === 'anonymous') {
    return ['security', 'quality'];
  }

  if (user.role === 'premium' || user.role === 'enterprise') {
    return ['security', 'quality', 'economics', 'defi', 'crossChain', 'mev'];
  }

  return ['security', 'quality', 'economics'];
};

router.getMaxAgentsForUser = function(user) {
  if (!user || user.role === 'anonymous') {
    return 2;
  }
  if (user.role === 'premium' || user.role === 'enterprise') {
    return 6;
  }
  return 4;
};

router.getRateLimitRecommendations = function(status) {
  if (!status) {
    return [];
  }

  const recommendations = [];

  if (status.remainingPoints < 5) {
    recommendations.push('Consider upgrading to premium for higher rate limits');
  }

  if (status.limiterType === 'anonymous') {
    recommendations.push('Sign up for an account to get higher rate limits');
  }

  return recommendations;
};

module.exports = router;
