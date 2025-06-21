// Mock implementations for backend services
const { EventEmitter } = require('events');

/**
 * Mock JWT Auth Service
 */
const mockJwtAuth = {
  verifyToken: jest.fn((token) => {
    if (token === 'invalid-token') {
      throw new Error('Invalid token');
    }
    return {
      sub: 'test-user-123',
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: ['read', 'write', 'analyze']
    };
  }),
  
  generateToken: jest.fn((payload) => {
    return 'mock-jwt-token-' + Math.random().toString(36).substring(7);
  }),
  
  middleware: jest.fn((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    try {
      req.user = mockJwtAuth.verifyToken(token);
      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  })
};

/**
 * Mock AI Analysis Pipeline
 */
const mockAiAnalysisPipeline = {
  analyzeContract: jest.fn().mockResolvedValue({
    vulnerabilities: [
      {
        name: 'Reentrancy Vulnerability',
        severity: 'high',
        category: 'reentrancy',
        description: 'External call before state change allows reentrancy attacks',
        affectedLines: [8, 9, 10],
        recommendation: 'Use checks-effects-interactions pattern or ReentrancyGuard'
      }
    ],
    overallScore: 75,
    riskLevel: 'Medium',
    metadata: {
      analysisMode: 'comprehensive',
      executionTime: 3000,
      agentsUsed: ['security']
    }
  }),
  
  getAvailableAgents: jest.fn().mockReturnValue([
    { id: 'security', name: 'Security Analyzer', description: 'Detects security vulnerabilities' },
    { id: 'quality', name: 'Quality Analyzer', description: 'Analyzes code quality' },
    { id: 'defi', name: 'DeFi Analyzer', description: 'Specialized DeFi analysis' }
  ])
};

/**
 * Mock Multi-Chain Web3 Service
 */
const mockMultiChainWeb3Service = {
  verifyContract: jest.fn().mockResolvedValue({
    isVerified: true,
    sourceCode: 'contract MockContract { }',
    contractName: 'MockContract',
    compilerVersion: '0.8.19',
    abi: []
  }),
  
  getSupportedChains: jest.fn().mockReturnValue({
    ethereum: { name: 'Ethereum', chainId: 1, type: 'evm', ecosystem: 'ethereum' },
    polygon: { name: 'Polygon', chainId: 137, type: 'evm', ecosystem: 'ethereum' },
    arbitrum: { name: 'Arbitrum', chainId: 42161, type: 'layer2', ecosystem: 'ethereum' }
  }),
  
  getContract: jest.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890',
    name: 'MockContract',
    abi: [],
    bytecode: '0x608060405234801561001057600080fd5b50...'
  }),

  getContractFromAddress: jest.fn().mockResolvedValue({
    address: '0x1234567890123456789012345678901234567890',
    chain: 'ethereum',
    chainId: 1,
    chainType: 'evm',
    ecosystem: 'ethereum',
    bytecode: '0x608060405234801561001057600080fd5b50',
    balance: '0.0',
    sourceCode: {
      sourceCode: 'contract MockContract { }',
      contractName: 'MockContract',
      compilerVersion: '0.8.19'
    },
    crossChainAnalysis: {
      deployedChains: [],
      potentialBridge: false,
      crossChainRisks: [],
      ecosystems: ['ethereum']
    },
    transactionCount: 100,
    recentActivity: {
      transactions: [],
      lastActivity: new Date().toISOString()
    },
    fetchedAt: new Date().toISOString()
  }),

  monitorEvents: jest.fn().mockResolvedValue([
    {
      address: '0x1234567890123456789012345678901234567890',
      topics: ['0x' + 'a'.repeat(64)],
      data: '0x' + 'b'.repeat(128),
      blockNumber: 18500000,
      transactionHash: '0x' + 'c'.repeat(64)
    }
  ]),

  providers: {
    ethereum: {
      getTransaction: jest.fn().mockResolvedValue({
        hash: '0x' + 'c'.repeat(64),
        to: '0x1234567890123456789012345678901234567890',
        from: '0x' + 'd'.repeat(40),
        value: '1000000000000000000',
        gasLimit: '21000',
        gasPrice: '20000000000'
      })
    }
  }
};

/**
 * Mock Real-Time Development Service
 */
const mockRealTimeDevelopmentService = {
  processCodeChange: jest.fn().mockResolvedValue({
    analysisId: 'analysis-123',
    instant: {
      syntaxValidation: { isValid: true, errors: [], warnings: [] },
      codeCompletion: { suggestions: [], context: 'unknown' },
      quickFeedback: [],
      vulnerabilityAlerts: []
    },
    deferred: {
      liveAnalysis: null,
      smartSuggestions: null
    },
    metadata: {
      changeType: 'edit',
      processingTime: 150
    }
  }),
  
  startDevelopmentSession: jest.fn().mockReturnValue({
    sessionId: 'session-123',
    userId: 'test-user-123',
    feedbackSessionId: 'feedback-123',
    detectionSessionId: 'detection-123',
    startedAt: new Date().toISOString()
  }),
  
  getStatus: jest.fn().mockReturnValue({
    activeSessions: 1,
    activeAnalyses: 0,
    queueSize: 0,
    serviceMetrics: {
      totalCodeChanges: 5,
      totalAnalyses: 3,
      averageResponseTime: 200,
      activeUsers: 1
    }
  }),
  
  getCodeCompletion: jest.fn().mockResolvedValue({
    suggestions: [
      {
        label: 'transfer',
        kind: 'function',
        detail: 'function transfer(address to, uint256 amount)',
        insertText: 'transfer()'
      }
    ],
    context: { type: 'member_access' }
  }),
  
  validateSyntax: jest.fn().mockResolvedValue({
    isValid: false,
    errors: [
      {
        line: 1,
        column: 1,
        message: 'Syntax error: unexpected token',
        severity: 'error'
      }
    ],
    warnings: []
  })
};

/**
 * Mock Team Collaboration Service
 */
const mockTeamCollaborationService = {
  createTeam: jest.fn().mockResolvedValue({
    id: 'team-123',
    name: 'Test Team',
    description: 'A test team',
    createdBy: 'test-user-123',
    createdAt: new Date().toISOString(),
    members: new Map([['test-user-123', { role: 'owner' }]]),
    settings: { requireCodeReview: true }
  }),
  
  startTeamAnalysis: jest.fn().mockResolvedValue({
    sessionId: 'analysis-session-123',
    teamId: 'team-123',
    status: 'active',
    config: { analysisType: 'comprehensive' },
    progress: { totalProjects: 2, analyzedProjects: 0 }
  }),
  
  startCodeReview: jest.fn().mockResolvedValue({
    id: 'review-123',
    teamId: 'team-123',
    title: 'Test Review',
    status: 'pending',
    reviewers: new Map([['reviewer-123', { status: 'pending' }]]),
    metrics: { linesChanged: 50 }
  })
};

/**
 * Mock ChainIDE Integration Service
 */
const mockChainIDEIntegrationService = {
  activeConnections: new Map(),
  workspaces: new Map(),
  pluginRegistry: new Map(),
  realtimeAnalysisQueue: new Map(),
  
  initialize: jest.fn().mockResolvedValue(undefined),
  
  createWorkspace: jest.fn().mockResolvedValue({
    workspaceId: 'workspace-123',
    name: 'Test Workspace',
    createdAt: new Date().toISOString(),
    collaborators: ['test-user-123']
  }),
  
  analyzeCode: jest.fn().mockResolvedValue({
    analysisId: 'analysis-123',
    instant: {
      syntaxValidation: { isValid: true, errors: [], warnings: [] },
      vulnerabilityAlerts: [],
      quickFeedback: []
    },
    metadata: { processingTime: 150 }
  }),

  handleMessage: jest.fn().mockImplementation(async (connectionId, data) => {
    try {
      const message = JSON.parse(data.toString());
      const connection = mockChainIDEIntegrationService.activeConnections.get(connectionId);
      
      if (!connection) {
        return;
      }

      switch (message.type) {
        case 'workspace:join':
          if (!connection.userId) {
            if (connection.ws && connection.ws.send) {
              connection.ws.send(JSON.stringify({
                type: 'error',
                error: 'Authentication required',
                id: message.id
              }));
            }
            return;
          }
          
          const workspace = {
            id: message.workspaceId,
            projectName: message.projectName,
            members: new Map(),
            contractFiles: new Map(),
            collaborativeState: {
              cursors: new Map()
            }
          };
          
          workspace.members.set(connection.userId, {
            connectionId,
            userId: connection.userId,
            role: 'owner'
          });
          
          if (message.contractFiles) {
            message.contractFiles.forEach(file => {
              workspace.contractFiles.set(file.path, file);
            });
          }
          
          mockChainIDEIntegrationService.workspaces.set(message.workspaceId, workspace);
          break;

        case 'analysis:realtime':
          // Add to queue
          const analysisId = `analysis_${Date.now()}`;
          mockChainIDEIntegrationService.realtimeAnalysisQueue.set(analysisId, {
            connectionId,
            contractCode: message.contractCode,
            filePath: message.filePath
          });
          break;

        case 'plugin:register':
          mockChainIDEIntegrationService.pluginRegistry.set(message.pluginId, {
            id: message.pluginId,
            name: message.pluginName,
            version: message.version
          });
          break;

        case 'collaboration:cursor':
          const ws = mockChainIDEIntegrationService.workspaces.get(connection.workspaceId);
          if (ws && ws.collaborativeState) {
            ws.collaborativeState.cursors.set(connection.userId, {
              userId: connection.userId,
              filePath: message.filePath,
              position: message.position
            });
          } else {
            // Send error for invalid workspace
            if (connection.ws && connection.ws.send) {
              connection.ws.send(JSON.stringify({
                type: 'error',
                error: 'Workspace not found',
                id: message.id
              }));
            }
          }
          break;

        case 'collaboration:edit':
          const editWs = mockChainIDEIntegrationService.workspaces.get(connection.workspaceId);
          if (editWs && editWs.contractFiles) {
            editWs.contractFiles.set(message.filePath, {
              path: message.filePath,
              content: message.content
            });
          }
          break;
      }
    } catch (error) {
      // Mock error handling
    }
  }),

  getServiceCapabilities: jest.fn().mockReturnValue({
    realtimeAnalysis: true,
    multiAgentSupport: true,
    collaborativeEditing: true,
    workspaceManagement: true,
    pluginSupport: true,
    supportedChains: ['ethereum', 'polygon', 'arbitrum'],
    supportedAgents: ['security', 'quality', 'defi'],
    builtInPlugins: [
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
      }
    ]
  }),

  getStatus: jest.fn().mockImplementation(() => ({
    isRunning: true,
    activeConnections: mockChainIDEIntegrationService.activeConnections.size,
    activeWorkspaces: mockChainIDEIntegrationService.workspaces.size,
    registeredPlugins: mockChainIDEIntegrationService.pluginRegistry.size,
    queuedAnalyses: mockChainIDEIntegrationService.realtimeAnalysisQueue.size
  })),

  generateConnectionId: jest.fn().mockReturnValue('conn_123'),

  broadcastToWorkspace: jest.fn().mockImplementation((workspaceId, message, excludeConnectionId) => {
    const workspace = mockChainIDEIntegrationService.workspaces.get(workspaceId);
    if (!workspace) return;

    workspace.members.forEach((member, userId) => {
      if (member.connectionId !== excludeConnectionId && member.isActive) {
        const connection = mockChainIDEIntegrationService.activeConnections.get(member.connectionId);
        if (connection && connection.ws && connection.ws.send) {
          connection.ws.send(JSON.stringify(message));
        }
      }
    });
  }),

  handleDisconnection: jest.fn().mockImplementation((connectionId) => {
    mockChainIDEIntegrationService.activeConnections.delete(connectionId);
  }),

  cleanup: jest.fn().mockImplementation(() => {
    mockChainIDEIntegrationService.activeConnections.clear();
    mockChainIDEIntegrationService.workspaces.clear();
    mockChainIDEIntegrationService.pluginRegistry.clear();
    mockChainIDEIntegrationService.realtimeAnalysisQueue.clear();
  })
};

/**
 * Mock Real-Time Monitoring Service
 */
const mockRealTimeMonitoringService = {
  startMonitoring: jest.fn().mockResolvedValue({
    monitorId: 'monitor-123',
    contractAddress: '0x1234567890123456789012345678901234567890',
    status: 'active',
    chain: 'ethereum',
    startedAt: new Date().toISOString()
  }),
  
  stopMonitoring: jest.fn().mockResolvedValue({
    success: true,
    monitorId: 'monitor-123',
    stoppedAt: new Date().toISOString()
  }),
  
  getStatus: jest.fn().mockReturnValue({
    activeMonitors: 1,
    totalContracts: 5,
    alertsGenerated: 10
  })
};

/**
 * Mock Contract Parser Service
 */
const mockContractParser = {
  parseContract: jest.fn().mockResolvedValue({
    functions: [
      {
        name: 'setValue',
        visibility: 'public',
        stateMutability: null,
        parameters: [],
        returnParameters: [],
        modifiers: [],
        location: { start: { line: 7, column: 8 }, end: { line: 9, column: 8 } },
        isExternal: false,
        isPayable: false
      }
    ],
    events: [],
    modifiers: [],
    stateVariables: [],
    findings: [
      {
        category: 'integerOverflow',
        severity: 'medium',
        message: 'Potential integer overflow detected',
        line: 5
      }
    ],
    codeMetrics: {
      totalLines: 48,
      codeLines: 35,
      commentLines: 0,
      complexity: 1,
      size: 1898,
      functionCount: 1,
      modifierCount: 0,
      eventCount: 0
    },
    ast: {},
    metadata: {
      compiler: 'solc',
      version: '0.8.19'
    }
  })
};

/**
 * Mock Syntax Validation Service
 */
const mockSyntaxValidationService = {
  validateSyntax: jest.fn().mockResolvedValue({
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  })
};

/**
 * Mock Live Vulnerability Detector
 */
const mockLiveVulnerabilityDetector = {
  startDetectionSession: jest.fn().mockReturnValue('detection-session-123'),
  
  performLiveDetection: jest.fn().mockResolvedValue({
    sessionId: 'detection-session-123',
    vulnerabilities: [],
    alerts: [],
    summary: {
      totalVulnerabilities: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0,
      confidence: 0
    },
    metadata: {
      detectionTime: 50,
      methodsUsed: ['pattern']
    }
  }),
  
  endDetectionSession: jest.fn()
};

/**
 * Mock Code Completion Engine
 */
const mockCodeCompletionEngine = {
  getCompletions: jest.fn().mockResolvedValue({
    suggestions: [
      {
        label: 'transfer',
        kind: 'method',
        detail: 'function transfer(address to, uint256 amount)'
      }
    ],
    context: { type: 'member_access' },
    timestamp: new Date().toISOString()
  })
};

/**
 * Setup all service mocks
 */
function setupServiceMocks() {
  // Mock JWT Auth
  jest.mock('../../src/middleware/jwtAuth', () => mockJwtAuth);
  
  // Mock AI Services
  jest.mock('../../src/services/aiAnalysisPipeline', () => mockAiAnalysisPipeline);
  
  // Mock Web3 Services
  jest.mock('../../src/services/multiChainWeb3Service', () => mockMultiChainWeb3Service);
  
  // Mock Development Services
  jest.mock('../../src/services/realTimeDevelopmentService', () => mockRealTimeDevelopmentService);
  jest.mock('../../src/services/syntaxValidationService', () => mockSyntaxValidationService);
  jest.mock('../../src/services/liveVulnerabilityDetector', () => mockLiveVulnerabilityDetector);
  jest.mock('../../src/services/codeCompletionEngine', () => mockCodeCompletionEngine);
  
  // Mock Collaboration Services
  jest.mock('../../src/services/teamCollaborationService', () => mockTeamCollaborationService);
  jest.mock('../../src/services/chainIDEIntegrationService', () => mockChainIDEIntegrationService);
  
  // Mock Monitoring Services
  jest.mock('../../src/services/realTimeMonitoringService', () => mockRealTimeMonitoringService);
  
  // Mock Parser Services
  jest.mock('../../src/services/contractParser', () => mockContractParser);
  
  // Mock audit engine
  jest.mock('../../src/services/auditEngine', () => ({
    performComprehensiveAudit: jest.fn().mockResolvedValue({
      auditId: 'audit-123',
      contractName: 'TestContract',
      vulnerabilities: [],
      overallScore: 85,
      riskLevel: 'Low'
    }),
    getAuditResults: jest.fn().mockResolvedValue({
      auditId: 'audit-123',
      contractName: 'TestContract',
      vulnerabilities: [],
      overallScore: 85,
      riskLevel: 'Low'
    }),
    getAuditHistory: jest.fn().mockResolvedValue({
      audits: [],
      total: 0
    }),
    generateReport: jest.fn().mockResolvedValue({
      format: 'json',
      data: {}
    })
  }));
  
  // Mock advanced rate limiter
  jest.mock('../../src/middleware/advancedRateLimiter', () => ({
    createRateLimitMiddleware: jest.fn(() => (req, res, next) => next()),
    createEndpointLimiter: jest.fn(() => (req, res, next) => next()),
    getRateLimitStatus: jest.fn().mockResolvedValue({}),
    resetRateLimit: jest.fn().mockResolvedValue(true)
  }));
}

/**
 * Reset all mocks
 */
function resetServiceMocks() {
  Object.values(mockJwtAuth).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
  
  Object.values(mockAiAnalysisPipeline).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
  
  Object.values(mockMultiChainWeb3Service).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
  
  Object.values(mockRealTimeDevelopmentService).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
  
  Object.values(mockTeamCollaborationService).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
  
  Object.values(mockChainIDEIntegrationService).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
  
  Object.values(mockRealTimeMonitoringService).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
  
  Object.values(mockContractParser).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
}

module.exports = {
  mockJwtAuth,
  mockAiAnalysisPipeline,
  mockMultiChainWeb3Service,
  mockRealTimeDevelopmentService,
  mockTeamCollaborationService,
  mockChainIDEIntegrationService,
  mockRealTimeMonitoringService,
  mockContractParser,
  mockSyntaxValidationService,
  mockLiveVulnerabilityDetector,
  mockCodeCompletionEngine,
  setupServiceMocks,
  resetServiceMocks
};