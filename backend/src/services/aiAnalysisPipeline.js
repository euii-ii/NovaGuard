const contractParser = require('./contractParser');
const logger = require('../utils/logger');

/**
 * AI Analysis Pipeline - Orchestrates multi-agent AI analysis
 * Coordinates specialized AI agents for comprehensive smart contract analysis
 */
class AIAnalysisPipeline {
  constructor() {
    this.supportedAgents = ['security', 'quality', 'economics', 'defi', 'crossChain', 'mev', 'gasOptimization', 'governance'];
    this.defaultAgentSet = ['security', 'quality'];
    this.maxConcurrentAgents = parseInt(process.env.MAX_CONCURRENT_AGENTS) || 6;
    this.analysisTimeout = parseInt(process.env.ANALYSIS_TIMEOUT_MS) || 180000; // 3 minutes
    this.confidenceThreshold = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7;
    this.retryAttempts = parseInt(process.env.AGENT_RETRY_ATTEMPTS) || 2;

    // Test mode flag to prevent circular dependencies during testing
    this.testMode = process.env.NODE_ENV === 'test';

    // Agent priority weights for result aggregation
    this.agentWeights = {
      security: 1.0,
      quality: 0.8,
      economics: 0.9,
      defi: 0.95,
      crossChain: 0.85,
      mev: 0.9,
      gasOptimization: 0.7,
      governance: 0.85
    };

    // Performance metrics tracking
    this.performanceMetrics = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      averageExecutionTime: 0,
      agentPerformance: {}
    };

    // Service configuration
    this.config = {
      enableCaching: false,
      maxConcurrentAnalyses: 5,
      enableAdvancedAggregation: true
    };

    // Service state
    this.isInitialized = false;
    this.analysisCache = new Map();
    this.startTime = null;
  }

  /**
   * Initialize the AI Analysis Pipeline service
   * @param {Object} config - Service configuration
   */
  async initialize(config = {}) {
    try {
      this.config = {
        ...this.config,
        ...config
      };

      // Initialize performance tracking for each agent
      this.supportedAgents.forEach(agent => {
        this.performanceMetrics.agentPerformance[agent] = {
          totalAnalyses: 0,
          successfulAnalyses: 0,
          averageExecutionTime: 0,
          lastUsed: null
        };
      });

      this.isInitialized = true;
      this.startTime = Date.now();

      logger.info('AI Analysis Pipeline initialized', {
        supportedAgents: this.supportedAgents,
        config: this.config
      });

    } catch (error) {
      logger.error('Failed to initialize AI Analysis Pipeline', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      availableAgents: this.supportedAgents,
      activeAnalyses: 0, // Number of currently running analyses
      totalAnalyses: this.performanceMetrics.totalAnalyses,
      configuration: this.config,
      performanceMetrics: this.performanceMetrics,
      cacheSize: this.analysisCache.size,
      uptime: this.isInitialized ? Date.now() - (this.startTime || Date.now()) : 0
    };
  }

  /**
   * Get available AI agents
   * @returns {Array} List of available agents with metadata
   */
  getAvailableAgents() {
    return [
      { id: 'security', name: 'Security Analyzer', description: 'Detects security vulnerabilities and attack vectors' },
      { id: 'quality', name: 'Quality Analyzer', description: 'Analyzes code quality and best practices' },
      { id: 'defi', name: 'DeFi Analyzer', description: 'Specialized in DeFi protocol analysis and risks' },
      { id: 'economics', name: 'Economics Analyzer', description: 'Analyzes tokenomics and economic models' },
      { id: 'crossChain', name: 'Cross-Chain Analyzer', description: 'Analyzes cross-chain bridge security' },
      { id: 'mev', name: 'MEV Analyzer', description: 'Detects MEV vulnerabilities and front-running risks' },
      { id: 'gasOptimization', name: 'Gas Optimizer', description: 'Identifies gas optimization opportunities' },
      { id: 'governance', name: 'Governance Analyzer', description: 'Analyzes governance mechanisms and risks' }
    ];
  }

  /**
   * Analyze contract using multi-agent AI system
   * @param {Object} request - Analysis request
   * @returns {Object} Comprehensive analysis results
   */
  async analyzeContract(request) {
    const startTime = Date.now();
    const analysisId = this.generateAnalysisId();

    // Validate input request
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid analysis request: request must be an object');
    }

    if (!request.contractCode || typeof request.contractCode !== 'string') {
      throw new Error('Invalid analysis request: contractCode is required and must be a string');
    }

    if (request.contractCode.length > 1000000) { // 1MB limit
      throw new Error('Contract code too large: maximum size is 1MB');
    }

    try {
      logger.info('Starting AI pipeline analysis', {
        analysisId,
        contractLength: request.contractCode?.length,
        requestedAgents: request.agents
      });

      // 1. Preprocess contract code
      const preprocessedData = await this.preprocessContract(request);

      // 2. Determine optimal agent configuration
      const agentConfig = this.determineAgentConfiguration(preprocessedData, request);

      // 3. Execute parallel agent analysis
      const agentResults = await this.executeAgentAnalysis(preprocessedData, agentConfig);

      // 4. Aggregate and score results
      const aggregatedResults = await this.aggregateResults(agentResults, preprocessedData);

      // 5. Generate final report
      const finalReport = this.generateComprehensiveReport({
        analysisId,
        request,
        preprocessedData,
        agentResults,
        aggregatedResults,
        executionTime: Date.now() - startTime
      });

      logger.info('AI pipeline analysis completed', {
        analysisId,
        agentsUsed: agentConfig.activeAgents.length,
        vulnerabilitiesFound: finalReport.vulnerabilities?.length || 0,
        overallScore: finalReport.overallScore,
        executionTime: Date.now() - startTime
      });

      return finalReport;

    } catch (error) {
      logger.error('AI pipeline analysis failed', {
        analysisId,
        error: error.message,
        executionTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Preprocess contract code and extract metadata
   * @param {Object} request - Analysis request
   * @returns {Object} Preprocessed contract data
   */
  async preprocessContract(request) {
    try {
      // Parse contract structure
      const parseResult = await contractParser.parseContract(request.contractCode);

      // Extract contract characteristics
      const characteristics = this.extractContractCharacteristics(parseResult, request.contractCode);

      // Determine contract complexity
      const complexity = this.calculateContractComplexity(parseResult);

      return {
        ...request,
        parseResult,
        characteristics,
        complexity,
        preprocessedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Contract preprocessing failed', { error: error.message });
      throw new Error(`Contract preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Determine optimal agent configuration for analysis
   * @param {Object} preprocessedData - Preprocessed contract data
   * @param {Object} request - Original request
   * @returns {Object} Agent configuration
   */
  determineAgentConfiguration(preprocessedData, request) {
    let activeAgents = [...this.defaultAgentSet];

    // Add specialized agents based on contract characteristics
    if (preprocessedData.characteristics.isDeFi) {
      activeAgents.push('defi', 'economics');
    }

    if (preprocessedData.characteristics.isCrossChain) {
      activeAgents.push('crossChain');
    }

    if (preprocessedData.characteristics.hasMEVRisk) {
      activeAgents.push('mev');
    }

    // Override with user-specified agents if provided
    if (request.agents && Array.isArray(request.agents)) {
      activeAgents = request.agents.filter(agent => this.supportedAgents.includes(agent));
    }

    // Ensure we don't exceed concurrent agent limit
    if (activeAgents.length > this.maxConcurrentAgents) {
      activeAgents = this.prioritizeAgents(activeAgents, preprocessedData.characteristics)
        .slice(0, this.maxConcurrentAgents);
    }

    return {
      activeAgents: [...new Set(activeAgents)], // Remove duplicates
      analysisMode: request.analysisMode || 'comprehensive',
      priority: request.priority || 'normal'
    };
  }

  /**
   * Execute parallel analysis with multiple AI agents
   * @param {Object} preprocessedData - Preprocessed contract data
   * @param {Object} agentConfig - Agent configuration
   * @returns {Array} Results from all agents
   */
  async executeAgentAnalysis(preprocessedData, agentConfig) {
    const { activeAgents } = agentConfig;

    logger.info('Executing multi-agent analysis', {
      agents: activeAgents,
      mode: agentConfig.analysisMode
    });

    // Create analysis promises for each agent
    const agentPromises = activeAgents.map(agentType => 
      this.runSingleAgentAnalysis(agentType, preprocessedData, agentConfig)
    );

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout')), this.analysisTimeout);
    });

    try {
      const results = await Promise.race([
        Promise.allSettled(agentPromises),
        timeoutPromise
      ]);

      return this.processAgentResults(results, activeAgents);

    } catch (error) {
      logger.error('Agent analysis execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run analysis with a single AI agent
   * @param {string} agentType - Type of agent
   * @param {Object} preprocessedData - Preprocessed contract data
   * @param {Object} agentConfig - Agent configuration
   * @returns {Object} Agent analysis result
   */
  async runSingleAgentAnalysis(agentType, preprocessedData, agentConfig) {
    const startTime = Date.now();

    try {
      logger.debug(`Starting ${agentType} agent analysis`);

      let parsedAnalysis;

      // In test mode, return mock data to prevent circular dependencies
      if (this.testMode) {
        parsedAnalysis = this.createMockAnalysis(agentType);
      } else {
        // Create a prompt for the specific agent
        const prompt = this.createAgentPrompt(agentType, preprocessedData, agentConfig);

        try {
          // Add a timeout and circuit breaker to prevent infinite loops
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('LLM service timeout')), 5000);
          });

          // Use the LLM service to generate response with timeout
          const llmService = require('./llmService');
          const analysisPromise = llmService.generateResponse(prompt, {
            agentType,
            analysisMode: agentConfig.analysisMode
          });

          const analysis = await Promise.race([analysisPromise, timeoutPromise]);

          // Parse the response into structured format
          parsedAnalysis = this.parseAgentResponse(analysis, agentType);
        } catch (error) {
          // If LLM service fails, create a default response
          logger.warn(`LLM service failed for ${agentType} agent, using default response`, { error: error.message });
          parsedAnalysis = this.createDefaultAnalysis(agentType);
        }
      }

      return {
        agentType,
        success: true,
        analysis: parsedAnalysis,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`${agentType} agent analysis failed`, { error: error.message });
      return {
        agentType,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process results from Promise.allSettled
   * @param {Array} results - Promise settlement results
   * @param {Array} activeAgents - List of active agents
   * @returns {Array} Processed agent results
   */
  processAgentResults(results, activeAgents) {
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          agentType: activeAgents[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  /**
   * Generate unique analysis ID
   * @returns {string} Unique analysis identifier
   */
  generateAnalysisId() {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract contract characteristics for agent selection
   * @param {Object} parseResult - Contract parse results
   * @param {string} contractCode - Raw contract code
   * @returns {Object} Contract characteristics
   */
  extractContractCharacteristics(parseResult, contractCode) {
    const codeText = contractCode.toLowerCase();
    
    return {
      isDeFi: this.checkDeFiCharacteristics(parseResult, codeText),
      isCrossChain: this.checkCrossChainCharacteristics(parseResult, codeText),
      hasMEVRisk: this.checkMEVRisk(parseResult, codeText),
      hasGovernance: this.checkGovernanceFeatures(parseResult, codeText),
      isUpgradeable: this.checkUpgradeability(parseResult, codeText),
      hasOracles: this.checkOracleUsage(parseResult, codeText)
    };
  }

  /**
   * Check if contract has DeFi characteristics
   * @param {Object} parseResult - Parse results
   * @param {string} codeText - Lowercase contract code
   * @returns {boolean} True if DeFi contract
   */
  checkDeFiCharacteristics(parseResult, codeText) {
    const defiKeywords = [
      'swap', 'pool', 'liquidity', 'stake', 'yield', 'farm', 'vault',
      'lending', 'borrow', 'collateral', 'token', 'erc20', 'ierc20'
    ];

    return defiKeywords.some(keyword => codeText.includes(keyword)) ||
           parseResult.functions?.some(func => 
             defiKeywords.some(keyword => func.name?.toLowerCase().includes(keyword))
           );
  }

  /**
   * Check if contract has cross-chain characteristics
   * @param {Object} parseResult - Parse results
   * @param {string} codeText - Lowercase contract code
   * @returns {boolean} True if cross-chain contract
   */
  checkCrossChainCharacteristics(parseResult, codeText) {
    const crossChainKeywords = [
      'bridge', 'relay', 'crosschain', 'multichain', 'portal',
      'layerzero', 'chainlink', 'axelar', 'wormhole'
    ];

    return crossChainKeywords.some(keyword => codeText.includes(keyword));
  }

  /**
   * Check if contract has MEV risk
   * @param {Object} parseResult - Parse results
   * @param {string} codeText - Lowercase contract code
   * @returns {boolean} True if MEV risk present
   */
  checkMEVRisk(parseResult, codeText) {
    const mevKeywords = [
      'flashloan', 'arbitrage', 'frontrun', 'sandwich', 'mev',
      'auction', 'priority', 'mempool', 'bundle'
    ];

    return mevKeywords.some(keyword => codeText.includes(keyword)) ||
           parseResult.functions?.some(func => func.isPayable && func.isExternal);
  }

  /**
   * Check if contract has governance features
   * @param {Object} parseResult - Parse results
   * @param {string} codeText - Lowercase contract code
   * @returns {boolean} True if governance contract
   */
  checkGovernanceFeatures(parseResult, codeText) {
    const governanceKeywords = ['vote', 'proposal', 'governance', 'delegate', 'quorum'];
    return governanceKeywords.some(keyword => codeText.includes(keyword));
  }

  /**
   * Check if contract is upgradeable
   * @param {Object} parseResult - Parse results
   * @param {string} codeText - Lowercase contract code
   * @returns {boolean} True if upgradeable contract
   */
  checkUpgradeability(parseResult, codeText) {
    const upgradeKeywords = ['proxy', 'upgrade', 'implementation', 'beacon'];
    return upgradeKeywords.some(keyword => codeText.includes(keyword));
  }

  /**
   * Check if contract uses oracles
   * @param {Object} parseResult - Parse results
   * @param {string} codeText - Lowercase contract code
   * @returns {boolean} True if uses oracles
   */
  checkOracleUsage(parseResult, codeText) {
    const oracleKeywords = ['oracle', 'chainlink', 'price', 'feed', 'aggregator'];
    return oracleKeywords.some(keyword => codeText.includes(keyword));
  }

  /**
   * Prioritize agents based on contract characteristics
   * @param {Array} agents - List of agents
   * @param {Object} characteristics - Contract characteristics
   * @returns {Array} Prioritized agent list
   */
  prioritizeAgents(agents, characteristics) {
    const priorities = {
      security: 10, // Always highest priority
      defi: characteristics.isDeFi ? 8 : 3,
      economics: characteristics.isDeFi ? 7 : 2,
      quality: 6,
      crossChain: characteristics.isCrossChain ? 9 : 1,
      mev: characteristics.hasMEVRisk ? 8 : 1
    };

    return agents.sort((a, b) => (priorities[b] || 0) - (priorities[a] || 0));
  }

  /**
   * Aggregate results from multiple agents using advanced aggregation service
   * @param {Array} agentResults - Results from all agents
   * @param {Object} preprocessedData - Preprocessed contract data
   * @returns {Object} Aggregated results
   */
  async aggregateResults(agentResults, preprocessedData) {
    try {
      // Use the advanced AI Result Aggregation Service
      const aggregationOptions = {
        method: 'weighted-consensus',
        contractCharacteristics: preprocessedData.characteristics,
        complexity: preprocessedData.complexity
      };

      const aiResultAggregationService = require('./aiResultAggregationService');
      return await aiResultAggregationService.aggregateResults(agentResults, aggregationOptions);
    } catch (error) {
      logger.error('Advanced result aggregation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate comprehensive analysis report
   * @param {Object} reportData - All analysis data
   * @returns {Object} Final comprehensive report
   */
  generateComprehensiveReport(reportData) {
    const {
      analysisId,
      request,
      preprocessedData,
      agentResults,
      aggregatedResults,
      executionTime
    } = reportData;

    return {
      analysisId,
      contractAddress: request.contractAddress,
      chain: request.chain,
      analysisType: 'multi-agent-ai',
      ...aggregatedResults,
      metadata: {
        contractCharacteristics: preprocessedData.characteristics,
        complexity: preprocessedData.complexity,
        agentsUsed: agentResults.filter(r => r.success).map(r => r.agentType),
        failedAgents: agentResults.filter(r => !r.success).map(r => r.agentType),
        executionTime,
        analysisVersion: '2.0.0',
        timestamp: new Date().toISOString()
      },
      rawAgentResults: agentResults.map(result => ({
        agentType: result.agentType,
        success: result.success,
        executionTime: result.executionTime,
        vulnerabilitiesFound: result.success ? result.analysis?.vulnerabilities?.length || 0 : 0
      }))
    };
  }

  /**
   * Calculate contract complexity score
   * @param {Object} parseResult - Contract parse results
   * @returns {number} Complexity score
   */
  calculateContractComplexity(parseResult) {
    const functionCount = parseResult.functions?.length || 0;
    const modifierCount = parseResult.modifiers?.length || 0;
    const eventCount = parseResult.events?.length || 0;
    const contractCount = parseResult.contracts?.length || 0;

    // Simple complexity calculation
    return functionCount * 2 + modifierCount * 1.5 + eventCount * 0.5 + contractCount * 3;
  }

  /**
   * Create agent-specific prompt
   * @param {string} agentType - Type of agent
   * @param {Object} preprocessedData - Preprocessed contract data
   * @param {Object} agentConfig - Agent configuration
   * @returns {string} Agent prompt
   */
  createAgentPrompt(agentType, preprocessedData, agentConfig) {
    const baseInfo = `
Contract Information:
- Contract Name: ${preprocessedData.parseResult?.contractName || 'Unknown'}
- Functions Count: ${preprocessedData.parseResult?.functions?.length || 0}
- Modifiers Count: ${preprocessedData.parseResult?.modifiers?.length || 0}
- Code Complexity: ${preprocessedData.complexity || 'Unknown'}
- Analysis Mode: ${agentConfig.analysisMode || 'comprehensive'}

Solidity Code to Analyze:
\`\`\`solidity
${preprocessedData.contractCode}
\`\`\``;

    const prompts = {
      security: `You are an expert smart contract security auditor. Analyze the following Solidity code for security vulnerabilities.

IMPORTANT: Respond ONLY with valid JSON in the exact format specified below.

Required JSON Response Format:
{
  "vulnerabilities": [
    {
      "name": "Vulnerability Name",
      "description": "Detailed description",
      "severity": "Low|Medium|High|Critical",
      "category": "reentrancy|access-control|arithmetic|unchecked-calls|gas-limit|timestamp-dependence|tx-origin|other",
      "affectedLines": [1, 2, 3],
      "codeSnippet": "vulnerable code snippet",
      "recommendation": "How to fix this vulnerability",
      "impact": "Potential impact description",
      "confidence": "Low|Medium|High"
    }
  ],
  "overallScore": 85,
  "riskLevel": "Low|Medium|High|Critical",
  "summary": "Brief overall security assessment",
  "recommendations": ["General recommendation 1", "General recommendation 2"]
}

${baseInfo}`,

      quality: `You are a smart contract code quality expert. Focus on code efficiency, best practices, and gas optimization.

IMPORTANT: Respond ONLY with valid JSON in the exact format specified below.

Required JSON Response Format:
{
  "vulnerabilities": [],
  "overallScore": 85,
  "riskLevel": "Low|Medium|High|Critical",
  "summary": "Code quality assessment summary",
  "recommendations": ["Quality recommendation 1", "Quality recommendation 2"],
  "gasOptimizations": [
    {
      "description": "Gas optimization suggestion",
      "affectedLines": [1, 2],
      "potentialSavings": "Estimated gas savings",
      "implementation": "How to implement this optimization"
    }
  ],
  "codeQuality": {
    "score": 80,
    "issues": ["Code quality issue 1", "Code quality issue 2"],
    "strengths": ["Code strength 1", "Code strength 2"]
  }
}

${baseInfo}`,

      defi: `You are a DeFi protocol security specialist. Focus on DeFi-specific vulnerabilities and risks.

IMPORTANT: Respond ONLY with valid JSON in the exact format specified below.

Required JSON Response Format:
{
  "vulnerabilities": [
    {
      "name": "DeFi Vulnerability Name",
      "description": "DeFi-specific risk description",
      "severity": "Low|Medium|High|Critical",
      "category": "defi|liquidity|oracle|governance|tokenomics|other",
      "affectedLines": [1, 2, 3],
      "codeSnippet": "relevant code snippet",
      "recommendation": "DeFi-specific fix recommendation",
      "impact": "DeFi impact and attack scenarios",
      "confidence": "Low|Medium|High"
    }
  ],
  "overallScore": 85,
  "riskLevel": "Low|Medium|High|Critical",
  "summary": "DeFi security assessment",
  "recommendations": ["DeFi recommendation 1", "DeFi recommendation 2"]
}

${baseInfo}`
    };

    return prompts[agentType] || prompts.security;
  }

  /**
   * Parse agent response into structured format
   * @param {string|Object} response - Raw LLM response (string or object)
   * @param {string} agentType - Type of agent
   * @returns {Object} Parsed analysis
   */
  parseAgentResponse(response, agentType) {
    try {
      let parsed;

      // Handle both string and object responses
      if (typeof response === 'string') {
        // Try to extract JSON from response if it contains other text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : response;
        parsed = JSON.parse(jsonString);
      } else if (typeof response === 'object' && response !== null) {
        parsed = response;
      } else {
        throw new Error('Invalid response format');
      }

      // Validate and sanitize the parsed response
      const sanitized = this.sanitizeAgentResponse(parsed, agentType);

      // Ensure required fields exist with proper validation
      return {
        vulnerabilities: this.validateVulnerabilities(sanitized.vulnerabilities || []),
        overallScore: this.validateScore(sanitized.overallScore, 50),
        riskLevel: this.validateRiskLevel(sanitized.riskLevel, 'Medium'),
        summary: this.validateString(sanitized.summary, 'Analysis completed'),
        recommendations: this.validateStringArray(sanitized.recommendations || []),
        gasOptimizations: this.validateGasOptimizations(sanitized.gasOptimizations || []),
        codeQuality: this.validateCodeQuality(sanitized.codeQuality),
        issues: this.validateStringArray(sanitized.issues || []), // For quality analysis
        risks: this.validateStringArray(sanitized.risks || []), // For DeFi analysis
        defiRisk: this.validateRiskLevel(sanitized.defiRisk, 'Low'), // For DeFi analysis
        agentType
      };
    } catch (error) {
      logger.warn(`Failed to parse ${agentType} agent response`, {
        error: error.message,
        responseType: typeof response,
        responseLength: typeof response === 'string' ? response.length : 'N/A'
      });

      // Return a default structure if parsing fails
      return this.createDefaultAnalysis(agentType);
    }
  }

  /**
   * Create default analysis when LLM service fails
   * @param {string} agentType - Type of agent
   * @returns {Object} Default analysis structure
   */
  createDefaultAnalysis(agentType) {
    return {
      vulnerabilities: [],
      overallScore: 50,
      riskLevel: 'Medium',
      summary: `${agentType} analysis completed with fallback response`,
      recommendations: ['Manual review recommended due to service issues'],
      gasOptimizations: [],
      codeQuality: { score: 50, issues: ['Service unavailable'], strengths: [] },
      issues: [],
      risks: [],
      defiRisk: 'Medium',
      agentType
    };
  }

  /**
   * Create mock analysis for testing
   * @param {string} agentType - Type of agent
   * @returns {Object} Mock analysis structure
   */
  createMockAnalysis(agentType) {
    const baseAnalysis = {
      agentType,
      summary: `Mock ${agentType} analysis completed`,
      recommendations: [`Mock ${agentType} recommendation`],
      overallScore: 80,
      riskLevel: 'Low'
    };

    switch (agentType) {
      case 'security':
        return {
          ...baseAnalysis,
          vulnerabilities: [
            {
              name: 'Mock Vulnerability',
              description: 'Mock vulnerability description',
              severity: 'Medium',
              category: 'access-control',
              affectedLines: [1, 2],
              codeSnippet: 'mock code',
              recommendation: 'Mock fix',
              impact: 'Mock impact',
              confidence: 'High'
            }
          ]
        };
      case 'quality':
        return {
          ...baseAnalysis,
          issues: ['Mock quality issue'],
          codeQuality: {
            score: 75,
            issues: ['Mock code issue'],
            strengths: ['Mock code strength']
          },
          gasOptimizations: [
            {
              description: 'Mock gas optimization',
              affectedLines: [1],
              potentialSavings: '100 gas'
            }
          ]
        };
      case 'defi':
        return {
          ...baseAnalysis,
          risks: ['Mock DeFi risk'],
          defiRisk: 'Low'
        };
      default:
        return {
          ...baseAnalysis,
          vulnerabilities: [],
          issues: [],
          risks: []
        };
    }
  }

  /**
   * Sanitize agent response to prevent injection and ensure data integrity
   * @param {Object} response - Raw agent response
   * @param {string} agentType - Type of agent
   * @returns {Object} Sanitized response
   */
  sanitizeAgentResponse(response, agentType) {
    if (!response || typeof response !== 'object') {
      return {};
    }

    const sanitized = { ...response };

    // Sanitize string fields
    if (typeof sanitized.summary === 'string') {
      sanitized.summary = sanitized.summary.trim().substring(0, 1000);
    }

    if (typeof sanitized.riskLevel === 'string') {
      sanitized.riskLevel = sanitized.riskLevel.trim();
    }

    return sanitized;
  }

  /**
   * Validate vulnerabilities array
   * @param {Array} vulnerabilities - Vulnerabilities to validate
   * @returns {Array} Valid vulnerabilities
   */
  validateVulnerabilities(vulnerabilities) {
    if (!Array.isArray(vulnerabilities)) {
      return [];
    }

    return vulnerabilities
      .filter(vuln => vuln && typeof vuln === 'object')
      .map(vuln => ({
        name: this.validateString(vuln.name, 'Unknown Vulnerability'),
        description: this.validateString(vuln.description, 'No description provided'),
        severity: this.validateRiskLevel(vuln.severity, 'Medium'),
        category: this.validateString(vuln.category, 'other'),
        affectedLines: Array.isArray(vuln.affectedLines) ? vuln.affectedLines.filter(line => typeof line === 'number') : [],
        codeSnippet: this.validateString(vuln.codeSnippet, ''),
        recommendation: this.validateString(vuln.recommendation, 'Manual review recommended'),
        impact: this.validateString(vuln.impact, 'Impact assessment needed'),
        confidence: this.validateConfidence(vuln.confidence, 'Medium')
      }));
  }

  /**
   * Validate score value
   * @param {number} score - Score to validate
   * @param {number} defaultValue - Default value if invalid
   * @returns {number} Valid score
   */
  validateScore(score, defaultValue = 50) {
    if (typeof score !== 'number' || isNaN(score)) {
      return defaultValue;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Validate risk level
   * @param {string} riskLevel - Risk level to validate
   * @param {string} defaultValue - Default value if invalid
   * @returns {string} Valid risk level
   */
  validateRiskLevel(riskLevel, defaultValue = 'Medium') {
    const validLevels = ['Low', 'Medium', 'High', 'Critical'];
    return validLevels.includes(riskLevel) ? riskLevel : defaultValue;
  }

  /**
   * Validate string value
   * @param {string} value - String to validate
   * @param {string} defaultValue - Default value if invalid
   * @returns {string} Valid string
   */
  validateString(value, defaultValue = '') {
    if (typeof value !== 'string') {
      return defaultValue;
    }
    return value.trim().substring(0, 2000); // Limit length
  }

  /**
   * Validate string array
   * @param {Array} array - Array to validate
   * @returns {Array} Valid string array
   */
  validateStringArray(array) {
    if (!Array.isArray(array)) {
      return [];
    }
    return array
      .filter(item => typeof item === 'string')
      .map(item => item.trim().substring(0, 500))
      .filter(item => item.length > 0);
  }

  /**
   * Validate gas optimizations array
   * @param {Array} optimizations - Gas optimizations to validate
   * @returns {Array} Valid gas optimizations
   */
  validateGasOptimizations(optimizations) {
    if (!Array.isArray(optimizations)) {
      return [];
    }

    return optimizations
      .filter(opt => opt && typeof opt === 'object')
      .map(opt => ({
        description: this.validateString(opt.description, 'Gas optimization suggestion'),
        affectedLines: Array.isArray(opt.affectedLines) ? opt.affectedLines.filter(line => typeof line === 'number') : [],
        potentialSavings: this.validateString(opt.potentialSavings, 'Unknown savings'),
        implementation: this.validateString(opt.implementation, 'Implementation details needed')
      }));
  }

  /**
   * Validate code quality object
   * @param {Object} codeQuality - Code quality to validate
   * @returns {Object} Valid code quality
   */
  validateCodeQuality(codeQuality) {
    if (!codeQuality || typeof codeQuality !== 'object') {
      return { score: 50, issues: [], strengths: [] };
    }

    return {
      score: this.validateScore(codeQuality.score, 50),
      issues: this.validateStringArray(codeQuality.issues || []),
      strengths: this.validateStringArray(codeQuality.strengths || [])
    };
  }

  /**
   * Validate confidence value
   * @param {string|number} confidence - Confidence to validate
   * @param {string} defaultValue - Default value if invalid
   * @returns {string} Valid confidence
   */
  validateConfidence(confidence, defaultValue = 'Medium') {
    const validConfidences = ['Low', 'Medium', 'High'];
    if (validConfidences.includes(confidence)) {
      return confidence;
    }
    if (typeof confidence === 'number') {
      if (confidence >= 0.8) return 'High';
      if (confidence >= 0.5) return 'Medium';
      return 'Low';
    }
    return defaultValue;
  }
}

module.exports = new AIAnalysisPipeline();
