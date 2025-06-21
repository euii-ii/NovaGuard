const logger = require('../utils/logger');

/**
 * DeFi-Specific Analysis Engine
 * Specialized analysis for AMM, lending, yield farming, and governance contracts
 */
class DeFiAnalysisEngine {
  constructor() {
    this.protocolPatterns = this.initializeProtocolPatterns();
    this.vulnerabilityChecks = this.initializeVulnerabilityChecks();
  }

  /**
   * Initialize DeFi protocol patterns for detection
   * @returns {Object} Protocol pattern mappings
   */
  initializeProtocolPatterns() {
    return {
      amm: {
        keywords: ['swap', 'pool', 'liquidity', 'reserve', 'pair', 'router'],
        functions: ['addLiquidity', 'removeLiquidity', 'swapExactTokensForTokens', 'getAmountsOut'],
        events: ['Swap', 'Mint', 'Burn', 'Sync'],
        interfaces: ['IUniswapV2Pair', 'IUniswapV3Pool', 'IPancakeRouter']
      },
      lending: {
        keywords: ['lend', 'borrow', 'collateral', 'liquidate', 'interest', 'debt'],
        functions: ['supply', 'borrow', 'repay', 'liquidate', 'redeem'],
        events: ['Supply', 'Borrow', 'Repay', 'Liquidation'],
        interfaces: ['ICToken', 'IAToken', 'ILendingPool']
      },
      yieldFarming: {
        keywords: ['farm', 'stake', 'reward', 'harvest', 'yield', 'mining'],
        functions: ['stake', 'unstake', 'harvest', 'getReward', 'claimRewards'],
        events: ['Staked', 'Withdrawn', 'RewardPaid', 'Harvested'],
        interfaces: ['IMasterChef', 'IStakingRewards', 'IYieldFarm']
      },
      governance: {
        keywords: ['vote', 'proposal', 'delegate', 'quorum', 'governance'],
        functions: ['propose', 'vote', 'execute', 'delegate', 'cancel'],
        events: ['ProposalCreated', 'VoteCast', 'ProposalExecuted'],
        interfaces: ['IGovernor', 'IVotes', 'ITimelock']
      },
      vault: {
        keywords: ['vault', 'strategy', 'deposit', 'withdraw', 'shares'],
        functions: ['deposit', 'withdraw', 'harvest', 'rebalance'],
        events: ['Deposit', 'Withdraw', 'StrategyHarvested'],
        interfaces: ['IVault', 'IStrategy', 'IYearnVault']
      }
    };
  }

  /**
   * Initialize DeFi-specific vulnerability checks
   * @returns {Object} Vulnerability check functions
   */
  initializeVulnerabilityChecks() {
    return {
      priceManipulation: this.checkPriceManipulation.bind(this),
      flashLoanAttack: this.checkFlashLoanVulnerability.bind(this),
      impermanentLoss: this.checkImpermanentLossRisk.bind(this),
      liquidationRisk: this.checkLiquidationMechanisms.bind(this),
      governanceAttack: this.checkGovernanceVulnerabilities.bind(this),
      yieldFarmingRisk: this.checkYieldFarmingRisks.bind(this),
      oracleManipulation: this.checkOracleVulnerabilities.bind(this),
      rugPullRisk: this.checkRugPullIndicators.bind(this)
    };
  }

  /**
   * Analyze DeFi contract for protocol-specific vulnerabilities
   * @param {Object} contractData - Contract information and code
   * @param {Object} parseResult - Parsed contract structure
   * @returns {Object} DeFi analysis results
   */
  async analyzeDeFiContract(contractData, parseResult) {
    try {
      logger.info('Starting DeFi-specific analysis', { 
        contractAddress: contractData.address,
        chain: contractData.chain 
      });

      // Detect DeFi protocol type
      const protocolType = this.detectProtocolType(contractData, parseResult);

      // Run protocol-specific vulnerability checks
      const vulnerabilities = await this.runVulnerabilityChecks(contractData, parseResult, protocolType);

      // Analyze economic risks
      const economicRisks = this.analyzeEconomicRisks(contractData, parseResult, protocolType);

      // Check for common DeFi attack vectors
      const attackVectors = this.identifyAttackVectors(contractData, parseResult, protocolType);

      // Generate DeFi-specific recommendations
      const recommendations = this.generateDeFiRecommendations(protocolType, vulnerabilities, economicRisks);

      const analysis = {
        protocolType,
        vulnerabilities,
        economicRisks,
        attackVectors,
        recommendations,
        riskScore: this.calculateDeFiRiskScore(vulnerabilities, economicRisks),
        analyzedAt: new Date().toISOString()
      };

      logger.info('DeFi analysis completed', {
        protocolType: protocolType.primary,
        vulnerabilitiesFound: vulnerabilities.length,
        riskScore: analysis.riskScore
      });

      return analysis;

    } catch (error) {
      logger.error('DeFi analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect the type of DeFi protocol
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @returns {Object} Protocol type information
   */
  detectProtocolType(contractData, parseResult) {
    const detectedTypes = [];
    const confidence = {};

    Object.entries(this.protocolPatterns).forEach(([protocolType, patterns]) => {
      let score = 0;

      // Check keywords in contract code
      const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';
      patterns.keywords.forEach(keyword => {
        if (codeText.includes(keyword)) score += 1;
      });

      // Check function names
      if (parseResult.functions) {
        patterns.functions.forEach(funcName => {
          if (parseResult.functions.some(f => f.name?.toLowerCase().includes(funcName.toLowerCase()))) {
            score += 2;
          }
        });
      }

      // Check event names
      if (parseResult.events) {
        patterns.events.forEach(eventName => {
          if (parseResult.events.some(e => e.name?.toLowerCase().includes(eventName.toLowerCase()))) {
            score += 2;
          }
        });
      }

      if (score > 0) {
        detectedTypes.push(protocolType);
        confidence[protocolType] = score;
      }
    });

    // Determine primary protocol type
    const primary = detectedTypes.reduce((a, b) => 
      confidence[a] > confidence[b] ? a : b, detectedTypes[0] || 'unknown'
    );

    return {
      primary,
      secondary: detectedTypes.filter(t => t !== primary),
      confidence,
      isMultiProtocol: detectedTypes.length > 1
    };
  }

  /**
   * Run all vulnerability checks
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Detected protocol type
   * @returns {Array} Array of vulnerabilities
   */
  async runVulnerabilityChecks(contractData, parseResult, protocolType) {
    const vulnerabilities = [];

    for (const [checkName, checkFunction] of Object.entries(this.vulnerabilityChecks)) {
      try {
        const result = await checkFunction(contractData, parseResult, protocolType);
        if (result && result.length > 0) {
          vulnerabilities.push(...result);
        }
      } catch (error) {
        logger.error(`Vulnerability check ${checkName} failed`, { error: error.message });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check for price manipulation vulnerabilities
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Price manipulation vulnerabilities
   */
  checkPriceManipulation(contractData, parseResult, protocolType) {
    const vulnerabilities = [];
    const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';

    // Check for single-source price feeds
    if (codeText.includes('getprice') && !codeText.includes('twap') && !codeText.includes('chainlink')) {
      vulnerabilities.push({
        name: 'Single Source Price Feed',
        description: 'Contract relies on a single price source which can be manipulated',
        severity: 'High',
        category: 'price-manipulation',
        recommendation: 'Use multiple price sources or time-weighted average prices (TWAP)',
        confidence: 'Medium'
      });
    }

    // Check for flash loan price manipulation
    if (protocolType.primary === 'amm' && codeText.includes('flashloan')) {
      vulnerabilities.push({
        name: 'Flash Loan Price Manipulation Risk',
        description: 'AMM contract may be vulnerable to flash loan price manipulation attacks',
        severity: 'Critical',
        category: 'flashloan-attack',
        recommendation: 'Implement flash loan protection mechanisms or use TWAP pricing',
        confidence: 'High'
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for flash loan attack vulnerabilities
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Flash loan vulnerabilities
   */
  checkFlashLoanVulnerability(contractData, parseResult, protocolType) {
    const vulnerabilities = [];
    const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';

    // Check for unprotected state changes in single transaction
    if (codeText.includes('flashloan') || codeText.includes('flashswap')) {
      if (!codeText.includes('reentrancyguard') && !codeText.includes('nonreentrant')) {
        vulnerabilities.push({
          name: 'Unprotected Flash Loan Operations',
          description: 'Flash loan operations lack proper reentrancy protection',
          severity: 'Critical',
          category: 'flashloan-attack',
          recommendation: 'Implement reentrancy guards and state validation checks',
          confidence: 'High'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check for impermanent loss risks in AMM protocols
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Impermanent loss risks
   */
  checkImpermanentLossRisk(contractData, parseResult, protocolType) {
    const vulnerabilities = [];

    if (protocolType.primary === 'amm') {
      const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';
      
      // Check for volatile asset pairs without proper warnings
      if (codeText.includes('addliquidity') && !codeText.includes('impermanentloss')) {
        vulnerabilities.push({
          name: 'Impermanent Loss Risk',
          description: 'AMM contract does not adequately warn about impermanent loss risks',
          severity: 'Medium',
          category: 'economic-risk',
          recommendation: 'Implement impermanent loss calculations and user warnings',
          confidence: 'Medium'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check liquidation mechanisms for lending protocols
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Liquidation vulnerabilities
   */
  checkLiquidationMechanisms(contractData, parseResult, protocolType) {
    const vulnerabilities = [];

    if (protocolType.primary === 'lending') {
      const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';

      // Check for liquidation threshold issues
      if (codeText.includes('liquidate') && !codeText.includes('healthfactor')) {
        vulnerabilities.push({
          name: 'Inadequate Liquidation Protection',
          description: 'Liquidation mechanism lacks proper health factor calculations',
          severity: 'High',
          category: 'liquidation-risk',
          recommendation: 'Implement comprehensive health factor and liquidation threshold checks',
          confidence: 'Medium'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check governance vulnerabilities
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Governance vulnerabilities
   */
  checkGovernanceVulnerabilities(contractData, parseResult, protocolType) {
    const vulnerabilities = [];

    if (protocolType.primary === 'governance' || protocolType.secondary.includes('governance')) {
      const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';

      // Check for low quorum requirements
      if (codeText.includes('quorum') && codeText.includes('1')) {
        vulnerabilities.push({
          name: 'Low Governance Quorum',
          description: 'Governance contract may have insufficient quorum requirements',
          severity: 'Medium',
          category: 'governance-attack',
          recommendation: 'Increase quorum requirements to prevent governance attacks',
          confidence: 'Low'
        });
      }

      // Check for timelock protection
      if (codeText.includes('execute') && !codeText.includes('timelock')) {
        vulnerabilities.push({
          name: 'Missing Timelock Protection',
          description: 'Governance proposals can be executed immediately without timelock',
          severity: 'High',
          category: 'governance-attack',
          recommendation: 'Implement timelock mechanism for proposal execution',
          confidence: 'Medium'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check yield farming risks
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Yield farming vulnerabilities
   */
  checkYieldFarmingRisks(contractData, parseResult, protocolType) {
    const vulnerabilities = [];

    if (protocolType.primary === 'yieldFarming') {
      const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';

      // Check for reward calculation vulnerabilities
      if (codeText.includes('reward') && !codeText.includes('safeMath')) {
        vulnerabilities.push({
          name: 'Unsafe Reward Calculations',
          description: 'Reward calculations may be vulnerable to overflow/underflow',
          severity: 'Medium',
          category: 'arithmetic',
          recommendation: 'Use SafeMath library for all reward calculations',
          confidence: 'Medium'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check oracle vulnerabilities
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Oracle vulnerabilities
   */
  checkOracleVulnerabilities(contractData, parseResult, protocolType) {
    const vulnerabilities = [];
    const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';

    // Check for oracle dependency without validation
    if (codeText.includes('oracle') || codeText.includes('pricefeed')) {
      if (!codeText.includes('staleness') && !codeText.includes('heartbeat')) {
        vulnerabilities.push({
          name: 'Oracle Staleness Check Missing',
          description: 'Contract uses oracle data without checking for staleness',
          severity: 'High',
          category: 'oracle-manipulation',
          recommendation: 'Implement staleness checks and heartbeat validation for oracle data',
          confidence: 'High'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check for rug pull indicators
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Rug pull risk indicators
   */
  checkRugPullIndicators(contractData, parseResult, protocolType) {
    const vulnerabilities = [];
    const codeText = contractData.sourceCode?.sourceCode?.toLowerCase() || '';

    // Check for admin functions that can drain funds
    if (codeText.includes('onlyowner') && (codeText.includes('withdraw') || codeText.includes('transfer'))) {
      vulnerabilities.push({
        name: 'Admin Withdrawal Functions',
        description: 'Contract contains admin functions that can withdraw user funds',
        severity: 'Critical',
        category: 'rug-pull-risk',
        recommendation: 'Remove admin withdrawal functions or implement multi-sig protection',
        confidence: 'High'
      });
    }

    return vulnerabilities;
  }

  /**
   * Analyze economic risks
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Object} Economic risk analysis
   */
  analyzeEconomicRisks(contractData, parseResult, protocolType) {
    return {
      highVolatility: this.assessVolatilityRisk(contractData, protocolType),
      lowLiquidity: this.assessLiquidityRisk(contractData, protocolType),
      centralizedControl: this.assessCentralizationRisk(contractData, parseResult),
      tokenInflation: this.assessInflationRisk(contractData, parseResult),
      yieldSustainability: this.assessYieldSustainability(contractData, protocolType)
    };
  }

  /**
   * Identify potential attack vectors
   * @param {Object} contractData - Contract data
   * @param {Object} parseResult - Parse results
   * @param {Object} protocolType - Protocol type
   * @returns {Array} Identified attack vectors
   */
  identifyAttackVectors(contractData, parseResult, protocolType) {
    const attackVectors = [];

    if (protocolType.primary === 'amm') {
      attackVectors.push('Sandwich attacks', 'MEV extraction', 'Impermanent loss exploitation');
    }

    if (protocolType.primary === 'lending') {
      attackVectors.push('Liquidation manipulation', 'Oracle price attacks', 'Flash loan exploits');
    }

    if (protocolType.primary === 'governance') {
      attackVectors.push('Governance token accumulation', 'Proposal manipulation', 'Vote buying');
    }

    return attackVectors;
  }

  /**
   * Generate DeFi-specific recommendations
   * @param {Object} protocolType - Protocol type
   * @param {Array} vulnerabilities - Detected vulnerabilities
   * @param {Object} economicRisks - Economic risks
   * @returns {Array} Recommendations
   */
  generateDeFiRecommendations(protocolType, vulnerabilities, economicRisks) {
    const recommendations = [];

    // Protocol-specific recommendations
    if (protocolType.primary === 'amm') {
      recommendations.push('Implement slippage protection mechanisms');
      recommendations.push('Use time-weighted average prices (TWAP) for price feeds');
    }

    if (protocolType.primary === 'lending') {
      recommendations.push('Implement comprehensive liquidation protection');
      recommendations.push('Use multiple oracle sources for price feeds');
    }

    // Risk-based recommendations
    if (economicRisks.centralizedControl) {
      recommendations.push('Implement multi-signature governance mechanisms');
    }

    if (vulnerabilities.some(v => v.category === 'flashloan-attack')) {
      recommendations.push('Add flash loan protection and reentrancy guards');
    }

    return recommendations;
  }

  /**
   * Calculate DeFi-specific risk score
   * @param {Array} vulnerabilities - Detected vulnerabilities
   * @param {Object} economicRisks - Economic risk analysis
   * @returns {number} Risk score (0-100)
   */
  calculateDeFiRiskScore(vulnerabilities, economicRisks) {
    let score = 100;

    // Deduct points for vulnerabilities
    vulnerabilities.forEach(vuln => {
      const severityDeductions = {
        'Critical': 25,
        'High': 15,
        'Medium': 8,
        'Low': 3
      };
      score -= severityDeductions[vuln.severity] || 5;
    });

    // Deduct points for economic risks
    if (economicRisks.highVolatility) score -= 10;
    if (economicRisks.lowLiquidity) score -= 15;
    if (economicRisks.centralizedControl) score -= 20;

    return Math.max(0, score);
  }

  // Placeholder methods for risk assessment (to be implemented)
  assessVolatilityRisk(contractData, protocolType) { return false; }
  assessLiquidityRisk(contractData, protocolType) { return false; }
  assessCentralizationRisk(contractData, parseResult) { return false; }
  assessInflationRisk(contractData, parseResult) { return false; }
  assessYieldSustainability(contractData, protocolType) { return true; }
}

module.exports = new DeFiAnalysisEngine();
