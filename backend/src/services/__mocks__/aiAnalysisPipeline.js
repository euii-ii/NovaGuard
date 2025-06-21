// Mock for aiAnalysisPipeline service
module.exports = {
  analyzeContract: jest.fn().mockResolvedValue({
    vulnerabilities: [
      {
        name: 'Reentrancy Vulnerability',
        severity: 'high',
        category: 'reentrancy',
        description: 'External call before state change allows reentrancy attacks',
        affectedLines: [8, 9, 10],
        recommendation: 'Use checks-effects-interactions pattern or ReentrancyGuard'
      }
    ],
    overallScore: 75,
    riskLevel: 'Medium',
    metadata: {
      analysisMode: 'comprehensive',
      executionTime: 3000,
      agentsUsed: ['security']
    }
  }),
  
  getAvailableAgents: jest.fn().mockReturnValue([
    { id: 'security', name: 'Security Analyzer', description: 'Detects security vulnerabilities' },
    { id: 'quality', name: 'Quality Analyzer', description: 'Analyzes code quality' },
    { id: 'defi', name: 'DeFi Analyzer', description: 'Specialized DeFi analysis' }
  ]),

  generateInsights: jest.fn().mockResolvedValue({
    insights: ['Contract follows best practices', 'No critical vulnerabilities found'],
    recommendations: ['Consider adding more input validation']
  })
};