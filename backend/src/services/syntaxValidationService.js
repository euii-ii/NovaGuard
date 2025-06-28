const Parser = require('@solidity-parser/parser');
const logger = require('../utils/logger');

/**
 * Syntax Validation Service
 * Provides real-time Solidity syntax validation
 */
class SyntaxValidationService {
  constructor() {
    this.validationCache = new Map();
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0
    };
  }

  /**
   * Validate Solidity syntax
   * @param {string} content - Solidity code content
   * @param {string} filePath - File path (optional)
   * @returns {Object} Validation result
   */
  async validateSyntax(content, filePath = '') {
    try {
      this.stats.totalValidations++;

      // Check cache first
      const cacheKey = this.generateCacheKey(content);
      if (this.validationCache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.validationCache.get(cacheKey);
      }

      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        timestamp: new Date().toISOString(),
        filePath
      };

      // Basic validation
      if (!content || typeof content !== 'string') {
        result.isValid = false;
        result.errors.push({
          line: 0,
          column: 0,
          message: 'Invalid input: content must be a non-empty string',
          severity: 'error',
          code: 'INVALID_INPUT'
        });
        return result;
      }

      // Try to parse with solidity-parser
      try {
        Parser.parse(content, {
          loc: true,
          range: true,
          tolerant: true
        });

        this.stats.successfulValidations++;

        // Add warnings and suggestions
        this.addWarningsAndSuggestions(content, result);

      } catch (parseError) {
        result.isValid = false;
        result.errors.push({
          line: parseError.location?.start?.line || 0,
          column: parseError.location?.start?.column || 0,
          message: parseError.message,
          severity: 'error',
          code: 'PARSE_ERROR'
        });

        this.stats.failedValidations++;
      }

      // Additional syntax checks
      this.performAdditionalChecks(content, result);

      // Cache the result
      this.validationCache.set(cacheKey, result);

      return result;

    } catch (error) {
      logger.error('Syntax validation failed', { error: error.message, filePath });
      
      this.stats.failedValidations++;
      
      return {
        isValid: false,
        errors: [{
          line: 0,
          column: 0,
          message: `Validation failed: ${error.message}`,
          severity: 'error',
          code: 'VALIDATION_ERROR'
        }],
        warnings: [],
        suggestions: [],
        timestamp: new Date().toISOString(),
        filePath
      };
    }
  }

  /**
   * Add warnings and suggestions to validation result
   * @param {string} content - Code content
   * @param {Object} result - Validation result object
   */
  addWarningsAndSuggestions(content, result) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Check for missing pragma
      if (index === 0 && !trimmedLine.startsWith('pragma solidity')) {
        result.warnings.push({
          line: lineNumber,
          column: 0,
          message: 'Missing pragma solidity directive',
          severity: 'warning',
          code: 'MISSING_PRAGMA'
        });
      }

      // Check for deprecated syntax
      if (trimmedLine.includes('var ')) {
        result.warnings.push({
          line: lineNumber,
          column: line.indexOf('var'),
          message: 'Use of deprecated "var" keyword',
          severity: 'warning',
          code: 'DEPRECATED_VAR'
        });
      }

      // Check for potential security issues
      if (trimmedLine.includes('tx.origin')) {
        result.warnings.push({
          line: lineNumber,
          column: line.indexOf('tx.origin'),
          message: 'Use of tx.origin is discouraged, use msg.sender instead',
          severity: 'warning',
          code: 'TX_ORIGIN_USAGE'
        });
      }

      // Check for missing visibility specifiers
      if (trimmedLine.includes('function ') && 
          !trimmedLine.includes('public') && 
          !trimmedLine.includes('private') && 
          !trimmedLine.includes('internal') && 
          !trimmedLine.includes('external')) {
        result.suggestions.push({
          line: lineNumber,
          column: 0,
          message: 'Consider adding explicit visibility specifier',
          severity: 'info',
          code: 'MISSING_VISIBILITY'
        });
      }

      // Check for missing NatSpec documentation
      if (trimmedLine.includes('function ') && 
          index > 0 && 
          !lines[index - 1].trim().startsWith('///')) {
        result.suggestions.push({
          line: lineNumber,
          column: 0,
          message: 'Consider adding NatSpec documentation',
          severity: 'info',
          code: 'MISSING_NATSPEC'
        });
      }
    });
  }

  /**
   * Perform additional syntax checks
   * @param {string} content - Code content
   * @param {Object} result - Validation result object
   */
  performAdditionalChecks(content, result) {
    try {
      // Check for balanced braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        result.errors.push({
          line: content.split('\n').length,
          column: 0,
          message: `Unmatched braces: ${openBraces} opening, ${closeBraces} closing`,
          severity: 'error',
          code: 'UNMATCHED_BRACES'
        });
        result.isValid = false;
      }

      // Check for balanced parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        result.errors.push({
          line: content.split('\n').length,
          column: 0,
          message: `Unmatched parentheses: ${openParens} opening, ${closeParens} closing`,
          severity: 'error',
          code: 'UNMATCHED_PARENS'
        });
        result.isValid = false;
      }

      // Check for basic contract structure
      if (!content.includes('contract ') && 
          !content.includes('interface ') && 
          !content.includes('library ')) {
        result.warnings.push({
          line: 1,
          column: 0,
          message: 'No contract, interface, or library definition found',
          severity: 'warning',
          code: 'NO_CONTRACT_DEFINITION'
        });
      }

    } catch (error) {
      logger.error('Additional syntax checks failed', { error: error.message });
    }
  }

  /**
   * Generate cache key for content
   * @param {string} content - Code content
   * @returns {string} Cache key
   */
  generateCacheKey(content) {
    return require('crypto').createHash('md5').update(content).digest('hex');
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.validationCache.clear();
    logger.info('Syntax validation cache cleared');
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.validationCache.size,
      cacheHitRate: this.stats.totalValidations > 0 ? 
        (this.stats.cacheHits / this.stats.totalValidations * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Validate multiple files
   * @param {Array} files - Array of file objects with content and path
   * @returns {Array} Array of validation results
   */
  async validateMultipleFiles(files) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.validateSyntax(file.content, file.path);
        results.push({
          filePath: file.path,
          ...result
        });
      } catch (error) {
        results.push({
          filePath: file.path,
          isValid: false,
          errors: [{
            line: 0,
            column: 0,
            message: `Validation failed: ${error.message}`,
            severity: 'error',
            code: 'VALIDATION_ERROR'
          }],
          warnings: [],
          suggestions: []
        });
      }
    }

    return results;
  }

  /**
   * Get validation summary for content
   * @param {string} content - Code content
   * @returns {Object} Validation summary
   */
  async getValidationSummary(content) {
    const result = await this.validateSyntax(content);
    
    return {
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      suggestionCount: result.suggestions.length,
      severity: result.errors.length > 0 ? 'error' : 
                result.warnings.length > 0 ? 'warning' : 'info',
      timestamp: result.timestamp
    };
  }

  /**
   * Cleanup service resources
   */
  cleanup() {
    this.clearCache();
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0
    };
    
    logger.info('Syntax validation service cleaned up');
  }
}

const syntaxValidationServiceInstance = new SyntaxValidationService();

// Export the service instance
module.exports = syntaxValidationServiceInstance;

// Export the class for testing
module.exports.SyntaxValidationService = SyntaxValidationService;

// Export individual methods for direct access
module.exports.validateSyntax = syntaxValidationServiceInstance.validateSyntax.bind(syntaxValidationServiceInstance);
module.exports.validateMultipleFiles = syntaxValidationServiceInstance.validateMultipleFiles.bind(syntaxValidationServiceInstance);
module.exports.getValidationSummary = syntaxValidationServiceInstance.getValidationSummary.bind(syntaxValidationServiceInstance);
module.exports.clearCache = syntaxValidationServiceInstance.clearCache.bind(syntaxValidationServiceInstance);
module.exports.getStats = syntaxValidationServiceInstance.getStats.bind(syntaxValidationServiceInstance);
module.exports.cleanup = syntaxValidationServiceInstance.cleanup.bind(syntaxValidationServiceInstance);

// Export initialization method
module.exports.initialize = async function(options = {}) {
  try {
    // Initialize syntax validation service with configuration
    if (options.cacheSize) {
      // Clear existing cache and set new size limit (if needed)
      syntaxValidationServiceInstance.clearCache();
    }
    
    logger.info('SyntaxValidationService initialized successfully', {
      cacheEnabled: true,
      supportedFeatures: ['syntax-validation', 'warnings', 'suggestions', 'multi-file-validation']
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize SyntaxValidationService', { error: error.message });
    throw error;
  }
};

// Export service status method
module.exports.getStatus = function() {
  const stats = syntaxValidationServiceInstance.getStats();
  return {
    initialized: true,
    stats,
    supportedFeatures: ['syntax-validation', 'warnings', 'suggestions', 'multi-file-validation', 'caching']
  };
};