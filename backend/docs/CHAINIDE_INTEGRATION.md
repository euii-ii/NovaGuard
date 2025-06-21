# ChainIDE Integration Guide

## Overview

The Enhanced DAO Smart Contract Security Auditor now includes comprehensive ChainIDE integration, providing real-time development features, collaborative tools, and advanced plugin architecture for smart contract development.

## Features

### 🔄 Real-Time Development
- **Live Code Analysis**: Instant security analysis as you type
- **Syntax Validation**: Real-time Solidity syntax checking
- **Code Completion**: Context-aware smart contract completions
- **Smart Suggestions**: AI-powered development recommendations

### 👥 Collaborative Development
- **Shared Workspaces**: Multi-user development environments
- **Real-Time Editing**: Collaborative code editing with conflict resolution
- **Cursor Tracking**: See where team members are working
- **Comments & Reviews**: In-line code comments and discussions

### 🔌 Plugin Architecture
- **Built-in Plugins**: Security analyzer, gas optimizer, DeFi analyzer
- **Custom Plugins**: Extensible plugin system with SDK
- **Plugin SDK**: JavaScript SDK for plugin development
- **Hot Reloading**: Dynamic plugin loading and updates

### 🌐 Multi-Chain Support
- **8+ Blockchain Networks**: Ethereum, Polygon, Arbitrum, Optimism, Base, zkSync, BSC
- **Chain-Specific Analysis**: Tailored analysis for different networks
- **Cross-Chain Detection**: Bridge and multi-chain vulnerability analysis

## Quick Start

### 1. Enable ChainIDE Integration

```bash
# In your .env file
ENABLE_CHAINIDE_INTEGRATION=true
CHAINIDE_WS_PORT=8080
CHAINIDE_ENABLE_COLLABORATION=true
CHAINIDE_ENABLE_REALTIME_ANALYSIS=true
```

### 2. Start the Backend

```bash
npm start
```

The ChainIDE integration service will start on WebSocket port 8080 (configurable).

### 3. Connect from ChainIDE

```javascript
// In your ChainIDE plugin or extension
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Send authentication
  ws.send(JSON.stringify({
    type: 'auth:authenticate',
    token: 'your-jwt-token'
  }));
};
```

## API Endpoints

### REST API

#### Create Workspace
```http
POST /api/v1/chainide/workspaces
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "My DeFi Project",
  "description": "Building a new AMM protocol",
  "projectType": "defi",
  "visibility": "private",
  "collaborators": [
    {
      "userId": "user123",
      "role": "collaborator",
      "permissions": ["read", "write"]
    }
  ]
}
```

#### Real-Time Code Analysis
```http
POST /api/v1/chainide/code/analyze
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "filePath": "contracts/AMM.sol",
  "content": "pragma solidity ^0.8.0; contract AMM { ... }",
  "cursorPosition": {
    "line": 10,
    "column": 5
  },
  "changeType": "edit"
}
```

#### Get Capabilities
```http
GET /api/v1/chainide/capabilities
```

#### Download Plugin SDK
```http
GET /api/v1/chainide/sdk
```

### WebSocket API

#### Authentication
```json
{
  "type": "auth:authenticate",
  "token": "jwt-token-here",
  "id": "request-id"
}
```

#### Join Workspace
```json
{
  "type": "workspace:join",
  "workspaceId": "workspace-id",
  "projectName": "My Project",
  "id": "request-id"
}
```

#### Real-Time Analysis
```json
{
  "type": "analysis:realtime",
  "contractCode": "pragma solidity ^0.8.0; ...",
  "filePath": "contracts/Token.sol",
  "analysisType": "quick",
  "agents": ["security", "quality"],
  "id": "request-id"
}
```

#### Collaborative Editing
```json
{
  "type": "collaboration:edit",
  "filePath": "contracts/Token.sol",
  "operation": "save",
  "content": "updated contract code",
  "position": { "line": 10, "column": 5 },
  "id": "request-id"
}
```

#### Cursor Updates
```json
{
  "type": "collaboration:cursor",
  "filePath": "contracts/Token.sol",
  "position": { "line": 15, "column": 10 },
  "selection": { "start": { "line": 15, "column": 10 }, "end": { "line": 15, "column": 20 } }
}
```

## Plugin Development

### Using the Plugin SDK

```javascript
const { ChainIDEPluginSDK, PluginHelpers } = require('./chainIDEPluginSDK');

class MySecurityPlugin {
  constructor() {
    this.sdk = new ChainIDEPluginSDK({
      serverUrl: 'ws://localhost:8080',
      pluginId: 'my-security-plugin',
      pluginName: 'Advanced Security Analyzer',
      version: '1.0.0',
      capabilities: ['vulnerability-detection', 'security-scoring']
    });
  }

  async initialize() {
    // Connect to backend
    await this.sdk.connect();
    
    // Set up event listeners
    this.sdk.onMessage('analysis:completed', (message) => {
      this.handleAnalysisResult(message.result);
    });
    
    // Authenticate
    await this.sdk.authenticate('your-jwt-token');
  }

  async analyzeContract(contractCode, filePath) {
    return await this.sdk.analyzeContract({
      contractCode,
      filePath,
      analysisType: 'comprehensive',
      agents: ['security']
    });
  }

  handleAnalysisResult(result) {
    // Process analysis results
    console.log('Vulnerabilities found:', result.vulnerabilities.length);
    
    // Create vulnerability objects
    const vulnerabilities = result.vulnerabilities.map(vuln => 
      PluginHelpers.createVulnerability({
        name: vuln.name,
        description: vuln.description,
        severity: vuln.severity,
        category: vuln.category,
        affectedLines: vuln.affectedLines,
        recommendation: vuln.recommendation
      })
    );
    
    // Update UI with results
    this.updateSecurityPanel(vulnerabilities);
  }
}
```

### Built-in Plugins

#### Security Analyzer
- **Vulnerability Detection**: Reentrancy, access control, arithmetic issues
- **Security Scoring**: Overall security assessment
- **Real-Time Alerts**: Instant security warnings

#### Gas Optimizer
- **Gas Analysis**: Function-level gas consumption analysis
- **Optimization Suggestions**: Specific gas reduction recommendations
- **Pattern Detection**: Inefficient code pattern identification

#### DeFi Analyzer
- **Protocol Detection**: AMM, lending, yield farming pattern recognition
- **Economic Analysis**: Tokenomics and incentive mechanism review
- **MEV Detection**: Frontrunning and sandwich attack vulnerabilities

## Collaborative Features

### Workspace Management

```javascript
// Create a workspace
const workspace = await collaborativeWorkspaceManager.createWorkspace({
  name: 'DeFi Protocol Development',
  description: 'Building next-gen AMM',
  createdBy: 'user123',
  collaborators: [
    { userId: 'user456', role: 'collaborator' },
    { userId: 'user789', role: 'viewer' }
  ]
});

// Join workspace
const session = await collaborativeWorkspaceManager.joinWorkspace(
  workspace.id,
  'user456',
  { userAgent: 'ChainIDE/1.0.0' }
);
```

### Real-Time Editing

```javascript
// Update file in workspace
await collaborativeWorkspaceManager.updateFile(
  workspaceId,
  userId,
  {
    filePath: 'contracts/Token.sol',
    content: updatedContractCode,
    operation: 'update'
  }
);

// Add comment
await collaborativeWorkspaceManager.addComment(
  workspaceId,
  userId,
  {
    filePath: 'contracts/Token.sol',
    lineNumber: 25,
    content: 'This function needs access control',
    type: 'suggestion'
  }
);
```

### Cursor Tracking

```javascript
// Update cursor position
collaborativeWorkspaceManager.updateCursor(sessionId, {
  filePath: 'contracts/Token.sol',
  position: { line: 15, column: 10 },
  selection: { start: { line: 15, column: 10 }, end: { line: 15, column: 20 } }
});
```

## Real-Time Development Features

### Live Code Analysis

```javascript
// Process code changes
const result = await realTimeDevelopmentService.processCodeChange({
  userId: 'user123',
  workspaceId: 'workspace456',
  filePath: 'contracts/Token.sol',
  content: contractCode,
  cursorPosition: { line: 10, column: 5 },
  changeType: 'edit'
});

// Result includes:
// - syntaxValidation: Real-time syntax checking
// - codeCompletion: Context-aware suggestions
// - smartSuggestions: AI-powered recommendations
// - liveAnalysis: Quick security scan (debounced)
```

### Code Completion

```javascript
// Get code completion suggestions
const completion = await realTimeDevelopmentService.getCodeCompletion(
  contractCode,
  { line: 10, column: 5 },
  'contracts/Token.sol'
);

// Returns context-aware suggestions:
// - Function completions
// - Variable completions
// - Type completions
// - Keyword completions
// - Smart contract specific completions
```

### Smart Suggestions

```javascript
// Get smart suggestions
const suggestions = await realTimeDevelopmentService.getSmartSuggestions(
  contractCode,
  { line: 10, column: 5 },
  'contracts/Token.sol',
  'user123'
);

// Returns categorized suggestions:
// - security: Security-related recommendations
// - optimization: Gas optimization tips
// - bestPractices: Code quality improvements
// - patterns: Design pattern suggestions
```

## Configuration

### Environment Variables

```bash
# ChainIDE Integration
ENABLE_CHAINIDE_INTEGRATION=true
CHAINIDE_WS_PORT=8080
CHAINIDE_MAX_CONNECTIONS=1000

# Real-Time Features
CHAINIDE_ENABLE_REALTIME_ANALYSIS=true
CHAINIDE_ENABLE_CODE_COMPLETION=true
CHAINIDE_DEBOUNCE_DELAY=1000
CHAINIDE_MAX_QUEUE_SIZE=100

# Collaboration
CHAINIDE_ENABLE_COLLABORATION=true
MAX_WORKSPACE_MEMBERS=10
WORKSPACE_AUTO_SAVE_INTERVAL=30000

# Plugin System
ENABLE_PLUGIN_SYSTEM=true
PLUGIN_SDK_VERSION=1.0.0
MAX_CUSTOM_PLUGINS=50
```

### Service Configuration

```javascript
// Initialize ChainIDE integration
await chainIDEIntegrationService.initialize({
  port: 8080,
  enableRealTimeAnalysis: true,
  enableCollaboration: true,
  maxConnections: 1000
});

// Initialize real-time development
await realTimeDevelopmentService.initialize({
  debounceDelay: 1000,
  enableSyntaxValidation: true,
  enableLiveAnalysis: true,
  enableCodeCompletion: true,
  enableSmartSuggestions: true
});
```

## Security Considerations

### Authentication
- All WebSocket connections require JWT authentication
- Role-based access control for workspace operations
- API key support for service-to-service communication

### Rate Limiting
- Connection-based rate limiting
- Analysis request throttling
- Workspace operation limits

### Data Protection
- Real-time data encryption
- Workspace access controls
- Audit logging for all operations

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if port 8080 is available
   - Verify JWT token is valid
   - Ensure ENABLE_CHAINIDE_INTEGRATION=true

2. **Real-Time Analysis Not Working**
   - Check CHAINIDE_ENABLE_REALTIME_ANALYSIS setting
   - Verify OpenRouter API key is configured
   - Check analysis queue size limits

3. **Collaboration Features Not Working**
   - Ensure CHAINIDE_ENABLE_COLLABORATION=true
   - Check workspace permissions
   - Verify user authentication

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug
ENABLE_DEBUG_LOGGING=true

# Check service status
curl http://localhost:3001/api/v1/chainide/status
```

## Examples

See the complete example plugin implementation in:
- `backend/examples/chainIDEPlugin.js`

For more examples and tutorials, visit our documentation at:
- [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md)
- [Collaboration Features](./COLLABORATION.md)
- [Real-Time Analysis](./REALTIME_ANALYSIS.md)
