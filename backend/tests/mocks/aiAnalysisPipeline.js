/**
 * Mock AI Analysis Pipeline for testing
 * This mock prevents circular dependency issues during testing
 */

class MockAIAnalysisPipeline {
  constructor() {
    this.supportedAgents = ['security', 'quality', 'economics', 'defi', 'crossChain', 'mev', 'gasOptimization', 'governance'];
    this.defaultAgentSet = ['security', 'quality'];
    this.maxConcurrentAgents = 6;
    this.analysisTimeout = 180000;
    this.confidenceThreshold = 0.7;
    this.retryAttempts = 2;
    this.performanceMetrics = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      averageExecutionTime: 0,
      agentPerformance: {}
    };
    this.cache = new Map();
    this.activeAnalyses = new Map();
    this.configuration = {
      enableCaching: false,
      maxConcurrentAnalyses: 5,
      enableAdvancedAggregation: true,
      analysisTimeout: 60000
    };
  }

  async initialize(config = {}) {
    this.configuration = { ...this.configuration, ...config };
    return Promise.resolve();
  }

  async analyzeContract(request) {
    const startTime = Date.now();
    const analysisId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Mock successful analysis
      const result = {
        vulnerabilities: [
          {
            name: 'Mock Vulnerability',
            description: 'Mock vulnerability description',
            severity: 'Medium',
            category: 'access-control',
            affectedLines: [1, 2],
            codeSnippet: 'mock code',
            recommendation: 'Mock fix recommendation',
            impact: 'Mock impact description',
            confidence: 'High'
          }
        ],
        overallScore: 85,
        riskLevel: 'Low',
        summary: 'Mock analysis completed successfully',
        recommendations: ['Mock recommendation 1', 'Mock recommendation 2'],
        gasOptimizations: [
          {
            type: 'storage',
            description: 'Mock gas optimization',
            estimatedSavings: 1000,
            line: 10
          }
        ],
        codeQuality: { 
          score: 80, 
          issues: [
            {
              type: 'naming',
              description: 'Mock code quality issue',
              line: 5,
              severity: 'Low'
            }
          ], 
          strengths: ['Mock strength 1', 'Mock strength 2'] 
        },
        metadata: {
          analysisId,
          analysisMode: request.analysisMode || 'comprehensive',
          executionTime: Date.now() - startTime,
          agentsUsed: request.agents || ['security'],
          fromCache: false
        }
      };

      this.performanceMetrics.totalAnalyses++;
      this.performanceMetrics.successfulAnalyses++;
      
      return result;
    } catch (error) {
      return {
        error: error.message,
        overallScore: 0,
        vulnerabilities: [],
        metadata: {
          analysisId,
          executionTime: Date.now() - startTime,
          error: true
        }
      };
    }
  }

  getStatus() {
    return {
      availableAgents: this.supportedAgents,
      activeAnalyses: this.activeAnalyses.size,
      totalAnalyses: this.performanceMetrics.totalAnalyses,
      cacheSize: this.cache.size,
      configuration: this.configuration
    };
  }

  generateAnalysisId() {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async preprocessContract(request) {
    return {
      contractInfo: {
        name: 'MockContract',
        type: 'smart-contract',
        language: 'solidity'
      },
      parsedCode: request.contractCode,
      complexity: 'medium'
    };
  }

  determineAgentConfiguration(preprocessedData, request) {
    return {
      agents: request.agents || ['security'],
      analysisMode: request.analysisMode || 'comprehensive'
    };
  }

  async executeAgentAnalysis(preprocessedData, agentConfig) {
    return agentConfig.agents.map(agent => ({
      agent,
      result: {
        vulnerabilities: [],
        score: 85,
        recommendations: []
      }
    }));
  }

  async aggregateResults(agentResults, preprocessedData) {
    return {
      vulnerabilities: [],
      overallScore: 85,
      riskLevel: 'Low',
      summary: 'Mock aggregated analysis',
      recommendations: []
    };
  }

  generateComprehensiveReport(data) {
    return {
      ...data.aggregatedResults,
      metadata: data
    };
  }
}

// Create a singleton instance
const mockAIAnalysisPipeline = new MockAIAnalysisPipeline();

module.exports = mockAIAnalysisPipeline;
