const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');
const mongoDBService = require('../database/mongodb');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL?.replace('sqlite:', '') || './data/auditor.db',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  define: {
    timestamps: true,
    underscored: false,
  },
});

// Define Models
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'premium', 'enterprise', 'admin'),
    defaultValue: 'user'
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: ['read']
  },
  apiKeyHash: DataTypes.STRING,
  lastLogin: DataTypes.DATE,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscriptionTier: {
    type: DataTypes.STRING,
    defaultValue: 'free'
  },
  rateLimitTier: {
    type: DataTypes.STRING,
    defaultValue: 'standard'
  }
});

const VulnerabilityPattern = sequelize.define('VulnerabilityPattern', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patternName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  patternType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  detectionRules: {
    type: DataTypes.JSON,
    allowNull: false
  },
  codePatterns: DataTypes.JSON,
  chainSpecific: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  supportedChains: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  confidenceThreshold: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.7
  },
  falsePositiveRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.1
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  successRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0
  }
});

const AIAnalysisResult = sequelize.define('AIAnalysisResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  analysisId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  contractAddress: DataTypes.STRING(42),
  contractCodeHash: DataTypes.STRING(64),
  chainId: DataTypes.INTEGER,
  chainName: DataTypes.STRING(50),
  analysisType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  agentsUsed: {
    type: DataTypes.JSON,
    allowNull: false
  },
  failedAgents: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  overallScore: {
    type: DataTypes.INTEGER,
    validate: { min: 0, max: 100 }
  },
  riskLevel: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical')
  },
  confidenceScore: DataTypes.DECIMAL(3, 2),
  vulnerabilitiesFound: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  vulnerabilities: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  recommendations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  gasOptimizations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  codeQuality: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  executionTimeMs: DataTypes.INTEGER,
  analysisVersion: DataTypes.STRING(20),
  modelVersions: DataTypes.JSON,
  aggregationMethod: DataTypes.STRING(50),
  completedAt: DataTypes.DATE
});

const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  address: {
    type: DataTypes.STRING(42),
    allowNull: false
  },
  chainId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  chainName: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  name: DataTypes.STRING,
  compilerVersion: DataTypes.STRING(50),
  optimizationUsed: DataTypes.BOOLEAN,
  sourceCode: DataTypes.TEXT,
  bytecode: DataTypes.TEXT,
  abi: DataTypes.JSON,
  deploymentBlock: DataTypes.INTEGER,
  deploymentTimestamp: DataTypes.DATE,
  creatorAddress: DataTypes.STRING(42),
  transactionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  firstAnalyzedAt: DataTypes.DATE,
  lastAnalyzedAt: DataTypes.DATE,
  analysisCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isDeFi: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isCrossChain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasMevRisk: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  protocolType: DataTypes.STRING(100),
  complexityScore: DataTypes.INTEGER,
  sourceVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cacheExpiresAt: DataTypes.DATE
}, {
  indexes: [
    {
      unique: true,
      fields: ['address', 'chainId'],
      name: 'unique_contract_address_chain'
    }
  ]
});

const VulnerabilityInstance = sequelize.define('VulnerabilityInstance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  confidence: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false
  },
  affectedLines: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  codeSnippet: DataTypes.TEXT,
  functionName: DataTypes.STRING,
  detectedBy: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  detectionMethod: DataTypes.STRING(100),
  impactDescription: DataTypes.TEXT,
  exploitScenario: DataTypes.TEXT,
  fixRecommendation: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM('open', 'acknowledged', 'fixed', 'false_positive'),
    defaultValue: 'open'
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  activityType: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  resourceType: DataTypes.STRING(100),
  resourceId: DataTypes.UUID,
  activityData: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  ipAddress: DataTypes.STRING,
  userAgent: DataTypes.TEXT,
  creditsConsumed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Define Associations
User.hasMany(AIAnalysisResult, { foreignKey: 'userId' });
AIAnalysisResult.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(VulnerabilityPattern, { foreignKey: 'createdBy' });
VulnerabilityPattern.belongsTo(User, { foreignKey: 'createdBy' });

Contract.hasMany(AIAnalysisResult, { foreignKey: 'contractId' });
AIAnalysisResult.belongsTo(Contract, { foreignKey: 'contractId' });

AIAnalysisResult.hasMany(VulnerabilityInstance, { foreignKey: 'analysisResultId' });
VulnerabilityInstance.belongsTo(AIAnalysisResult, { foreignKey: 'analysisResultId' });

VulnerabilityPattern.hasMany(VulnerabilityInstance, { foreignKey: 'patternId' });
VulnerabilityInstance.belongsTo(VulnerabilityPattern, { foreignKey: 'patternId' });

Contract.hasMany(VulnerabilityInstance, { foreignKey: 'contractId' });
VulnerabilityInstance.belongsTo(Contract, { foreignKey: 'contractId' });

User.hasMany(UserActivity, { foreignKey: 'userId' });
UserActivity.belongsTo(User, { foreignKey: 'userId' });

// Add unique constraint for contract address + chain combination
Contract.addIndex = undefined; // Remove invalid reference

// Database initialization
async function initializeDatabase() {
  try {
    // Initialize SQLite for structured data
    await sequelize.authenticate();
    logger.info('SQLite database connection established successfully');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('SQLite database synchronized');
    }

    // Initialize MongoDB for audit results and analytics
    if (process.env.USE_MONGODB === 'true') {
      const mongoInitialized = await mongoDBService.initialize();
      if (mongoInitialized) {
        logger.info('MongoDB connection established successfully');
        // Create indexes for optimization
        await mongoDBService.createIndexes();
      } else {
        logger.warn('MongoDB initialization failed, continuing with SQLite only');
      }
    }

    return true;
  } catch (error) {
    logger.error('Unable to connect to database', { error: error.message });
    return false;
  }
}

module.exports = {
  sequelize,
  mongoDBService,
  User,
  VulnerabilityPattern,
  AIAnalysisResult,
  Contract,
  VulnerabilityInstance,
  UserActivity,
  initializeDatabase
};
