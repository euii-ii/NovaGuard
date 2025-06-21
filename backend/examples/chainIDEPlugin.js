/**
 * Example ChainIDE Plugin
 * Demonstrates how to create a plugin for ChainIDE integration
 */

// Import the ChainIDE Plugin SDK
const { ChainIDEPluginSDK, PluginHelpers } = require('../src/sdk/chainIDEPluginSDK');

class SecurityAnalyzerPlugin {
  constructor() {
    this.sdk = new ChainIDEPluginSDK({
      serverUrl: 'ws://localhost:8080',
      pluginId: 'security-analyzer-example',
      pluginName: 'Advanced Security Analyzer',
      version: '1.0.0',
      capabilities: [
        'vulnerability-detection',
        'security-scoring',
        'real-time-analysis',
        'code-suggestions'
      ]
    });

    this.isConnected = false;
    this.currentWorkspace = null;
    this.analysisHistory = [];
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    try {
      // Set up event listeners
      this.setupEventListeners();

      // Connect to ChainIDE backend
      await this.sdk.connect();
      this.isConnected = true;

      console.log('Security Analyzer Plugin initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize plugin:', error);
      return false;
    }
  }

  /**
   * Set up event listeners for ChainIDE integration
   */
  setupEventListeners() {
    // Connection events
    this.sdk.on('connected', () => {
      console.log('Connected to ChainIDE backend');
      this.onConnected();
    });

    this.sdk.on('disconnected', () => {
      console.log('Disconnected from ChainIDE backend');
      this.onDisconnected();
    });

    // Workspace events
    this.sdk.onMessage('workspace:joined', (message) => {
      this.currentWorkspace = message.workspace;
      console.log('Joined workspace:', message.workspace.id);
    });

    this.sdk.onMessage('workspace:member_joined', (message) => {
      console.log('New member joined workspace:', message.userId);
    });

    // File events
    this.sdk.onMessage('file:updated', (message) => {
      console.log('File updated:', message.filePath);
      this.onFileUpdated(message);
    });

    // Analysis events
    this.sdk.onMessage('analysis:completed', (message) => {
      console.log('Analysis completed:', message.analysisId);
      this.onAnalysisCompleted(message);
    });

    // Collaboration events
    this.sdk.onMessage('collaboration:cursor_update', (message) => {
      this.onCursorUpdate(message);
    });

    this.sdk.onMessage('collaboration:edit', (message) => {
      this.onCollaborativeEdit(message);
    });
  }

  /**
   * Authenticate with JWT token
   * @param {string} token - JWT authentication token
   */
  async authenticate(token) {
    try {
      const result = await this.sdk.authenticate(token);
      console.log('Authentication successful:', result);
      return result;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Join a workspace
   * @param {string} workspaceId - Workspace identifier
   */
  async joinWorkspace(workspaceId) {
    try {
      const result = await this.sdk.joinWorkspace(workspaceId);
      this.currentWorkspace = result.workspace;
      console.log('Joined workspace successfully:', workspaceId);
      return result;
    } catch (error) {
      console.error('Failed to join workspace:', error);
      throw error;
    }
  }

  /**
   * Analyze contract code for security vulnerabilities
   * @param {string} contractCode - Solidity contract code
   * @param {string} filePath - File path
   * @param {Object} options - Analysis options
   */
  async analyzeContract(contractCode, filePath, options = {}) {
    try {
      const analysisRequest = {
        contractCode,
        filePath,
        analysisType: options.analysisType || 'comprehensive',
        agents: options.agents || ['security'],
        chain: options.chain || 'ethereum'
      };

      const result = await this.sdk.analyzeContract(analysisRequest);
      
      // Process and enhance the analysis result
      const enhancedResult = this.enhanceAnalysisResult(result, contractCode);
      
      // Store in history
      this.analysisHistory.push({
        filePath,
        timestamp: new Date().toISOString(),
        result: enhancedResult
      });

      console.log('Contract analysis completed:', enhancedResult.overallScore);
      return enhancedResult;

    } catch (error) {
      console.error('Contract analysis failed:', error);
      throw error;
    }
  }

  /**
   * Request real-time analysis as user types
   * @param {string} contractCode - Current contract code
   * @param {string} filePath - File path
   */
  async requestRealtimeAnalysis(contractCode, filePath) {
    try {
      const result = await this.sdk.requestRealtimeAnalysis({
        contractCode,
        filePath,
        analysisType: 'quick',
        agents: ['security']
      });

      console.log('Real-time analysis queued:', result.analysisId);
      return result;

    } catch (error) {
      console.error('Real-time analysis request failed:', error);
      throw error;
    }
  }

  /**
   * Get security suggestions for current code
   * @param {string} contractCode - Contract code
   * @param {Object} cursorPosition - Current cursor position
   */
  getSecuritySuggestions(contractCode, cursorPosition) {
    const suggestions = [];

    // Check for common security patterns
    const patterns = this.analyzeSecurityPatterns(contractCode);

    if (patterns.hasReentrancyRisk) {
      suggestions.push(PluginHelpers.createVulnerability({
        name: 'Potential Reentrancy Vulnerability',
        description: 'This function may be vulnerable to reentrancy attacks',
        severity: 'High',
        category: 'reentrancy',
        affectedLines: patterns.reentrancyLines,
        recommendation: 'Use the ReentrancyGuard modifier or checks-effects-interactions pattern'
      }));
    }

    if (patterns.hasUncheckedCalls) {
      suggestions.push(PluginHelpers.createVulnerability({
        name: 'Unchecked External Call',
        description: 'External call return value is not checked',
        severity: 'Medium',
        category: 'unchecked-calls',
        affectedLines: patterns.uncheckedCallLines,
        recommendation: 'Check the return value of external calls'
      }));
    }

    if (patterns.hasAccessControlIssues) {
      suggestions.push(PluginHelpers.createVulnerability({
        name: 'Missing Access Control',
        description: 'Function lacks proper access control',
        severity: 'High',
        category: 'access-control',
        affectedLines: patterns.accessControlLines,
        recommendation: 'Add appropriate access control modifiers'
      }));
    }

    return suggestions;
  }

  /**
   * Handle file update events
   * @param {Object} message - File update message
   */
  onFileUpdated(message) {
    // Automatically trigger analysis for Solidity files
    if (message.filePath.endsWith('.sol')) {
      console.log('Solidity file updated, triggering analysis...');
      // Note: In a real plugin, you would get the file content from the workspace
      // this.requestRealtimeAnalysis(fileContent, message.filePath);
    }
  }

  /**
   * Handle analysis completion
   * @param {Object} message - Analysis completion message
   */
  onAnalysisCompleted(message) {
    const result = message.result;
    
    // Display results in IDE (this would integrate with actual IDE UI)
    console.log('Analysis Results:');
    console.log(`- Overall Score: ${result.overallScore}`);
    console.log(`- Risk Level: ${result.riskLevel}`);
    console.log(`- Vulnerabilities Found: ${result.vulnerabilities?.length || 0}`);

    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      console.log('Vulnerabilities:');
      result.vulnerabilities.forEach((vuln, index) => {
        console.log(`  ${index + 1}. ${vuln.name} (${vuln.severity})`);
        console.log(`     ${vuln.description}`);
        if (vuln.affectedLines && vuln.affectedLines.length > 0) {
          console.log(`     Lines: ${vuln.affectedLines.join(', ')}`);
        }
      });
    }

    // Trigger UI updates (in real implementation)
    this.updateSecurityPanel(result);
  }

  /**
   * Handle cursor updates from other users
   * @param {Object} message - Cursor update message
   */
  onCursorUpdate(message) {
    // Update collaborative cursor display
    console.log(`User ${message.userId} cursor at line ${message.position?.line}`);
  }

  /**
   * Handle collaborative edits
   * @param {Object} message - Collaborative edit message
   */
  onCollaborativeEdit(message) {
    console.log(`User ${message.userId} edited ${message.filePath}`);
    
    // Trigger real-time analysis for collaborative edits
    if (message.filePath.endsWith('.sol')) {
      // this.requestRealtimeAnalysis(message.content, message.filePath);
    }
  }

  /**
   * Analyze security patterns in contract code
   * @param {string} contractCode - Contract code to analyze
   * @returns {Object} Pattern analysis results
   */
  analyzeSecurityPatterns(contractCode) {
    const patterns = {
      hasReentrancyRisk: false,
      hasUncheckedCalls: false,
      hasAccessControlIssues: false,
      reentrancyLines: [],
      uncheckedCallLines: [],
      accessControlLines: []
    };

    const lines = contractCode.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Check for reentrancy patterns
      if (trimmedLine.includes('.call(') || trimmedLine.includes('.send(') || trimmedLine.includes('.transfer(')) {
        if (!trimmedLine.includes('nonReentrant') && !contractCode.includes('ReentrancyGuard')) {
          patterns.hasReentrancyRisk = true;
          patterns.reentrancyLines.push(lineNumber);
        }
      }

      // Check for unchecked calls
      if ((trimmedLine.includes('.call(') || trimmedLine.includes('.delegatecall(')) && 
          !trimmedLine.includes('require(') && !trimmedLine.includes('assert(')) {
        patterns.hasUncheckedCalls = true;
        patterns.uncheckedCallLines.push(lineNumber);
      }

      // Check for missing access control
      if (trimmedLine.includes('function ') && 
          (trimmedLine.includes('public') || trimmedLine.includes('external')) &&
          !trimmedLine.includes('onlyOwner') && !trimmedLine.includes('onlyAdmin') &&
          !trimmedLine.includes('view') && !trimmedLine.includes('pure')) {
        patterns.hasAccessControlIssues = true;
        patterns.accessControlLines.push(lineNumber);
      }
    });

    return patterns;
  }

  /**
   * Enhance analysis result with plugin-specific insights
   * @param {Object} result - Original analysis result
   * @param {string} contractCode - Contract code
   * @returns {Object} Enhanced result
   */
  enhanceAnalysisResult(result, contractCode) {
    // Add plugin-specific enhancements
    const enhanced = {
      ...result,
      pluginInsights: {
        codeComplexity: this.calculateCodeComplexity(contractCode),
        securityPatterns: this.analyzeSecurityPatterns(contractCode),
        gasOptimizationTips: this.getGasOptimizationTips(contractCode),
        bestPracticeScore: this.calculateBestPracticeScore(contractCode)
      }
    };

    return enhanced;
  }

  /**
   * Update security panel in IDE (placeholder for UI integration)
   * @param {Object} result - Analysis result
   */
  updateSecurityPanel(result) {
    // This would integrate with the actual IDE UI
    console.log('Updating security panel with results...');
  }

  /**
   * Handle connection established
   */
  onConnected() {
    // Plugin is now connected and ready
    console.log('Plugin ready for use');
  }

  /**
   * Handle disconnection
   */
  onDisconnected() {
    this.isConnected = false;
    this.currentWorkspace = null;
  }

  /**
   * Get plugin status
   * @returns {Object} Plugin status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      currentWorkspace: this.currentWorkspace?.id || null,
      analysisHistory: this.analysisHistory.length,
      ...this.sdk.getStatus()
    };
  }

  // Placeholder methods for additional functionality
  calculateCodeComplexity(contractCode) { return 'Medium'; }
  getGasOptimizationTips(contractCode) { return []; }
  calculateBestPracticeScore(contractCode) { return 85; }
}

// Example usage
async function exampleUsage() {
  const plugin = new SecurityAnalyzerPlugin();
  
  try {
    // Initialize plugin
    await plugin.initialize();
    
    // Authenticate (you would get this token from your authentication system)
    // await plugin.authenticate('your-jwt-token');
    
    // Join a workspace
    // await plugin.joinWorkspace('workspace-id');
    
    // Analyze a contract
    const contractCode = `
      pragma solidity ^0.8.0;
      
      contract Example {
          mapping(address => uint256) public balances;
          
          function withdraw(uint256 amount) public {
              require(balances[msg.sender] >= amount);
              msg.sender.call{value: amount}("");
              balances[msg.sender] -= amount;
          }
      }
    `;
    
    const result = await plugin.analyzeContract(contractCode, 'Example.sol');
    console.log('Analysis completed:', result);
    
  } catch (error) {
    console.error('Plugin example failed:', error);
  }
}

// Export for use in other modules
module.exports = { SecurityAnalyzerPlugin, exampleUsage };

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}
