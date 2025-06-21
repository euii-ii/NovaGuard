const mongoose = require('mongoose');

// Audit Result Schema for MongoDB
const auditResultSchema = new mongoose.Schema({
  auditId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  contractAddress: {
    type: String,
    required: true,
    index: true
  },
  chain: {
    type: String,
    required: true,
    index: true
  },
  chainId: {
    type: Number,
    required: true
  },
  contractInfo: {
    name: String,
    symbol: String,
    compilerVersion: String,
    optimizationUsed: Boolean,
    sourceVerified: Boolean,
    deploymentBlock: Number,
    deploymentTimestamp: Date,
    creatorAddress: String
  },
  analysisType: {
    type: String,
    required: true,
    enum: ['basic', 'enhanced', 'multi-agent', 'defi', 'cross-chain']
  },
  agentsUsed: [{
    name: String,
    version: String,
    model: String,
    executionTime: Number,
    success: Boolean,
    errorMessage: String
  }],
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical']
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  vulnerabilities: [{
    name: String,
    description: String,
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical']
    },
    category: String,
    confidence: Number,
    affectedLines: [Number],
    codeSnippet: String,
    functionName: String,
    detectedBy: String,
    impactDescription: String,
    exploitScenario: String,
    fixRecommendation: String,
    cweId: String,
    swcId: String
  }],
  gasOptimizations: [{
    type: String,
    description: String,
    estimatedSavings: Number,
    affectedLines: [Number],
    codeSnippet: String,
    recommendation: String
  }],
  codeQuality: {
    complexity: Number,
    maintainability: Number,
    readability: Number,
    testCoverage: Number,
    documentation: Number,
    bestPractices: Number
  },
  defiAnalysis: {
    protocolType: String,
    liquidityRisks: [String],
    flashLoanVulnerabilities: [String],
    oracleRisks: [String],
    governanceRisks: [String],
    economicRisks: [String],
    mevRisks: [String]
  },
  crossChainAnalysis: {
    bridgeRisks: [String],
    consensusRisks: [String],
    validatorRisks: [String],
    interoperabilityIssues: [String]
  },
  executionMetrics: {
    totalExecutionTime: Number,
    agentExecutionTimes: Object,
    memoryUsage: Number,
    cpuUsage: Number,
    apiCalls: Number
  },
  metadata: {
    analysisVersion: String,
    modelVersions: Object,
    aggregationMethod: String,
    userId: String,
    userTier: String,
    requestId: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true,
  collection: 'auditresults'
});

// Analytics Event Schema
const analyticsEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  sessionId: String,
  contractAddress: String,
  chain: String,
  eventData: {
    type: Object,
    default: {}
  },
  metrics: {
    responseTime: Number,
    memoryUsage: Number,
    cpuUsage: Number,
    errorCount: Number,
    successCount: Number
  },
  userContext: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    location: Object
  }
}, {
  timestamps: true,
  collection: 'analytics'
});

// User Session Schema for MongoDB
const userSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userTier: String,
  sessionData: {
    type: Object,
    default: {}
  },
  activities: [{
    timestamp: Date,
    action: String,
    resource: String,
    metadata: Object
  }],
  metrics: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    totalExecutionTime: { type: Number, default: 0 },
    creditsConsumed: { type: Number, default: 0 }
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  collection: 'usersessions'
});

// Real-time Monitoring Data Schema
const monitoringDataSchema = new mongoose.Schema({
  contractAddress: {
    type: String,
    required: true,
    index: true
  },
  chain: {
    type: String,
    required: true,
    index: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  transactionHash: String,
  eventType: {
    type: String,
    required: true,
    enum: ['transaction', 'event', 'anomaly', 'mev', 'security_alert']
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  data: {
    type: Object,
    required: true
  },
  analysis: {
    riskScore: Number,
    anomalyDetected: Boolean,
    mevDetected: Boolean,
    securityAlert: Boolean,
    recommendations: [String]
  }
}, {
  timestamps: true,
  collection: 'monitoringdata'
});

// Create models
const AuditResult = mongoose.model('AuditResult', auditResultSchema);
const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
const UserSession = mongoose.model('UserSession', userSessionSchema);
const MonitoringData = mongoose.model('MonitoringData', monitoringDataSchema);

module.exports = {
  AuditResult,
  AnalyticsEvent,
  UserSession,
  MonitoringData
};
