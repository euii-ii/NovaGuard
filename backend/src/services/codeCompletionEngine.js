const logger = require('../utils/logger');

/**
 * Advanced Code Completion Engine
 * Provides intelligent code completion for Solidity smart contracts
 */
class CodeCompletionEngine {
  constructor() {
    this.solidityKeywords = this.initializeSolidityKeywords();
    this.solidityTypes = this.initializeSolidityTypes();
    this.solidityBuiltins = this.initializeSolidityBuiltins();
    this.commonPatterns = this.initializeCommonPatterns();
    this.contextCache = new Map();
    this.completionCache = new Map();
  }

  /**
   * Initialize Solidity keywords
   * @returns {Array} Solidity keywords
   */
  initializeSolidityKeywords() {
    return [
      // Contract structure
      'contract', 'interface', 'library', 'abstract',
      'pragma', 'import', 'using', 'for',
      
      // Function modifiers
      'function', 'modifier', 'constructor', 'fallback', 'receive',
      'public', 'private', 'internal', 'external',
      'pure', 'view', 'payable', 'nonpayable',
      'virtual', 'override',
      
      // Control flow
      'if', 'else', 'while', 'for', 'do', 'break', 'continue',
      'return', 'try', 'catch', 'revert', 'require', 'assert',
      
      // Storage
      'storage', 'memory', 'calldata', 'constant', 'immutable',
      
      // Events and errors
      'event', 'error', 'emit',
      
      // Assembly
      'assembly', 'let', 'switch', 'case', 'default',
      
      // Other
      'new', 'delete', 'this', 'super', 'selfdestruct',
      'type', 'unchecked', 'anonymous', 'indexed'
    ];
  }

  /**
   * Initialize Solidity types
   * @returns {Array} Solidity types
   */
  initializeSolidityTypes() {
    const types = [
      // Basic types
      'bool', 'string', 'bytes', 'address', 'address payable',
      
      // Arrays
      'bytes32[]', 'uint256[]', 'address[]', 'string[]',
      
      // Mappings
      'mapping(address => uint256)',
      'mapping(address => bool)',
      'mapping(bytes32 => address)',
      'mapping(uint256 => address)',
      
      // Common structs
      'struct'
    ];

    // Add uint and int variants
    for (let i = 8; i <= 256; i += 8) {
      types.push(`uint${i}`, `int${i}`);
    }

    // Add bytes variants
    for (let i = 1; i <= 32; i++) {
      types.push(`bytes${i}`);
    }

    return types;
  }

  /**
   * Initialize Solidity built-in functions and variables
   * @returns {Array} Built-in functions and variables
   */
  initializeSolidityBuiltins() {
    return [
      // Global variables
      'msg.sender', 'msg.value', 'msg.data', 'msg.sig',
      'tx.origin', 'tx.gasprice',
      'block.timestamp', 'block.number', 'block.difficulty', 'block.gaslimit',
      'block.coinbase', 'block.chainid', 'block.basefee',
      'gasleft()', 'blockhash()',
      
      // Address methods
      '.balance', '.code', '.codehash',
      '.call()', '.delegatecall()', '.staticcall()',
      '.send()', '.transfer()',
      
      // Array methods
      '.length', '.push()', '.pop()',
      
      // String methods
      'abi.encode()', 'abi.encodePacked()', 'abi.encodeWithSignature()',
      'abi.encodeWithSelector()', 'abi.decode()',
      
      // Crypto functions
      'keccak256()', 'sha256()', 'ripemd160()',
      'ecrecover()',
      
      // Math functions
      'addmod()', 'mulmod()',
      
      // Type conversions
      'uint256()', 'address()', 'bytes32()', 'string()'
    ];
  }

  /**
   * Initialize common smart contract patterns
   * @returns {Array} Common patterns
   */
  initializeCommonPatterns() {
    return [
      {
        trigger: 'onlyOwner',
        completion: 'modifier onlyOwner() {\n    require(msg.sender == owner, "Not the owner");\n    _;\n}',
        description: 'Access control modifier for owner-only functions'
      },
      {
        trigger: 'nonReentrant',
        completion: 'modifier nonReentrant() {\n    require(!locked, "Reentrant call");\n    locked = true;\n    _;\n    locked = false;\n}',
        description: 'Reentrancy guard modifier'
      },
      {
        trigger: 'safeTransfer',
        completion: 'function safeTransfer(address to, uint256 amount) internal {\n    require(to != address(0), "Transfer to zero address");\n    require(balances[msg.sender] >= amount, "Insufficient balance");\n    balances[msg.sender] -= amount;\n    balances[to] += amount;\n    emit Transfer(msg.sender, to, amount);\n}',
        description: 'Safe token transfer function'
      },
      {
        trigger: 'constructor',
        completion: 'constructor() {\n    owner = msg.sender;\n}',
        description: 'Basic constructor with owner initialization'
      },
      {
        trigger: 'event Transfer',
        completion: 'event Transfer(address indexed from, address indexed to, uint256 value);',
        description: 'Standard ERC20 Transfer event'
      },
      {
        trigger: 'event Approval',
        completion: 'event Approval(address indexed owner, address indexed spender, uint256 value);',
        description: 'Standard ERC20 Approval event'
      }
    ];
  }

  /**
   * Get code completion suggestions
   * @param {string} content - Full contract content
   * @param {Object} position - Cursor position {line, column}
   * @param {string} filePath - File path for context
   * @returns {Object} Completion suggestions
   */
  async getCompletions(content, position, filePath) {
    try {
      const context = this.analyzeContext(content, position);
      const cacheKey = this.generateCacheKey(content, position, context);
      
      // Check cache
      const cached = this.completionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5000) { // 5 second cache
        return cached.completions;
      }

      const completions = {
        suggestions: [],
        context: context.type,
        triggerCharacter: context.triggerCharacter,
        range: context.range,
        timestamp: new Date().toISOString()
      };

      // Get context-specific completions
      switch (context.type) {
        case 'keyword':
          completions.suggestions = this.getKeywordCompletions(context);
          break;
        case 'type':
          completions.suggestions = this.getTypeCompletions(context);
          break;
        case 'function_call':
          completions.suggestions = this.getFunctionCompletions(content, context);
          break;
        case 'member_access':
          completions.suggestions = this.getMemberCompletions(content, context);
          break;
        case 'variable':
          completions.suggestions = this.getVariableCompletions(content, context);
          break;
        case 'import':
          completions.suggestions = this.getImportCompletions(context);
          break;
        case 'pragma':
          completions.suggestions = this.getPragmaCompletions(context);
          break;
        case 'pattern':
          completions.suggestions = this.getPatternCompletions(context);
          break;
        default:
          completions.suggestions = this.getGeneralCompletions(content, context);
      }

      // Add built-in completions
      completions.suggestions.push(...this.getBuiltinCompletions(context));

      // Sort by relevance
      completions.suggestions = this.sortByRelevance(completions.suggestions, context);

      // Cache result
      this.completionCache.set(cacheKey, {
        completions,
        timestamp: Date.now()
      });

      return completions;

    } catch (error) {
      logger.error('Code completion failed', { error: error.message });
      return {
        suggestions: [],
        context: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze context around cursor position
   * @param {string} content - Contract content
   * @param {Object} position - Cursor position
   * @returns {Object} Context analysis
   */
  analyzeContext(content, position) {
    const lines = content.split('\n');
    const currentLine = lines[position.line] || '';
    const textBefore = currentLine.substring(0, position.column);
    const textAfter = currentLine.substring(position.column);
    
    // Get surrounding context
    const contextLines = this.getContextLines(lines, position.line, 3);
    const fullContext = contextLines.join('\n');

    // Determine context type
    const context = {
      line: position.line,
      column: position.column,
      textBefore,
      textAfter,
      currentLine,
      fullContext,
      type: 'general',
      triggerCharacter: null,
      range: null,
      partial: '',
      scope: this.determineScope(fullContext, position.line)
    };

    // Analyze trigger character
    const lastChar = textBefore.slice(-1);
    if (lastChar === '.') {
      context.type = 'member_access';
      context.triggerCharacter = '.';
      context.object = this.extractObjectName(textBefore);
    } else if (lastChar === '(') {
      context.type = 'function_call';
      context.triggerCharacter = '(';
      context.functionName = this.extractFunctionName(textBefore);
    } else if (textBefore.includes('import ')) {
      context.type = 'import';
      context.partial = this.extractImportPath(textBefore);
    } else if (textBefore.includes('pragma ')) {
      context.type = 'pragma';
      context.partial = this.extractPragmaDirective(textBefore);
    } else {
      // Analyze word context
      const wordMatch = textBefore.match(/(\w+)$/);
      if (wordMatch) {
        context.partial = wordMatch[1];
        context.type = this.determineWordContext(textBefore, context.partial, fullContext);
      }
    }

    return context;
  }

  /**
   * Get keyword completions
   * @param {Object} context - Context information
   * @returns {Array} Keyword suggestions
   */
  getKeywordCompletions(context) {
    return this.solidityKeywords
      .filter(keyword => keyword.startsWith(context.partial))
      .map(keyword => ({
        label: keyword,
        kind: 'keyword',
        detail: 'Solidity keyword',
        insertText: keyword,
        priority: 10
      }));
  }

  /**
   * Get type completions
   * @param {Object} context - Context information
   * @returns {Array} Type suggestions
   */
  getTypeCompletions(context) {
    return this.solidityTypes
      .filter(type => type.startsWith(context.partial))
      .map(type => ({
        label: type,
        kind: 'type',
        detail: 'Solidity type',
        insertText: type,
        priority: 9
      }));
  }

  /**
   * Get function completions
   * @param {string} content - Contract content
   * @param {Object} context - Context information
   * @returns {Array} Function suggestions
   */
  getFunctionCompletions(content, context) {
    const functions = this.extractFunctions(content);
    return functions
      .filter(func => func.name.startsWith(context.partial))
      .map(func => ({
        label: func.name,
        kind: 'function',
        detail: `function ${func.signature}`,
        insertText: `${func.name}(${func.parameters})`,
        documentation: func.documentation,
        priority: 8
      }));
  }

  /**
   * Get member access completions
   * @param {string} content - Contract content
   * @param {Object} context - Context information
   * @returns {Array} Member suggestions
   */
  getMemberCompletions(content, context) {
    const objectType = this.inferObjectType(content, context.object);
    const members = this.getTypeMembers(objectType);
    
    return members.map(member => ({
      label: member.name,
      kind: member.kind,
      detail: member.detail,
      insertText: member.insertText,
      documentation: member.documentation,
      priority: 7
    }));
  }

  /**
   * Get variable completions
   * @param {string} content - Contract content
   * @param {Object} context - Context information
   * @returns {Array} Variable suggestions
   */
  getVariableCompletions(content, context) {
    const variables = this.extractVariables(content, context.scope);
    return variables
      .filter(variable => variable.name.startsWith(context.partial))
      .map(variable => ({
        label: variable.name,
        kind: 'variable',
        detail: `${variable.type} ${variable.name}`,
        insertText: variable.name,
        priority: 6
      }));
  }

  /**
   * Get pattern completions
   * @param {Object} context - Context information
   * @returns {Array} Pattern suggestions
   */
  getPatternCompletions(context) {
    return this.commonPatterns
      .filter(pattern => pattern.trigger.startsWith(context.partial))
      .map(pattern => ({
        label: pattern.trigger,
        kind: 'snippet',
        detail: pattern.description,
        insertText: pattern.completion,
        documentation: pattern.description,
        priority: 5
      }));
  }

  /**
   * Get built-in completions
   * @param {Object} context - Context information
   * @returns {Array} Built-in suggestions
   */
  getBuiltinCompletions(context) {
    return this.solidityBuiltins
      .filter(builtin => builtin.startsWith(context.partial))
      .map(builtin => ({
        label: builtin,
        kind: 'builtin',
        detail: 'Solidity built-in',
        insertText: builtin,
        priority: 4
      }));
  }

  /**
   * Get general completions
   * @param {string} content - Contract content
   * @param {Object} context - Context information
   * @returns {Array} General suggestions
   */
  getGeneralCompletions(content, context) {
    const suggestions = [];
    
    // Add keywords
    suggestions.push(...this.getKeywordCompletions(context));
    
    // Add types
    suggestions.push(...this.getTypeCompletions(context));
    
    // Add patterns
    suggestions.push(...this.getPatternCompletions(context));
    
    return suggestions;
  }

  /**
   * Sort suggestions by relevance
   * @param {Array} suggestions - Completion suggestions
   * @param {Object} context - Context information
   * @returns {Array} Sorted suggestions
   */
  sortByRelevance(suggestions, context) {
    return suggestions.sort((a, b) => {
      // Sort by priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Then by exact match
      const aExact = a.label === context.partial;
      const bExact = b.label === context.partial;
      if (aExact !== bExact) {
        return bExact ? 1 : -1;
      }
      
      // Then by prefix match
      const aPrefix = a.label.startsWith(context.partial);
      const bPrefix = b.label.startsWith(context.partial);
      if (aPrefix !== bPrefix) {
        return bPrefix ? 1 : -1;
      }
      
      // Finally by alphabetical order
      return a.label.localeCompare(b.label);
    });
  }

  // Helper methods (simplified implementations)
  getContextLines(lines, currentLine, radius) {
    const start = Math.max(0, currentLine - radius);
    const end = Math.min(lines.length, currentLine + radius + 1);
    return lines.slice(start, end);
  }

  determineScope(content, line) {
    // Simplified scope determination
    return 'contract';
  }

  extractObjectName(textBefore) {
    const match = textBefore.match(/(\w+)\.$/);
    return match ? match[1] : '';
  }

  extractFunctionName(textBefore) {
    const match = textBefore.match(/(\w+)\($/);
    return match ? match[1] : '';
  }

  extractImportPath(textBefore) {
    const match = textBefore.match(/import\s+["']([^"']*)$/);
    return match ? match[1] : '';
  }

  extractPragmaDirective(textBefore) {
    const match = textBefore.match(/pragma\s+(\w*)$/);
    return match ? match[1] : '';
  }

  determineWordContext(textBefore, partial, fullContext) {
    if (/\b(uint|int|bool|address|string|bytes)\s*$/.test(textBefore)) {
      return 'type';
    } else if (/\b(function|modifier|event|error)\s+\w*$/.test(textBefore)) {
      return 'declaration';
    } else {
      return 'keyword';
    }
  }

  extractFunctions(content) {
    // Simplified function extraction
    const functions = [];
    const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        parameters: match[2],
        signature: `${match[1]}(${match[2]})`,
        documentation: ''
      });
    }
    
    return functions;
  }

  extractVariables(content, scope) {
    // Simplified variable extraction
    const variables = [];
    const variableRegex = /(\w+)\s+(\w+);/g;
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      variables.push({
        type: match[1],
        name: match[2]
      });
    }
    
    return variables;
  }

  inferObjectType(content, objectName) {
    // Simplified type inference
    return 'address';
  }

  getTypeMembers(type) {
    const typeMembers = {
      address: [
        { name: 'balance', kind: 'property', detail: 'uint256', insertText: 'balance' },
        { name: 'call', kind: 'method', detail: 'function call(bytes)', insertText: 'call()' },
        { name: 'transfer', kind: 'method', detail: 'function transfer(uint256)', insertText: 'transfer()' }
      ],
      array: [
        { name: 'length', kind: 'property', detail: 'uint256', insertText: 'length' },
        { name: 'push', kind: 'method', detail: 'function push()', insertText: 'push()' },
        { name: 'pop', kind: 'method', detail: 'function pop()', insertText: 'pop()' }
      ]
    };
    
    return typeMembers[type] || [];
  }

  getImportCompletions(context) {
    return [
      { label: '@openzeppelin/contracts/', kind: 'module', insertText: '@openzeppelin/contracts/' },
      { label: 'hardhat/', kind: 'module', insertText: 'hardhat/' },
      { label: './interfaces/', kind: 'module', insertText: './interfaces/' }
    ];
  }

  getPragmaCompletions(context) {
    return [
      { label: 'solidity', kind: 'keyword', insertText: 'solidity ^0.8.0;' },
      { label: 'experimental', kind: 'keyword', insertText: 'experimental ABIEncoderV2;' }
    ];
  }

  generateCacheKey(content, position, context) {
    const contentHash = require('crypto').createHash('md5').update(content).digest('hex').substring(0, 8);
    return `${contentHash}_${position.line}_${position.column}_${context.type}`;
  }

  /**
   * Clear completion cache
   */
  clearCache() {
    this.completionCache.clear();
    this.contextCache.clear();
  }

  /**
   * Get completion statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cacheSize: this.completionCache.size,
      contextCacheSize: this.contextCache.size,
      keywordCount: this.solidityKeywords.length,
      typeCount: this.solidityTypes.length,
      builtinCount: this.solidityBuiltins.length,
      patternCount: this.commonPatterns.length
    };
  }
}

module.exports = new CodeCompletionEngine();
