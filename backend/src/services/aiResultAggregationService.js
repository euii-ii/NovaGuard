const logger = require('../utils/logger');

/**
 * AI Result Aggregation Service
 * Advanced service to combine and score results from multiple AI agents with confidence weighting
 */
class AIResultAggregationService {
  constructor() {
    this.agentWeights = this.initializeAgentWeights();
    this.confidenceThresholds = this.initializeConfidenceThresholds();
    this.severityScores = { 'Critical': 100, 'High': 75, 'Medium': 50, 'Low': 25 };
    this.consensusThreshold = 0.6; // 60% agreement for consensus
  }

  /**
   * Initialize agent weights for different vulnerability categories
   * @returns {Object} Agent weight mappings
   */
  initializeAgentWeights() {
    return {
      security: {
        'reentrancy': 0.9,
        'access-control': 0.9,
        'arithmetic': 0.8,
        'unchecked-calls': 0.8,
        'gas-limit': 0.7,
        'timestamp-dependence': 0.7,
        'tx-origin': 0.8,
        'default': 0.8
      },
      quality: {
        'gas-optimization': 0.9,
        'best-practices': 0.8,
        'code-structure': 0.7,
        'default': 0.6
      },
      economics: {
        'tokenomics': 0.9,
        'incentive-design': 0.8,
        'economic-attack': 0.7,
        'governance': 0.6,
        'default': 0.5
      },
      defi: {
        'amm': 0.9,
        'lending': 0.9,
        'yield-farming': 0.8,
        'governance': 0.7,
        'liquidity': 0.8,
        'oracle': 0.7,
        'default': 0.7
      },
      crossChain: {
        'bridge-security': 0.9,
        'state-sync': 0.8,
        'cross-chain-reentrancy': 0.8,
        'consensus': 0.7,
        'default': 0.6
      },
      mev: {
        'frontrunning': 0.9,
        'sandwich-attack': 0.9,
        'flashloan': 0.8,
        'arbitrage': 0.7,
        'liquidation': 0.7,
        'default': 0.6
      }
    };
  }

  /**
   * Initialize confidence thresholds for different scenarios
   * @returns {Object} Confidence threshold mappings
   */
  initializeConfidenceThresholds() {
    return {
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      consensus: 0.7,
      singleAgent: 0.5
    };
  }

  /**
   * Aggregate results from multiple AI agents with advanced scoring
   * @param {Array} agentResults - Results from all agents
   * @param {Object} options - Aggregation options
   * @returns {Object} Aggregated and scored results
   */
  async aggregateResults(agentResults, options = {}) {
    try {
      logger.info('Starting AI result aggregation', {
        totalAgents: agentResults.length,
        successfulAgents: agentResults.filter(r => r.success).length
      });

      const successfulResults = agentResults.filter(result => result.success);
      
      if (successfulResults.length === 0) {
        throw new Error('No successful agent results to aggregate');
      }

      // Extract and process vulnerabilities
      const processedVulnerabilities = this.processVulnerabilities(successfulResults);
      
      // Apply consensus filtering
      const consensusVulnerabilities = this.applyConsensusFiltering(processedVulnerabilities);
      
      // Calculate weighted scores
      const weightedScores = this.calculateWeightedScores(successfulResults, consensusVulnerabilities);
      
      // Generate confidence metrics
      const confidenceMetrics = this.calculateConfidenceMetrics(successfulResults, consensusVulnerabilities);
      
      // Create aggregated recommendations
      const aggregatedRecommendations = this.aggregateRecommendations(successfulResults);
      
      // Generate final risk assessment
      const riskAssessment = this.generateRiskAssessment(consensusVulnerabilities, weightedScores, confidenceMetrics);

      const aggregatedResult = {
        vulnerabilities: consensusVulnerabilities,
        overallScore: weightedScores.overall,
        riskLevel: riskAssessment.level,
        confidenceScore: confidenceMetrics.overall,
        summary: this.generateAggregatedSummary(successfulResults, consensusVulnerabilities),
        recommendations: aggregatedRecommendations,
        gasOptimizations: this.aggregateGasOptimizations(successfulResults),
        codeQuality: this.aggregateCodeQuality(successfulResults),
        agentConsensus: this.calculateAgentConsensus(successfulResults),
        metadata: {
          aggregationMethod: options.method || 'weighted-consensus',
          agentsUsed: successfulResults.map(r => r.agentType),
          failedAgents: agentResults.filter(r => !r.success).map(r => r.agentType),
          confidenceMetrics,
          weightedScores,
          riskAssessment,
          aggregatedAt: new Date().toISOString()
        }
      };

      logger.info('AI result aggregation completed', {
        finalScore: aggregatedResult.overallScore,
        riskLevel: aggregatedResult.riskLevel,
        vulnerabilitiesCount: consensusVulnerabilities.length,
        confidenceScore: aggregatedResult.confidenceScore
      });

      return aggregatedResult;

    } catch (error) {
      logger.error('AI result aggregation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Process vulnerabilities from all agents with deduplication and scoring
   * @param {Array} successfulResults - Successful agent results
   * @returns {Array} Processed vulnerabilities
   */
  processVulnerabilities(successfulResults) {
    const allVulnerabilities = [];

    successfulResults.forEach(result => {
      if (result.analysis?.vulnerabilities) {
        result.analysis.vulnerabilities.forEach(vuln => {
          const processedVuln = {
            ...vuln,
            detectedBy: [result.agentType],
            agentConfidence: this.normalizeConfidence(vuln.confidence),
            categoryWeight: this.getCategoryWeight(result.agentType, vuln.category),
            severityScore: this.severityScores[vuln.severity] || 50,
            uniqueId: this.generateVulnerabilityId(vuln)
          };
          allVulnerabilities.push(processedVuln);
        });
      }
    });

    // Deduplicate and merge similar vulnerabilities
    return this.deduplicateAndMergeVulnerabilities(allVulnerabilities);
  }

  /**
   * Apply consensus filtering to vulnerabilities
   * @param {Array} vulnerabilities - Processed vulnerabilities
   * @returns {Array} Consensus-filtered vulnerabilities
   */
  applyConsensusFiltering(vulnerabilities) {
    return vulnerabilities.map(vuln => {
      const consensus = vuln.detectedBy.length / this.getTotalAgents(vuln);
      const adjustedConfidence = this.adjustConfidenceByConsensus(vuln.agentConfidence, consensus);
      
      return {
        ...vuln,
        consensus,
        adjustedConfidence,
        finalConfidence: Math.min(vuln.agentConfidence * vuln.categoryWeight * consensus, 1.0),
        consensusLevel: this.getConsensusLevel(consensus)
      };
    }).filter(vuln => vuln.finalConfidence >= this.confidenceThresholds.low);
  }

  /**
   * Calculate weighted scores from all agents
   * @param {Array} successfulResults - Successful agent results
   * @param {Array} vulnerabilities - Processed vulnerabilities
   * @returns {Object} Weighted scores
   */
  calculateWeightedScores(successfulResults, vulnerabilities) {
    const agentScores = successfulResults.map(result => ({
      agentType: result.agentType,
      score: result.analysis?.overallScore || 50,
      weight: this.getAgentOverallWeight(result.agentType),
      vulnerabilityCount: result.analysis?.vulnerabilities?.length || 0
    }));

    // Calculate weighted average
    const totalWeight = agentScores.reduce((sum, agent) => sum + agent.weight, 0);
    const weightedSum = agentScores.reduce((sum, agent) => sum + (agent.score * agent.weight), 0);
    const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 50;

    // Apply vulnerability penalty
    const vulnerabilityPenalty = this.calculateVulnerabilityPenalty(vulnerabilities);
    const adjustedScore = Math.max(0, weightedAverage - vulnerabilityPenalty);

    return {
      overall: Math.round(adjustedScore),
      weightedAverage: Math.round(weightedAverage),
      vulnerabilityPenalty,
      agentScores,
      scoreDistribution: this.calculateScoreDistribution(agentScores)
    };
  }

  /**
   * Calculate confidence metrics for the aggregated result
   * @param {Array} successfulResults - Successful agent results
   * @param {Array} vulnerabilities - Processed vulnerabilities
   * @returns {Object} Confidence metrics
   */
  calculateConfidenceMetrics(successfulResults, vulnerabilities) {
    const agentAgreement = this.calculateAgentAgreement(successfulResults);
    const vulnerabilityConfidence = this.calculateVulnerabilityConfidence(vulnerabilities);
    const coverageScore = this.calculateCoverageScore(successfulResults);
    
    const overall = (agentAgreement + vulnerabilityConfidence + coverageScore) / 3;

    return {
      overall: Math.round(overall * 100) / 100,
      agentAgreement,
      vulnerabilityConfidence,
      coverageScore,
      level: this.getConfidenceLevel(overall)
    };
  }

  /**
   * Generate aggregated summary from all agent results
   * @param {Array} successfulResults - Successful agent results
   * @param {Array} vulnerabilities - Processed vulnerabilities
   * @returns {string} Aggregated summary
   */
  generateAggregatedSummary(successfulResults, vulnerabilities) {
    const agentCount = successfulResults.length;
    const vulnCount = vulnerabilities.length;
    const criticalCount = vulnerabilities.filter(v => v.severity === 'Critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'High').length;

    let summary = `Multi-agent analysis completed with ${agentCount} specialized AI agents. `;
    
    if (vulnCount === 0) {
      summary += 'No significant vulnerabilities detected across all analysis dimensions.';
    } else {
      summary += `Identified ${vulnCount} potential issues`;
      if (criticalCount > 0) {
        summary += ` including ${criticalCount} critical vulnerabilities`;
      }
      if (highCount > 0) {
        summary += ` and ${highCount} high-severity issues`;
      }
      summary += '.';
    }

    // Add agent-specific insights
    const agentInsights = successfulResults
      .filter(r => r.analysis?.summary)
      .map(r => `${r.agentType}: ${r.analysis.summary}`)
      .join(' ');

    if (agentInsights) {
      summary += ` Agent insights: ${agentInsights}`;
    }

    return summary;
  }

  /**
   * Deduplicate and merge similar vulnerabilities
   * @param {Array} vulnerabilities - All vulnerabilities
   * @returns {Array} Deduplicated vulnerabilities
   */
  deduplicateAndMergeVulnerabilities(vulnerabilities) {
    const vulnerabilityMap = new Map();

    vulnerabilities.forEach(vuln => {
      const key = vuln.uniqueId;
      
      if (vulnerabilityMap.has(key)) {
        const existing = vulnerabilityMap.get(key);
        // Merge detectedBy arrays
        existing.detectedBy = [...new Set([...existing.detectedBy, ...vuln.detectedBy])];
        // Take highest confidence and severity
        existing.agentConfidence = Math.max(existing.agentConfidence, vuln.agentConfidence);
        existing.categoryWeight = Math.max(existing.categoryWeight, vuln.categoryWeight);
        if (this.severityScores[vuln.severity] > this.severityScores[existing.severity]) {
          existing.severity = vuln.severity;
          existing.severityScore = vuln.severityScore;
        }
      } else {
        vulnerabilityMap.set(key, vuln);
      }
    });

    return Array.from(vulnerabilityMap.values());
  }

  /**
   * Generate unique ID for vulnerability based on characteristics
   * @param {Object} vulnerability - Vulnerability object
   * @returns {string} Unique identifier
   */
  generateVulnerabilityId(vulnerability) {
    const key = `${vulnerability.category || 'unknown'}-${vulnerability.name || 'unnamed'}-${(vulnerability.affectedLines || []).join(',')}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  /**
   * Get category weight for agent type and vulnerability category
   * @param {string} agentType - Type of agent
   * @param {string} category - Vulnerability category
   * @returns {number} Weight factor
   */
  getCategoryWeight(agentType, category) {
    const agentWeights = this.agentWeights[agentType];
    if (!agentWeights) return 0.5;
    return agentWeights[category] || agentWeights.default || 0.5;
  }

  /**
   * Get overall weight for agent type
   * @param {string} agentType - Type of agent
   * @returns {number} Overall weight
   */
  getAgentOverallWeight(agentType) {
    const weights = {
      security: 0.35,
      defi: 0.25,
      quality: 0.15,
      economics: 0.1,
      crossChain: 0.08,
      mev: 0.07
    };
    return weights[agentType] || 0.1;
  }

  /**
   * Normalize confidence values to 0-1 range
   * @param {string|number} confidence - Confidence value
   * @returns {number} Normalized confidence
   */
  normalizeConfidence(confidence) {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(1, confidence));
    }

    const confidenceMap = {
      'High': 0.9,
      'Medium': 0.6,
      'Low': 0.3
    };

    return confidenceMap[confidence] || 0.5;
  }

  /**
   * Adjust confidence based on consensus
   * @param {number} baseConfidence - Base confidence score
   * @param {number} consensus - Consensus ratio
   * @returns {number} Adjusted confidence
   */
  adjustConfidenceByConsensus(baseConfidence, consensus) {
    // Boost confidence if multiple agents agree
    const consensusBoost = consensus > this.consensusThreshold ? 1.2 : 1.0;
    return Math.min(1.0, baseConfidence * consensusBoost);
  }

  /**
   * Get consensus level description
   * @param {number} consensus - Consensus ratio
   * @returns {string} Consensus level
   */
  getConsensusLevel(consensus) {
    if (consensus >= 0.8) return 'Strong';
    if (consensus >= 0.6) return 'Moderate';
    if (consensus >= 0.4) return 'Weak';
    return 'Low';
  }

  /**
   * Calculate vulnerability penalty for overall score
   * @param {Array} vulnerabilities - Processed vulnerabilities
   * @returns {number} Penalty points
   */
  calculateVulnerabilityPenalty(vulnerabilities) {
    let penalty = 0;

    vulnerabilities.forEach(vuln => {
      const basePenalty = {
        'Critical': 25,
        'High': 15,
        'Medium': 8,
        'Low': 3
      }[vuln.severity] || 5;

      // Apply confidence weighting
      penalty += basePenalty * vuln.finalConfidence;
    });

    return Math.round(penalty);
  }

  /**
   * Calculate score distribution statistics
   * @param {Array} agentScores - Agent score data
   * @returns {Object} Score distribution
   */
  calculateScoreDistribution(agentScores) {
    const scores = agentScores.map(a => a.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    return {
      mean: Math.round(mean),
      variance: Math.round(variance),
      standardDeviation: Math.round(Math.sqrt(variance)),
      min: Math.min(...scores),
      max: Math.max(...scores),
      range: Math.max(...scores) - Math.min(...scores)
    };
  }

  /**
   * Calculate agent agreement score
   * @param {Array} successfulResults - Successful agent results
   * @returns {number} Agreement score (0-1)
   */
  calculateAgentAgreement(successfulResults) {
    if (successfulResults.length < 2) return 1.0;

    const scores = successfulResults.map(r => r.analysis?.overallScore || 50);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert standard deviation to agreement score (lower deviation = higher agreement)
    const maxStdDev = 50; // Maximum expected standard deviation
    return Math.max(0, 1 - (standardDeviation / maxStdDev));
  }

  /**
   * Calculate vulnerability confidence score
   * @param {Array} vulnerabilities - Processed vulnerabilities
   * @returns {number} Vulnerability confidence (0-1)
   */
  calculateVulnerabilityConfidence(vulnerabilities) {
    if (vulnerabilities.length === 0) return 1.0;

    const totalConfidence = vulnerabilities.reduce((sum, vuln) => sum + vuln.finalConfidence, 0);
    return totalConfidence / vulnerabilities.length;
  }

  /**
   * Calculate coverage score based on agent diversity
   * @param {Array} successfulResults - Successful agent results
   * @returns {number} Coverage score (0-1)
   */
  calculateCoverageScore(successfulResults) {
    const totalAgents = 6; // Total available agent types
    const usedAgents = successfulResults.length;
    return Math.min(1.0, usedAgents / totalAgents);
  }

  /**
   * Get confidence level description
   * @param {number} confidence - Confidence score
   * @returns {string} Confidence level
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.8) return 'Very High';
    if (confidence >= 0.6) return 'High';
    if (confidence >= 0.4) return 'Medium';
    if (confidence >= 0.2) return 'Low';
    return 'Very Low';
  }

  /**
   * Aggregate recommendations from all agents
   * @param {Array} successfulResults - Successful agent results
   * @returns {Array} Aggregated recommendations
   */
  aggregateRecommendations(successfulResults) {
    const allRecommendations = [];

    successfulResults.forEach(result => {
      if (result.analysis?.recommendations) {
        result.analysis.recommendations.forEach(rec => {
          allRecommendations.push({
            recommendation: rec,
            source: result.agentType,
            priority: this.getRecommendationPriority(rec, result.agentType)
          });
        });
      }
    });

    // Deduplicate and sort by priority
    const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);
    return uniqueRecommendations
      .sort((a, b) => b.priority - a.priority)
      .map(r => r.recommendation);
  }

  /**
   * Aggregate gas optimizations from all agents
   * @param {Array} successfulResults - Successful agent results
   * @returns {Array} Aggregated gas optimizations
   */
  aggregateGasOptimizations(successfulResults) {
    const allOptimizations = [];

    successfulResults.forEach(result => {
      if (result.analysis?.gasOptimizations) {
        result.analysis.gasOptimizations.forEach(opt => {
          allOptimizations.push({
            ...opt,
            source: result.agentType
          });
        });
      }
    });

    return this.deduplicateOptimizations(allOptimizations);
  }

  /**
   * Aggregate code quality metrics
   * @param {Array} successfulResults - Successful agent results
   * @returns {Object} Aggregated code quality
   */
  aggregateCodeQuality(successfulResults) {
    const qualityResults = successfulResults
      .filter(r => r.analysis?.codeQuality)
      .map(r => r.analysis.codeQuality);

    if (qualityResults.length === 0) {
      return { score: 70, issues: [], strengths: [] };
    }

    const avgScore = qualityResults.reduce((sum, q) => sum + (q.score || 70), 0) / qualityResults.length;
    const allIssues = qualityResults.flatMap(q => q.issues || []);
    const allStrengths = qualityResults.flatMap(q => q.strengths || []);

    return {
      score: Math.round(avgScore),
      issues: [...new Set(allIssues)],
      strengths: [...new Set(allStrengths)]
    };
  }

  /**
   * Calculate agent consensus metrics
   * @param {Array} successfulResults - Successful agent results
   * @returns {Object} Agent consensus data
   */
  calculateAgentConsensus(successfulResults) {
    const consensus = {
      totalAgents: successfulResults.length,
      scoreConsensus: this.calculateAgentAgreement(successfulResults),
      vulnerabilityConsensus: this.calculateVulnerabilityConsensus(successfulResults),
      recommendationOverlap: this.calculateRecommendationOverlap(successfulResults)
    };

    consensus.overall = (consensus.scoreConsensus + consensus.vulnerabilityConsensus + consensus.recommendationOverlap) / 3;

    return consensus;
  }

  // Helper methods for consensus calculations
  getTotalAgents(vulnerability) {
    return 6; // Total available agents
  }

  getRecommendationPriority(recommendation, agentType) {
    const agentPriorities = { security: 5, defi: 4, quality: 3, economics: 2, crossChain: 2, mev: 2 };
    return agentPriorities[agentType] || 1;
  }

  deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      const key = rec.recommendation.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  deduplicateOptimizations(optimizations) {
    const seen = new Set();
    return optimizations.filter(opt => {
      const key = `${opt.description}-${opt.affectedLines?.join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  calculateVulnerabilityConsensus(successfulResults) {
    // Simplified consensus calculation
    return 0.7; // Placeholder
  }

  calculateRecommendationOverlap(successfulResults) {
    // Simplified overlap calculation
    return 0.6; // Placeholder
  }

  generateRiskAssessment(vulnerabilities, weightedScores, confidenceMetrics) {
    const score = weightedScores.overall;
    const criticalCount = vulnerabilities.filter(v => v.severity === 'Critical').length;

    let level;
    if (criticalCount > 0 || score < 40) level = 'Critical';
    else if (score < 60) level = 'High';
    else if (score < 80) level = 'Medium';
    else level = 'Low';

    return {
      level,
      score,
      criticalIssues: criticalCount,
      confidence: confidenceMetrics.overall,
      recommendation: this.getRiskRecommendation(level, criticalCount)
    };
  }

  getRiskRecommendation(level, criticalCount) {
    if (level === 'Critical') return 'Immediate security review required before deployment';
    if (level === 'High') return 'Comprehensive security audit recommended';
    if (level === 'Medium') return 'Address identified issues before production';
    return 'Monitor and maintain security best practices';
  }
}

module.exports = new AIResultAggregationService();
