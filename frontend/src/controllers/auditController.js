const express = require('express');
const Joi = require('joi');
const auditEngine = require('../services/auditEngine');
const teeMonitor = require('../services/teeMonitor');
const web3Service = require('../services/web3Service');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const contractAuditSchema = Joi.object({
  contractCode: Joi.string().required().min(1).max(1048576), // 1MB limit
  options: Joi.object({
    includeGasOptimization: Joi.boolean().default(true),
    includeCodeQuality: Joi.boolean().default(true),
    severityFilter: Joi.array().items(Joi.string().valid('Low', 'Medium', 'High', 'Critical')),
  }).default({}),
});

const addressAuditSchema = Joi.object({
  contractAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40}$/),
  chain: Joi.string().valid('ethereum', 'polygon', 'bsc', 'sepolia', 'mumbai', 'bscTestnet').default('ethereum'),
  options: Joi.object({
    includeGasOptimization: Joi.boolean().default(true),
    includeCodeQuality: Joi.boolean().default(true),
    severityFilter: Joi.array().items(Joi.string().valid('Low', 'Medium', 'High', 'Critical')),
  }).default({}),
});

const historyQuerySchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  status: Joi.string().valid('completed', 'failed'),
  riskLevel: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
  contractAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

/**
 * POST /api/audit/contract
 * Audit smart contract from source code
 */
router.post('/contract', async (req, res) => {
  try {
    // Validate request
    const { error, value } = contractAuditSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { contractCode, options } = value;

    logger.info('Contract audit request received', {
      codeLength: contractCode.length,
      ip: req.ip,
    });

    // Perform audit
    const auditResult = await auditEngine.auditContract(contractCode, options);

    // Filter results based on severity filter
    if (options.severityFilter && options.severityFilter.length > 0) {
      auditResult.vulnerabilities = auditResult.vulnerabilities.filter(
        vuln => options.severityFilter.includes(vuln.severity)
      );
    }

    logger.info('Contract audit completed', {
      auditId: auditResult.auditId,
      score: auditResult.overallScore,
      vulnerabilities: auditResult.vulnerabilities.length,
    });

    res.json({
      success: true,
      data: auditResult,
    });

  } catch (error) {
    logger.error('Contract audit failed', { error: error.message });
    res.status(500).json({
      error: 'Audit failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/audit/address
 * Audit deployed contract by address
 */
router.post('/address', async (req, res) => {
  try {
    // Validate request
    const { error, value } = addressAuditSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    const { contractAddress, chain, options } = value;

    logger.info('Address audit request received', {
      contractAddress,
      chain,
      ip: req.ip,
    });

    // Check if chain is supported
    if (!web3Service.isChainSupported(chain)) {
      return res.status(400).json({
        error: 'Unsupported chain',
        message: `Chain '${chain}' is not supported`,
        supportedChains: Object.keys(web3Service.getSupportedChains()),
      });
    }

    // Perform audit
    const auditResult = await auditEngine.auditContractByAddress(
      contractAddress, 
      chain, 
      options
    );

    // Filter results based on severity filter
    if (options.severityFilter && options.severityFilter.length > 0) {
      auditResult.vulnerabilities = auditResult.vulnerabilities.filter(
        vuln => options.severityFilter.includes(vuln.severity)
      );
    }

    logger.info('Address audit completed', {
      auditId: auditResult.auditId,
      contractAddress,
      chain,
      score: auditResult.overallScore,
    });

    res.json({
      success: true,
      data: auditResult,
    });

  } catch (error) {
    logger.error('Address audit failed', { 
      error: error.message,
      contractAddress: req.body.contractAddress,
      chain: req.body.chain,
    });

    // Provide specific error messages for common issues
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes('Invalid contract address')) {
      statusCode = 400;
    } else if (error.message.includes('No contract found')) {
      statusCode = 404;
      errorMessage = 'No contract found at the specified address';
    } else if (error.message.includes('Unsupported chain')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: 'Audit failed',
      message: errorMessage,
    });
  }
});

/**
 * GET /api/audit/history
 * Get audit history with filtering
 */
router.get('/history', async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = historyQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }

    logger.info('Audit history request', { filters: value, ip: req.ip });

    // Get audit history
    const history = await teeMonitor.getAuditHistory(value);

    res.json({
      success: true,
      data: {
        audits: history,
        pagination: {
          limit: value.limit,
          offset: value.offset,
          total: history.length,
        },
        filters: value,
      },
    });

  } catch (error) {
    logger.error('Failed to get audit history', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve audit history',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/statistics
 * Get audit statistics and analytics
 */
router.get('/statistics', async (req, res) => {
  try {
    logger.info('Audit statistics request', { ip: req.ip });

    const statistics = await teeMonitor.getAuditStatistics();

    if (!statistics) {
      return res.status(503).json({
        error: 'Statistics unavailable',
        message: 'TEE Monitor is disabled or statistics could not be generated',
      });
    }

    res.json({
      success: true,
      data: statistics,
    });

  } catch (error) {
    logger.error('Failed to get audit statistics', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/chains
 * Get supported blockchain networks
 */
router.get('/chains', (req, res) => {
  try {
    const supportedChains = web3Service.getSupportedChains();
    
    res.json({
      success: true,
      data: {
        chains: supportedChains,
        total: Object.keys(supportedChains).length,
      },
    });

  } catch (error) {
    logger.error('Failed to get supported chains', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve supported chains',
      message: error.message,
    });
  }
});

/**
 * POST /api/audit/verify-integrity
 * Verify audit log integrity
 */
router.post('/verify-integrity', async (req, res) => {
  try {
    logger.info('Integrity verification request', { ip: req.ip });

    const verification = await teeMonitor.verifyIntegrity();

    res.json({
      success: true,
      data: verification,
    });

  } catch (error) {
    logger.error('Failed to verify integrity', { error: error.message });
    res.status(500).json({
      error: 'Integrity verification failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/audit/health
 * Health check for audit services
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        auditEngine: 'operational',
        teeMonitor: teeMonitor.enabled ? 'operational' : 'disabled',
        web3Service: 'operational',
        llmService: 'operational',
      },
      supportedChains: Object.keys(web3Service.getSupportedChains()),
    };

    // Test LLM service
    try {
      const llmService = require('../services/llmService');
      const modelInfo = llmService.getModelInfo();
      health.services.llmService = modelInfo.configured ? 'operational' : 'not-configured';
      health.llmModel = modelInfo.model;
    } catch (error) {
      health.services.llmService = 'error';
    }

    res.json({
      success: true,
      data: health,
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
    });
  }
});

module.exports = router;
