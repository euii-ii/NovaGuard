const WebSocket = require('ws');
const EventEmitter = require('events');
const aiAnalysisPipeline = require('./aiAnalysisPipeline');
const multiChainWeb3Service = require('./multiChainWeb3Service');
const logger = require('../utils/logger');

/**
 * ChainIDE Integration Service
 * Provides real-time smart contract analysis and collaborative development features
 */
class ChainIDEIntegrationService extends EventEmitter {
  constructor() {
    super();
    this.activeConnections = new Map();
    this.workspaces = new Map();
    this.collaborativeSessions = new Map();
    this.pluginRegistry = new Map();
    this.realtimeAnalysisQueue = new Map();
    this.wsServer = null;
    this.isRunning = false;
    this.intervals = [];
    this.autoAnalysisTimeouts = new Map();
  }

  /**
   * Initialize ChainIDE integration service
   * @param {Object} config - Service configuration
   */
  async initialize(config = {}) {
    try {
      const {
        port = process.env.CHAINIDE_WS_PORT || 8080,
        enableRealTimeAnalysis = true,
        enableCollaboration = true,
        maxConnections = 1000
      } = config;

      // Initialize WebSocket server for IDE connections
      this.wsServer = new WebSocket.Server({
        port,
        maxPayload: 10 * 1024 * 1024, // 10MB max payload
        perMessageDeflate: true
      });

      this.setupWebSocketHandlers();
      this.initializePluginArchitecture();
      this.startRealtimeAnalysisEngine();

      this.isRunning = true;

      logger.info('ChainIDE Integration Service initialized', {
        port,
        enableRealTimeAnalysis,
        enableCollaboration,
        maxConnections
      });

      this.emit('service:initialized', { port, timestamp: new Date().toISOString() });

    } catch (error) {
      logger.error('Failed to initialize ChainIDE Integration Service', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup WebSocket connection handlers
   */
  setupWebSocketHandlers() {
    this.wsServer.on('connection', (ws, request) => {
      const connectionId = this.generateConnectionId();
      const clientInfo = this.extractClientInfo(request);

      logger.info('New ChainIDE connection', { connectionId, clientInfo });

      // Store connection
      this.activeConnections.set(connectionId, {
        ws,
        connectionId,
        clientInfo,
        connectedAt: new Date().toISOString(),
        workspaceId: null,
        userId: null,
        subscriptions: new Set()
      });

      // Setup message handlers
      ws.on('message', (data) => {
        this.handleMessage(connectionId, data);
      });

      ws.on('close', () => {
        this.handleDisconnection(connectionId);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { connectionId, error: error.message });
      });

      // Send welcome message
      this.sendMessage(connectionId, {
        type: 'connection:established',
        connectionId,
        capabilities: this.getServiceCapabilities(),
        timestamp: new Date().toISOString()
      });
    });

    this.wsServer.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });
  }

  /**
   * Handle incoming messages from IDE clients
   * @param {string} connectionId - Connection identifier
   * @param {Buffer} data - Message data
   */
  async handleMessage(connectionId, data) {
    try {
      const message = JSON.parse(data.toString());
      const connection = this.activeConnections.get(connectionId);

      if (!connection) {
        logger.warn('Message from unknown connection', { connectionId });
        return;
      }

      logger.debug('Received message', { 
        connectionId, 
        type: message.type,
        workspaceId: message.workspaceId 
      });

      switch (message.type) {
        case 'auth:authenticate':
          await this.handleAuthentication(connectionId, message);
          break;

        case 'workspace:join':
          await this.handleWorkspaceJoin(connectionId, message);
          break;

        case 'workspace:leave':
          await this.handleWorkspaceLeave(connectionId, message);
          break;

        case 'analysis:request':
          await this.handleAnalysisRequest(connectionId, message);
          break;

        case 'analysis:realtime':
          await this.handleRealtimeAnalysis(connectionId, message);
          break;

        case 'collaboration:cursor':
          await this.handleCursorUpdate(connectionId, message);
          break;

        case 'collaboration:edit':
          await this.handleCollaborativeEdit(connectionId, message);
          break;

        case 'plugin:register':
          await this.handlePluginRegistration(connectionId, message);
          break;

        case 'plugin:execute':
          await this.handlePluginExecution(connectionId, message);
          break;

        default:
          logger.warn('Unknown message type', { connectionId, type: message.type });
          this.sendError(connectionId, 'Unknown message type', message.id);
      }

    } catch (error) {
      logger.error('Error handling message', { 
        connectionId, 
        error: error.message 
      });
      this.sendError(connectionId, 'Message processing failed', null);
    }
  }

  /**
   * Handle user authentication
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Authentication message
   */
  async handleAuthentication(connectionId, message) {
    try {
      const { token, userId, workspaceId } = message;
      
      // Validate authentication token (integrate with existing JWT auth)
      const jwtAuth = require('../middleware/jwtAuth');
      const decoded = jwtAuth.verifyToken(token);

      const connection = this.activeConnections.get(connectionId);
      connection.userId = decoded.sub || decoded.userId;
      connection.userRole = decoded.role;
      connection.permissions = decoded.permissions || [];

      this.sendMessage(connectionId, {
        type: 'auth:success',
        userId: connection.userId,
        role: connection.userRole,
        permissions: connection.permissions,
        id: message.id
      });

      logger.info('User authenticated in ChainIDE', {
        connectionId,
        userId: connection.userId,
        role: connection.userRole
      });

    } catch (error) {
      logger.error('Authentication failed', { connectionId, error: error.message });
      this.sendError(connectionId, 'Authentication failed', message.id);
    }
  }

  /**
   * Handle workspace join request
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Workspace join message
   */
  async handleWorkspaceJoin(connectionId, message) {
    try {
      const { workspaceId, projectName, contractFiles } = message;
      const connection = this.activeConnections.get(connectionId);

      if (!connection.userId) {
        this.sendError(connectionId, 'Authentication required', message.id);
        return;
      }

      // Create or join workspace
      let workspace = this.workspaces.get(workspaceId);
      if (!workspace) {
        workspace = {
          id: workspaceId,
          projectName,
          createdBy: connection.userId,
          createdAt: new Date().toISOString(),
          members: new Map(),
          contractFiles: new Map(),
          analysisHistory: [],
          collaborativeState: {
            cursors: new Map(),
            activeEdits: new Map(),
            lockState: new Map()
          }
        };
        this.workspaces.set(workspaceId, workspace);
      }

      // Add user to workspace
      workspace.members.set(connection.userId, {
        connectionId,
        userId: connection.userId,
        role: connection.userRole,
        joinedAt: new Date().toISOString(),
        isActive: true
      });

      connection.workspaceId = workspaceId;

      // Initialize contract files if provided
      if (contractFiles) {
        contractFiles.forEach(file => {
          workspace.contractFiles.set(file.path, {
            ...file,
            lastModified: new Date().toISOString(),
            modifiedBy: connection.userId
          });
        });
      }

      this.sendMessage(connectionId, {
        type: 'workspace:joined',
        workspaceId,
        workspace: this.sanitizeWorkspaceForClient(workspace),
        id: message.id
      });

      // Notify other workspace members
      this.broadcastToWorkspace(workspaceId, {
        type: 'workspace:member_joined',
        userId: connection.userId,
        memberInfo: workspace.members.get(connection.userId)
      }, connectionId);

      logger.info('User joined workspace', {
        connectionId,
        userId: connection.userId,
        workspaceId,
        memberCount: workspace.members.size
      });

    } catch (error) {
      logger.error('Failed to join workspace', { connectionId, error: error.message });
      this.sendError(connectionId, 'Failed to join workspace', message.id);
    }
  }

  /**
   * Handle real-time contract analysis request
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Analysis request message
   */
  async handleRealtimeAnalysis(connectionId, message) {
    try {
      const { contractCode, filePath, analysisType = 'quick', agents } = message;
      const connection = this.activeConnections.get(connectionId);

      if (!connection.userId) {
        this.sendError(connectionId, 'Authentication required', message.id);
        return;
      }

      // Queue analysis for real-time processing
      const analysisId = this.generateAnalysisId();
      this.realtimeAnalysisQueue.set(analysisId, {
        connectionId,
        workspaceId: connection.workspaceId,
        userId: connection.userId,
        contractCode,
        filePath,
        analysisType,
        agents: agents || ['security', 'quality'],
        requestedAt: new Date().toISOString(),
        messageId: message.id
      });

      // Send immediate acknowledgment
      this.sendMessage(connectionId, {
        type: 'analysis:queued',
        analysisId,
        estimatedTime: this.estimateAnalysisTime(analysisType, agents),
        id: message.id
      });

      // Process analysis asynchronously
      this.processRealtimeAnalysis(analysisId);

      logger.info('Real-time analysis queued', {
        connectionId,
        analysisId,
        filePath,
        analysisType
      });

    } catch (error) {
      logger.error('Failed to queue real-time analysis', { 
        connectionId, 
        error: error.message 
      });
      this.sendError(connectionId, 'Analysis request failed', message.id);
    }
  }

  /**
   * Process real-time analysis
   * @param {string} analysisId - Analysis identifier
   */
  async processRealtimeAnalysis(analysisId) {
    try {
      const analysisRequest = this.realtimeAnalysisQueue.get(analysisId);
      if (!analysisRequest) return;

      const {
        connectionId,
        workspaceId,
        contractCode,
        filePath,
        analysisType,
        agents,
        messageId
      } = analysisRequest;

      // Send analysis started notification
      this.sendMessage(connectionId, {
        type: 'analysis:started',
        analysisId,
        timestamp: new Date().toISOString()
      });

      // Perform analysis using AI pipeline
      const analysisResult = await aiAnalysisPipeline.analyzeContract({
        contractCode,
        agents,
        analysisMode: analysisType === 'quick' ? 'quick' : 'comprehensive',
        filePath
      });

      // Send results to client
      this.sendMessage(connectionId, {
        type: 'analysis:completed',
        analysisId,
        result: {
          ...analysisResult,
          filePath,
          analysisType,
          realtime: true
        },
        id: messageId
      });

      // Broadcast to workspace if collaborative
      if (workspaceId) {
        this.broadcastToWorkspace(workspaceId, {
          type: 'workspace:analysis_completed',
          analysisId,
          filePath,
          summary: {
            overallScore: analysisResult.overallScore,
            vulnerabilitiesFound: analysisResult.vulnerabilities?.length || 0,
            riskLevel: analysisResult.riskLevel
          },
          analyzedBy: analysisRequest.userId
        }, connectionId);

        // Update workspace analysis history
        const workspace = this.workspaces.get(workspaceId);
        if (workspace) {
          workspace.analysisHistory.push({
            analysisId,
            filePath,
            analyzedBy: analysisRequest.userId,
            analyzedAt: new Date().toISOString(),
            summary: {
              overallScore: analysisResult.overallScore,
              vulnerabilitiesFound: analysisResult.vulnerabilities?.length || 0,
              riskLevel: analysisResult.riskLevel
            }
          });

          // Keep only last 50 analyses
          if (workspace.analysisHistory.length > 50) {
            workspace.analysisHistory = workspace.analysisHistory.slice(-50);
          }
        }
      }

      // Clean up
      this.realtimeAnalysisQueue.delete(analysisId);

      logger.info('Real-time analysis completed', {
        analysisId,
        connectionId,
        filePath,
        overallScore: analysisResult.overallScore,
        vulnerabilitiesFound: analysisResult.vulnerabilities?.length || 0
      });

    } catch (error) {
      logger.error('Real-time analysis failed', { 
        analysisId, 
        error: error.message 
      });

      const analysisRequest = this.realtimeAnalysisQueue.get(analysisId);
      if (analysisRequest) {
        this.sendMessage(analysisRequest.connectionId, {
          type: 'analysis:failed',
          analysisId,
          error: error.message,
          id: analysisRequest.messageId
        });
        this.realtimeAnalysisQueue.delete(analysisId);
      }
    }
  }

  /**
   * Handle collaborative cursor updates
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Cursor update message
   */
  async handleCursorUpdate(connectionId, message) {
    try {
      const { filePath, position, selection } = message;
      const connection = this.activeConnections.get(connectionId);

      if (!connection.workspaceId) {
        this.sendError(connectionId, 'Not in a workspace', message.id);
        return;
      }

      const workspace = this.workspaces.get(connection.workspaceId);
      if (!workspace) {
        this.sendError(connectionId, 'Workspace not found', message.id);
        return;
      }

      // Update cursor position in workspace
      workspace.collaborativeState.cursors.set(connection.userId, {
        userId: connection.userId,
        filePath,
        position,
        selection,
        updatedAt: new Date().toISOString()
      });

      // Broadcast cursor update to other workspace members
      this.broadcastToWorkspace(connection.workspaceId, {
        type: 'collaboration:cursor_update',
        userId: connection.userId,
        filePath,
        position,
        selection,
        timestamp: new Date().toISOString()
      }, connectionId);

    } catch (error) {
      logger.error('Failed to handle cursor update', { 
        connectionId, 
        error: error.message 
      });
    }
  }

  /**
   * Send message to specific connection
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Message to send
   */
  sendMessage(connectionId, message) {
    const connection = this.activeConnections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to connection
   * @param {string} connectionId - Connection identifier
   * @param {string} error - Error message
   * @param {string} messageId - Original message ID
   */
  sendError(connectionId, error, messageId) {
    this.sendMessage(connectionId, {
      type: 'error',
      error,
      id: messageId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all workspace members
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} message - Message to broadcast
   * @param {string} excludeConnectionId - Connection to exclude from broadcast
   */
  broadcastToWorkspace(workspaceId, message, excludeConnectionId = null) {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    workspace.members.forEach((member, userId) => {
      if (member.connectionId !== excludeConnectionId && member.isActive) {
        this.sendMessage(member.connectionId, message);
      }
    });
  }

  /**
   * Generate unique connection ID
   * @returns {string} Connection identifier
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique analysis ID
   * @returns {string} Analysis identifier
   */
  generateAnalysisId() {
    return `rt_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract client information from request
   * @param {Object} request - HTTP request object
   * @returns {Object} Client information
   */
  extractClientInfo(request) {
    return {
      userAgent: request.headers['user-agent'],
      origin: request.headers.origin,
      ip: request.socket.remoteAddress,
      ideVersion: request.headers['x-chainide-version'],
      pluginVersion: request.headers['x-plugin-version']
    };
  }

  /**
   * Handle workspace leave request
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Workspace leave message
   */
  async handleWorkspaceLeave(connectionId, message) {
    try {
      const connection = this.activeConnections.get(connectionId);
      if (!connection.workspaceId) return;

      const workspace = this.workspaces.get(connection.workspaceId);
      if (workspace) {
        workspace.members.delete(connection.userId);

        // Broadcast member left
        this.broadcastToWorkspace(connection.workspaceId, {
          type: 'workspace:member_left',
          userId: connection.userId
        }, connectionId);

        // Clean up empty workspace
        if (workspace.members.size === 0) {
          this.workspaces.delete(connection.workspaceId);
        }
      }

      connection.workspaceId = null;
      this.sendMessage(connectionId, {
        type: 'workspace:left',
        id: message.id
      });

    } catch (error) {
      logger.error('Failed to leave workspace', { connectionId, error: error.message });
    }
  }

  /**
   * Handle collaborative edit
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Edit message
   */
  async handleCollaborativeEdit(connectionId, message) {
    try {
      const { filePath, operation, content, position } = message;
      const connection = this.activeConnections.get(connectionId);

      if (!connection.workspaceId) {
        this.sendError(connectionId, 'Not in a workspace', message.id);
        return;
      }

      const workspace = this.workspaces.get(connection.workspaceId);
      if (!workspace) {
        this.sendError(connectionId, 'Workspace not found', message.id);
        return;
      }

      // Update file content in workspace
      const file = workspace.contractFiles.get(filePath);
      if (file) {
        file.content = content;
        file.lastModified = new Date().toISOString();
        file.modifiedBy = connection.userId;
      }

      // Broadcast edit to other workspace members
      this.broadcastToWorkspace(connection.workspaceId, {
        type: 'collaboration:edit',
        userId: connection.userId,
        filePath,
        operation,
        content,
        position,
        timestamp: new Date().toISOString()
      }, connectionId);

      // Trigger real-time analysis if enabled
      if (operation === 'save' || operation === 'auto-save') {
        this.triggerAutoAnalysis(connectionId, filePath, content);
      }

    } catch (error) {
      logger.error('Failed to handle collaborative edit', {
        connectionId,
        error: error.message
      });
    }
  }

  /**
   * Handle plugin registration
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Plugin registration message
   */
  async handlePluginRegistration(connectionId, message) {
    try {
      const { pluginId, pluginName, version, capabilities } = message;
      const connection = this.activeConnections.get(connectionId);

      if (!connection.userId) {
        this.sendError(connectionId, 'Authentication required', message.id);
        return;
      }

      this.pluginRegistry.set(pluginId, {
        id: pluginId,
        name: pluginName,
        version,
        capabilities,
        registeredBy: connection.userId,
        registeredAt: new Date().toISOString(),
        connectionId
      });

      this.sendMessage(connectionId, {
        type: 'plugin:registered',
        pluginId,
        id: message.id
      });

      logger.info('Plugin registered', { pluginId, pluginName, connectionId });

    } catch (error) {
      logger.error('Failed to register plugin', { connectionId, error: error.message });
      this.sendError(connectionId, 'Plugin registration failed', message.id);
    }
  }

  /**
   * Handle plugin execution
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Plugin execution message
   */
  async handlePluginExecution(connectionId, message) {
    try {
      const { pluginId, action, parameters } = message;
      const plugin = this.pluginRegistry.get(pluginId);

      if (!plugin) {
        this.sendError(connectionId, 'Plugin not found', message.id);
        return;
      }

      // Execute plugin action
      const result = await this.executePluginAction(plugin, action, parameters);

      this.sendMessage(connectionId, {
        type: 'plugin:result',
        pluginId,
        action,
        result,
        id: message.id
      });

    } catch (error) {
      logger.error('Failed to execute plugin', { connectionId, error: error.message });
      this.sendError(connectionId, 'Plugin execution failed', message.id);
    }
  }

  /**
   * Handle disconnection
   * @param {string} connectionId - Connection identifier
   */
  handleDisconnection(connectionId) {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    // Leave workspace if connected
    if (connection.workspaceId) {
      const workspace = this.workspaces.get(connection.workspaceId);
      if (workspace) {
        workspace.members.delete(connection.userId);

        // Notify other members
        this.broadcastToWorkspace(connection.workspaceId, {
          type: 'workspace:member_disconnected',
          userId: connection.userId
        }, connectionId);
      }
    }

    // Clean up connection
    this.activeConnections.delete(connectionId);

    logger.info('ChainIDE connection closed', {
      connectionId,
      userId: connection.userId
    });
  }

  /**
   * Initialize plugin architecture
   */
  initializePluginArchitecture() {
    // Register built-in plugins
    this.registerBuiltInPlugins();
  }

  /**
   * Register built-in plugins
   */
  registerBuiltInPlugins() {
    const builtInPlugins = [
      {
        id: 'security-analyzer',
        name: 'Security Analyzer',
        version: '1.0.0',
        capabilities: ['vulnerability-detection', 'security-scoring']
      },
      {
        id: 'gas-optimizer',
        name: 'Gas Optimizer',
        version: '1.0.0',
        capabilities: ['gas-analysis', 'optimization-suggestions']
      },
      {
        id: 'defi-analyzer',
        name: 'DeFi Analyzer',
        version: '1.0.0',
        capabilities: ['defi-patterns', 'economic-analysis']
      }
    ];

    builtInPlugins.forEach(plugin => {
      this.pluginRegistry.set(plugin.id, {
        ...plugin,
        registeredBy: 'system',
        registeredAt: new Date().toISOString(),
        isBuiltIn: true
      });
    });
  }

  /**
   * Start real-time analysis engine
   */
  startRealtimeAnalysisEngine() {
    // Process analysis queue every 100ms
    const intervalId = setInterval(() => {
      this.processAnalysisQueue();
    }, 100);
    this.intervals.push(intervalId);
  }

  /**
   * Process analysis queue
   */
  processAnalysisQueue() {
    // Implementation for batch processing of queued analyses
    // This helps manage load and prevents overwhelming the AI pipeline
  }

  /**
   * Trigger automatic analysis
   * @param {string} connectionId - Connection identifier
   * @param {string} filePath - File path
   * @param {string} content - File content
   */
  triggerAutoAnalysis(connectionId, filePath, content) {
    // Debounce auto-analysis to prevent too frequent calls
    const debounceKey = `${connectionId}-${filePath}`;
    const existingTimeout = this.autoAnalysisTimeouts.get(debounceKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      this.handleRealtimeAnalysis(connectionId, {
        contractCode: content,
        filePath,
        analysisType: 'quick',
        agents: ['security']
      });
      this.autoAnalysisTimeouts.delete(debounceKey);
    }, 2000); // 2 second debounce
    
    this.autoAnalysisTimeouts.set(debounceKey, timeoutId);
  }

  /**
   * Execute plugin action
   * @param {Object} plugin - Plugin information
   * @param {string} action - Action to execute
   * @param {Object} parameters - Action parameters
   * @returns {Object} Execution result
   */
  async executePluginAction(plugin, action, parameters) {
    // Built-in plugin actions
    if (plugin.isBuiltIn) {
      switch (plugin.id) {
        case 'security-analyzer':
          return await this.executeSecurityAnalysis(parameters);
        case 'gas-optimizer':
          return await this.executeGasOptimization(parameters);
        case 'defi-analyzer':
          return await this.executeDeFiAnalysis(parameters);
        default:
          throw new Error('Unknown built-in plugin');
      }
    }

    // External plugin execution would be implemented here
    throw new Error('External plugin execution not implemented');
  }

  /**
   * Execute security analysis plugin
   * @param {Object} parameters - Analysis parameters
   * @returns {Object} Analysis result
   */
  async executeSecurityAnalysis(parameters) {
    const { contractCode, focusAreas } = parameters;

    return await aiAnalysisPipeline.analyzeContract({
      contractCode,
      agents: ['security'],
      analysisMode: 'comprehensive',
      focusAreas
    });
  }

  /**
   * Execute gas optimization plugin
   * @param {Object} parameters - Optimization parameters
   * @returns {Object} Optimization result
   */
  async executeGasOptimization(parameters) {
    const { contractCode } = parameters;

    return await aiAnalysisPipeline.analyzeContract({
      contractCode,
      agents: ['quality'],
      analysisMode: 'comprehensive'
    });
  }

  /**
   * Execute DeFi analysis plugin
   * @param {Object} parameters - Analysis parameters
   * @returns {Object} Analysis result
   */
  async executeDeFiAnalysis(parameters) {
    const { contractCode, protocolType } = parameters;

    return await aiAnalysisPipeline.analyzeContract({
      contractCode,
      agents: ['defi', 'economics'],
      analysisMode: 'defi-focused',
      protocolType
    });
  }

  /**
   * Estimate analysis time
   * @param {string} analysisType - Type of analysis
   * @param {Array} agents - Agents to use
   * @returns {number} Estimated time in milliseconds
   */
  estimateAnalysisTime(analysisType, agents) {
    const baseTime = analysisType === 'quick' ? 5000 : 15000;
    const agentMultiplier = agents ? agents.length * 0.5 : 1;
    return Math.round(baseTime * agentMultiplier);
  }

  /**
   * Sanitize workspace data for client
   * @param {Object} workspace - Workspace object
   * @returns {Object} Sanitized workspace
   */
  sanitizeWorkspaceForClient(workspace) {
    return {
      id: workspace.id,
      projectName: workspace.projectName,
      createdBy: workspace.createdBy,
      createdAt: workspace.createdAt,
      memberCount: workspace.members.size,
      fileCount: workspace.contractFiles.size,
      recentAnalyses: workspace.analysisHistory.slice(-10)
    };
  }

  /**
   * Get service capabilities
   * @returns {Object} Service capabilities
   */
  getServiceCapabilities() {
    return {
      realtimeAnalysis: true,
      multiAgentSupport: true,
      collaborativeEditing: true,
      workspaceManagement: true,
      pluginSupport: true,
      supportedChains: Object.keys(multiChainWeb3Service.getSupportedChains()),
      supportedAgents: ['security', 'quality', 'economics', 'defi', 'crossChain', 'mev'],
      builtInPlugins: Array.from(this.pluginRegistry.values()).filter(p => p.isBuiltIn)
    };
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeConnections: this.activeConnections.size,
      activeWorkspaces: this.workspaces.size,
      registeredPlugins: this.pluginRegistry.size,
      queuedAnalyses: this.realtimeAnalysisQueue.size
    };
  }

  /**
   * Cleanup service resources
   */
  cleanup() {
    // Clear all intervals
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals = [];

    // Clear all timeouts
    this.autoAnalysisTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.autoAnalysisTimeouts.clear();

    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }

    // Clear all connections
    this.activeConnections.clear();
    this.workspaces.clear();
    this.realtimeAnalysisQueue.clear();

    this.isRunning = false;
  }
}

module.exports = new ChainIDEIntegrationService();
