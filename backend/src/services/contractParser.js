const Parser = require('@solidity-parser/parser');
const logger = require('../utils/logger');

class ContractParser {
  constructor() {
    this.vulnerabilityPatterns = {
      reentrancy: [
        /\.call\s*\{/,
        /\.call\s*\(/,
        /\.send\s*\(/,
        /\.transfer\s*\(/,
        /external.*payable/,
      ],
      integerOverflow: [
        /\+\+/,
        /--/,
        /\+\s*=/,
        /-\s*=/,
        /\*\s*=/,
        /\/\s*=/,
      ],
      accessControl: [
        /onlyOwner/,
        /require\s*\(\s*msg\.sender/,
        /modifier/,
        /public\s+function/,
      ],
      'unchecked-call': [
        /\.call\s*\(/,
        /\.delegatecall\s*\(/,
        /\.staticcall\s*\(/,
      ],
      timestampDependence: [
        /block\.timestamp/,
        /now/,
        /block\.number/,
      ],
      'tx-origin': [
        /tx\.origin/,
      ],
      delegatecall: [
        /\.delegatecall\s*\(/,
      ],
      selfdestruct: [
        /selfdestruct\s*\(/,
      ],
    };
  }

  /**
   * Parse Solidity contract and extract security-relevant information
   * @param {string} contractCode - Raw Solidity code
   * @returns {Object} Parsed contract information
   */
  async parseContract(contractCode) {
    try {
      logger.info('Starting contract parsing');
      
      // Basic validation
      if (!contractCode) {
        throw new Error('Contract code cannot be empty');
      }
      
      if (typeof contractCode !== 'string') {
        throw new Error('Contract code must be a string');
      }

      // Parse the contract using solidity-parser-antlr
      const ast = Parser.parse(contractCode, {
        loc: true,
        range: true,
      });

      // Extract contract information
      const contractInfo = this.extractContractInfo(ast, contractCode);
      
      // Perform static analysis
      const staticAnalysis = this.performStaticAnalysis(contractCode);
      
      // Combine results
      const result = {
        contracts: contractInfo.contracts,
        functions: contractInfo.functions,
        modifiers: contractInfo.modifiers,
        events: contractInfo.events,
        imports: contractInfo.imports,
        stateVariables: contractInfo.stateVariables,
        codeMetrics: contractInfo.codeMetrics,
        staticAnalysis,
        rawCode: contractCode,
        parseTimestamp: new Date().toISOString(),
      };

      logger.info('Contract parsing completed successfully');
      return result;

    } catch (error) {
      logger.error('Contract parsing failed', { error: error.message });
      throw new Error(`Failed to parse contract: ${error.message}`);
    }
  }

  /**
   * Extract basic contract information from AST
   * @param {Object} ast - Abstract Syntax Tree
   * @param {string} contractCode - Raw contract code
   * @returns {Object} Contract information
   */
  extractContractInfo(ast, contractCode) {
    const contracts = [];
    const functions = [];
    const modifiers = [];
    const events = [];
    const imports = [];
    const stateVariables = [];

    try {
      Parser.visit(ast, {
        ContractDefinition: (node) => {
          contracts.push({
            name: node.name,
            type: node.kind, // contract, interface, library
            inheritance: node.baseContracts?.map(base => base.baseName.namePath) || [],
            location: node.loc,
          });
        },
        
        FunctionDefinition: (node) => {
          functions.push({
            name: node.name || 'constructor',
            visibility: node.visibility,
            stateMutability: node.stateMutability,
            modifiers: node.modifiers?.map(mod => mod.name) || [],
            parameters: node.parameters?.parameters?.map(param => ({
              name: param.name,
              type: param.typeName?.type,
            })) || [],
            returnParameters: node.returnParameters?.parameters?.map(param => ({
              name: param.name,
              type: param.typeName?.type,
            })) || [],
            location: node.loc,
            isPayable: node.stateMutability === 'payable',
            isExternal: node.visibility === 'external',
          });
        },

        ModifierDefinition: (node) => {
          modifiers.push({
            name: node.name,
            parameters: node.parameters?.parameters?.map(param => ({
              name: param.name,
              type: param.typeName?.type,
            })) || [],
            location: node.loc,
          });
        },

        EventDefinition: (node) => {
          events.push({
            name: node.name,
            parameters: node.parameters?.parameters?.map(param => ({
              name: param.name,
              type: param.typeName?.type,
              indexed: param.indexed,
            })) || [],
            location: node.loc,
          });
        },

        ImportDirective: (node) => {
          imports.push({
            path: node.path,
            symbols: node.symbolAliases?.map(alias => alias.foreign) || [],
            location: node.loc,
          });
        },

        StateVariableDeclaration: (node) => {
          if (node.variables) {
            node.variables.forEach(variable => {
              stateVariables.push({
                name: variable.name,
                type: variable.typeName?.type,
                visibility: variable.visibility,
                location: node.loc,
              });
            });
          }
        },
      });
    } catch (error) {
      logger.warn('AST parsing encountered issues', { error: error.message });
    }

    return {
      contracts,
      functions,
      modifiers,
      events,
      imports,
      stateVariables,
      codeMetrics: this.calculateCodeMetrics(contractCode),
    };
  }

  /**
   * Perform static analysis for common vulnerability patterns
   * @param {string} contractCode - Raw contract code
   * @returns {Object} Static analysis results
   */
  performStaticAnalysis(contractCode) {
    const lines = contractCode.split('\n');
    const findings = [];

    // Check for vulnerability patterns
    Object.entries(this.vulnerabilityPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            findings.push({
              category,
              line: index + 1,
              code: line.trim(),
              pattern: pattern.toString(),
              severity: this.getSeverityForCategory(category),
            });
          }
        });
      });
    });

    return {
      findings,
      totalFindings: findings.length,
      categoryCounts: this.categorizeFindingsCounts(findings),
    };
  }

  /**
   * Calculate basic code metrics
   * @param {string} contractCode - Raw contract code
   * @returns {Object} Code metrics
   */
  calculateCodeMetrics(contractCode) {
    const lines = contractCode.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*'));

    // Count functions, modifiers, and events
    const functionCount = (contractCode.match(/function\s+\w+/g) || []).length;
    const modifierCount = (contractCode.match(/modifier\s+\w+/g) || []).length;
    const eventCount = (contractCode.match(/event\s+\w+/g) || []).length;

    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length,
      commentLines: commentLines.length,
      complexity: this.calculateComplexity(contractCode),
      size: contractCode.length,
      functionCount,
      modifierCount,
      eventCount,
    };
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   * @param {string} contractCode - Raw contract code
   * @returns {number} Complexity score
   */
  calculateComplexity(contractCode) {
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s*if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g, // ternary operator
    ];

    let complexity = 1; // Base complexity
    complexityPatterns.forEach(pattern => {
      const matches = contractCode.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * Get severity level for vulnerability category
   * @param {string} category - Vulnerability category
   * @returns {string} Severity level
   */
  getSeverityForCategory(category) {
    const severityMap = {
      reentrancy: 'High',
      integerOverflow: 'Medium',
      accessControl: 'High',
      'unchecked-call': 'Medium',
      timestampDependence: 'Low',
      'tx-origin': 'High',
      delegatecall: 'Medium',
      selfdestruct: 'High',
    };

    return severityMap[category] || 'Low';
  }

  /**
   * Categorize findings counts
   * @param {Array} findings - Array of findings
   * @returns {Object} Category counts
   */
  categorizeFindingsCounts(findings) {
    const counts = {};
    findings.forEach(finding => {
      counts[finding.category] = (counts[finding.category] || 0) + 1;
    });
    return counts;
  }

  /**
   * Validate Solidity syntax
   * @param {string} contractCode - Raw contract code
   * @returns {Object} Validation result
   */
  validateSyntax(contractCode) {
    try {
      Parser.parse(contractCode);
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: error.message,
          location: error.location,
        }],
      };
    }
  }
}

const contractParserInstance = new ContractParser();

// Export the service instance
module.exports = contractParserInstance;

// Export the class for testing
module.exports.ContractParser = ContractParser;

// Export individual methods for direct access
module.exports.parseContract = contractParserInstance.parseContract.bind(contractParserInstance);
module.exports.validateSyntax = contractParserInstance.validateSyntax.bind(contractParserInstance);
module.exports.performStaticAnalysis = contractParserInstance.performStaticAnalysis.bind(contractParserInstance);
module.exports.calculateCodeMetrics = contractParserInstance.calculateCodeMetrics.bind(contractParserInstance);

// Export initialization method
module.exports.initialize = async function(options = {}) {
  try {
    // Initialize contract parser with configuration
    if (options.vulnerabilityPatterns) {
      contractParserInstance.vulnerabilityPatterns = {
        ...contractParserInstance.vulnerabilityPatterns,
        ...options.vulnerabilityPatterns
      };
    }
    
    logger.info('ContractParser initialized successfully', {
      vulnerabilityPatterns: Object.keys(contractParserInstance.vulnerabilityPatterns).length
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize ContractParser', { error: error.message });
    throw error;
  }
};

// Export service status method
module.exports.getStatus = function() {
  return {
    initialized: true,
    vulnerabilityPatterns: Object.keys(contractParserInstance.vulnerabilityPatterns).length,
    supportedFeatures: ['parsing', 'static-analysis', 'syntax-validation', 'code-metrics']
  };
};
