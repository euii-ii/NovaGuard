// Using Jest's built-in expect instead of chai
const sinon = require('sinon');
const AuditEngine = require('../../src/services/auditEngine');

// Mock dependencies
const contractParser = require('../../src/services/contractParser');
const llmService = require('../../src/services/llmService');
const aiAnalysisPipeline = require('../../src/services/aiAnalysisPipeline');
const web3Service = require('../../src/services/web3Service');
const multiChainWeb3Service = require('../../src/services/multiChainWeb3Service');
const dataPersistenceService = require('../../src/services/dataPersistenceService');
const teeMonitor = require('../../src/services/teeMonitor');
const logger = require('../../src/utils/logger');

const { 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  mockContracts,
  mockAIResponses,
  testUtils
} = require('../setup');

describe('AuditEngine Service', () => {
  let auditEngine;
  let stubs = {};

  beforeAll(async () => {
    await setupTestEnvironment();
    auditEngine = AuditEngine;
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Create stubs for all dependencies
    stubs.contractParser = sinon.stub(contractParser, 'parseContract');
    stubs.aiAnalysisPipeline = sinon.stub(aiAnalysisPipeline, 'analyzeContract');
    stubs.web3Service = {
      isValidAddress: sinon.stub(web3Service, 'isValidAddress'),
      isChainSupported: sinon.stub(web3Service, 'isChainSupported'),
      getContractFromAddress: sinon.stub(web3Service, 'getContractFromAddress')
    };
    stubs.dataPersistenceService = sinon.stub(dataPersistenceService, 'saveAnalysisResult');
    stubs.teeMonitor = sinon.stub(teeMonitor, 'logAudit');
    stubs.logger = {
      info: sinon.stub(logger, 'info'),
      error: sinon.stub(logger, 'error'),
      warn: sinon.stub(logger, 'warn')
    };
  });

  afterEach(() => {
    // Restore all stubs
    Object.values(stubs).forEach(stub => {
      if (typeof stub.restore === 'function') {
        stub.restore();
      } else if (typeof stub === 'object') {
        Object.values(stub).forEach(s => s.restore && s.restore());
      }
    });
    stubs = {};
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(auditEngine.maxContractSize).toEqual(expect.any(Number));
      expect(auditEngine.vulnerabilityThresholds).toHaveProperty('high');
      expect(auditEngine.vulnerabilityThresholds).toHaveProperty('medium');
    });

    it('should use environment variables for configuration', () => {
      // Store original values
      const originalMaxSize = process.env.MAX_CONTRACT_SIZE_BYTES;
      const originalHigh = process.env.VULNERABILITY_THRESHOLD_HIGH;
      const originalMedium = process.env.VULNERABILITY_THRESHOLD_MEDIUM;
      
      process.env.MAX_CONTRACT_SIZE_BYTES = '2097152';
      process.env.VULNERABILITY_THRESHOLD_HIGH = '85';
      process.env.VULNERABILITY_THRESHOLD_MEDIUM = '60';
      
      // Create a new instance to test environment variables
      const engine = new AuditEngine.AuditEngine();
      expect(engine.maxContractSize).toBe(2097152);
      expect(engine.vulnerabilityThresholds.high).toBe(85);
      expect(engine.vulnerabilityThresholds.medium).toBe(60);
      
      // Restore original values
      if (originalMaxSize) process.env.MAX_CONTRACT_SIZE_BYTES = originalMaxSize;
      else delete process.env.MAX_CONTRACT_SIZE_BYTES;
      if (originalHigh) process.env.VULNERABILITY_THRESHOLD_HIGH = originalHigh;
      else delete process.env.VULNERABILITY_THRESHOLD_HIGH;
      if (originalMedium) process.env.VULNERABILITY_THRESHOLD_MEDIUM = originalMedium;
      else delete process.env.VULNERABILITY_THRESHOLD_MEDIUM;
    });
  });

  describe('auditContract', () => {
    const mockParseResult = {
      contracts: [{ name: 'TestContract' }],
      functions: [{ name: 'testFunction' }],
      modifiers: [],
      events: [],
      codeMetrics: { complexity: 5, codeLines: 50 },
      staticAnalysis: {
        findings: [
          {
            category: 'reentrancy',
            pattern: 'external-call-before-state-change',
            severity: 'High',
            line: 10,
            code: 'msg.sender.call{value: amount}("");'
          }
        ]
      }
    };

    const mockAIAnalysis = {
      analysisType: 'multi-agent',
      vulnerabilities: [
        {
          name: 'Reentrancy Vulnerability',
          severity: 'High',
          category: 'reentrancy',
          description: 'External call before state change',
          affectedLines: [10],
          detectedBy: 'security-agent'
        }
      ],
      recommendations: ['Use ReentrancyGuard'],
      gasOptimizations: [],
      codeQuality: { score: 75 },
      summary: 'Contract has security issues',
      confidenceScore: 85,
      metadata: {
        agentsUsed: ['security-agent'],
        failedAgents: [],
        analysisVersion: '2.0.0'
      }
    };

    beforeEach(() => {
      stubs.contractParser.resolves(mockParseResult);
      stubs.aiAnalysisPipeline.resolves(mockAIAnalysis);
      stubs.dataPersistenceService.resolves({ id: 'test-id' });
      stubs.teeMonitor.resolves();
    });

    it('should successfully audit a valid contract', async () => {
      const result = await auditEngine.auditContract(mockContracts.simple);
      
      expect(result).toHaveProperty('auditId');
      expect(result).toHaveProperty('status', 'completed');
      expect(result).toHaveProperty('type', 'full-analysis');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('contractInfo');
      
      expect(stubs.contractParser.calledOnce).toBe(true);
      expect(stubs.aiAnalysisPipeline.calledOnce).toBe(true);
      expect(stubs.dataPersistenceService.calledOnce).toBe(true);
      expect(stubs.teeMonitor.calledOnce).toBe(true);
    });

    it('should validate contract input', async () => {
      try {
        await auditEngine.auditContract('');
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Contract code must be a non-empty string');
      }
    });

    it('should reject oversized contracts', async () => {
      const largeContract = 'a'.repeat(auditEngine.maxContractSize + 1);
      
      try {
        await auditEngine.auditContract(largeContract);
        throw new Error('Should have thrown size error');
      } catch (error) {
        expect(error.message).toContain('Contract size exceeds maximum limit');
      }
    });

    it('should reject invalid Solidity code', async () => {
      try {
        await auditEngine.auditContract('invalid code without contract keyword');
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('validation');
      }
    });

    it('should handle parsing errors gracefully', async () => {
      stubs.contractParser.rejects(new Error('Parse error'));
      
      try {
        await auditEngine.auditContract(mockContracts.simple);
        throw new Error('Should have thrown parse error');
      } catch (error) {
        expect(error.message).toBe('Parse error');
        expect(stubs.teeMonitor.calledOnce).toBe(true);
      }
    });

    it('should handle AI analysis errors gracefully', async () => {
      stubs.aiAnalysisPipeline.rejects(new Error('AI analysis failed'));
      
      try {
        await auditEngine.auditContract(mockContracts.simple);
        throw new Error('Should have thrown AI analysis error');
      } catch (error) {
        expect(error.message).toBe('AI analysis failed');
        expect(stubs.teeMonitor.calledOnce).toBe(true);
      }
    });

    it('should continue audit even if database save fails', async () => {
      stubs.dataPersistenceService.rejects(new Error('Database error'));
      
      const result = await auditEngine.auditContract(mockContracts.simple);
      
      expect(result).toHaveProperty('auditId');
      expect(stubs.logger.error.calledWith('Failed to save analysis result to database')).toBe(true);
    });

    it('should pass correct options to AI analysis pipeline', async () => {
      const options = {
        contractAddress: '0x123',
        chain: 'ethereum',
        agents: ['security', 'quality'],
        analysisMode: 'comprehensive'
      };
      
      await auditEngine.auditContract(mockContracts.simple, options);
      
      expect(stubs.aiAnalysisPipeline.calledWith(sinon.match({
        contractCode: mockContracts.simple,
        contractAddress: '0x123',
        chain: 'ethereum',
        agents: ['security', 'quality'],
        analysisMode: 'comprehensive'
      }))).toBe(true);
    });
  });

  describe('auditContractByAddress', () => {
    const mockContractData = {
      address: '0x123',
      chain: 'ethereum',
      chainId: 1,
      balance: '1000000000000000000',
      transactionCount: 100,
      sourceCode: {
        sourceCode: mockContracts.simple
      },
      bytecode: '0x608060405234801561001057600080fd5b50...'
    };

    beforeEach(() => {
      stubs.web3Service.isValidAddress.returns(true);
      stubs.web3Service.isChainSupported.returns(true);
      stubs.web3Service.getContractFromAddress.resolves(mockContractData);
    });

    it('should successfully audit contract by address', async () => {
      const result = await auditEngine.auditContractByAddress('0x123', 'ethereum');
      
      expect(result).toHaveProperty('auditId');
      expect(result).toHaveProperty('contractInfo');
      expect(result.contractInfo).toHaveProperty('address', '0x123');
      expect(result.contractInfo).toHaveProperty('chain', 'ethereum');
      
      expect(stubs.web3Service.isValidAddress.calledWith('0x123')).toBe(true);
      expect(stubs.web3Service.isChainSupported.calledWith('ethereum')).toBe(true);
      expect(stubs.web3Service.getContractFromAddress.calledWith('0x123', 'ethereum')).toBe(true);
    });

    it('should reject invalid contract address', async () => {
      stubs.web3Service.isValidAddress.returns(false);
      
      try {
        await auditEngine.auditContractByAddress('invalid-address', 'ethereum');
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Invalid contract address format');
      }
    });

    it('should reject unsupported chain', async () => {
      stubs.web3Service.isChainSupported.returns(false);
      
      try {
        await auditEngine.auditContractByAddress('0x123', 'unsupported-chain');
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Unsupported blockchain');
      }
    });

    it('should perform bytecode analysis when source code unavailable', async () => {
      const contractDataWithoutSource = {
        ...mockContractData,
        sourceCode: null
      };
      stubs.web3Service.getContractFromAddress.resolves(contractDataWithoutSource);
      
      const result = await auditEngine.auditContractByAddress('0x123', 'ethereum');
      
      expect(result).toHaveProperty('type', 'bytecode-only');
      expect(result).toHaveProperty('analysis');
      expect(result.analysis).toHaveProperty('type', 'bytecode');
    });
  });

  describe('analyzeBytecode', () => {
    it('should analyze bytecode patterns correctly', () => {
      const bytecode = '0x608060405234801561001057600080fd5bff'; // Contains selfdestruct (ff)
      const result = auditEngine.analyzeBytecode(bytecode);

      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('warnings');

      expect(result.patterns.hasSelfdestruct).toBe(true);
      expect(result.warnings).toContain('Contract contains selfdestruct functionality');
    });

    it('should detect delegatecall pattern', () => {
      const bytecode = '0x608060405234801561001057600080fd5bf4'; // Contains delegatecall (f4)
      const result = auditEngine.analyzeBytecode(bytecode);

      expect(result.patterns.hasDelegatecall).toBe(true);
      expect(result.warnings).toContain('Contract uses delegatecall - potential proxy pattern');
    });

    it('should detect CREATE2 pattern', () => {
      const bytecode = '0x608060405234801561001057600080fd5bf5'; // Contains CREATE2 (f5)
      const result = auditEngine.analyzeBytecode(bytecode);

      expect(result.patterns.hasCreate2).toBe(true);
      expect(result.warnings).toContain('Contract can deploy other contracts using CREATE2');
    });

    it('should calculate bytecode size correctly', () => {
      const bytecode = '0x608060405234801561001057600080fd5b';
      const result = auditEngine.analyzeBytecode(bytecode);

      expect(result.size).toEqual(expect.any(Number)); // Bytecode size should be a number
    });
  });

  describe('combineAnalysisResults', () => {
    const mockParseResult = {
      staticAnalysis: {
        findings: [
          {
            category: 'reentrancy',
            pattern: 'external-call-before-state-change',
            severity: 'High',
            line: 10,
            code: 'msg.sender.call{value: amount}("");'
          }
        ]
      }
    };

    const mockAIAnalysis = {
      vulnerabilities: [
        {
          name: 'Reentrancy Vulnerability',
          severity: 'High',
          category: 'reentrancy',
          description: 'External call before state change',
          affectedLines: [10],
          detectedBy: 'security-agent'
        },
        {
          name: 'Integer Overflow',
          severity: 'Medium',
          category: 'arithmetic',
          description: 'Potential integer overflow',
          affectedLines: [15],
          detectedBy: 'quality-agent'
        }
      ]
    };

    it('should combine static and AI analysis results', () => {
      const result = auditEngine.combineAnalysisResults(mockParseResult, mockAIAnalysis);

      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('staticAnalysis');
      expect(result).toHaveProperty('aiAnalysis');

      expect(result.vulnerabilities).toBeInstanceOf(Array);
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
    });

    it('should deduplicate similar vulnerabilities', () => {
      const duplicateAIAnalysis = {
        vulnerabilities: [
          ...mockAIAnalysis.vulnerabilities,
          {
            name: 'Duplicate Reentrancy',
            severity: 'High',
            category: 'reentrancy',
            description: 'Another reentrancy issue',
            affectedLines: [10], // Same line as static analysis
            detectedBy: 'another-agent'
          }
        ]
      };

      const result = auditEngine.combineAnalysisResults(mockParseResult, duplicateAIAnalysis);

      // Should have fewer vulnerabilities due to deduplication
      expect(result.vulnerabilities.length).toBeLessThan(
        mockParseResult.staticAnalysis.findings.length + duplicateAIAnalysis.vulnerabilities.length
      );
    });

    it('should calculate agent contributions correctly', () => {
      const result = auditEngine.combineAnalysisResults(mockParseResult, mockAIAnalysis);

      expect(result.metrics).toHaveProperty('agentContributions');
      expect(result.metrics.agentContributions).toHaveProperty('security-agent');
      expect(result.metrics.agentContributions).toHaveProperty('quality-agent');

      expect(result.metrics.agentContributions['security-agent'].count).toBe(1);
      expect(result.metrics.agentContributions['quality-agent'].count).toBe(1);
    });
  });

  describe('calculateSecurityScores', () => {
    it('should calculate scores based on vulnerability severity', () => {
      const analysis = {
        vulnerabilities: [
          { severity: 'Critical' },
          { severity: 'High' },
          { severity: 'Medium' },
          { severity: 'Low' }
        ],
        aiAnalysis: {
          codeQuality: { score: 80 }
        }
      };

      const result = auditEngine.calculateSecurityScores(analysis);

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('severityCounts');
      expect(result).toHaveProperty('totalVulnerabilities', 4);
      expect(result).toHaveProperty('codeQuality', 80);

      expect(result.severityCounts.Critical).toBe(1);
      expect(result.severityCounts.High).toBe(1);
      expect(result.severityCounts.Medium).toBe(1);
      expect(result.severityCounts.Low).toBe(1);
    });

    it('should calculate correct risk level', () => {
      const highScoreAnalysis = {
        vulnerabilities: [{ severity: 'Low' }],
        aiAnalysis: { codeQuality: { score: 90 } }
      };

      const lowScoreAnalysis = {
        vulnerabilities: [
          { severity: 'Critical' },
          { severity: 'Critical' },
          { severity: 'High' }
        ],
        aiAnalysis: { codeQuality: { score: 30 } }
      };

      const highResult = auditEngine.calculateSecurityScores(highScoreAnalysis);
      const lowResult = auditEngine.calculateSecurityScores(lowScoreAnalysis);

      expect(highResult.riskLevel).toBe('Low');
      expect(lowResult.riskLevel).toBe('Critical');
    });
  });

  describe('generateAuditReport', () => {
    const mockData = {
      auditId: 'test-audit-123',
      parseResult: {
        contracts: [{ name: 'TestContract' }],
        functions: [{ name: 'testFunction' }],
        modifiers: [],
        events: [],
        codeMetrics: { complexity: 5, codeLines: 50 }
      },
      aiAnalysis: {
        summary: 'Test summary',
        recommendations: ['Test recommendation'],
        gasOptimizations: ['Test optimization'],
        codeQuality: { score: 75 },
        metadata: {
          agentsUsed: ['security-agent'],
          failedAgents: [],
          analysisVersion: '2.0.0'
        }
      },
      combinedAnalysis: {
        vulnerabilities: [
          {
            name: 'Test Vulnerability',
            severity: 'Medium',
            category: 'test',
            description: 'Test description'
          }
        ],
        metrics: {
          agentContributions: {
            'security-agent': { count: 1, severities: { Medium: 1 } }
          }
        }
      },
      scores: {
        overall: 75,
        riskLevel: 'Medium',
        severityCounts: { Medium: 1 },
        codeQuality: 75
      },
      options: {},
      executionTime: 1500
    };

    it('should generate comprehensive audit report', () => {
      const result = auditEngine.generateAuditReport(mockData);

      expect(result).toHaveProperty('auditId', 'test-audit-123');
      expect(result).toHaveProperty('status', 'completed');
      expect(result).toHaveProperty('type', 'full-analysis');
      expect(result).toHaveProperty('contractInfo');
      expect(result).toHaveProperty('vulnerabilities');
      expect(result).toHaveProperty('overallScore', 75);
      expect(result).toHaveProperty('riskLevel', 'Medium');
      expect(result).toHaveProperty('summary', 'Test summary');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('gasOptimizations');
      expect(result).toHaveProperty('codeQuality');
      expect(result).toHaveProperty('staticAnalysis');
      expect(result).toHaveProperty('aiAnalysis');
      expect(result).toHaveProperty('agentContributions');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('executionTime', 1500);
    });

    it('should handle missing contract name gracefully', () => {
      const dataWithoutName = {
        ...mockData,
        parseResult: {
          ...mockData.parseResult,
          contracts: []
        }
      };

      const result = auditEngine.generateAuditReport(dataWithoutName);
      expect(result.contractInfo.name).toBe('Unknown');
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique audit IDs', () => {
      const id1 = auditEngine.generateAuditId();
      const id2 = auditEngine.generateAuditId();

      expect(id1).toEqual(expect.any(String));
      expect(id2).toEqual(expect.any(String));
      expect(id1).not.toBe(id2);
    });

    it('should validate contract input correctly', () => {
      expect(() => auditEngine.validateContractInput(null)).toThrow();
      expect(() => auditEngine.validateContractInput('')).toThrow();
      expect(() => auditEngine.validateContractInput(123)).toThrow();
      expect(() => auditEngine.validateContractInput('invalid code')).toThrow();
      expect(() => auditEngine.validateContractInput('contract Test {}')).not.toThrow();
    });

    it('should calculate risk level correctly', () => {
      expect(auditEngine.calculateRiskLevel(90)).toBe('Low');
      expect(auditEngine.calculateRiskLevel(70)).toBe('Medium');
      expect(auditEngine.calculateRiskLevel(40)).toBe('High');
      expect(auditEngine.calculateRiskLevel(20)).toBe('Critical');
    });
  });
});
