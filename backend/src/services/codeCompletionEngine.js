const logger = require('../utils/logger');

/**
 * Code Completion Engine
 * Provides intelligent code completion for Solidity development
 */
class CodeCompletionEngine {
  constructor() {
    this.completionCache = new Map();
    this.solidityKeywords = this.initializeSolidityKeywords();
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Initialize Solidity keywords and built-in types
   * @returns {Object} Categorized keywords
   */
  initializeSolidityKeywords() {
    return {
      keywords: [
        'pragma', 'solidity', 'contract', 'interface', 'library', 'import', 'using',
        'function', 'modifier', 'event', 'struct', 'enum', 'mapping', 'array',
        'public', 'private', 'internal', 'external', 'pure', 'view', 'payable',
        'constant', 'immutable', 'override', 'virtual', 'abstract',
        'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return',
        'try', 'catch', 'throw', 'require', 'assert', 'revert',
        'new', 'delete', 'this', 'super', 'selfdestruct', 'suicide'
      ],
      types: [
        'bool', 'uint', 'int', 'address', 'bytes', 'string',
        'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256',
        'int8', 'int16', 'int32', 'int64', 'int128', 'int256',
        'bytes1', 'bytes2', 'bytes4', 'bytes8', 'bytes16', 'bytes32',
        'fixed', 'ufixed'
      ],
      globalVariables: [
        'msg.sender', 'msg.value', 'msg.data', 'msg.sig',
        'tx.origin', 'tx.gasprice',
        'block.coinbase', 'block.difficulty', 'block.gaslimit',
        'block.number', 'block.timestamp', 'block.blockhash',
        'now', 'gasleft'
      ],
      functions: [
        'keccak256', 'sha256', 'sha3', 'ripemd160',
        'ecrecover', 'addmod', 'mulmod',
        'abi.encode', 'abi.encodePacked', 'abi.encodeWithSelector', 'abi.encodeWithSignature',
        'abi.decode'
      ]
    };
  }

  /**
   * Get code completions for given context
   * @param {string} content - Current code content
   * @param {Object} cursorPosition - Cursor position {line, column}
   * @param {string} filePath - File path for context
   * @returns {Object} Completion suggestions
   */
  async getCompletions(content, cursorPosition, filePath = '') {
    try {
      this.stats.totalRequests++;
      const startTime = Date.now();

      // Generate cache key
      const context = this.extractContext(content, cursorPosition);
      const cacheKey = this.generateCacheKey(context);

      // Check cache
      if (this.completionCache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.completionCache.get(cacheKey);
      }

      // Generate completions based on context
      const completions = await this.generateCompletions(content, cursorPosition, context);

      // Cache the result
      this.completionCache.set(cacheKey, completions);

      // Update stats
      const responseTime = Date.now() - startTime;
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime + responseTime) / 2;

      return completions;

    } catch (error) {
      logger.error('Code completion failed', { error: error.message, filePath });
      return {
        suggestions: [],
        context: { type: 'unknown' },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract context around cursor position
   * @param {string} content - Code content
   * @param {Object} cursorPosition - Cursor position
   * @returns {Object} Context information
   */
  extractContext(content, cursorPosition) {
    const lines = content.split('\n');
    const currentLine = lines[cursorPosition.line - 1] || '';
    const textBefore = currentLine.substring(0, cursorPosition.column);
    const textAfter = currentLine.substring(cursorPosition.column);

    // Determine context type
    let contextType = 'general';
    let prefix = '';

    if (textBefore.endsWith('.')) {
      contextType = 'member_access';
      const words = textBefore.split(/\s+/);
      prefix = words[words.length - 1].slice(0, -1); // Remove the dot
    } else if (textBefore.match(/\b(function|modifier|event)\s+$/)) {
      contextType = 'declaration';
    } else if (textBefore.match(/\b(uint|int|bool|address|string|bytes)\d*\s*$/)) {
      contextType = 'type_declaration';
    } else if (textBefore.match(/\bpragma\s+$/)) {
      contextType = 'pragma';
    } else if (textBefore.match(/\bimport\s+$/)) {
      contextType = 'import';
    } else {
      // Check for partial word
      const match = textBefore.match(/\b(\w+)$/);
      if (match) {
        prefix = match[1];
        contextType = 'keyword_or_identifier';
      }
    }

    return {
      type: contextType,
      prefix,
      textBefore,
      textAfter,
      currentLine,
      lineNumber: cursorPosition.line
    };
  }

  /**
   * Generate completions based on context
   * @param {string} content - Code content
   * @param {Object} cursorPosition - Cursor position
   * @param {Object} context - Context information
   * @returns {Object} Completion suggestions
   */
  async generateCompletions(content, cursorPosition, context) {
    const suggestions = [];

    switch (context.type) {
      case 'member_access':
        suggestions.push(...this.getMemberAccessCompletions(context.prefix, content));
        break;

      case 'pragma':
        suggestions.push(...this.getPragmaCompletions());
        break;

      case 'import':
        suggestions.push(...this.getImportCompletions());
        break;

      case 'type_declaration':
        suggestions.push(...this.getTypeCompletions());
        break;

      case 'declaration':
        suggestions.push(...this.getDeclarationCompletions(context.textBefore));
        break;

      case 'keyword_or_identifier':
        suggestions.push(...this.getKeywordCompletions(context.prefix));
        suggestions.push(...this.getIdentifierCompletions(content, context.prefix));
        break;

      default:
        suggestions.push(...this.getGeneralCompletions(context.prefix));
        break;
    }

    return {
      suggestions: suggestions.slice(0, 20), // Limit to 20 suggestions
      context,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get member access completions (e.g., msg., block., etc.)
   * @param {string} object - Object name
   * @param {string} content - Full content for context
   * @returns {Array} Completion suggestions
   */
  getMemberAccessCompletions(object, content) {
    const suggestions = [];

    const memberMappings = {
      'msg': [
        { label: 'sender', kind: 'property', detail: 'address - Message sender' },
        { label: 'value', kind: 'property', detail: 'uint256 - Message value in wei' },
        { label: 'data', kind: 'property', detail: 'bytes - Complete calldata' },
        { label: 'sig', kind: 'property', detail: 'bytes4 - Function signature' }
      ],
      'block': [
        { label: 'coinbase', kind: 'property', detail: 'address - Current block miner' },
        { label: 'difficulty', kind: 'property', detail: 'uint256 - Current block difficulty' },
        { label: 'gaslimit', kind: 'property', detail: 'uint256 - Current block gas limit' },
        { label: 'number', kind: 'property', detail: 'uint256 - Current block number' },
        { label: 'timestamp', kind: 'property', detail: 'uint256 - Current block timestamp' }
      ],
      'tx': [
        { label: 'origin', kind: 'property', detail: 'address - Transaction origin' },
        { label: 'gasprice', kind: 'property', detail: 'uint256 - Transaction gas price' }
      ],
      'abi': [
        { label: 'encode', kind: 'method', detail: 'Encode arguments' },
        { label: 'encodePacked', kind: 'method', detail: 'Encode arguments packed' },
        { label: 'encodeWithSelector', kind: 'method', detail: 'Encode with function selector' },
        { label: 'encodeWithSignature', kind: 'method', detail: 'Encode with function signature' },
        { label: 'decode', kind: 'method', detail: 'Decode data' }
      ]
    };

    if (memberMappings[object]) {
      suggestions.push(...memberMappings[object]);
    }

    // For address type
    if (object.includes('address') || this.isAddressVariable(object, content)) {
      suggestions.push(
        { label: 'balance', kind: 'property', detail: 'uint256 - Address balance' },
        { label: 'call', kind: 'method', detail: 'Low-level call' },
        { label: 'delegatecall', kind: 'method', detail: 'Delegate call' },
        { label: 'staticcall', kind: 'method', detail: 'Static call' },
        { label: 'transfer', kind: 'method', detail: 'Transfer Ether (2300 gas)' },
        { label: 'send', kind: 'method', detail: 'Send Ether (2300 gas)' }
      );
    }

    return suggestions;
  }

  /**
   * Get pragma completions
   * @returns {Array} Pragma suggestions
   */
  getPragmaCompletions() {
    return [
      { label: 'solidity ^0.8.0;', kind: 'snippet', detail: 'Solidity version pragma' },
      { label: 'solidity >=0.8.0 <0.9.0;', kind: 'snippet', detail: 'Solidity version range' },
      { label: 'experimental ABIEncoderV2;', kind: 'snippet', detail: 'Enable ABI encoder v2' }
    ];
  }

  /**
   * Get import completions
   * @returns {Array} Import suggestions
   */
  getImportCompletions() {
    return [
      { label: '"./Contract.sol";', kind: 'snippet', detail: 'Import local contract' },
      { label: '"@openzeppelin/contracts/token/ERC20/ERC20.sol";', kind: 'snippet', detail: 'Import OpenZeppelin ERC20' },
      { label: '"@openzeppelin/contracts/access/Ownable.sol";', kind: 'snippet', detail: 'Import OpenZeppelin Ownable' },
      { label: '"@openzeppelin/contracts/security/ReentrancyGuard.sol";', kind: 'snippet', detail: 'Import ReentrancyGuard' }
    ];
  }

  /**
   * Get type completions
   * @returns {Array} Type suggestions
   */
  getTypeCompletions() {
    return this.solidityKeywords.types.map(type => ({
      label: type,
      kind: 'keyword',
      detail: `Solidity type: ${type}`
    }));
  }

  /**
   * Get declaration completions
   * @param {string} textBefore - Text before cursor
   * @returns {Array} Declaration suggestions
   */
  getDeclarationCompletions(textBefore) {
    const suggestions = [];

    if (textBefore.includes('function')) {
      suggestions.push(
        { label: 'public', kind: 'keyword', detail: 'Public visibility' },
        { label: 'private', kind: 'keyword', detail: 'Private visibility' },
        { label: 'internal', kind: 'keyword', detail: 'Internal visibility' },
        { label: 'external', kind: 'keyword', detail: 'External visibility' },
        { label: 'pure', kind: 'keyword', detail: 'Pure function' },
        { label: 'view', kind: 'keyword', detail: 'View function' },
        { label: 'payable', kind: 'keyword', detail: 'Payable function' }
      );
    }

    return suggestions;
  }

  /**
   * Get keyword completions
   * @param {string} prefix - Partial word
   * @returns {Array} Keyword suggestions
   */
  getKeywordCompletions(prefix) {
    const allKeywords = [
      ...this.solidityKeywords.keywords,
      ...this.solidityKeywords.types,
      ...this.solidityKeywords.globalVariables,
      ...this.solidityKeywords.functions
    ];

    return allKeywords
      .filter(keyword => keyword.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(keyword => ({
        label: keyword,
        kind: 'keyword',
        detail: `Solidity keyword: ${keyword}`
      }));
  }

  /**
   * Get identifier completions from current code
   * @param {string} content - Code content
   * @param {string} prefix - Partial identifier
   * @returns {Array} Identifier suggestions
   */
  getIdentifierCompletions(content, prefix) {
    const suggestions = [];
    
    // Extract function names
    const functionMatches = content.match(/function\s+(\w+)/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const funcName = match.replace('function ', '');
        if (funcName.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            label: funcName,
            kind: 'function',
            detail: 'User-defined function'
          });
        }
      });
    }

    // Extract variable names
    const variableMatches = content.match(/\b(uint\d*|int\d*|bool|address|string|bytes\d*)\s+(\w+)/g);
    if (variableMatches) {
      variableMatches.forEach(match => {
        const parts = match.split(/\s+/);
        const varName = parts[1];
        if (varName.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            label: varName,
            kind: 'variable',
            detail: `Variable: ${parts[0]} ${varName}`
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * Get general completions
   * @param {string} prefix - Partial word
   * @returns {Array} General suggestions
   */
  getGeneralCompletions(prefix) {
    const suggestions = [];

    // Common Solidity snippets
    const snippets = [
      {
        label: 'contract',
        kind: 'snippet',
        detail: 'Contract template',
        insertText: 'contract ${1:ContractName} {\n    ${2}\n}'
      },
      {
        label: 'function',
        kind: 'snippet',
        detail: 'Function template',
        insertText: 'function ${1:functionName}(${2}) ${3:public} ${4:returns (${5})} {\n    ${6}\n}'
      },
      {
        label: 'modifier',
        kind: 'snippet',
        detail: 'Modifier template',
        insertText: 'modifier ${1:modifierName}(${2}) {\n    ${3};\n    _;\n}'
      },
      {
        label: 'require',
        kind: 'snippet',
        detail: 'Require statement',
        insertText: 'require(${1:condition}, "${2:error message}");'
      }
    ];

    if (!prefix || snippets.some(s => s.label.startsWith(prefix))) {
      suggestions.push(...snippets.filter(s => !prefix || s.label.startsWith(prefix)));
    }

    return suggestions;
  }

  /**
   * Check if a variable is of address type
   * @param {string} varName - Variable name
   * @param {string} content - Code content
   * @returns {boolean} True if variable is address type
   */
  isAddressVariable(varName, content) {
    const regex = new RegExp(`\\baddress\\s+\\w*\\b${varName}\\b`);
    return regex.test(content);
  }

  /**
   * Generate cache key for context
   * @param {Object} context - Context object
   * @returns {string} Cache key
   */
  generateCacheKey(context) {
    return `${context.type}:${context.prefix}:${context.textBefore.slice(-20)}`;
  }

  /**
   * Clear completion cache
   */
  clearCache() {
    this.completionCache.clear();
    logger.info('Code completion cache cleared');
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.completionCache.size,
      cacheHitRate: this.stats.totalRequests > 0 ? 
        (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Get completion suggestions for specific context types
   * @param {string} contextType - Type of context
   * @param {Object} options - Additional options
   * @returns {Array} Context-specific suggestions
   */
  getContextSpecificCompletions(contextType, options = {}) {
    switch (contextType) {
      case 'security':
        return [
          { label: 'nonReentrant', kind: 'modifier', detail: 'ReentrancyGuard modifier' },
          { label: 'onlyOwner', kind: 'modifier', detail: 'Ownable modifier' },
          { label: 'whenNotPaused', kind: 'modifier', detail: 'Pausable modifier' }
        ];

      case 'erc20':
        return [
          { label: 'totalSupply', kind: 'function', detail: 'ERC20 total supply' },
          { label: 'balanceOf', kind: 'function', detail: 'ERC20 balance query' },
          { label: 'transfer', kind: 'function', detail: 'ERC20 transfer' },
          { label: 'approve', kind: 'function', detail: 'ERC20 approve' },
          { label: 'transferFrom', kind: 'function', detail: 'ERC20 transfer from' }
        ];

      case 'events':
        return [
          { label: 'Transfer', kind: 'event', detail: 'Transfer event' },
          { label: 'Approval', kind: 'event', detail: 'Approval event' },
          { label: 'OwnershipTransferred', kind: 'event', detail: 'Ownership transfer event' }
        ];

      default:
        return [];
    }
  }

  /**
   * Cleanup service resources
   */
  cleanup() {
    this.clearCache();
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      averageResponseTime: 0
    };
    
    logger.info('Code completion engine cleaned up');
  }
}

const codeCompletionEngineInstance = new CodeCompletionEngine();

// Export the service instance
module.exports = codeCompletionEngineInstance;

// Export the class for testing
module.exports.CodeCompletionEngine = CodeCompletionEngine;

// Export individual methods for direct access
module.exports.getCompletions = codeCompletionEngineInstance.getCompletions.bind(codeCompletionEngineInstance);
module.exports.getContextSpecificCompletions = codeCompletionEngineInstance.getContextSpecificCompletions.bind(codeCompletionEngineInstance);
module.exports.clearCache = codeCompletionEngineInstance.clearCache.bind(codeCompletionEngineInstance);
module.exports.getStats = codeCompletionEngineInstance.getStats.bind(codeCompletionEngineInstance);
module.exports.cleanup = codeCompletionEngineInstance.cleanup.bind(codeCompletionEngineInstance);

// Export initialization method
module.exports.initialize = async function(options = {}) {
  try {
    // Initialize code completion engine with configuration
    if (options.customKeywords) {
      // Add custom keywords to existing ones
      Object.keys(options.customKeywords).forEach(category => {
        if (codeCompletionEngineInstance.solidityKeywords[category]) {
          codeCompletionEngineInstance.solidityKeywords[category].push(...options.customKeywords[category]);
        }
      });
    }
    
    if (options.cacheSize) {
      // Clear existing cache if size limit specified
      codeCompletionEngineInstance.clearCache();
    }
    
    logger.info('CodeCompletionEngine initialized successfully', {
      keywordCategories: Object.keys(codeCompletionEngineInstance.solidityKeywords).length,
      totalKeywords: Object.values(codeCompletionEngineInstance.solidityKeywords).flat().length,
      cacheEnabled: true
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize CodeCompletionEngine', { error: error.message });
    throw error;
  }
};

// Export service status method
module.exports.getStatus = function() {
  const stats = codeCompletionEngineInstance.getStats();
  return {
    initialized: true,
    stats,
    keywordCategories: Object.keys(codeCompletionEngineInstance.solidityKeywords).length,
    totalKeywords: Object.values(codeCompletionEngineInstance.solidityKeywords).flat().length,
    supportedFeatures: ['code-completion', 'context-aware', 'snippets', 'member-access', 'caching']
  };
};