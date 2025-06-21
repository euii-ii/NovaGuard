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
    // Ensure parseResult is defined
    if (!parseResult) {
      parseResult = {
        staticAnalysis: { findings: [] },
        contracts: [],
        functions: [],
        modifiers: [],
        events: [],
        codeMetrics: { complexity: 0, codeLines: 0 }
      };
    }

    // Ensure aiAnalysis is defined
    if (!aiAnalysis) {
      aiAnalysis = {
        vulnerabilities: [],
        summary: 'AI analysis not available',
        overallScore: 70,
        riskLevel: 'Medium'
      };
    }

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

    const aiVulns = (aiAnalysis.vulnerabilities || []).map(vuln => ({
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
      staticAnalysis: parseResult?.staticAnalysis || { findings: [] },
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

  /**
   * Perform comprehensive audit (enhanced version)
   * @param {string} contractCodeOrAddress - Contract code or address
   * @param {Object} config - Audit configuration
   * @returns {Object} Comprehensive audit results
   */
  async performComprehensiveAudit(contractCodeOrAddress, config = {}) {
    try {
      // Determine if input is code or address
      const isAddress = contractCodeOrAddress.startsWith('0x') && contractCodeOrAddress.length === 42;
      
      let auditResult;
      if (isAddress) {
        auditResult = await this.auditContractByAddress(
          contractCodeOrAddress, 
          config.chain || 'ethereum',
          config
        );
      } else {
        auditResult = await this.auditContract(contractCodeOrAddress, config);
      }

      // Add comprehensive analysis metadata
      auditResult.comprehensiveAnalysis = {
        enabledFeatures: {
          aiAnalysis: config.enableAIAnalysis !== false,
          teamReview: config.enableTeamReview || false,
          gasOptimization: config.includeGasOptimization !== false,
          bestPractices: config.includeBestPractices !== false
        },
        analysisDepth: config.analysisDepth || 'comprehensive',
        timestamp: new Date().toISOString()
      };

      return auditResult;
    } catch (error) {
      logger.error('Comprehensive audit failed', {
        error: error.message,
        input: contractCodeOrAddress.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Get audit results by ID
   * @param {string} auditId - Audit ID
   * @returns {Object|null} Audit results or null if not found
   */
  async getAuditResults(auditId) {
    try {
      const results = await dataPersistenceService.getAnalysisResult(auditId);
      return results;
    } catch (error) {
      logger.error('Failed to get audit results', {
        auditId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get audit history for user
   * @param {Object} options - Query options
   * @returns {Object} Audit history with pagination
   */
  async getAuditHistory(options = {}) {
    try {
      const {
        userId,
        page = 1,
        limit = 10,
        filter = {}
      } = options;

      const history = await dataPersistenceService.getAnalysisHistory({
        userId,
        page,
        limit,
        filter
      });

      return {
        audits: history.results || [],
        total: history.total || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('Failed to get audit history', {
        userId: options.userId,
        error: error.message
      });
      return {
        audits: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 10
      };
    }
  }

  /**
   * Generate audit report in various formats
   * @param {Object} auditResults - Audit results
   * @param {Object} options - Report options
   * @returns {Object|Buffer} Generated report
   */
  async generateReport(auditResults, options = {}) {
    try {
      const {
        format = 'json',
        includeRecommendations = true,
        includeAIInsights = true
      } = options;

      // Enhance audit results with additional insights if requested
      let enhancedResults = { ...auditResults };
      
      if (includeAIInsights && !auditResults.aiInsights) {
        try {
          const aiInsights = await aiAnalysisPipeline.generateInsights(auditResults);
          enhancedResults.aiInsights = aiInsights;
        } catch (error) {
          logger.warn('Failed to generate AI insights for report', {
            auditId: auditResults.auditId,
            error: error.message
          });
        }
      }

      // Generate report based on format
      switch (format.toLowerCase()) {
        case 'pdf':
          return await this.generatePDFReport(enhancedResults, options);
        case 'html':
          return this.generateHTMLReport(enhancedResults, options);
        case 'markdown':
          return this.generateMarkdownReport(enhancedResults, options);
        default:
          return this.generateJSONReport(enhancedResults, options);
      }
    } catch (error) {
      logger.error('Failed to generate audit report', {
        auditId: auditResults?.auditId,
        format: options.format,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate JSON report
   * @param {Object} auditResults - Audit results
   * @param {Object} options - Report options
   * @returns {Object} JSON report
   */
  generateJSONReport(auditResults, options) {
    const report = {
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0.0',
        includeRecommendations: options.includeRecommendations,
        includeAIInsights: options.includeAIInsights
      },
      auditSummary: {
        auditId: auditResults.auditId,
        contractName: auditResults.contractInfo?.name || 'Unknown',
        overallScore: auditResults.overallScore,
        riskLevel: auditResults.riskLevel,
        totalVulnerabilities: auditResults.vulnerabilities?.length || 0,
        executionTime: auditResults.executionTime
      },
      contractInfo: auditResults.contractInfo || {},
      vulnerabilities: auditResults.vulnerabilities || [],
      recommendations: options.includeRecommendations ? (auditResults.recommendations || []) : [],
      gasOptimizations: auditResults.gasOptimizations || [],
      codeQuality: auditResults.codeQuality || {},
      aiInsights: options.includeAIInsights ? auditResults.aiInsights : undefined
    };

    return report;
  }

  /**
   * Generate HTML report
   * @param {Object} auditResults - Audit results
   * @param {Object} options - Report options
   * @returns {string} HTML report
   */
  generateHTMLReport(auditResults, options) {
    const jsonReport = this.generateJSONReport(auditResults, options);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Contract Audit Report - ${jsonReport.auditSummary.contractName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .vulnerability { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
        .high-risk { border-left-color: #dc3545; background: #f8d7da; }
        .medium-risk { border-left-color: #fd7e14; background: #fff3cd; }
        .low-risk { border-left-color: #28a745; background: #d4edda; }
        .recommendation { background: #d1ecf1; padding: 10px; margin: 10px 0; border-left: 4px solid #17a2b8; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Smart Contract Audit Report</h1>
        <p><strong>Contract:</strong> ${jsonReport.auditSummary.contractName}</p>
        <p><strong>Audit ID:</strong> ${jsonReport.auditSummary.auditId}</p>
        <p><strong>Generated:</strong> ${jsonReport.reportMetadata.generatedAt}</p>
    </div>

    <div class="summary">
        <h2>Audit Summary</h2>
        <p><strong>Overall Score:</strong> ${jsonReport.auditSummary.overallScore}/100</p>
        <p><strong>Risk Level:</strong> ${jsonReport.auditSummary.riskLevel}</p>
        <p><strong>Total Vulnerabilities:</strong> ${jsonReport.auditSummary.totalVulnerabilities}</p>
        <p><strong>Execution Time:</strong> ${jsonReport.auditSummary.executionTime}ms</p>
    </div>

    <h2>Vulnerabilities</h2>
    ${jsonReport.vulnerabilities.map(vuln => `
        <div class="vulnerability ${vuln.severity.toLowerCase()}-risk">
            <h3>${vuln.name}</h3>
            <p><strong>Severity:</strong> ${vuln.severity}</p>
            <p><strong>Description:</strong> ${vuln.description}</p>
            ${vuln.recommendation ? `<p><strong>Recommendation:</strong> ${vuln.recommendation}</p>` : ''}
        </div>
    `).join('')}

    ${options.includeRecommendations && jsonReport.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    ${jsonReport.recommendations.map(rec => `
        <div class="recommendation">
            <h3>${rec.title || 'Recommendation'}</h3>
            <p>${rec.description}</p>
        </div>
    `).join('')}
    ` : ''}

    <h2>Contract Information</h2>
    <table>
        <tr><th>Property</th><th>Value</th></tr>
        <tr><td>Functions</td><td>${jsonReport.contractInfo.functions || 'N/A'}</td></tr>
        <tr><td>Modifiers</td><td>${jsonReport.contractInfo.modifiers || 'N/A'}</td></tr>
        <tr><td>Events</td><td>${jsonReport.contractInfo.events || 'N/A'}</td></tr>
        <tr><td>Lines of Code</td><td>${jsonReport.contractInfo.linesOfCode || 'N/A'}</td></tr>
    </table>
</body>
</html>`;

    return html;
  }

  /**
   * Generate Markdown report
   * @param {Object} auditResults - Audit results
   * @param {Object} options - Report options
   * @returns {string} Markdown report
   */
  generateMarkdownReport(auditResults, options) {
    const jsonReport = this.generateJSONReport(auditResults, options);
    
    let markdown = `# Smart Contract Audit Report

## Contract Information
- **Name:** ${jsonReport.auditSummary.contractName}
- **Audit ID:** ${jsonReport.auditSummary.auditId}
- **Generated:** ${jsonReport.reportMetadata.generatedAt}

## Audit Summary
- **Overall Score:** ${jsonReport.auditSummary.overallScore}/100
- **Risk Level:** ${jsonReport.auditSummary.riskLevel}
- **Total Vulnerabilities:** ${jsonReport.auditSummary.totalVulnerabilities}
- **Execution Time:** ${jsonReport.auditSummary.executionTime}ms

## Vulnerabilities

`;

    jsonReport.vulnerabilities.forEach(vuln => {
      markdown += `### ${vuln.name}
- **Severity:** ${vuln.severity}
- **Description:** ${vuln.description}
${vuln.recommendation ? `- **Recommendation:** ${vuln.recommendation}` : ''}

`;
    });

    if (options.includeRecommendations && jsonReport.recommendations.length > 0) {
      markdown += `## Recommendations

`;
      jsonReport.recommendations.forEach(rec => {
        markdown += `### ${rec.title || 'Recommendation'}
${rec.description}

`;
      });
    }

    markdown += `## Contract Details
| Property | Value |
|----------|-------|
| Functions | ${jsonReport.contractInfo.functions || 'N/A'} |
| Modifiers | ${jsonReport.contractInfo.modifiers || 'N/A'} |
| Events | ${jsonReport.contractInfo.events || 'N/A'} |
| Lines of Code | ${jsonReport.contractInfo.linesOfCode || 'N/A'} |
`;

    return markdown;
  }

  /**
   * Generate PDF report (placeholder - would need PDF library)
   * @param {Object} auditResults - Audit results
   * @param {Object} options - Report options
   * @returns {Buffer} PDF buffer
   */
  async generatePDFReport(auditResults, options) {
    // For now, return HTML content as PDF would require additional dependencies
    // In production, you would use libraries like puppeteer or pdfkit
    const htmlContent = this.generateHTMLReport(auditResults, options);
    
    logger.warn('PDF generation not implemented, returning HTML content', {
      auditId: auditResults.auditId
    });
    
    return Buffer.from(htmlContent, 'utf8');
  }
}

const auditEngineInstance = new AuditEngine();

// Export all methods for proper service integration
module.exports = auditEngineInstance;
module.exports.AuditEngine = AuditEngine;

// Export individual methods for direct access
module.exports.auditContract = auditEngineInstance.auditContract.bind(auditEngineInstance);
module.exports.auditContractByAddress = auditEngineInstance.auditContractByAddress.bind(auditEngineInstance);
module.exports.performComprehensiveAudit = auditEngineInstance.performComprehensiveAudit.bind(auditEngineInstance);
module.exports.getAuditResults = auditEngineInstance.getAuditResults.bind(auditEngineInstance);
module.exports.getAuditHistory = auditEngineInstance.getAuditHistory.bind(auditEngineInstance);
module.exports.generateReport = auditEngineInstance.generateReport.bind(auditEngineInstance);
module.exports.generateJSONReport = auditEngineInstance.generateJSONReport.bind(auditEngineInstance);
module.exports.generateHTMLReport = auditEngineInstance.generateHTMLReport.bind(auditEngineInstance);
module.exports.generateMarkdownReport = auditEngineInstance.generateMarkdownReport.bind(auditEngineInstance);
module.exports.generatePDFReport = auditEngineInstance.generatePDFReport.bind(auditEngineInstance);

// Export initialization method
module.exports.initialize = async function(options = {}) {
  try {
    // Initialize audit engine with configuration
    if (options.maxContractSize) {
      auditEngineInstance.maxContractSize = options.maxContractSize;
    }
    if (options.vulnerabilityThresholds) {
      auditEngineInstance.vulnerabilityThresholds = {
        ...auditEngineInstance.vulnerabilityThresholds,
        ...options.vulnerabilityThresholds
      };
    }
    
    logger.info('AuditEngine initialized successfully', {
      maxContractSize: auditEngineInstance.maxContractSize,
      vulnerabilityThresholds: auditEngineInstance.vulnerabilityThresholds
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize AuditEngine', { error: error.message });
    throw error;
  }
};

// Export service status method
module.exports.getStatus = function() {
  return {
    initialized: true,
    maxContractSize: auditEngineInstance.maxContractSize,
    vulnerabilityThresholds: auditEngineInstance.vulnerabilityThresholds,
    uptime: Date.now() - (auditEngineInstance.startTime || Date.now())
  };
};
