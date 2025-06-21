/**
 * ChainIDE Plugin SDK
 * JavaScript SDK for developing ChainIDE plugins with smart contract analysis capabilities
 */

class ChainIDEPluginSDK {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'ws://localhost:8080',
      pluginId: config.pluginId || this.generatePluginId(),
      pluginName: config.pluginName || 'Unnamed Plugin',
      version: config.version || '1.0.0',
      capabilities: config.capabilities || [],
      autoReconnect: config.autoReconnect !== false,
      reconnectInterval: config.reconnectInterval || 5000,
      ...config
    };

    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.eventListeners = new Map();
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Connect to ChainIDE backend
   * @returns {Promise} Connection promise
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.registerPlugin();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected');
          
          if (this.config.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              this.connect();
            }, this.config.reconnectInterval);
          }
        };

        this.ws.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from ChainIDE backend
   */
  disconnect() {
    if (this.ws) {
      this.config.autoReconnect = false;
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Register plugin with backend
   */
  registerPlugin() {
    this.sendMessage({
      type: 'plugin:register',
      pluginId: this.config.pluginId,
      pluginName: this.config.pluginName,
      version: this.config.version,
      capabilities: this.config.capabilities
    });
  }

  /**
   * Authenticate with JWT token
   * @param {string} token - JWT authentication token
   * @returns {Promise} Authentication result
   */
  async authenticate(token) {
    return this.sendRequest({
      type: 'auth:authenticate',
      token
    });
  }

  /**
   * Join a workspace
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} options - Join options
   * @returns {Promise} Join result
   */
  async joinWorkspace(workspaceId, options = {}) {
    return this.sendRequest({
      type: 'workspace:join',
      workspaceId,
      ...options
    });
  }

  /**
   * Leave current workspace
   * @returns {Promise} Leave result
   */
  async leaveWorkspace() {
    return this.sendRequest({
      type: 'workspace:leave'
    });
  }

  /**
   * Request contract analysis
   * @param {Object} analysisRequest - Analysis parameters
   * @returns {Promise} Analysis result
   */
  async analyzeContract(analysisRequest) {
    const {
      contractCode,
      filePath,
      analysisType = 'comprehensive',
      agents = ['security', 'quality'],
      chain = 'ethereum'
    } = analysisRequest;

    return this.sendRequest({
      type: 'analysis:request',
      contractCode,
      filePath,
      analysisType,
      agents,
      chain
    });
  }

  /**
   * Request real-time analysis
   * @param {Object} analysisRequest - Real-time analysis parameters
   * @returns {Promise} Analysis acknowledgment
   */
  async requestRealtimeAnalysis(analysisRequest) {
    return this.sendRequest({
      type: 'analysis:realtime',
      ...analysisRequest
    });
  }

  /**
   * Execute plugin action
   * @param {string} pluginId - Target plugin ID
   * @param {string} action - Action to execute
   * @param {Object} parameters - Action parameters
   * @returns {Promise} Execution result
   */
  async executePlugin(pluginId, action, parameters) {
    return this.sendRequest({
      type: 'plugin:execute',
      pluginId,
      action,
      parameters
    });
  }

  /**
   * Send cursor position update
   * @param {string} filePath - File path
   * @param {Object} position - Cursor position
   * @param {Object} selection - Text selection
   */
  updateCursor(filePath, position, selection = null) {
    this.sendMessage({
      type: 'collaboration:cursor',
      filePath,
      position,
      selection
    });
  }

  /**
   * Send collaborative edit
   * @param {string} filePath - File path
   * @param {string} operation - Edit operation
   * @param {string} content - File content
   * @param {Object} position - Edit position
   */
  sendEdit(filePath, operation, content, position) {
    this.sendMessage({
      type: 'collaboration:edit',
      filePath,
      operation,
      content,
      position
    });
  }

  /**
   * Register message handler
   * @param {string} messageType - Message type to handle
   * @param {Function} handler - Handler function
   */
  onMessage(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener to remove
   */
  off(event, listener) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   */
  emit(event, ...args) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * Send message to backend
   * @param {Object} message - Message to send
   */
  sendMessage(message) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('Not connected to ChainIDE backend');
    }
  }

  /**
   * Send request and wait for response
   * @param {Object} message - Request message
   * @returns {Promise} Response promise
   */
  sendRequest(message) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      message.id = requestId;

      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout

      this.sendMessage(message);
    });
  }

  /**
   * Handle incoming message
   * @param {Object} message - Received message
   */
  handleMessage(message) {
    // Handle request responses
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);

      if (message.type === 'error') {
        reject(new Error(message.error));
      } else {
        resolve(message);
      }
      return;
    }

    // Handle message type handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Message handler error:', error);
        }
      });
    }

    // Emit as event
    this.emit('message', message);
    this.emit(message.type, message);
  }

  /**
   * Generate unique plugin ID
   * @returns {string} Plugin identifier
   */
  generatePluginId() {
    return `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      pluginId: this.config.pluginId,
      pluginName: this.config.pluginName,
      version: this.config.version,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Helper functions for plugin development
const PluginHelpers = {
  /**
   * Create vulnerability finding
   * @param {Object} vulnerability - Vulnerability data
   * @returns {Object} Formatted vulnerability
   */
  createVulnerability(vulnerability) {
    return {
      name: vulnerability.name,
      description: vulnerability.description,
      severity: vulnerability.severity || 'Medium',
      category: vulnerability.category || 'other',
      affectedLines: vulnerability.affectedLines || [],
      codeSnippet: vulnerability.codeSnippet || '',
      recommendation: vulnerability.recommendation || '',
      confidence: vulnerability.confidence || 'Medium',
      ...vulnerability
    };
  },

  /**
   * Create gas optimization suggestion
   * @param {Object} optimization - Optimization data
   * @returns {Object} Formatted optimization
   */
  createOptimization(optimization) {
    return {
      description: optimization.description,
      affectedLines: optimization.affectedLines || [],
      potentialSavings: optimization.potentialSavings || 'Unknown',
      implementation: optimization.implementation || '',
      difficulty: optimization.difficulty || 'Medium',
      ...optimization
    };
  },

  /**
   * Parse Solidity AST
   * @param {string} contractCode - Solidity code
   * @returns {Object} Parsed AST (simplified)
   */
  parseAST(contractCode) {
    // This would integrate with a Solidity parser
    // For now, return a simplified structure
    return {
      contracts: [],
      functions: [],
      modifiers: [],
      events: [],
      imports: []
    };
  },

  /**
   * Extract function signatures
   * @param {string} contractCode - Solidity code
   * @returns {Array} Function signatures
   */
  extractFunctions(contractCode) {
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*(public|private|internal|external)?\s*(view|pure|payable)?\s*(returns\s*\([^)]*\))?\s*{/g;
    const functions = [];
    let match;

    while ((match = functionRegex.exec(contractCode)) !== null) {
      functions.push({
        name: match[1],
        visibility: match[2] || 'internal',
        stateMutability: match[3] || '',
        returns: match[4] || '',
        line: contractCode.substring(0, match.index).split('\n').length
      });
    }

    return functions;
  }
};

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChainIDEPluginSDK, PluginHelpers };
} else if (typeof window !== 'undefined') {
  window.ChainIDEPluginSDK = ChainIDEPluginSDK;
  window.PluginHelpers = PluginHelpers;
}
