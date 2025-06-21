// Using Jest's built-in expect instead of chai
const sinon = require('sinon');
const contractParser = require('../../src/services/contractParser');
const logger = require('../../src/utils/logger');

const { 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  mockContracts,
  testUtils
} = require('../setup');

describe('ContractParser Service', () => {
  let stubs = {};

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    stubs.logger = {
      info: sinon.stub(logger, 'info'),
      error: sinon.stub(logger, 'error'),
      warn: sinon.stub(logger, 'warn')
    };
  });

  afterEach(() => {
    Object.values(stubs).forEach(stub => {
      if (typeof stub === 'object') {
        Object.values(stub).forEach(s => s.restore && s.restore());
      } else if (typeof stub.restore === 'function') {
        stub.restore();
      }
    });
    stubs = {};
  });

  describe('parseContract', () => {
    it('should parse a simple contract successfully', async () => {
      const result = await contractParser.parseContract(mockContracts.simple);
      
      expect(result).toHaveProperty('contracts');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('modifiers');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('codeMetrics');
      expect(result).toHaveProperty('staticAnalysis');
      
      expect(result.contracts).toBeInstanceOf(Array);
      expect(result.functions).toBeInstanceOf(Array);
      expect(result.modifiers).toBeInstanceOf(Array);
      expect(result.events).toBeInstanceOf(Array);
    });

    it('should parse contract with vulnerabilities', async () => {
      const result = await contractParser.parseContract(mockContracts.vulnerable);
      
      expect(result.staticAnalysis).toHaveProperty('findings');
      expect(result.staticAnalysis.findings).toBeInstanceOf(Array);
      
      // Should detect reentrancy vulnerability
      const reentrancyFindings = result.staticAnalysis.findings.filter(
        finding => finding.category === 'reentrancy'
      );
      expect(reentrancyFindings.length).toBeGreaterThan(0);
    });

    it('should parse complex DeFi contract', async () => {
      const result = await contractParser.parseContract(mockContracts.defi);
      
      expect(result.contracts).toBeInstanceOf(Array);
      expect(result.functions).toBeInstanceOf(Array);
      
      // Should detect interface usage
      const interfaces = result.contracts.filter(contract => contract.type === 'interface');
      expect(interfaces.length).toBeGreaterThan(0);
    });

    it('should calculate code metrics correctly', async () => {
      const result = await contractParser.parseContract(mockContracts.complex);
      
      expect(result.codeMetrics).toHaveProperty('codeLines');
      expect(result.codeMetrics).toHaveProperty('complexity');
      expect(result.codeMetrics).toHaveProperty('functionCount');
      expect(result.codeMetrics).toHaveProperty('modifierCount');
      expect(result.codeMetrics).toHaveProperty('eventCount');
      
      expect(result.codeMetrics.codeLines).toEqual(expect.any(Number));
      expect(result.codeMetrics.complexity).toEqual(expect.any(Number));
      expect(result.codeMetrics.functionCount).toEqual(expect.any(Number));
    });

    it('should handle invalid Solidity code', async () => {
      try {
        await contractParser.parseContract('invalid solidity code');
        throw new Error('Should have thrown parsing error');
      } catch (error) {
        expect(error.message).toContain('Failed to parse contract');
      }
    });

    it('should handle empty contract code', async () => {
      try {
        await contractParser.parseContract('');
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Contract code cannot be empty');
      }
    });

    it('should detect security patterns correctly', async () => {
      const result = await contractParser.parseContract(mockContracts.vulnerable);
      
      const findings = result.staticAnalysis.findings;
      
      // Check for common vulnerability patterns
      const categories = findings.map(f => f.category);
      expect(categories).toEqual(expect.arrayContaining(['reentrancy']));
    });

    it('should extract function information correctly', async () => {
      const result = await contractParser.parseContract(mockContracts.simple);
      
      expect(result.functions).toBeInstanceOf(Array);
      
      if (result.functions.length > 0) {
        const func = result.functions[0];
        expect(func).toHaveProperty('name');
        expect(func).toHaveProperty('visibility');
        expect(func).toHaveProperty('stateMutability');
        expect(func).toHaveProperty('parameters');
        expect(func).toHaveProperty('returnParameters');
      }
    });

    it('should extract event information correctly', async () => {
      const result = await contractParser.parseContract(mockContracts.complex);
      
      expect(result.events).toBeInstanceOf(Array);
      
      if (result.events.length > 0) {
        const event = result.events[0];
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('parameters');
      }
    });

    it('should extract modifier information correctly', async () => {
      const result = await contractParser.parseContract(mockContracts.complex);
      
      expect(result.modifiers).toBeInstanceOf(Array);
      
      if (result.modifiers.length > 0) {
        const modifier = result.modifiers[0];
        expect(modifier).toHaveProperty('name');
        expect(modifier).toHaveProperty('parameters');
      }
    });
  });

  describe('Static Analysis', () => {
    it('should detect reentrancy vulnerabilities', async () => {
      const vulnerableCode = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          mapping(address => uint256) public balances;
          
          function withdraw(uint256 amount) public {
            require(balances[msg.sender] >= amount);
            msg.sender.call{value: amount}("");
            balances[msg.sender] -= amount;
          }
        }
      `;
      
      const result = await contractParser.parseContract(vulnerableCode);
      const reentrancyFindings = result.staticAnalysis.findings.filter(
        finding => finding.category === 'reentrancy'
      );
      
      expect(reentrancyFindings.length).toBeGreaterThan(0);
    });

    it('should detect unchecked external calls', async () => {
      const vulnerableCode = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function unsafeCall(address target) public {
            target.call("");
          }
        }
      `;
      
      const result = await contractParser.parseContract(vulnerableCode);
      const uncheckedCallFindings = result.staticAnalysis.findings.filter(
        finding => finding.category === 'unchecked-call'
      );
      
      expect(uncheckedCallFindings.length).toBeGreaterThan(0);
    });

    it('should detect tx.origin usage', async () => {
      const vulnerableCode = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function checkOrigin() public view returns (bool) {
            return tx.origin == msg.sender;
          }
        }
      `;
      
      const result = await contractParser.parseContract(vulnerableCode);
      const txOriginFindings = result.staticAnalysis.findings.filter(
        finding => finding.category === 'tx-origin'
      );
      
      expect(txOriginFindings.length).toBeGreaterThan(0);
    });

    it('should detect delegatecall usage', async () => {
      const vulnerableCode = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function delegateCall(address target, bytes memory data) public {
            target.delegatecall(data);
          }
        }
      `;
      
      const result = await contractParser.parseContract(vulnerableCode);
      const delegatecallFindings = result.staticAnalysis.findings.filter(
        finding => finding.category === 'delegatecall'
      );
      
      expect(delegatecallFindings.length).toBeGreaterThan(0);
    });

    it('should detect selfdestruct usage', async () => {
      const vulnerableCode = `
        pragma solidity ^0.8.0;
        contract Vulnerable {
          function destroy() public {
            selfdestruct(payable(msg.sender));
          }
        }
      `;
      
      const result = await contractParser.parseContract(vulnerableCode);
      const selfdestructFindings = result.staticAnalysis.findings.filter(
        finding => finding.category === 'selfdestruct'
      );
      
      expect(selfdestructFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Code Metrics', () => {
    it('should calculate cyclomatic complexity', async () => {
      const complexCode = `
        pragma solidity ^0.8.0;
        contract Complex {
          function complexFunction(uint256 x) public pure returns (uint256) {
            if (x > 10) {
              if (x > 20) {
                return x * 2;
              } else {
                return x + 5;
              }
            } else {
              for (uint256 i = 0; i < x; i++) {
                if (i % 2 == 0) {
                  x += i;
                }
              }
              return x;
            }
          }
        }
      `;
      
      const result = await contractParser.parseContract(complexCode);
      expect(result.codeMetrics.complexity).toBeGreaterThan(1);
    });

    it('should count lines of code correctly', async () => {
      const result = await contractParser.parseContract(mockContracts.simple);
      expect(result.codeMetrics.codeLines).toEqual(expect.any(Number));
      expect(result.codeMetrics.codeLines).toBeGreaterThan(0);
    });

    it('should count functions, modifiers, and events', async () => {
      const result = await contractParser.parseContract(mockContracts.complex);
      
      expect(result.codeMetrics.functionCount).toBe(result.functions.length);
      expect(result.codeMetrics.modifierCount).toBe(result.modifiers.length);
      expect(result.codeMetrics.eventCount).toBe(result.events.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', async () => {
      const invalidCode = `
        pragma solidity ^0.8.0;
        contract Invalid {
          function test() public {
            // Missing closing brace
      `;
      
      try {
        await contractParser.parseContract(invalidCode);
        throw new Error('Should have thrown parsing error');
      } catch (error) {
        expect(error.message).toContain('Failed to parse contract');
        expect(stubs.logger.error.calledOnce).toBe(true);
      }
    });

    it('should handle null or undefined input', async () => {
      try {
        await contractParser.parseContract(null);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Contract code cannot be empty');
      }
      
      try {
        await contractParser.parseContract(undefined);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Contract code cannot be empty');
      }
    });

    it('should handle non-string input', async () => {
      try {
        await contractParser.parseContract(123);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Contract code must be a string');
      }
    });
  });
});
