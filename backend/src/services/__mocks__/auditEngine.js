// Mock for auditEngine service
module.exports = {
  performComprehensiveAudit: jest.fn().mockResolvedValue({
    auditId: 'audit-123',
    contractName: 'TestContract',
    vulnerabilities: [],
    overallScore: 85,
    riskLevel: 'Low',
    metadata: {
      analysisMode: 'comprehensive',
      executionTime: 5000
    }
  }),
  
  getAuditResults: jest.fn().mockResolvedValue({
    auditId: 'audit-123',
    contractName: 'TestContract',
    vulnerabilities: [],
    overallScore: 85,
    riskLevel: 'Low'
  }),
  
  getAuditHistory: jest.fn().mockResolvedValue({
    audits: [],
    total: 0
  }),
  
  generateReport: jest.fn().mockResolvedValue({
    format: 'json',
    data: {
      auditId: 'audit-123',
      summary: 'No critical issues found'
    }
  })
};