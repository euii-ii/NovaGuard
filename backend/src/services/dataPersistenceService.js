const { 
  User, 
  VulnerabilityPattern, 
  AIAnalysisResult, 
  Contract, 
  VulnerabilityInstance, 
  UserActivity 
} = require('../models');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Data Persistence Service
 * Handles all database operations for the enhanced smart contract auditor
 */
class DataPersistenceService {
  constructor() {
    this.enabled = !!process.env.DATABASE_URL;
  }

  /**
   * Save AI analysis result to database
   * @param {Object} analysisData - Analysis result data
   * @param {string} userId - User ID who performed the analysis
   * @returns {Object} Saved analysis result
   */
  async saveAnalysisResult(analysisData, userId = null) {
    if (!this.enabled) {
      logger.debug('Database not configured, skipping analysis save');
      return null;
    }

    // Validate required fields
    if (!analysisData || typeof analysisData !== 'object') {
      throw new Error('Invalid analysis data provided');
    }

    try {
      // Generate contract code hash with validation
      const contractCodeHash = analysisData.contractCode && typeof analysisData.contractCode === 'string'
        ? crypto.createHash('sha256').update(analysisData.contractCode).digest('hex')
        : null;

      // Find or create contract record
      let contract = null;
      if (analysisData.contractAddress && analysisData.chain) {
        contract = await this.findOrCreateContract({
          address: analysisData.contractAddress,
          chainName: analysisData.chain,
          sourceCode: analysisData.contractCode
        });
      }

      // Validate and sanitize analysis data
      const sanitizedData = this.sanitizeAnalysisData(analysisData);

      // Create analysis result record with validation
      const analysisResult = await AIAnalysisResult.create({
        analysisId: sanitizedData.analysisId || this.generateAnalysisId(),
        userId,
        contractId: contract?.id,
        contractAddress: sanitizedData.contractAddress,
        contractCodeHash,
        chainId: this.getChainId(sanitizedData.chain),
        chainName: sanitizedData.chain,
        analysisType: sanitizedData.analysisType || 'multi-agent',
        agentsUsed: Array.isArray(sanitizedData.metadata?.agentsUsed) ? sanitizedData.metadata.agentsUsed : [],
        failedAgents: Array.isArray(sanitizedData.metadata?.failedAgents) ? sanitizedData.metadata.failedAgents : [],
        overallScore: this.validateScore(sanitizedData.overallScore),
        riskLevel: this.validateRiskLevel(sanitizedData.riskLevel),
        confidenceScore: this.validateConfidenceScore(sanitizedData.confidenceScore),
        vulnerabilitiesFound: Array.isArray(sanitizedData.vulnerabilities) ? sanitizedData.vulnerabilities.length : 0,
        vulnerabilities: Array.isArray(sanitizedData.vulnerabilities) ? sanitizedData.vulnerabilities : [],
        recommendations: Array.isArray(sanitizedData.recommendations) ? sanitizedData.recommendations : [],
        gasOptimizations: Array.isArray(sanitizedData.gasOptimizations) ? sanitizedData.gasOptimizations : [],
        codeQuality: typeof sanitizedData.codeQuality === 'object' ? sanitizedData.codeQuality : {},
        executionTimeMs: this.validateExecutionTime(sanitizedData.metadata?.executionTime),
        analysisVersion: sanitizedData.metadata?.analysisVersion || '2.0.0',
        modelVersions: typeof sanitizedData.metadata?.modelVersions === 'object' ? sanitizedData.metadata.modelVersions : {},
        aggregationMethod: sanitizedData.metadata?.aggregationMethod,
        completedAt: new Date()
      });

      // Save individual vulnerability instances
      if (analysisData.vulnerabilities && analysisData.vulnerabilities.length > 0) {
        await this.saveVulnerabilityInstances(
          analysisData.vulnerabilities,
          analysisResult.id,
          contract?.id
        );
      }

      // Update contract analysis statistics
      if (contract) {
        await this.updateContractAnalysisStats(contract.id);
      }

      // Log user activity
      if (userId) {
        await this.logUserActivity(userId, 'analysis_completed', 'analysis', analysisResult.id, {
          analysisType: analysisData.analysisType,
          overallScore: analysisData.overallScore,
          vulnerabilitiesFound: analysisData.vulnerabilities?.length || 0
        });
      }

      logger.info('Analysis result saved to database', {
        analysisId: analysisResult.analysisId,
        userId,
        contractAddress: analysisData.contractAddress,
        vulnerabilitiesFound: analysisData.vulnerabilities?.length || 0
      });

      return analysisResult;

    } catch (error) {
      logger.error('Failed to save analysis result', { 
        error: error.message,
        userId,
        contractAddress: analysisData.contractAddress 
      });
      throw error;
    }
  }

  /**
   * Find or create contract record
   * @param {Object} contractData - Contract data
   * @returns {Object} Contract record
   */
  async findOrCreateContract(contractData) {
    try {
      const [contract, created] = await Contract.findOrCreate({
        where: {
          address: contractData.address,
          chainId: this.getChainId(contractData.chainName)
        },
        defaults: {
          address: contractData.address,
          chainId: this.getChainId(contractData.chainName),
          chainName: contractData.chainName,
          name: contractData.name,
          sourceCode: contractData.sourceCode,
          sourceVerified: !!contractData.sourceCode,
          firstAnalyzedAt: new Date(),
          lastAnalyzedAt: new Date(),
          analysisCount: 0
        }
      });

      if (!created) {
        // Update existing contract
        await contract.update({
          lastAnalyzedAt: new Date(),
          sourceCode: contractData.sourceCode || contract.sourceCode,
          sourceVerified: !!contractData.sourceCode || contract.sourceVerified
        });
      }

      return contract;

    } catch (error) {
      logger.error('Failed to find or create contract', { 
        error: error.message,
        contractAddress: contractData.address 
      });
      throw error;
    }
  }

  /**
   * Save vulnerability instances
   * @param {Array} vulnerabilities - Vulnerability data
   * @param {string} analysisResultId - Analysis result ID
   * @param {string} contractId - Contract ID
   */
  async saveVulnerabilityInstances(vulnerabilities, analysisResultId, contractId) {
    if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
      logger.debug('No vulnerabilities to save');
      return;
    }

    try {
      const instances = vulnerabilities
        .filter(vuln => vuln && typeof vuln === 'object')
        .map(vuln => this.sanitizeVulnerabilityInstance({
          analysisResultId,
          contractId,
          name: vuln.name,
          description: vuln.description,
          severity: vuln.severity,
          category: vuln.category,
          confidence: vuln.confidence || vuln.finalConfidence || 0.5,
          affectedLines: vuln.affectedLines || [],
          codeSnippet: vuln.codeSnippet,
          functionName: vuln.functionName,
          detectedBy: vuln.detectedBy || 'unknown',
          detectionMethod: vuln.detectionMethod || 'ai',
          impactDescription: vuln.impact,
          exploitScenario: vuln.exploitScenario,
          fixRecommendation: vuln.recommendation,
          status: 'open',
          verified: false
        }))
        .filter(instance => instance !== null); // Remove invalid instances

      await VulnerabilityInstance.bulkCreate(instances);

      logger.debug('Vulnerability instances saved', {
        count: instances.length,
        analysisResultId
      });

    } catch (error) {
      logger.error('Failed to save vulnerability instances', { 
        error: error.message,
        analysisResultId 
      });
      throw error;
    }
  }

  /**
   * Update contract analysis statistics
   * @param {string} contractId - Contract ID
   */
  async updateContractAnalysisStats(contractId) {
    try {
      const contract = await Contract.findByPk(contractId);
      if (contract) {
        await contract.increment('analysisCount');
        await contract.update({ lastAnalyzedAt: new Date() });
      }
    } catch (error) {
      logger.error('Failed to update contract stats', { 
        error: error.message,
        contractId 
      });
    }
  }

  /**
   * Log user activity
   * @param {string} userId - User ID
   * @param {string} activityType - Type of activity
   * @param {string} resourceType - Type of resource
   * @param {string} resourceId - Resource ID
   * @param {Object} activityData - Additional activity data
   */
  async logUserActivity(userId, activityType, resourceType, resourceId, activityData = {}) {
    if (!this.enabled) return;

    try {
      await UserActivity.create({
        userId,
        activityType,
        resourceType,
        resourceId,
        activityData,
        creditsConsumed: this.calculateCreditsConsumed(activityType, activityData)
      });
    } catch (error) {
      logger.error('Failed to log user activity', { 
        error: error.message,
        userId,
        activityType 
      });
    }
  }

  /**
   * Get analysis history for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Analysis history
   */
  async getAnalysisHistory(userId, options = {}) {
    if (!this.enabled) return [];

    try {
      const { limit = 50, offset = 0, chainName, analysisType } = options;
      
      const whereClause = { userId };
      if (chainName) whereClause.chainName = chainName;
      if (analysisType) whereClause.analysisType = analysisType;

      const results = await AIAnalysisResult.findAll({
        where: whereClause,
        include: [
          {
            model: Contract,
            attributes: ['address', 'chainName', 'name', 'protocolType']
          },
          {
            model: VulnerabilityInstance,
            attributes: ['severity', 'category', 'name']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return results;

    } catch (error) {
      logger.error('Failed to get analysis history', { 
        error: error.message,
        userId 
      });
      return [];
    }
  }

  /**
   * Get vulnerability statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Vulnerability statistics
   */
  async getVulnerabilityStats(filters = {}) {
    if (!this.enabled) return {};

    try {
      const { timeRange = '30d', chainName, severity } = filters;
      const startDate = this.getStartDate(timeRange);

      const whereClause = {
        createdAt: { [require('sequelize').Op.gte]: startDate }
      };

      if (chainName) {
        whereClause['$AIAnalysisResult.chainName$'] = chainName;
      }
      if (severity) {
        whereClause.severity = severity;
      }

      const stats = await VulnerabilityInstance.findAll({
        attributes: [
          'severity',
          'category',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        include: [{
          model: AIAnalysisResult,
          attributes: []
        }],
        where: whereClause,
        group: ['severity', 'category'],
        raw: true
      });

      return this.formatVulnerabilityStats(stats);

    } catch (error) {
      logger.error('Failed to get vulnerability stats', { error: error.message });
      return {};
    }
  }

  /**
   * Helper methods
   */
  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize analysis data to prevent injection and ensure data integrity
   * @param {Object} analysisData - Raw analysis data
   * @returns {Object} Sanitized analysis data
   */
  sanitizeAnalysisData(analysisData) {
    const sanitized = { ...analysisData };

    // Sanitize string fields
    if (typeof sanitized.contractAddress === 'string') {
      sanitized.contractAddress = sanitized.contractAddress.trim().toLowerCase();
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(sanitized.contractAddress)) {
        sanitized.contractAddress = null;
      }
    }

    if (typeof sanitized.chain === 'string') {
      sanitized.chain = sanitized.chain.trim().toLowerCase();
    }

    if (typeof sanitized.analysisType === 'string') {
      sanitized.analysisType = sanitized.analysisType.trim();
    }

    return sanitized;
  }

  /**
   * Validate overall score
   * @param {number} score - Score to validate
   * @returns {number} Valid score between 0-100
   */
  validateScore(score) {
    if (typeof score !== 'number' || isNaN(score)) {
      return 50; // Default score
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Validate risk level
   * @param {string} riskLevel - Risk level to validate
   * @returns {string} Valid risk level
   */
  validateRiskLevel(riskLevel) {
    const validLevels = ['Low', 'Medium', 'High', 'Critical'];
    return validLevels.includes(riskLevel) ? riskLevel : 'Medium';
  }

  /**
   * Validate confidence score
   * @param {number} confidence - Confidence score to validate
   * @returns {number} Valid confidence between 0-1
   */
  validateConfidenceScore(confidence) {
    if (typeof confidence !== 'number' || isNaN(confidence)) {
      return 0.5; // Default confidence
    }
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Validate execution time
   * @param {number} executionTime - Execution time in milliseconds
   * @returns {number} Valid execution time
   */
  validateExecutionTime(executionTime) {
    if (typeof executionTime !== 'number' || isNaN(executionTime) || executionTime < 0) {
      return null;
    }
    return Math.round(executionTime);
  }

  /**
   * Sanitize vulnerability instance data
   * @param {Object} instance - Raw vulnerability instance
   * @returns {Object|null} Sanitized instance or null if invalid
   */
  sanitizeVulnerabilityInstance(instance) {
    // Validate required fields
    if (!instance.name || !instance.description || !instance.severity) {
      logger.warn('Invalid vulnerability instance: missing required fields', {
        name: instance.name,
        description: !!instance.description,
        severity: instance.severity
      });
      return null;
    }

    // Validate severity
    const validSeverities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validSeverities.includes(instance.severity)) {
      logger.warn('Invalid severity level', { severity: instance.severity });
      instance.severity = 'Medium';
    }

    // Validate confidence
    instance.confidence = this.validateConfidenceScore(instance.confidence);

    // Sanitize arrays
    if (!Array.isArray(instance.affectedLines)) {
      instance.affectedLines = [];
    }

    // Sanitize strings
    if (typeof instance.name === 'string') {
      instance.name = instance.name.trim().substring(0, 255);
    }

    if (typeof instance.description === 'string') {
      instance.description = instance.description.trim();
    }

    if (typeof instance.category === 'string') {
      instance.category = instance.category.trim().substring(0, 100);
    }

    if (typeof instance.detectedBy === 'string') {
      instance.detectedBy = instance.detectedBy.trim().substring(0, 50);
    }

    return instance;
  }

  getChainId(chainName) {
    const chainIds = {
      ethereum: 1,
      polygon: 137,
      bsc: 56,
      arbitrum: 42161,
      optimism: 10,
      base: 8453,
      zksync: 324,
      sepolia: 11155111,
      mumbai: 80001
    };
    return chainIds[chainName] || 0;
  }

  calculateCreditsConsumed(activityType, activityData) {
    const creditCosts = {
      analysis_completed: 1,
      multi_agent_analysis: 3,
      defi_analysis: 2,
      monitoring_started: 5
    };
    return creditCosts[activityType] || 0;
  }

  getStartDate(timeRange) {
    const days = parseInt(timeRange.replace('d', '')) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  formatVulnerabilityStats(stats) {
    const formatted = {
      bySeverity: {},
      byCategory: {},
      total: 0
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      formatted.total += count;
      
      if (!formatted.bySeverity[stat.severity]) {
        formatted.bySeverity[stat.severity] = 0;
      }
      formatted.bySeverity[stat.severity] += count;
      
      if (!formatted.byCategory[stat.category]) {
        formatted.byCategory[stat.category] = 0;
      }
      formatted.byCategory[stat.category] += count;
    });

    return formatted;
  }
}

module.exports = new DataPersistenceService();
