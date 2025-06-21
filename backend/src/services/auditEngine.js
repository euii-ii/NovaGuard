const contractParser = require('./contractParser');
const llmService = require('./llmService');
const aiAnalysisPipeline = require('./aiAnalysisPipeline');
const web3Service = require('./web3Service');
const multiChainWeb3Service = require('./multiChainWeb3Service');
const dataPersistenceService = require('./dataPersistenceService');
const teeMonitor = require('./teeMonitor');
const logger = require('../utils/logger');

class AuditEngine {
  constructor() {
    this.maxContractSize = parseInt(process.env.MAX_CONTRACT_SIZE_BYTES) || 1048576; // 1MB
    this.vulnerabilityThresholds = {
      high: parseInt(process.env.VULNERABILITY_THRESHOLD_HIGH) || 80,
      medium: parseInt(process.env.VULNERABILITY_THRESHOLD_MEDIUM) || 50,
    };
  }

  /**
   * Audit smart contract from source code
   * @param {string} contractCode - Solidity source code
   * @param {Object} options - Audit options
   * @returns {Object} Comprehensive audit report
   */
  async auditContract(contractCode, options = {}) {
    const auditId = this.generateAuditId();
    const startTime = Date.now();

    try {
      logger.info('Starting contract audit', { auditId, codeLength: contractCode.length });

      // Validate input
      this.validateContractInput(contractCode);

      // Parse contract
      const parseResult = await contractParser.parseContract(contractCode);

      // Perform enhanced AI analysis using multi-agent pipeline
      const aiAnalysis = await aiAnalysisPipeline.analyzeContract({
        contractCode,
        contractAddress: options.contractAddress,
        chain: options.chain,
        agents: options.agents,
        analysisMode: options.analysisMode || 'comprehensive'
      });

      // Combine static analysis and AI results
      const combinedAnalysis = this.combineAnalysisResults(parseResult, aiAnalysis);

      // Calculate final scores
      const scores = this.calculateSecurityScores(combinedAnalysis);

      // Generate comprehensive report
      const auditReport = this.generateAuditReport({
        auditId,
        contractCode,
        parseResult,
        aiAnalysis,
        combinedAnalysis,
        scores,
        options,
        executionTime: Date.now() - startTime,
      });

      // Save analysis result to database
      try {
        await dataPersistenceService.saveAnalysisResult({
          analysisId: auditId,
          contractCode,
          contractAddress: options.contractAddress,
          chain: options.chain,
          analysisType: aiAnalysis.analysisType || 'multi-agent',
          overallScore: auditReport.overallScore,
          riskLevel: auditReport.riskLevel,
          confidenceScore: aiAnalysis.confidenceScore,
          vulnerabilities: auditReport.vulnerabilities,
          recommendations: auditReport.recommendations,
          gasOptimizations: auditReport.gasOptimizations,
          codeQuality: auditReport.codeQuality,
          metadata: {
            agentsUsed: aiAnalysis.metadata?.agentsUsed || [],
            failedAgents: aiAnalysis.metadata?.failedAgents || [],
            executionTime: Date.now() - startTime,
            analysisVersion: '2.0.0',
            aggregationMethod: 'weighted-consensus'
          }
        }, options.userId);
      } catch (error) {
        logger.error('Failed to save analysis result to database', {
          error: error.message,
          auditId
        });
        // Don't fail the audit if database save fails
      }

      // Log audit to TEE monitor
      await teeMonitor.logAudit(auditReport);

      logger.info('Contract audit completed', {
        auditId,
        score: scores.overall,
        vulnerabilities: combinedAnalysis.vulnerabilities.length,
        executionTime: Date.now() - startTime
      });

      return auditReport;

    } catch (error) {
      logger.error('Contract audit failed', { auditId, error: error.message });
      
      // Log failed audit
      await teeMonitor.logAudit({
        auditId,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Audit deployed contract by address
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain name
   * @param {Object} options - Audit options
   * @returns {Object} Comprehensive audit report
   */
  async auditContractByAddress(contractAddress, chain = 'ethereum', options = {}) {
    const auditId = this.generateAuditId();
    const startTime = Date.now();

    try {
      logger.info('Starting contract audit by address', { 
        auditId, 
        contractAddress, 
        chain 
      });

      // Validate address
      if (!web3Service.isValidAddress(contractAddress)) {
        throw new Error('Invalid contract address format');
      }

      if (!web3Service.isChainSupported(chain)) {
        throw new Error(`Unsupported blockchain: ${chain}`);
      }

      // Fetch contract from blockchain
      const contractData = await web3Service.getContractFromAddress(contractAddress, chain);

      if (!contractData.sourceCode?.sourceCode) {
        // If no source code available, perform bytecode analysis
        return this.auditBytecode(contractData, auditId, startTime);
      }

      // Audit the source code
      const auditResult = await this.auditContract(contractData.sourceCode.sourceCode, {
        ...options,
        contractAddress,
        chain,
        contractData,
      });

      // Enhance report with blockchain data
      auditResult.contractInfo = {
        ...auditResult.contractInfo,
        address: contractAddress,
        chain,
        chainId: contractData.chainId,
        balance: contractData.balance,
        transactionCount: contractData.transactionCount,
        compilerInfo: contractData.sourceCode,
      };

      return auditResult;

    } catch (error) {
      logger.error('Contract audit by address failed', { 
        auditId, 
        contractAddress, 
        chain, 
        error: error.message 
      });

      // Log failed audit
      await teeMonitor.logAudit({
        auditId,
        contractAddress,
        chain,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Audit contract bytecode when source is not available
   * @param {Object} contractData - Contract data from blockchain
   * @param {string} auditId - Audit ID
   * @param {number} startTime - Start timestamp
   * @returns {Object} Limited audit report
   */
  async auditBytecode(contractData, auditId, startTime) {
    logger.info('Performing bytecode analysis', { auditId });

    const bytecodeAnalysis = this.analyzeBytecode(contractData.bytecode);

    const auditReport = {
      auditId,
      status: 'completed',
      type: 'bytecode-only',
      contractInfo: {
        address: contractData.address,
        chain: contractData.chain,
        chainId: contractData.chainId,
        balance: contractData.balance,
        transactionCount: contractData.transactionCount,
      },
      analysis: {
        type: 'bytecode',
        ...bytecodeAnalysis,
      },
      vulnerabilities: [],
      overallScore: 60, // Default score for bytecode-only analysis
      riskLevel: 'Medium',
      summary: 'Limited analysis performed on bytecode only. Source code verification recommended.',
      recommendations: [
        'Verify contract source code on block explorer',
        'Request source code from contract deployer',
        'Perform manual review of contract functionality',
      ],
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime,
    };

    await teeMonitor.logAudit(auditReport);
    return auditReport;
  }

  /**
   * Analyze contract bytecode for basic patterns
   * @param {string} bytecode - Contract bytecode
   * @returns {Object} Bytecode analysis results
   */
  analyzeBytecode(bytecode) {
    const patterns = {
      hasSelfdestruct: /ff/.test(bytecode),
      hasDelegatecall: /f4/.test(bytecode),
      hasCreate2: /f5/.test(bytecode),
      hasExtcodecopy: /3c/.test(bytecode),
      hasExtcodesize: /3b/.test(bytecode),
      hasBalance: /31/.test(bytecode),
      hasCallvalue: /34/.test(bytecode),
    };

    const size = bytecode.length / 2; // Convert hex to bytes
    const complexity = this.estimateBytecodeComplexity(bytecode);

    return {
      size,
      complexity,
      patterns,
      warnings: this.generateBytecodeWarnings(patterns),
    };
  }

  /**
   * Estimate bytecode complexity
   * @param {string} bytecode - Contract bytecode
   * @returns {number} Complexity score
   */
  estimateBytecodeComplexity(bytecode) {
    // Simple complexity estimation based on bytecode size and patterns
    const size = bytecode.length / 2;
    const jumpInstructions = (bytecode.match(/56|57|58/g) || []).length;
    const callInstructions = (bytecode.match(/f1|f2|f4|fa/g) || []).length;
    
    return Math.min(100, Math.floor((size / 100) + (jumpInstructions * 2) + (callInstructions * 3)));
  }

  /**
   * Generate warnings for bytecode patterns
   * @param {Object} patterns - Detected patterns
   * @returns {Array} Array of warnings
   */
  generateBytecodeWarnings(patterns) {
    const warnings = [];

    if (patterns.hasSelfdestruct) {
      warnings.push('Contract contains selfdestruct functionality');
    }
    if (patterns.hasDelegatecall) {
      warnings.push('Contract uses delegatecall - potential proxy pattern');
    }
    if (patterns.hasCreate2) {
      warnings.push('Contract can deploy other contracts using CREATE2');
    }

    return warnings;
  }

  /**
   * Validate contract input
   * @param {string} contractCode - Contract source code
   */
  validateContractInput(contractCode) {
    if (!contractCode || typeof contractCode !== 'string') {
      throw new Error('Contract code must be a non-empty string');
    }

    if (contractCode.length > this.maxContractSize) {
      throw new Error(`Contract size exceeds maximum limit of ${this.maxContractSize} bytes`);
    }

    // Basic Solidity validation
    if (!contractCode.includes('contract') && !contractCode.includes('interface') && !contractCode.includes('library')) {
      throw new Error('Invalid Solidity code - no contract, interface, or library found');
    }
  }

  /**
   * Combine static analysis and AI analysis results
   * @param {Object} parseResult - Parser results
   * @param {Object} aiAnalysis - AI analysis results from multi-agent pipeline
   * @returns {Object} Combined analysis
   */
  combineAnalysisResults(parseResult, aiAnalysis) {
    // Merge vulnerabilities from both sources
    const staticVulns = (parseResult?.staticAnalysis?.findings || []).map(finding => ({
      name: `Static Analysis: ${finding.category}`,
      description: `Pattern detected: ${finding.pattern}`,
      severity: finding.severity,
      category: finding.category,
      affectedLines: [finding.line],
      codeSnippet: finding.code,
      source: 'static',
      confidence: 'High',
    }));

    const aiVulns = aiAnalysis.vulnerabilities.map(vuln => ({
      ...vuln,
      source: 'ai-multi-agent',
      detectedBy: vuln.detectedBy || 'unknown-agent',
    }));

    // Deduplicate similar vulnerabilities
    const allVulns = [...staticVulns, ...aiVulns];
    const deduplicatedVulns = this.deduplicateVulnerabilities(allVulns);

    // Calculate combined metrics
    const combinedMetrics = {
      totalVulnerabilities: deduplicatedVulns.length,
      agentContributions: this.calculateAgentContributions(aiVulns),
      staticFindings: staticVulns.length,
      aiFindings: aiVulns.length,
    };

    return {
      vulnerabilities: deduplicatedVulns,
      metrics: combinedMetrics,
      staticAnalysis: parseResult.staticAnalysis,
      aiAnalysis,
      contractInfo: parseResult,
      combinedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate agent contributions to vulnerability detection
   * @param {Array} aiVulns - AI-detected vulnerabilities
   * @returns {Object} Agent contribution statistics
   */
  calculateAgentContributions(aiVulns) {
    const contributions = {};

    aiVulns.forEach(vuln => {
      const agent = vuln.detectedBy || 'unknown';
      if (!contributions[agent]) {
        contributions[agent] = {
          count: 0,
          severities: { Critical: 0, High: 0, Medium: 0, Low: 0 }
        };
      }
      contributions[agent].count++;
      contributions[agent].severities[vuln.severity || 'Medium']++;
    });

    return contributions;
  }

  /**
   * Deduplicate similar vulnerabilities
   * @param {Array} vulnerabilities - Array of vulnerabilities
   * @returns {Array} Deduplicated vulnerabilities
   */
  deduplicateVulnerabilities(vulnerabilities) {
    const seen = new Set();
    return vulnerabilities.filter(vuln => {
      const key = `${vuln.category}-${vuln.affectedLines.join(',')}-${vuln.severity}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate comprehensive security scores
   * @param {Object} analysis - Combined analysis results
   * @returns {Object} Security scores
   */
  calculateSecurityScores(analysis) {
    const vulnerabilities = analysis.vulnerabilities;
    
    // Calculate severity-weighted score
    const severityWeights = { Critical: 40, High: 25, Medium: 15, Low: 5 };
    let totalDeduction = 0;
    
    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    
    vulnerabilities.forEach(vuln => {
      const severity = vuln.severity || 'Medium';
      severityCounts[severity]++;
      totalDeduction += severityWeights[severity] || 10;
    });

    const overall = Math.max(0, 100 - totalDeduction);
    const riskLevel = this.calculateRiskLevel(overall);

    return {
      overall,
      riskLevel,
      severityCounts,
      totalVulnerabilities: vulnerabilities.length,
      codeQuality: analysis.aiAnalysis?.codeQuality?.score || 70,
    };
  }

  /**
   * Calculate risk level based on score
   * @param {number} score - Overall security score
   * @returns {string} Risk level
   */
  calculateRiskLevel(score) {
    if (score >= this.vulnerabilityThresholds.high) return 'Low';
    if (score >= this.vulnerabilityThresholds.medium) return 'Medium';
    if (score >= 25) return 'High';
    return 'Critical';
  }

  /**
   * Generate comprehensive audit report
   * @param {Object} data - Audit data
   * @returns {Object} Formatted audit report
   */
  generateAuditReport(data) {
    return {
      auditId: data.auditId,
      status: 'completed',
      type: 'full-analysis',
      contractInfo: {
        name: data.parseResult.contracts[0]?.name || 'Unknown',
        functions: data.parseResult.functions.length,
        modifiers: data.parseResult.modifiers.length,
        events: data.parseResult.events.length,
        complexity: data.parseResult.codeMetrics.complexity,
        linesOfCode: data.parseResult.codeMetrics.codeLines,
        ...data.options.contractData,
      },
      vulnerabilities: data.combinedAnalysis.vulnerabilities,
      overallScore: data.scores.overall,
      riskLevel: data.scores.riskLevel,
      severityCounts: data.scores.severityCounts,
      summary: data.aiAnalysis.summary || 'Multi-agent AI security analysis completed',
      recommendations: data.aiAnalysis.recommendations || [],
      gasOptimizations: data.aiAnalysis.gasOptimizations || [],
      codeQuality: data.aiAnalysis.codeQuality || {},
      staticAnalysis: data.parseResult.staticAnalysis,
      aiAnalysis: {
        analysisType: data.aiAnalysis.analysisType || 'multi-agent-ai',
        agentsUsed: data.aiAnalysis.metadata?.agentsUsed || [],
        failedAgents: data.aiAnalysis.metadata?.failedAgents || [],
        analysisVersion: data.aiAnalysis.metadata?.analysisVersion || '2.0.0',
        analyzedAt: data.aiAnalysis.analyzedAt || new Date().toISOString(),
      },
      agentContributions: data.combinedAnalysis.metrics?.agentContributions || {},
      timestamp: new Date().toISOString(),
      executionTime: data.executionTime,
    };
  }

  /**
   * Generate unique audit ID
   * @returns {string} Unique audit ID
   */
  generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

const auditEngineInstance = new AuditEngine();
auditEngineInstance.AuditEngine = AuditEngine;

module.exports = auditEngineInstance;
