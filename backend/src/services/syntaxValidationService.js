const contractParser = require('./contractParser');
const logger = require('../utils/logger');

/**
 * Advanced Syntax Validation Service
 * Provides comprehensive Solidity syntax validation with detailed error reporting
 */
class SyntaxValidationService {
  constructor() {
    this.validationRules = this.initializeValidationRules();
    this.syntaxPatterns = this.initializeSyntaxPatterns();
    this.validationCache = new Map();
    this.cacheTimeout = 5000; // 5 seconds
  }

  /**
   * Initialize validation rules
   * @returns {Array} Validation rules
   */
  initializeValidationRules() {
    return [
      {
        id: 'missing_semicolon',
        pattern: /^\s*[^;{}\s]+\s*$/m,
        message: 'Missing semicolon at end of statement',
        severity: 'error',
        category: 'syntax'
      },
      {
        id: 'unmatched_braces',
        pattern: /[{}]/g,
        message: 'Unmatched braces',
        severity: 'error',
        category: 'syntax',
        validator: this.validateBraces.bind(this)
      },
      {
        id: 'unmatched_parentheses',
        pattern: /[()]/g,
        message: 'Unmatched parentheses',
        severity: 'error',
        category: 'syntax',
        validator: this.validateParentheses.bind(this)
      },
      {
        id: 'invalid_pragma',
        pattern: /pragma\s+solidity\s+([^;]+);/g,
        message: 'Invalid pragma directive',
        severity: 'error',
        category: 'pragma',
        validator: this.validatePragma.bind(this)
      },
      {
        id: 'missing_visibility',
        pattern: /function\s+\w+\s*\([^)]*\)\s*(?!(?:public|private|internal|external))/g,
        message: 'Function missing visibility specifier',
        severity: 'warning',
        category: 'visibility'
      },
      {
        id: 'unused_variable',
        pattern: /(\w+)\s+(\w+)\s*;/g,
        message: 'Variable declared but never used',
        severity: 'warning',
        category: 'optimization',
        validator: this.validateUnusedVariables.bind(this)
      },
      {
        id: 'deprecated_throw',
        pattern: /\bthrow\b/g,
        message: 'Use of deprecated "throw" statement. Use "revert()" instead',
        severity: 'warning',
        category: 'deprecated'
      },
      {
        id: 'deprecated_suicide',
        pattern: /\bsuicide\b/g,
        message: 'Use of deprecated "suicide" function. Use "selfdestruct()" instead',
        severity: 'warning',
        category: 'deprecated'
      },
      {
        id: 'unsafe_math',
        pattern: /[+\-*/]\s*(?!=)/g,
        message: 'Consider using SafeMath for arithmetic operations',
        severity: 'info',
        category: 'security',
        validator: this.validateUnsafeMath.bind(this)
      },
      {
        id: 'tx_origin_usage',
        pattern: /tx\.origin/g,
        message: 'Avoid using tx.origin for authorization. Use msg.sender instead',
        severity: 'warning',
        category: 'security'
      },
      {
        id: 'block_timestamp_usage',
        pattern: /block\.timestamp/g,
        message: 'Be cautious with block.timestamp as it can be manipulated by miners',
        severity: 'info',
        category: 'security'
      }
    ];
  }

  /**
   * Initialize syntax patterns for advanced validation
   * @returns {Object} Syntax patterns
   */
  initializeSyntaxPatterns() {
    return {
      contractDeclaration: /contract\s+(\w+)(?:\s+is\s+([^{]+))?\s*{/g,
      functionDeclaration: /function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?\s*(pure|view|payable)?\s*(returns\s*\([^)]*\))?\s*{/g,
      modifierDeclaration: /modifier\s+(\w+)(?:\s*\([^)]*\))?\s*{/g,
      eventDeclaration: /event\s+(\w+)\s*\(([^)]*)\)\s*;/g,
      structDeclaration: /struct\s+(\w+)\s*{/g,
      enumDeclaration: /enum\s+(\w+)\s*{/g,
      mappingDeclaration: /mapping\s*\([^)]+\)\s+(\w+)/g,
      arrayDeclaration: /(\w+)\[\]\s+(\w+)/g,
      importStatement: /import\s+(?:"([^"]+)"|'([^']+)'|\{([^}]+)\}\s+from\s+(?:"([^"]+)"|'([^']+)'))\s*;/g,
      pragmaStatement: /pragma\s+(\w+)\s+([^;]+);/g
    };
  }

  /**
   * Validate Solidity syntax
   * @param {string} content - Contract code
   * @param {string} filePath - File path for context
   * @returns {Object} Validation result
   */
  async validateSyntax(content, filePath = 'unknown') {
    try {
      const cacheKey = this.generateCacheKey(content);
      const cached = this.validationCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }

      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        info: [],
        suggestions: [],
        metrics: {
          linesOfCode: content.split('\n').length,
          functions: 0,
          contracts: 0,
          complexity: 0
        },
        timestamp: new Date().toISOString()
      };

      // Basic syntax validation using contract parser
      await this.performBasicValidation(content, validation);

      // Advanced rule-based validation
      await this.performRuleBasedValidation(content, validation);

      // Structural validation
      await this.performStructuralValidation(content, validation);

      // Security-focused validation
      await this.performSecurityValidation(content, validation);

      // Calculate metrics
      this.calculateMetrics(content, validation);

      // Determine overall validity
      validation.isValid = validation.errors.length === 0;

      // Cache result
      this.validationCache.set(cacheKey, {
        result: validation,
        timestamp: Date.now()
      });

      logger.debug('Syntax validation completed', {
        filePath,
        isValid: validation.isValid,
        errors: validation.errors.length,
        warnings: validation.warnings.length
      });

      return validation;

    } catch (error) {
      logger.error('Syntax validation failed', { 
        error: error.message,
        filePath 
      });
      
      return {
        isValid: false,
        errors: [{
          line: 0,
          column: 0,
          message: `Validation failed: ${error.message}`,
          severity: 'error',
          category: 'system',
          code: 'VALIDATION_ERROR'
        }],
        warnings: [],
        info: [],
        suggestions: [],
        metrics: { linesOfCode: 0, functions: 0, contracts: 0, complexity: 0 },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Perform basic syntax validation using contract parser
   * @param {string} content - Contract code
   * @param {Object} validation - Validation result object
   */
  async performBasicValidation(content, validation) {
    try {
      const parseResult = await contractParser.parseContract(content);
      
      if (parseResult.errors && parseResult.errors.length > 0) {
        parseResult.errors.forEach(error => {
          validation.errors.push({
            line: error.line || 0,
            column: error.column || 0,
            message: error.message,
            severity: 'error',
            category: 'syntax',
            code: error.code || 'PARSE_ERROR'
          });
        });
      }

      if (parseResult.warnings && parseResult.warnings.length > 0) {
        parseResult.warnings.forEach(warning => {
          validation.warnings.push({
            line: warning.line || 0,
            column: warning.column || 0,
            message: warning.message,
            severity: 'warning',
            category: 'syntax',
            code: warning.code || 'PARSE_WARNING'
          });
        });
      }

    } catch (parseError) {
      validation.errors.push({
        line: 0,
        column: 0,
        message: `Parse error: ${parseError.message}`,
        severity: 'error',
        category: 'syntax',
        code: 'PARSE_FAILURE'
      });
    }
  }

  /**
   * Perform rule-based validation
   * @param {string} content - Contract code
   * @param {Object} validation - Validation result object
   */
  async performRuleBasedValidation(content, validation) {
    const lines = content.split('\n');

    this.validationRules.forEach(rule => {
      if (rule.validator) {
        // Custom validator function
        const results = rule.validator(content, lines);
        results.forEach(result => {
          this.addValidationResult(validation, result, rule);
        });
      } else if (rule.pattern) {
        // Pattern-based validation
        const matches = content.matchAll(rule.pattern);
        for (const match of matches) {
          const lineNumber = this.getLineNumber(content, match.index);
          const columnNumber = this.getColumnNumber(content, match.index);
          
          this.addValidationResult(validation, {
            line: lineNumber,
            column: columnNumber,
            message: rule.message,
            severity: rule.severity,
            category: rule.category,
            code: rule.id
          }, rule);
        }
      }
    });
  }

  /**
   * Perform structural validation
   * @param {string} content - Contract code
   * @param {Object} validation - Validation result object
   */
  async performStructuralValidation(content, validation) {
    // Validate contract structure
    const contracts = this.extractContracts(content);
    validation.metrics.contracts = contracts.length;

    if (contracts.length === 0) {
      validation.warnings.push({
        line: 0,
        column: 0,
        message: 'No contract declarations found',
        severity: 'warning',
        category: 'structure',
        code: 'NO_CONTRACTS'
      });
    }

    // Validate functions
    const functions = this.extractFunctions(content);
    validation.metrics.functions = functions.length;

    functions.forEach(func => {
      if (!func.visibility) {
        validation.warnings.push({
          line: func.line,
          column: func.column,
          message: `Function '${func.name}' missing visibility specifier`,
          severity: 'warning',
          category: 'visibility',
          code: 'MISSING_VISIBILITY'
        });
      }

      if (func.isPayable && func.isView) {
        validation.errors.push({
          line: func.line,
          column: func.column,
          message: `Function '${func.name}' cannot be both payable and view`,
          severity: 'error',
          category: 'modifiers',
          code: 'CONFLICTING_MODIFIERS'
        });
      }
    });

    // Validate imports
    const imports = this.extractImports(content);
    imports.forEach(imp => {
      if (!imp.path) {
        validation.errors.push({
          line: imp.line,
          column: imp.column,
          message: 'Invalid import statement',
          severity: 'error',
          category: 'imports',
          code: 'INVALID_IMPORT'
        });
      }
    });
  }

  /**
   * Perform security-focused validation
   * @param {string} content - Contract code
   * @param {Object} validation - Validation result object
   */
  async performSecurityValidation(content, validation) {
    // Check for common security issues
    const securityChecks = [
      {
        pattern: /\.call\s*\(/g,
        message: 'Low-level call detected. Ensure proper error handling',
        severity: 'warning',
        category: 'security'
      },
      {
        pattern: /\.delegatecall\s*\(/g,
        message: 'Delegatecall detected. Be aware of storage layout compatibility',
        severity: 'warning',
        category: 'security'
      },
      {
        pattern: /selfdestruct\s*\(/g,
        message: 'Selfdestruct usage detected. Ensure proper access control',
        severity: 'info',
        category: 'security'
      },
      {
        pattern: /assembly\s*{/g,
        message: 'Inline assembly detected. Review for security implications',
        severity: 'info',
        category: 'security'
      }
    ];

    securityChecks.forEach(check => {
      const matches = content.matchAll(check.pattern);
      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index);
        const columnNumber = this.getColumnNumber(content, match.index);
        
        validation[check.severity === 'error' ? 'errors' : 
                   check.severity === 'warning' ? 'warnings' : 'info'].push({
          line: lineNumber,
          column: columnNumber,
          message: check.message,
          severity: check.severity,
          category: check.category,
          code: 'SECURITY_CHECK'
        });
      }
    });
  }

  /**
   * Calculate code metrics
   * @param {string} content - Contract code
   * @param {Object} validation - Validation result object
   */
  calculateMetrics(content, validation) {
    const lines = content.split('\n');
    validation.metrics.linesOfCode = lines.filter(line => line.trim().length > 0).length;
    
    // Calculate cyclomatic complexity (simplified)
    const complexityKeywords = ['if', 'else', 'while', 'for', 'do', '&&', '||', '?'];
    validation.metrics.complexity = complexityKeywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 1); // Base complexity of 1
  }

  /**
   * Custom validator for braces
   * @param {string} content - Contract code
   * @param {Array} lines - Code lines
   * @returns {Array} Validation results
   */
  validateBraces(content, lines) {
    const results = [];
    let braceCount = 0;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '{') {
          braceCount++;
        } else if (line[i] === '}') {
          braceCount--;
          if (braceCount < 0) {
            results.push({
              line: lineNumber,
              column: i + 1,
              message: 'Unmatched closing brace',
              severity: 'error',
              category: 'syntax'
            });
          }
        }
      }
    }

    if (braceCount > 0) {
      results.push({
        line: lineNumber,
        column: 0,
        message: 'Unmatched opening brace',
        severity: 'error',
        category: 'syntax'
      });
    }

    return results;
  }

  /**
   * Custom validator for parentheses
   * @param {string} content - Contract code
   * @param {Array} lines - Code lines
   * @returns {Array} Validation results
   */
  validateParentheses(content, lines) {
    const results = [];
    let parenCount = 0;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '(') {
          parenCount++;
        } else if (line[i] === ')') {
          parenCount--;
          if (parenCount < 0) {
            results.push({
              line: lineNumber,
              column: i + 1,
              message: 'Unmatched closing parenthesis',
              severity: 'error',
              category: 'syntax'
            });
          }
        }
      }
    }

    if (parenCount > 0) {
      results.push({
        line: lineNumber,
        column: 0,
        message: 'Unmatched opening parenthesis',
        severity: 'error',
        category: 'syntax'
      });
    }

    return results;
  }

  /**
   * Custom validator for pragma directives
   * @param {string} content - Contract code
   * @param {Array} lines - Code lines
   * @returns {Array} Validation results
   */
  validatePragma(content, lines) {
    const results = [];
    const pragmaPattern = /pragma\s+solidity\s+([^;]+);/g;
    const matches = content.matchAll(pragmaPattern);

    for (const match of matches) {
      const version = match[1].trim();
      const lineNumber = this.getLineNumber(content, match.index);
      
      // Validate version format
      if (!/^[\^~>=<\s]*\d+\.\d+\.\d+/.test(version)) {
        results.push({
          line: lineNumber,
          column: 0,
          message: `Invalid Solidity version format: ${version}`,
          severity: 'error',
          category: 'pragma'
        });
      }
      
      // Check for outdated versions
      if (version.includes('0.4.') || version.includes('0.5.')) {
        results.push({
          line: lineNumber,
          column: 0,
          message: `Consider upgrading from Solidity ${version} to a newer version`,
          severity: 'info',
          category: 'pragma'
        });
      }
    }

    return results;
  }

  /**
   * Custom validator for unused variables
   * @param {string} content - Contract code
   * @param {Array} lines - Code lines
   * @returns {Array} Validation results
   */
  validateUnusedVariables(content, lines) {
    const results = [];
    const variablePattern = /(\w+)\s+(\w+)\s*;/g;
    const matches = content.matchAll(variablePattern);

    for (const match of matches) {
      const variableName = match[2];
      const lineNumber = this.getLineNumber(content, match.index);
      
      // Check if variable is used elsewhere
      const usagePattern = new RegExp(`\\b${variableName}\\b`, 'g');
      const usages = content.match(usagePattern);
      
      if (usages && usages.length === 1) { // Only the declaration
        results.push({
          line: lineNumber,
          column: 0,
          message: `Variable '${variableName}' is declared but never used`,
          severity: 'warning',
          category: 'optimization'
        });
      }
    }

    return results;
  }

  /**
   * Custom validator for unsafe math operations
   * @param {string} content - Contract code
   * @param {Array} lines - Code lines
   * @returns {Array} Validation results
   */
  validateUnsafeMath(content, lines) {
    const results = [];
    
    // Check if SafeMath is imported or used
    const hasSafeMath = content.includes('SafeMath') || content.includes('using SafeMath');
    const hasUnchecked = content.includes('unchecked');
    
    if (!hasSafeMath && !hasUnchecked) {
      const mathPattern = /[+\-*/]\s*(?!=)/g;
      const matches = content.matchAll(mathPattern);
      
      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index);
        results.push({
          line: lineNumber,
          column: this.getColumnNumber(content, match.index),
          message: 'Consider using SafeMath for arithmetic operations to prevent overflow/underflow',
          severity: 'info',
          category: 'security'
        });
        break; // Only show once per contract
      }
    }

    return results;
  }

  // Helper methods
  addValidationResult(validation, result, rule) {
    const target = result.severity === 'error' ? validation.errors :
                   result.severity === 'warning' ? validation.warnings :
                   validation.info;
    target.push(result);
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getColumnNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines[lines.length - 1].length + 1;
  }

  extractContracts(content) {
    const contracts = [];
    const contractPattern = /contract\s+(\w+)/g;
    let match;
    
    while ((match = contractPattern.exec(content)) !== null) {
      contracts.push({
        name: match[1],
        line: this.getLineNumber(content, match.index)
      });
    }
    
    return contracts;
  }

  extractFunctions(content) {
    const functions = [];
    const functionPattern = /function\s+(\w+)\s*\([^)]*\)\s*(public|private|internal|external)?\s*(pure|view|payable)?/g;
    let match;
    
    while ((match = functionPattern.exec(content)) !== null) {
      functions.push({
        name: match[1],
        visibility: match[2],
        modifier: match[3],
        isPayable: match[3] === 'payable',
        isView: match[3] === 'view',
        line: this.getLineNumber(content, match.index),
        column: this.getColumnNumber(content, match.index)
      });
    }
    
    return functions;
  }

  extractImports(content) {
    const imports = [];
    const importPattern = /import\s+(?:"([^"]+)"|'([^']+)')/g;
    let match;
    
    while ((match = importPattern.exec(content)) !== null) {
      imports.push({
        path: match[1] || match[2],
        line: this.getLineNumber(content, match.index),
        column: this.getColumnNumber(content, match.index)
      });
    }
    
    return imports;
  }

  generateCacheKey(content) {
    return require('crypto').createHash('md5').update(content).digest('hex');
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.validationCache.clear();
  }

  /**
   * Get validation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cacheSize: this.validationCache.size,
      rulesCount: this.validationRules.length,
      patternsCount: Object.keys(this.syntaxPatterns).length
    };
  }
}

module.exports = new SyntaxValidationService();
