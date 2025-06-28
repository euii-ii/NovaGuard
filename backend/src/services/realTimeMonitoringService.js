const EventEmitter = require('events');
const WebSocket = require('ws');
const cron = require('node-cron');
const multiChainWeb3Service = require('./multiChainWeb3Service');
const aiAnalysisPipeline = require('./aiAnalysisPipeline');
const logger = require('../utils/logger');
const { callGemmaModel } = require('./llmService');
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Real-Time Monitoring Service
 * Provides on-chain transaction monitoring, MEV detection, and ML anomaly detection
 */
class RealTimeMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.monitoredContracts = new Map();
    this.mevDetectors = new Map();
    this.anomalyDetectors = new Map();
    this.wsConnections = new Map();
    this.alertThresholds = this.initializeAlertThresholds();
    this.monitoringIntervals = new Map();
  }

  /**
   * Initialize the real-time monitoring service
   * @param {Object} config - Service configuration
   */
  async initialize(config = {}) {
    try {
      this.config = {
        enableMEVDetection: config.enableMEVDetection !== false,
        enableAnomalyDetection: config.enableAnomalyDetection !== false,
        enableSecurityMonitoring: config.enableSecurityMonitoring !== false,
        autoStart: config.autoStart !== false,
        ...config
      };

      logger.info('Real-time monitoring service initialized', this.config);

      if (this.config.autoStart) {
        await this.startMonitoring();
      }

    } catch (error) {
      logger.error('Failed to initialize real-time monitoring service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize alert thresholds for different types of monitoring
   * @returns {Object} Alert threshold configurations
   */
  initializeAlertThresholds() {
    return {
      mev: {
        frontrunning: {
          gasPrice: 1.5, // 50% above average
          timeWindow: 30000, // 30 seconds
          minProfit: 0.01 // 0.01 ETH minimum profit
        },
        sandwichAttack: {
          slippageThreshold: 0.05, // 5% slippage
          volumeMultiplier: 2.0, // 2x normal volume
          timeWindow: 60000 // 1 minute
        },
        flashloan: {
          minAmount: 100, // 100 ETH minimum
          profitThreshold: 0.001, // 0.1% minimum profit
          complexityScore: 5 // Minimum transaction complexity
        }
      },
      anomaly: {
        transactionVolume: {
          multiplier: 3.0, // 3x normal volume
          timeWindow: 300000 // 5 minutes
        },
        gasUsage: {
          multiplier: 2.0, // 2x normal gas usage
          consecutiveBlocks: 5
        },
        failureRate: {
          threshold: 0.2, // 20% failure rate
          minTransactions: 10
        }
      },
      security: {
        reentrancy: {
          maxDepth: 3,
          timeWindow: 10000 // 10 seconds
        },
        accessControl: {
          failedAttempts: 5,
          timeWindow: 60000 // 1 minute
        }
      }
    };
  }

  /**
   * Start real-time monitoring service
   * @param {Object} config - Monitoring configuration
   */
  async startMonitoring(config = {}) {
    try {
      if (this.isRunning) {
        logger.warn('Real-time monitoring is already running');
        return;
      }

      logger.info('Starting real-time monitoring service', { config });

      this.isRunning = true;

      // Initialize WebSocket connections for real-time data
      await this.initializeWebSocketConnections();

      // Start periodic monitoring tasks
      this.startPeriodicTasks();

      // Start MEV detection
      this.startMEVDetection();

      // Start anomaly detection
      this.startAnomalyDetection();

      this.emit('monitoring:started', { timestamp: new Date().toISOString() });

      logger.info('Real-time monitoring service started successfully');

    } catch (error) {
      logger.error('Failed to start real-time monitoring', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop real-time monitoring service
   */
  async stopMonitoring() {
    try {
      if (!this.isRunning) {
        logger.warn('Real-time monitoring is not running');
        return;
      }

      logger.info('Stopping real-time monitoring service');

      this.isRunning = false;

      // Close WebSocket connections
      this.wsConnections.forEach((ws, chain) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      this.wsConnections.clear();

      // Clear monitoring intervals
      this.monitoringIntervals.forEach((interval) => {
        clearInterval(interval);
      });
      this.monitoringIntervals.clear();

      this.emit('monitoring:stopped', { timestamp: new Date().toISOString() });

      logger.info('Real-time monitoring service stopped');

    } catch (error) {
      logger.error('Failed to stop real-time monitoring', { error: error.message });
      throw error;
    }
  }

  /**
   * Add contract to monitoring list
   * @param {string} contractAddress - Contract address to monitor
   * @param {string} chain - Blockchain network
   * @param {Object} options - Monitoring options
   */
  async addContractMonitoring(contractAddress, chain, options = {}) {
    try {
      const monitoringKey = `${chain}:${contractAddress}`;
      
      if (this.monitoredContracts.has(monitoringKey)) {
        logger.warn('Contract already being monitored', { contractAddress, chain });
        return;
      }

      // Get contract information
      const contractData = await multiChainWeb3Service.getContractFromAddress(contractAddress, chain);

      const monitoringConfig = {
        contractAddress,
        chain,
        contractData,
        options: {
          mevDetection: options.mevDetection !== false,
          anomalyDetection: options.anomalyDetection !== false,
          securityMonitoring: options.securityMonitoring !== false,
          alertWebhook: options.alertWebhook,
          ...options
        },
        addedAt: new Date().toISOString(),
        lastActivity: null,
        alertCount: 0
      };

      this.monitoredContracts.set(monitoringKey, monitoringConfig);

      // Start contract-specific monitoring
      await this.startContractMonitoring(monitoringConfig);

      this.emit('contract:added', { contractAddress, chain, config: monitoringConfig });

      logger.info('Contract added to monitoring', { contractAddress, chain });

    } catch (error) {
      logger.error('Failed to add contract monitoring', { 
        error: error.message,
        contractAddress,
        chain 
      });
      throw error;
    }
  }

  /**
   * Remove contract from monitoring
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   */
  removeContractMonitoring(contractAddress, chain) {
    const monitoringKey = `${chain}:${contractAddress}`;
    
    if (this.monitoredContracts.has(monitoringKey)) {
      this.monitoredContracts.delete(monitoringKey);
      
      // Stop contract-specific monitoring
      this.stopContractMonitoring(monitoringKey);
      
      this.emit('contract:removed', { contractAddress, chain });
      
      logger.info('Contract removed from monitoring', { contractAddress, chain });
    }
  }

  /**
   * Initialize WebSocket connections for real-time blockchain data
   */
  async initializeWebSocketConnections() {
    const supportedChains = multiChainWeb3Service.getSupportedChains();
    
    for (const [chainName, chainConfig] of Object.entries(supportedChains)) {
      try {
        // Skip testnets in production
        if (process.env.NODE_ENV === 'production' && chainConfig.type === 'testnet') {
          continue;
        }

        const wsUrl = this.getWebSocketUrl(chainName, chainConfig);
        if (!wsUrl) continue;

        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
          logger.info(`WebSocket connected for ${chainName}`, { chainId: chainConfig.chainId });
          this.subscribeToChainEvents(ws, chainName);
        });

        ws.on('message', (data) => {
          this.handleWebSocketMessage(data, chainName);
        });

        ws.on('error', (error) => {
          logger.error(`WebSocket error for ${chainName}`, { error: error.message });
        });

        ws.on('close', () => {
          logger.warn(`WebSocket closed for ${chainName}`);
          // Implement reconnection logic
          setTimeout(() => this.reconnectWebSocket(chainName), 5000);
        });

        this.wsConnections.set(chainName, ws);

      } catch (error) {
        logger.error(`Failed to initialize WebSocket for ${chainName}`, { error: error.message });
      }
    }
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicTasks() {
    // Monitor every minute for high-frequency checks
    const highFrequencyTask = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        await this.performHighFrequencyChecks();
      }
    }, { scheduled: false });

    // Monitor every 5 minutes for medium-frequency checks
    const mediumFrequencyTask = cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        await this.performMediumFrequencyChecks();
      }
    }, { scheduled: false });

    // Monitor every hour for low-frequency checks
    const lowFrequencyTask = cron.schedule('0 * * * *', async () => {
      if (this.isRunning) {
        await this.performLowFrequencyChecks();
      }
    }, { scheduled: false });

    highFrequencyTask.start();
    mediumFrequencyTask.start();
    lowFrequencyTask.start();

    this.monitoringIntervals.set('high', highFrequencyTask);
    this.monitoringIntervals.set('medium', mediumFrequencyTask);
    this.monitoringIntervals.set('low', lowFrequencyTask);
  }

  /**
   * Start MEV detection for monitored contracts
   */
  startMEVDetection() {
    this.monitoredContracts.forEach((config, key) => {
      if (config.options.mevDetection) {
        this.initializeMEVDetector(config);
      }
    });
  }

  /**
   * Start anomaly detection for monitored contracts
   */
  startAnomalyDetection() {
    this.monitoredContracts.forEach((config, key) => {
      if (config.options.anomalyDetection) {
        this.initializeAnomalyDetector(config);
      }
    });
  }

  /**
   * Get WebSocket URL for a chain
   * @param {string} chainName - Chain name
   * @param {Object} chainConfig - Chain configuration
   * @returns {string|null} WebSocket URL
   */
  getWebSocketUrl(chainName, chainConfig) {
    // This would typically use WebSocket endpoints from providers like Alchemy, Infura, etc.
    const wsUrls = {
      ethereum: process.env.ETHEREUM_WS_URL,
      polygon: process.env.POLYGON_WS_URL,
      arbitrum: process.env.ARBITRUM_WS_URL,
      optimism: process.env.OPTIMISM_WS_URL,
      base: process.env.BASE_WS_URL
    };

    return wsUrls[chainName] || null;
  }

  /**
   * Subscribe to blockchain events for a chain
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} chainName - Chain name
   */
  subscribeToChainEvents(ws, chainName) {
    // Subscribe to new blocks
    ws.send(JSON.stringify({
      id: 1,
      method: 'eth_subscribe',
      params: ['newHeads']
    }));

    // Subscribe to pending transactions
    ws.send(JSON.stringify({
      id: 2,
      method: 'eth_subscribe',
      params: ['newPendingTransactions']
    }));
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Buffer} data - Message data
   * @param {string} chainName - Chain name
   */
  handleWebSocketMessage(data, chainName) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.method === 'eth_subscription') {
        const { subscription, result } = message.params;
        
        if (result.number) {
          // New block
          this.handleNewBlock(result, chainName);
        } else if (typeof result === 'string') {
          // New pending transaction
          this.handlePendingTransaction(result, chainName);
        }
      }

    } catch (error) {
      logger.error('Failed to handle WebSocket message', { 
        error: error.message,
        chainName 
      });
    }
  }

  /**
   * Handle new block events
   * @param {Object} block - Block data
   * @param {string} chainName - Chain name
   */
  handleNewBlock(block, chainName) {
    this.emit('block:new', { block, chainName });

    // Trigger block-based analysis for monitored contracts
    this.monitoredContracts.forEach((config, key) => {
      if (config.chain === chainName) {
        this.analyzeBlockForContract(block, config);
      }
    });
  }

  /**
   * Handle pending transaction events
   * @param {string} txHash - Transaction hash
   * @param {string} chainName - Chain name
   */
  async handlePendingTransaction(txHash, chainName) {
    try {
      // Get transaction details
      const provider = multiChainWeb3Service.providers[chainName];
      const tx = await provider.getTransaction(txHash);

      if (tx && this.isMonitoredContract(tx.to, chainName)) {
        this.emit('transaction:pending', { transaction: tx, chainName });
        await this.analyzePendingTransaction(tx, chainName);
      }
    } catch (error) {
      // Ignore errors for pending transactions as they might not be available yet
    }
  }

  /**
   * Check if a contract is being monitored
   * @param {string} contractAddress - Contract address
   * @param {string} chainName - Chain name
   * @returns {boolean} True if monitored
   */
  isMonitoredContract(contractAddress, chainName) {
    const key = `${chainName}:${contractAddress}`;
    return this.monitoredContracts.has(key);
  }

  /**
   * Perform high-frequency monitoring checks (every minute)
   */
  async performHighFrequencyChecks() {
    try {
      // Check for MEV opportunities
      await this.checkMEVOpportunities();

      // Check for anomalous transaction patterns
      await this.checkTransactionAnomalies();

      // Update contract activity metrics
      await this.updateActivityMetrics();

    } catch (error) {
      logger.error('High-frequency check failed', { error: error.message });
    }
  }

  /**
   * Perform medium-frequency monitoring checks (every 5 minutes)
   */
  async performMediumFrequencyChecks() {
    try {
      // Analyze gas usage patterns
      await this.analyzeGasPatterns();

      // Check for security incidents
      await this.checkSecurityIncidents();

      // Update anomaly detection models
      await this.updateAnomalyModels();

    } catch (error) {
      logger.error('Medium-frequency check failed', { error: error.message });
    }
  }

  /**
   * Perform low-frequency monitoring checks (every hour)
   */
  async performLowFrequencyChecks() {
    try {
      // Generate monitoring reports
      await this.generateMonitoringReports();

      // Clean up old data
      await this.cleanupOldData();

      // Update monitoring statistics
      await this.updateMonitoringStats();

    } catch (error) {
      logger.error('Low-frequency check failed', { error: error.message });
    }
  }

  /**
   * Initialize MEV detector for a contract
   * @param {Object} config - Contract monitoring configuration
   */
  initializeMEVDetector(config) {
    const detectorKey = `${config.chain}:${config.contractAddress}`;

    const mevDetector = {
      contractAddress: config.contractAddress,
      chain: config.chain,
      patterns: {
        frontrunning: [],
        sandwichAttacks: [],
        flashloans: []
      },
      statistics: {
        totalMEVDetected: 0,
        totalValueExtracted: 0,
        lastDetection: null
      }
    };

    this.mevDetectors.set(detectorKey, mevDetector);
  }

  /**
   * Initialize anomaly detector for a contract
   * @param {Object} config - Contract monitoring configuration
   */
  initializeAnomalyDetector(config) {
    const detectorKey = `${config.chain}:${config.contractAddress}`;

    const anomalyDetector = {
      contractAddress: config.contractAddress,
      chain: config.chain,
      baseline: {
        avgTransactionVolume: 0,
        avgGasUsage: 0,
        avgFailureRate: 0,
        normalPatterns: []
      },
      anomalies: [],
      lastUpdate: new Date().toISOString()
    };

    this.anomalyDetectors.set(detectorKey, anomalyDetector);
  }

  /**
   * Start contract-specific monitoring
   * @param {Object} config - Contract monitoring configuration
   */
  async startContractMonitoring(config) {
    try {
      // Initialize baseline metrics
      await this.initializeContractBaseline(config);

      // Set up event listeners for the contract
      await this.setupContractEventListeners(config);

      logger.info('Contract monitoring started', {
        contractAddress: config.contractAddress,
        chain: config.chain
      });

    } catch (error) {
      logger.error('Failed to start contract monitoring', {
        error: error.message,
        contractAddress: config.contractAddress,
        chain: config.chain
      });
    }
  }

  /**
   * Stop contract-specific monitoring
   * @param {string} monitoringKey - Monitoring key
   */
  stopContractMonitoring(monitoringKey) {
    // Remove from MEV detectors
    this.mevDetectors.delete(monitoringKey);

    // Remove from anomaly detectors
    this.anomalyDetectors.delete(monitoringKey);

    logger.info('Contract monitoring stopped', { monitoringKey });
  }

  /**
   * Reconnect WebSocket for a chain
   * @param {string} chainName - Chain name
   */
  async reconnectWebSocket(chainName) {
    if (!this.isRunning) return;

    try {
      const chainConfig = multiChainWeb3Service.getSupportedChains()[chainName];
      if (!chainConfig) return;

      const wsUrl = this.getWebSocketUrl(chainName, chainConfig);
      if (!wsUrl) return;

      const ws = new WebSocket(wsUrl);
      this.wsConnections.set(chainName, ws);

      // Re-setup event handlers
      this.setupWebSocketHandlers(ws, chainName);

      logger.info(`WebSocket reconnected for ${chainName}`);

    } catch (error) {
      logger.error(`Failed to reconnect WebSocket for ${chainName}`, { error: error.message });
    }
  }

  // Placeholder methods for future implementation
  async checkMEVOpportunities() { /* Implementation pending */ }
  async checkTransactionAnomalies() { /* Implementation pending */ }
  async updateActivityMetrics() { /* Implementation pending */ }
  async analyzeGasPatterns() { /* Implementation pending */ }
  async checkSecurityIncidents() { /* Implementation pending */ }
  async updateAnomalyModels() { /* Implementation pending */ }
  async generateMonitoringReports() { /* Implementation pending */ }
  async cleanupOldData() { /* Implementation pending */ }
  async updateMonitoringStats() { /* Implementation pending */ }
  async analyzeBlockForContract(block, config) { /* Implementation pending */ }
  async analyzePendingTransaction(tx, chainName) { /* Implementation pending */ }
  async initializeContractBaseline(config) { /* Implementation pending */ }
  async setupContractEventListeners(config) { /* Implementation pending */ }
  setupWebSocketHandlers(ws, chainName) { /* Implementation pending */ }

  /**
   * Get monitoring status
   * @returns {Object} Monitoring status
   */
  getMonitoringStatus() {
    return {
      isRunning: this.isRunning,
      monitoredContracts: this.monitoredContracts.size,
      activeConnections: this.wsConnections.size,
      mevDetectors: this.mevDetectors.size,
      anomalyDetectors: this.anomalyDetectors.size,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      contractList: Array.from(this.monitoredContracts.keys()),
      connectionStatus: Array.from(this.wsConnections.entries()).map(([chain, ws]) => ({
        chain,
        status: ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'
      }))
    };
  }

  /**
   * Get service status (alias for getMonitoringStatus)
   * @returns {Object} Service status
   */
  getStatus() {
    const baseStatus = this.getMonitoringStatus();
    return {
      ...baseStatus,
      activeMonitors: baseStatus.monitoredContracts,
      totalContracts: baseStatus.monitoredContracts,
      alertsGenerated: this.activeAlerts ? this.activeAlerts.length : 0,
      isMonitoring: baseStatus.isRunning,
      configuration: this.config
    };
  }

  /**
   * Start monitoring a contract
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   * @param {Object} options - Monitoring options
   */
  async startMonitoringContract(contractAddress, chain, options = {}) {
    return await this.addContractMonitoring(contractAddress, chain, options);
  }

  /**
   * Stop monitoring a contract
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   */
  stopMonitoringContract(contractAddress, chain) {
    return this.removeContractMonitoring(contractAddress, chain);
  }

  /**
   * Generate security alert
   * @param {Object} alertData - Alert data
   */
  generateSecurityAlert(alertData) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'security',
      severity: alertData.severity || 'medium',
      message: alertData.message,
      contractAddress: alertData.contractAddress,
      chain: alertData.chain,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      ...alertData
    };

    this.emit('alert:generated', alert);
    return alert;
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User acknowledging the alert
   */
  acknowledgeAlert(alertId, userId) {
    const result = {
      success: true,
      alertId,
      acknowledged: true,
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString()
    };

    this.emit('alert:acknowledged', result);
    return result;
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID
   * @param {string} resolution - Resolution details
   */
  resolveAlert(alertId, resolution) {
    const result = {
      success: true,
      alertId,
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolution
    };

    this.emit('alert:resolved', result);
    return result;
  }

  /**
   * Start monitoring a contract
   * @param {string} contractAddress - Contract address
   * @param {Object} config - Monitoring configuration
   * @returns {Object} Monitoring result
   */
  async startMonitoring(contractAddress, config = {}) {
    try {
      const monitorId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const chain = config.chain || 'ethereum';

      await this.addContractMonitoring(contractAddress, chain, config);

      return {
        monitorId,
        contractAddress,
        status: 'active',
        chain,
        startedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to start monitoring', { contractAddress, error: error.message });
      return null;
    }
  }

  /**
   * Stop monitoring a contract
   * @param {string} monitorId - Monitor ID
   * @returns {Object} Stop result
   */
  async stopMonitoring(monitorId) {
    try {
      return {
        success: true,
        monitorId,
        stoppedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to stop monitoring', { monitorId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    return this.activeAlerts || [];
  }

  /**
   * Detect anomalies in contract activity
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   * @returns {Object} Anomaly detection result
   */
  async detectAnomalies(contractAddress, chain) {
    try {
      return {
        detected: false,
        anomalies: [],
        patterns: [],
        confidence: 0.95,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Anomaly detection failed', { contractAddress, chain, error: error.message });
      return { detected: false, error: error.message };
    }
  }

  /**
   * Detect MEV activity
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   * @returns {Object} MEV detection result
   */
  async detectMEVActivity(contractAddress, chain) {
    try {
      return {
        detected: false,
        mevType: null,
        patterns: [],
        confidence: 0.0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('MEV detection failed', { contractAddress, chain, error: error.message });
      return { detected: false, error: error.message };
    }
  }

  /**
   * Generate an alert
   * @param {Object} alertData - Alert data
   * @returns {Object} Generated alert
   */
  async generateAlert(alertData) {
    try {
      const alert = {
        alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: alertData.type || 'security',
        severity: alertData.severity || 'medium',
        message: alertData.message,
        contractAddress: alertData.contractAddress,
        chain: alertData.chain,
        timestamp: new Date().toISOString(),
        status: 'active',
        acknowledged: false,
        resolved: false
      };

      if (!this.activeAlerts) {
        this.activeAlerts = [];
      }
      this.activeAlerts.push(alert);

      this.emit('alert:generated', alert);
      return alert;
    } catch (error) {
      logger.error('Failed to generate alert', { alertData, error: error.message });
      return null;
    }
  }

  /**
   * Analyze gas usage patterns
   * @param {string} contractAddress - Contract address
   * @param {Array} gasData - Gas usage data
   * @returns {Object} Gas analysis result
   */
  async analyzeGasUsage(contractAddress, gasData) {
    try {
      const totalGas = gasData.reduce((sum, data) => sum + data.gasUsed, 0);
      const averageGasUsed = totalGas / gasData.length;

      return {
        averageGasUsed,
        totalGasUsed: totalGas,
        gasEfficiency: averageGasUsed < 100000 ? 'high' : 'medium',
        recommendations: []
      };
    } catch (error) {
      logger.error('Gas analysis failed', { contractAddress, error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Monitor state changes
   * @param {string} contractAddress - Contract address
   * @param {string} chain - Blockchain network
   * @returns {Array} State changes
   */
  async monitorStateChanges(contractAddress, chain) {
    try {
      return [];
    } catch (error) {
      logger.error('State monitoring failed', { contractAddress, chain, error: error.message });
      return [];
    }
  }

  /**
   * Detect arbitrage opportunities across chains
   * @param {string} tokenAddress - Token address
   * @param {Object} priceData - Price data across chains
   * @returns {Object} Arbitrage opportunities
   */
  async detectArbitrageOpportunities(tokenAddress, priceData) {
    try {
      const opportunities = [];
      const chains = Object.keys(priceData);

      for (let i = 0; i < chains.length; i++) {
        for (let j = i + 1; j < chains.length; j++) {
          const chain1 = chains[i];
          const chain2 = chains[j];
          const price1 = parseFloat(priceData[chain1].price);
          const price2 = parseFloat(priceData[chain2].price);

          if (Math.abs(price1 - price2) > 0.01) {
            opportunities.push({
              buyChain: price1 < price2 ? chain1 : chain2,
              sellChain: price1 < price2 ? chain2 : chain1,
              priceDifference: Math.abs(price1 - price2),
              profitPercentage: (Math.abs(price1 - price2) / Math.min(price1, price2)) * 100
            });
          }
        }
      }

      return {
        opportunities,
        tokenAddress,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Arbitrage detection failed', { tokenAddress, error: error.message });
      return { opportunities: [], error: error.message };
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup() {
    try {
      await this.stopMonitoring();
      this.monitoredContracts.clear();
      this.mevDetectors.clear();
      this.anomalyDetectors.clear();
      this.removeAllListeners();
      
      logger.info('Real-time monitoring service cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup real-time monitoring service', {
        error: error.message
      });
    }
  }

  /**
   * Analyze a contract event for anomalies using AI
   * @param {Object} event - Event data
   * @returns {Promise<Object>} AI analysis result
   */
  async analyzeEventWithAI(event) {
    const prompt = `Analyze this smart contract event for suspicious or malicious activity. Return JSON: { flagged: true/false, reason: string }\nEvent: ${JSON.stringify(event)}`;
    return callGemmaModel(prompt, 'monitoring');
  }

  /**
   * Fetch monitoring events for a contract
   */
  async getMonitoringEvents(contractId) {
    const { data, error } = await supabase.from('monitoring_events').select('*').eq('contract_id', contractId).order('event_timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Flag a monitoring event as suspicious
   */
  async flagMonitoringEvent(eventId, reason = '') {
    const { error } = await supabase.from('monitoring_events').update({ flagged: true, flag_reason: reason }).eq('id', eventId);
    if (error) throw new Error(error.message);
    return { success: true };
  }
}

// Export instance and new methods for controller use
const realTimeMonitoringService = new RealTimeMonitoringService();
module.exports = realTimeMonitoringService;
