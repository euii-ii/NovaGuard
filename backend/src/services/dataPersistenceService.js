const supabaseService = require('./supabaseService');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Data Persistence Service
 * Handles all database operations using Supabase for the smart contract auditor
 */
class DataPersistenceService {
  constructor() {
    this.supabase = supabaseService;
    this.enabled = true; // Always enabled with Supabase
  }

  /**
   * Save AI analysis result to database
   * @param {Object} analysisData - Analysis result data
   * @param {string} userId - User ID who performed the analysis
   * @returns {Object} Saved analysis result
   */
  async saveAnalysisResult(analysisData, userId = null) {
    // Validate required fields
    if (!analysisData || typeof analysisData !== 'object') {
      throw new Error('Invalid analysis data provided');
    }

    try {
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

      // Create analysis result record using Supabase
      const auditData = {
        contract_id: contract?.data?.id,
        user_id: userId,
        audit_type: sanitizedData.analysisType || 'multi-agent',
        status: 'completed',
        results: {
          overallScore: this.validateScore(sanitizedData.overallScore),
          riskLevel: this.validateRiskLevel(sanitizedData.riskLevel),
          vulnerabilities: Array.isArray(sanitizedData.vulnerabilities) ? sanitizedData.vulnerabilities : [],
          recommendations: Array.isArray(sanitizedData.recommendations) ? sanitizedData.recommendations : [],
          gasOptimizations: Array.isArray(sanitizedData.gasOptimizations) ? sanitizedData.gasOptimizations : [],
          codeQuality: typeof sanitizedData.codeQuality === 'object' ? sanitizedData.codeQuality : {},
          metadata: {
            agentsUsed: Array.isArray(sanitizedData.metadata?.agentsUsed) ? sanitizedData.metadata.agentsUsed : [],
            failedAgents: Array.isArray(sanitizedData.metadata?.failedAgents) ? sanitizedData.metadata.failedAgents : [],
            analysisVersion: sanitizedData.metadata?.analysisVersion || '2.0.0',
            modelVersions: typeof sanitizedData.metadata?.modelVersions === 'object' ? sanitizedData.metadata.modelVersions : {},
            aggregationMethod: sanitizedData.metadata?.aggregationMethod
          }
        },
        vulnerability_score: this.calculateVulnerabilityScore(sanitizedData.vulnerabilities),
        security_score: this.validateScore(sanitizedData.overallScore),
        confidence_score: this.validateConfidenceScore(sanitizedData.confidenceScore),
        analysis_duration: this.validateExecutionTime(sanitizedData.metadata?.executionTime),
        completed_at: new Date().toISOString()
      };

      const auditResult = await this.supabase.createAuditResult(auditData);

      if (!auditResult.success) {
        throw new Error(`Failed to save audit result: ${auditResult.error}`);
      }

      // Save individual vulnerability instances
      if (analysisData.vulnerabilities && analysisData.vulnerabilities.length > 0) {
        await this.saveVulnerabilityInstances(
          analysisData.vulnerabilities,
          auditResult.data.id
        );
      }

      // Log analytics
      if (userId) {
        await this.supabase.logAnalytics({
          user_id: userId,
          event_type: 'analysis_completed',
          event_data: {
            audit_id: auditResult.data.id,
            analysis_type: analysisData.analysisType,
            overall_score: analysisData.overallScore,
            vulnerabilities_found: analysisData.vulnerabilities?.length || 0
          }
        });
      }

      logger.info('Analysis result saved to Supabase', {
        auditId: auditResult.data.id,
        userId,
        contractAddress: analysisData.contractAddress,
        vulnerabilitiesFound: analysisData.vulnerabilities?.length || 0
      });

      return auditResult.data;

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
      // Try to find existing contract
      const { data: existingContracts } = await this.supabase.admin
        .from('contracts')
        .select('*')
        .eq('contract_address', contractData.address)
        .eq('chain_id', this.getChainId(contractData.chainName))
        .limit(1);

      if (existingContracts && existingContracts.length > 0) {
        // Update existing contract
        const contractResult = await this.supabase.admin
          .from('contracts')
          .update({
            contract_code: contractData.sourceCode || existingContracts[0].contract_code,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContracts[0].id)
          .select()
          .single();

        return contractResult;
      } else {
        // Create new contract
        const contractResult = await this.supabase.createContract({
          contract_address: contractData.address,
          contract_code: contractData.sourceCode || '',
          protocol_type: contractData.protocolType || 'unknown',
          chain_id: this.getChainId(contractData.chainName),
          name: contractData.name || `Contract ${contractData.address.substring(0, 8)}...`,
          description: contractData.description || 'Smart contract for analysis'
        });

        return contractResult;
      }

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
   */
  async saveVulnerabilityInstances(vulnerabilities, analysisResultId) {
    if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
      logger.debug('No vulnerabilities to save');
      return;
    }

    try {
      const instances = vulnerabilities
        .filter(vuln => vuln && typeof vuln === 'object')
        .map(vuln => ({
          audit_result_id: analysisResultId,
          type: vuln.category || vuln.type || 'unknown',
          severity: this.validateSeverity(vuln.severity),
          title: vuln.name || vuln.title || 'Unnamed Vulnerability',
          description: vuln.description || 'No description provided',
          line_number: Array.isArray(vuln.affectedLines) && vuln.affectedLines.length > 0
            ? vuln.affectedLines[0]
            : null,
          code_snippet: vuln.codeSnippet || null,
          recommendation: vuln.recommendation || vuln.fixRecommendation || 'No recommendation provided',
          confidence: this.validateConfidenceScore(vuln.confidence || vuln.finalConfidence || 0.5)
        }))
        .filter(instance => instance !== null); // Remove invalid instances

      if (instances.length > 0) {
        const result = await this.supabase.createVulnerabilities(instances);

        if (!result.success) {
          throw new Error(`Failed to save vulnerabilities: ${result.error}`);
        }

        logger.debug('Vulnerability instances saved', {
          count: instances.length,
          analysisResultId
        });
      }

    } catch (error) {
      logger.error('Failed to save vulnerability instances', { 
        error: error.message,
        analysisResultId 
      });
      throw error;
    }
  }

  /**
   * Calculate vulnerability score based on vulnerabilities
   * @param {Array} vulnerabilities - Array of vulnerabilities
   * @returns {number} Vulnerability score
   */
  calculateVulnerabilityScore(vulnerabilities) {
    if (!Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
      return 100; // Perfect score if no vulnerabilities
    }

    const severityWeights = {
      'critical': 40,
      'high': 25,
      'medium': 10,
      'low': 5,
      'info': 1
    };

    const totalWeight = vulnerabilities.reduce((sum, vuln) => {
      const severity = (vuln.severity || 'low').toLowerCase();
      return sum + (severityWeights[severity] || severityWeights['low']);
    }, 0);

    // Calculate score (0-100, where 100 is best)
    const maxPossibleWeight = vulnerabilities.length * severityWeights['critical'];
    return Math.max(0, Math.round(100 - (totalWeight / maxPossibleWeight) * 100));
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
   * Save analytics event
   * @param {Object} eventData - Event data
   */
  async saveAnalyticsEvent(eventData) {
    try {
      const analyticsData = {
        user_id: eventData.userId,
        event_type: eventData.eventType,
        event_data: {
          sessionId: eventData.sessionId,
          contractAddress: eventData.contractAddress,
          chain: eventData.chain,
          ...eventData.data
        }
      };

      const result = await this.supabase.logAnalytics(analyticsData);

      if (!result.success) {
        throw new Error(`Failed to save analytics: ${result.error}`);
      }

      logger.debug('Analytics event saved', {
        eventType: eventData.eventType,
        userId: eventData.userId
      });

    } catch (error) {
      logger.error('Failed to save analytics event', {
        error: error.message,
        eventType: eventData.eventType
      });
    }
  }

  /**
   * Save monitoring data
   * @param {Object} monitoringData - Monitoring data
   */
  async saveMonitoringData(monitoringData) {
    try {
      const monitoringSessionData = {
        contract_id: monitoringData.contractId,
        user_id: monitoringData.userId,
        session_type: monitoringData.eventType || 'general',
        status: 'active',
        config: {
          blockNumber: monitoringData.blockNumber,
          transactionHash: monitoringData.transactionHash,
          eventData: monitoringData.data,
          severity: monitoringData.severity || 'info',
          analysis: monitoringData.analysis || {}
        }
      };

      const result = await this.supabase.createMonitoringSession(monitoringSessionData);

      if (!result.success) {
        throw new Error(`Failed to save monitoring data: ${result.error}`);
      }

      logger.debug('Monitoring data saved', {
        contractAddress: monitoringData.contractAddress,
        eventType: monitoringData.eventType
      });

    } catch (error) {
      logger.error('Failed to save monitoring data', {
        error: error.message,
        contractAddress: monitoringData.contractAddress
      });
    }
  }

  /**
   * Helper methods
   */
  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
   * Validate severity level
   * @param {string} severity - Severity level
   * @returns {string} Valid severity level
   */
  validateSeverity(severity) {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    const normalizedSeverity = typeof severity === 'string'
      ? severity.toLowerCase()
      : 'low';

    return validSeverities.includes(normalizedSeverity)
      ? normalizedSeverity
      : 'low';
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

  calculateCreditsConsumed(activityType) {
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
