const express = require('express');
const Joi = require('joi');
const auditEngine = require('../services/auditEngine');
const aiAnalysisPipeline = require('../services/aiAnalysisPipeline');
const multiChainWeb3Service = require('../services/multiChainWeb3Service');
const defiAnalysisEngine = require('../services/defiAnalysisEngine');
const teamCollaborationService = require('../services/teamCollaborationService');
const supabaseAuth = require('../middleware/supabaseAuth');
const advancedRateLimiter = require('../middleware/advancedRateLimiter');
const logger = require('../utils/logger');
const supabaseService = require('../services/supabaseService');
const { v4: uuidv4 } = require('uuid');

// Import AI analysis services for enhanced functionality
const llmService = require('../services/llmService');

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
 * POST /api/audit/contract
 * Analyze smart contract from source code
 */
router.post('/contract', supabaseAuth.optionalAuth, async (req, res) => {
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
    const userId = req.user?.id;

    logger.info('Contract analysis request received', {
      codeLength: contractCode.length,
      chain,
      analysisMode,
      userId,
      ip: req.ip
    });

    // Start audit analysis
    const auditResult = await auditEngine.analyzeContract({
      contractCode,
      contractName,
      chain,
      agents,
      analysisMode,
      priority,
      userId
    });

    res.json({
      success: true,
      auditId: auditResult.auditId,
      status: auditResult.status,
      estimatedCompletion: auditResult.estimatedCompletion,
      message: 'Contract analysis started successfully'
    });

  } catch (error) {
    logger.error('Contract analysis failed', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/address
 * Analyze deployed contract by address
 */
router.post('/address', supabaseAuth.optionalAuth, async (req, res) => {
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
    const userId = req.user?.id;

    logger.info('Address analysis request received', {
      contractAddress,
      chain,
      analysisMode,
      userId,
      ip: req.ip
    });

    // Verify contract exists on chain
    const contractExists = await multiChainWeb3Service.verifyContract(contractAddress, chain);
    if (!contractExists) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
        message: `Contract ${contractAddress} not found on ${chain}`
      });
    }

    // Start address analysis
    const auditResult = await auditEngine.analyzeAddress({
      contractAddress,
      chain,
      agents,
      analysisMode,
      includeCrossChain,
      userId
    });

    res.json({
      success: true,
      auditId: auditResult.auditId,
      status: auditResult.status,
      estimatedCompletion: auditResult.estimatedCompletion,
      message: 'Address analysis started successfully'
    });

  } catch (error) {
    logger.error('Address analysis failed', {
      error: error.message,
      contractAddress: req.body.contractAddress,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/comprehensive
 * Start comprehensive audit with AI analysis
 */
router.post('/comprehensive', supabaseAuth.optionalAuth, async (req, res) => {
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
    const userId = req.user?.id;

    logger.info('Comprehensive audit request received', {
      hasCode: !!contractCode,
      hasAddress: !!contractAddress,
      options: analysisOptions,
      userId,
      ip: req.ip
    });

    // Start comprehensive audit
    const auditResult = await auditEngine.startComprehensiveAudit({
      contractCode,
      contractAddress,
      analysisOptions,
      userId
    });

    // If team review is enabled, set up collaboration
    if (analysisOptions.enableTeamReview && userId) {
      await teamCollaborationService.setupTeamReview(auditResult.auditId, userId);
    }

    res.json({
      success: true,
      auditId: auditResult.auditId,
      status: auditResult.status,
      estimatedCompletion: auditResult.estimatedCompletion,
      teamReviewEnabled: analysisOptions.enableTeamReview,
      message: 'Comprehensive audit started successfully'
    });

  } catch (error) {
    logger.error('Comprehensive audit failed', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Audit failed',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/verify
 * Verify contract on blockchain
 */
router.post('/verify', supabaseAuth.authenticate, async (req, res) => {
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
    const userId = req.user.id;

    logger.info('Contract verification request received', {
      contractAddress,
      chain,
      userId,
      ip: req.ip
    });

    // Verify contract
    const verificationResult = await multiChainWeb3Service.verifyContractSource(contractAddress, chain);

    res.json({
      success: true,
      verification: verificationResult,
      message: 'Contract verification completed'
    });

  } catch (error) {
    logger.error('Contract verification failed', {
      error: error.message,
      contractAddress: req.body.contractAddress,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/upload
 * Upload contract and store in Supabase with analysis
 */
router.post('/upload', supabaseAuth.authenticate, async (req, res) => {
  try {
    const { contract_code, contract_name, chain = 'ethereum', contract_address } = req.body;

    if (!contract_code || contract_code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required'
      });
    }

    logger.info('Contract upload request received', {
      codeLength: contract_code.length,
      contractName: contract_name,
      chain,
      userId: req.user.id,
      ip: req.ip
    });

    // Store contract in Supabase
    const contractResult = await supabaseService.createContract({
      contract_code,
      contract_name: contract_name || `Contract_${Date.now()}`,
      chain,
      contract_address,
      user_id: req.user.id,
      file_hash: require('crypto').createHash('sha256').update(contract_code).digest('hex')
    });

    if (!contractResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to store contract'
      });
    }

    // Start audit process
    const auditResult = await supabaseService.createAuditResult({
      contract_id: contractResult.data.id,
      user_id: req.user.id,
      audit_type: 'full',
      status: 'processing'
    });

    if (!auditResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create audit record'
      });
    }

    // Start analysis asynchronously
    performContractAnalysis(auditResult.data.id, contractResult.data, req.user.id);

    res.json({
      success: true,
      data: {
        contract: contractResult.data,
        audit: auditResult.data
      }
    });

  } catch (error) {
    logger.error('Contract upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/audit/multi-agent
 * Multi-agent analysis with Supabase storage
 */
router.post('/multi-agent', supabaseAuth.authenticate, async (req, res) => {
  try {
    const { contract_code, analysis_type = 'comprehensive', contract_name, chain = 'ethereum' } = req.body;

    if (!contract_code || contract_code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contract code is required'
      });
    }

    logger.info('Multi-agent analysis request received', {
      codeLength: contract_code.length,
      analysisType: analysis_type,
      userId: req.user.id,
      ip: req.ip
    });

    // Store contract in Supabase
    const contractResult = await supabaseService.createContract({
      contract_code,
      contract_name: contract_name || `MultiAgent_${Date.now()}`,
      chain,
      user_id: req.user.id,
      file_hash: require('crypto').createHash('sha256').update(contract_code).digest('hex')
    });

    if (!contractResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to store contract'
      });
    }

    // Create audit record
    const auditResult = await supabaseService.createAuditResult({
      contract_id: contractResult.data.id,
      user_id: req.user.id,
      audit_type: analysis_type,
      status: 'processing'
    });

    // Start multi-agent analysis
    const analysis = await performMultiAgentAnalysis(contract_code, analysis_type);

    // Update audit result
    const updateResult = await supabaseService.updateAuditResult(auditResult.data.id, {
      status: 'completed',
      results: analysis.results,
      agent_results: analysis.agentResults,
      vulnerability_score: analysis.scores.vulnerability,
      security_score: analysis.scores.security,
      gas_optimization_score: analysis.scores.gasOptimization,
      confidence_score: analysis.confidence,
      completed_at: new Date().toISOString()
    });

    // Create vulnerabilities if found
    if (analysis.vulnerabilities && analysis.vulnerabilities.length > 0) {
      const vulnerabilityData = analysis.vulnerabilities.map(vuln => ({
        audit_result_id: auditResult.data.id,
        type: vuln.type,
        severity: vuln.severity,
        title: vuln.title,
        description: vuln.description,
        line_number: vuln.lineNumber,
        code_snippet: vuln.codeSnippet,
        recommendation: vuln.recommendation,
        confidence: vuln.confidence
      }));

      await supabaseService.createVulnerabilities(vulnerabilityData);
    }

    res.json({
      success: true,
      data: {
        audit_id: auditResult.data.id,
        analysis: analysis,
        status: 'completed'
      }
    });

  } catch (error) {
    logger.error('Multi-agent analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed'
    });
  }
});

/**
 * GET /api/audit/results/:auditId
 * Get audit results with AI insights
 */
router.get('/results/:auditId', supabaseAuth.optionalAuth, async (req, res) => {
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
    if (includeAIInsights === 'true') {
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
      auditId: req.params.auditId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit results'
    });
  }
});

/**
 * GET /api/audit/history
 * Get audit history with analytics
 */
router.get('/history', supabaseAuth.authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, filter = {} } = req.query;
    const userId = req.user.id;

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
 * GET /api/audit/report/:auditId
 * Generate audit report
 */
router.get('/report/:auditId', supabaseAuth.optionalAuth, async (req, res) => {
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
    }

    res.json({
      success: true,
      report,
      format
    });

  } catch (error) {
    logger.error('Failed to generate audit report', {
      error: error.message,
      auditId: req.params.auditId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * POST /api/audit/defi/analyze
 * Analyze DeFi protocol
 */
router.post('/defi/analyze', supabaseAuth.authenticate, async (req, res) => {
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
    const userId = req.user.id;

    logger.info('DeFi analysis request received', {
      codeLength: contractCode.length,
      protocolType,
      autoDetectProtocol,
      userId,
      ip: req.ip
    });

    // Start DeFi analysis
    const analysisResult = await defiAnalysisEngine.analyzeProtocol({
      contractCode,
      protocolType,
      agents,
      autoDetectProtocol,
      userId
    });

    res.json({
      success: true,
      analysisId: analysisResult.analysisId,
      detectedProtocol: analysisResult.detectedProtocol,
      status: analysisResult.status,
      estimatedCompletion: analysisResult.estimatedCompletion,
      message: 'DeFi analysis started successfully'
    });

  } catch (error) {
    logger.error('DeFi analysis failed', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'DeFi analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/team-review
 * Start team-based audit review
 */
router.post('/team-review', supabaseAuth.authenticate, async (req, res) => {
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
    const userId = req.user.id;

    logger.info('Team audit review request received', {
      auditId,
      teamId,
      userId,
      ip: req.ip
    });

    // Start team review
    const reviewResult = await teamCollaborationService.startTeamReview({
      auditId,
      teamId,
      reviewConfig,
      initiatedBy: userId
    });

    res.json({
      success: true,
      reviewId: reviewResult.reviewId,
      status: reviewResult.status,
      teamMembers: reviewResult.teamMembers,
      message: 'Team review started successfully'
    });

  } catch (error) {
    logger.error('Team review failed', {
      error: error.message,
      auditId: req.body.auditId,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Team review failed',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/chains/supported
 * Get all supported blockchain networks
 */
router.get('/chains/supported', supabaseAuth.optionalAuth, (req, res) => {
  try {
    const supportedChains = multiChainWeb3Service.getSupportedChains();

    res.json({
      success: true,
      chains: supportedChains,
      total: Object.keys(supportedChains).length
    });

  } catch (error) {
    logger.error('Failed to get supported chains', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve supported chains'
    });
  }
});

/**
 * GET /api/audit/agents/available
 * Get available AI agents and their capabilities
 */
router.get('/agents/available', supabaseAuth.optionalAuth, (req, res) => {
  try {
    const llmService = require('../services/llmService');
    const modelInfo = llmService.getModelInfo();

    const availableAgents = {
      security: {
        name: 'Security Agent',
        description: 'Specialized in vulnerability detection and security analysis',
        capabilities: ['vulnerability_detection', 'access_control_analysis', 'reentrancy_detection'],
        model: modelInfo.primary
      },
      quality: {
        name: 'Code Quality Agent',
        description: 'Focuses on code quality, best practices, and optimization',
        capabilities: ['code_quality', 'gas_optimization', 'best_practices'],
        model: modelInfo.primary
      },
      economics: {
        name: 'Economics Agent',
        description: 'Analyzes tokenomics and economic mechanisms',
        capabilities: ['tokenomics_analysis', 'economic_modeling', 'incentive_analysis'],
        model: modelInfo.secondary
      },
      defi: {
        name: 'DeFi Agent',
        description: 'Specialized in DeFi protocol analysis',
        capabilities: ['defi_analysis', 'liquidity_analysis', 'yield_farming'],
        model: modelInfo.primary
      },
      crossChain: {
        name: 'Cross-Chain Agent',
        description: 'Analyzes cross-chain interactions and bridge security',
        capabilities: ['bridge_analysis', 'cross_chain_security', 'interoperability'],
        model: modelInfo.secondary
      },
      mev: {
        name: 'MEV Agent',
        description: 'Analyzes MEV opportunities and protection mechanisms',
        capabilities: ['mev_analysis', 'frontrunning_detection', 'sandwich_protection'],
        model: modelInfo.secondary
      }
    };

    res.json({
      success: true,
      agents: availableAgents,
      total: Object.keys(availableAgents).length
    });

  } catch (error) {
    logger.error('Failed to get available agents', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve available agents'
    });
  }
});

/**
 * GET /api/audit/user/rate-limit-status
 * Get current rate limit status for authenticated user
 */
router.get('/user/rate-limit-status', supabaseAuth.authenticate, async (req, res) => {
  try {
    const status = await advancedRateLimiter.getRateLimitStatus(req.user, req.ip);

    res.json({
      success: true,
      rateLimitStatus: status
    });

  } catch (error) {
    logger.error('Failed to get rate limit status', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve rate limit status'
    });
  }
});

/**
 * POST /api/audit/auth/api-key
 * Generate API key for service-to-service authentication (admin only)
 */
router.post('/auth/api-key',
  supabaseAuth.authenticate,
  supabaseAuth.authorize(['admin', 'enterprise']),
  async (req, res) => {
    try {
      const { serviceName, permissions } = req.body;

      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: 'Service name is required'
        });
      }

      // Generate API key using crypto for Supabase
      const crypto = require('crypto');
      const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;

      // Store API key in user record via Supabase
      const supabaseService = require('../services/supabaseService');
      const updateResult = await supabaseService.updateUser(req.user.id, {
        api_key: apiKey,
        api_key_permissions: permissions || ['read', 'analyze'],
        api_key_service_name: serviceName
      });

      if (!updateResult.success) {
        throw new Error('Failed to store API key');
      }

      logger.info('API key generated', {
        userId: req.user.id,
        serviceName,
        permissions: permissions || ['read', 'analyze']
      });

      res.json({
        success: true,
        apiKey,
        serviceName,
        permissions: permissions || ['read', 'analyze'],
        message: 'API key generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate API key', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate API key'
      });
    }
  }
);

/**
 * GET /api/audit/statistics
 * Get audit statistics and analytics
 */
router.get('/statistics', supabaseAuth.optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Get statistics from audit engine
    const statistics = await auditEngine.getStatistics(userId);

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    logger.error('Failed to get audit statistics', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
});

// Helper functions for Supabase-based analysis

/**
 * Perform contract analysis (async function)
 */
async function performContractAnalysis(auditId, contract, userId) {
  try {
    const startTime = Date.now();

    // Run various analyses
    const [
      vulnerabilityAnalysis,
      gasOptimizationAnalysis,
      securityAnalysis
    ] = await Promise.all([
      vulnerabilityDetectionService.analyzeContract(contract.contract_code),
      gasOptimizationAnalyzer.analyzeContract(contract.contract_code),
      aiModelService.analyzeContractSecurity(contract.contract_code)
    ]);

    const analysisTime = Date.now() - startTime;

    // Combine results
    const combinedResults = {
      vulnerability: vulnerabilityAnalysis,
      gasOptimization: gasOptimizationAnalysis,
      security: securityAnalysis,
      analysisMetrics: {
        duration: analysisTime,
        timestamp: new Date().toISOString()
      }
    };

    // Calculate scores
    const scores = {
      vulnerability: calculateVulnerabilityScore(vulnerabilityAnalysis),
      security: calculateSecurityScore(securityAnalysis),
      gasOptimization: calculateGasScore(gasOptimizationAnalysis)
    };

    // Update audit result
    await supabaseService.updateAuditResult(auditId, {
      status: 'completed',
      results: combinedResults,
      vulnerability_score: scores.vulnerability,
      security_score: scores.security,
      gas_optimization_score: scores.gasOptimization,
      confidence_score: 0.85, // Default confidence
      analysis_duration: analysisTime,
      completed_at: new Date().toISOString()
    });

    logger.info('Contract analysis completed', {
      auditId,
      analysisTime,
      scores
    });

  } catch (error) {
    logger.error('Contract analysis failed', {
      auditId,
      error: error.message
    });

    // Update audit result with error status
    await supabaseService.updateAuditResult(auditId, {
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString()
    });
  }
}

/**
 * Calculate vulnerability score based on analysis results
 */
function calculateVulnerabilityScore(vulnerabilityAnalysis) {
  if (!vulnerabilityAnalysis || !vulnerabilityAnalysis.vulnerabilities) {
    return 100; // No vulnerabilities found
  }

  const vulnerabilities = vulnerabilityAnalysis.vulnerabilities;
  let score = 100;

  vulnerabilities.forEach(vuln => {
    switch (vuln.severity?.toLowerCase()) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 8;
        break;
      case 'low':
        score -= 3;
        break;
      default:
        score -= 1;
    }
  });

  return Math.max(0, score);
}

/**
 * Calculate security score based on analysis results
 */
function calculateSecurityScore(securityAnalysis) {
  if (!securityAnalysis) return 50; // Default score

  // This would be based on your AI model's security analysis
  // For now, return a score based on the analysis confidence
  return securityAnalysis.confidence ? Math.round(securityAnalysis.confidence * 100) : 75;
}

/**
 * Calculate gas optimization score
 */
function calculateGasScore(gasAnalysis) {
  if (!gasAnalysis) return 50; // Default score

  // Calculate based on optimization opportunities found
  const optimizations = gasAnalysis.optimizations || [];
  let score = 100;

  optimizations.forEach(opt => {
    const impact = opt.impact || 'low';
    switch (impact.toLowerCase()) {
      case 'high':
        score -= 10;
        break;
      case 'medium':
        score -= 5;
        break;
      case 'low':
        score -= 2;
        break;
    }
  });

  return Math.max(0, score);
}

/**
 * Multi-agent analysis function
 */
async function performMultiAgentAnalysis(contractCode, analysisType) {
  try {
    // Use aiAnalysisPipeline for multi-agent analysis
    const analysisConfig = {
      contractCode,
      agents: ['security', 'quality'],
      analysisMode: analysisType || 'standard'
    };

    // Add more agents for comprehensive analysis
    if (analysisType === 'comprehensive') {
      analysisConfig.agents.push('economics', 'defi', 'crossChain', 'gasOptimization');
    }

    const results = await aiAnalysisPipeline.analyzeContract(analysisConfig);

    const scores = {
      vulnerability: calculateVulnerabilityScore(results.vulnerabilities),
      security: calculateSecurityScore(results.security),
      gasOptimization: calculateGasScore(results.gasOptimization)
    };

    // Extract vulnerabilities for database storage
    const vulnerabilities = results.vulnerabilities?.vulnerabilities || [];

    return {
      results,
      agentResults: {
        securityAgent: results.security,
        vulnerabilityAgent: results.vulnerabilities,
        gasOptimizationAgent: results.gasOptimization,
        crossChainAgent: results.crossChain
      },
      scores,
      vulnerabilities,
      confidence: 0.85, // Default confidence score
      analysisType
    };

  } catch (error) {
    logger.error('Multi-agent analysis failed:', error);
    throw error;
  }
}

module.exports = router;
