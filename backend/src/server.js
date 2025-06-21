const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const _path = require('path');

// Load environment variables
dotenv.config();

// Import middleware
const rateLimiter = require('./middleware/rateLimiter');
const jwtAuth = require('./middleware/jwtAuth');
const _advancedRateLimiter = require('./middleware/advancedRateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import services
const realTimeMonitoringService = require('./services/realTimeMonitoringService');
const analyticsService = require('./services/analyticsService');
const chainIDEIntegrationService = require('./services/chainIDEIntegrationService');
const _collaborativeWorkspaceManager = require('./services/collaborativeWorkspaceManager');
const realTimeDevelopmentService = require('./services/realTimeDevelopmentService');
const teamCollaborationService = require('./services/teamCollaborationService');
const sharedWorkspaceAnalytics = require('./services/sharedWorkspaceAnalytics');
const { initializeDatabase } = require('./models');

// Import routes
const auditRoutes = require('./controllers/auditController');
const enhancedAuditRoutes = require('./controllers/enhancedAuditController');
const chainIDERoutes = require('./controllers/chainIDEController');
const realTimeDevelopmentRoutes = require('./controllers/realTimeDevelopmentController');
const collaborativeToolsRoutes = require('./controllers/collaborativeToolsController');
const pitchRoutes = require('./controllers/pitchController');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with enhanced production settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc: ['\'self\'', 'https://api.openrouter.ai'],
      fontSrc: ['\'self\'', 'https:', 'data:'],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\'']
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for API integrations
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware with enhanced security
app.use(express.json({
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 100
}));

// Input sanitization middleware
app.use((req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
});

// Helper function to sanitize objects recursively
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  return sanitized;
}

// Helper function to sanitize strings
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit string length
}

// Rate limiting
app.use(rateLimiter);

// Performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;

    // Log request with performance metrics
    logger.info(`${req.method} ${req.path} - ${req.ip}`, {
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length') || 0
    });

    // Log slow requests
    if (responseTime > 5000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        responseTime: `${responseTime}ms`,
        ip: req.ip
      });
    }

    originalEnd.apply(this, args);
  };

  next();
});

// Health check endpoint with enhanced monitoring
app.get('/health', async (req, res) => {
  try {
    const monitoringStatus = realTimeMonitoringService.getMonitoringStatus();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        monitoring: {
          status: monitoringStatus.isRunning ? 'active' : 'inactive',
          monitoredContracts: monitoringStatus.monitoredContracts,
          activeConnections: monitoringStatus.activeConnections
        },
        analytics: {
          status: 'active',
          cacheSize: analyticsService.metricsCache.size
        }
      }
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        monitoring: { status: 'unknown' },
        analytics: { status: 'unknown' }
      }
    });
  }
});

// Readiness probe for Kubernetes/Docker
app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Liveness probe for Kubernetes/Docker
app.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/audit', auditRoutes);
app.use('/api/v1/contracts', enhancedAuditRoutes);
app.use('/api/v1/ai', enhancedAuditRoutes);
app.use('/api/v1/defi', enhancedAuditRoutes);
app.use('/api/v1/chains', enhancedAuditRoutes);
app.use('/api/v1/agents', enhancedAuditRoutes);
app.use('/api/v1/user', enhancedAuditRoutes);
app.use('/api/v1/auth', enhancedAuditRoutes);
app.use('/api/v1/chainide', chainIDERoutes);
app.use('/api/v1/realtime', realTimeDevelopmentRoutes);
app.use('/api/v1/collaboration', collaborativeToolsRoutes);
app.use('/api/pitch', pitchRoutes);

// Analytics endpoint
app.get('/api/v1/analytics/dashboard',
  jwtAuth.optionalAuth,
  async (req, res) => {
    try {
      const { timeRange = '30d', includePredicitions = true } = req.query;
      const userId = req.user?.id;

      const dashboard = await analyticsService.generateDashboardAnalytics({
        timeRange,
        userId,
        includePredicitions: includePredicitions === 'true'
      });

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Failed to generate analytics dashboard', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate analytics dashboard'
      });
    }
  }
);

// Monitoring endpoints
app.post('/api/v1/monitoring/start',
  jwtAuth.authenticate,
  jwtAuth.authorize(['admin', 'enterprise']),
  async (req, res) => {
    try {
      const { contractAddress, chain = 'ethereum', ...options } = req.body;

      if (!contractAddress) {
        return res.status(400).json({
          success: false,
          error: 'Contract address is required'
        });
      }

      const result = await realTimeMonitoringService.startMonitoring(contractAddress, { chain, ...options });
      res.json({
        success: true,
        message: 'Real-time monitoring started',
        data: result
      });
    } catch (error) {
      logger.error('Failed to start monitoring', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to start monitoring'
      });
    }
  }
);

app.post('/api/v1/monitoring/stop',
  jwtAuth.authenticate,
  jwtAuth.authorize(['admin', 'enterprise']),
  async (req, res) => {
    try {
      await realTimeMonitoringService.stopMonitoring();
      res.json({
        success: true,
        message: 'Real-time monitoring stopped'
      });
    } catch (error) {
      logger.error('Failed to stop monitoring', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to stop monitoring'
      });
    }
  }
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: [
    'GET /health',
    'POST /api/pitch/evaluate',
    'GET /api/pitch/models',
    'GET /api/pitch/health',
    'POST /api/audit/contract',
    'POST /api/audit/address',
    'GET /api/audit/history',
    'POST /api/v1/contracts/analyze',
    'POST /api/v1/contracts/analyze-address',
    'POST /api/v1/ai/multi-agent-analysis',
    'POST /api/v1/defi/analyze',
    'GET /api/v1/chains/supported',
    'GET /api/v1/agents/available',
    'GET /api/v1/analytics/dashboard',
    'POST /api/v1/chainide/workspaces',
    'POST /api/v1/chainide/code/analyze',
    'GET /api/v1/chainide/capabilities',
    'GET /api/v1/chainide/sdk',
    'POST /api/v1/realtime/code/analyze',
    'POST /api/v1/realtime/completion',
    'POST /api/v1/realtime/validate',
    'POST /api/v1/realtime/session/start',
    'GET /api/v1/realtime/capabilities',
    'POST /api/v1/collaboration/teams',
    'POST /api/v1/collaboration/teams/:teamId/analysis',
    'POST /api/v1/collaboration/realtime-reviews',
    'GET /api/v1/collaboration/workspaces/:workspaceId/analytics',
    'GET /api/v1/collaboration/capabilities'
    ],
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    // Stop real-time monitoring
    if (realTimeMonitoringService.isRunning) {
      await realTimeMonitoringService.stopMonitoring();
      logger.info('Real-time monitoring stopped');
    }

    // Clear analytics cache
    analyticsService.metricsCache.clear();
    logger.info('Analytics cache cleared');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
}

// Process event handlers for production
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Attempt graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });

  // Attempt graceful shutdown
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle warnings
process.on('warning', (warning) => {
  logger.warn('Process Warning', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
    timestamp: new Date().toISOString()
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing enhanced services...');

    // Initialize database
    const dbInitialized = await initializeDatabase();
    if (dbInitialized) {
      logger.info('Database initialized successfully');
    } else {
      logger.warn('Database initialization failed, continuing without persistence');
    }

    // Initialize ChainIDE integration service
    if (process.env.ENABLE_CHAINIDE_INTEGRATION !== 'false') {
      try {
        await chainIDEIntegrationService.initialize({
          port: process.env.CHAINIDE_WS_PORT || 8080,
          enableRealTimeAnalysis: true,
          enableCollaboration: true
        });
        logger.info('ChainIDE integration service initialized');
      } catch (error) {
        logger.error('Failed to initialize ChainIDE integration service', { error: error.message });
      }
    }

    // Initialize real-time development service
    try {
      await realTimeDevelopmentService.initialize({
        enableSyntaxValidation: true,
        enableLiveAnalysis: true,
        enableCodeCompletion: true,
        enableSmartSuggestions: true
      });
      logger.info('Real-time development service initialized');
    } catch (error) {
      logger.error('Failed to initialize real-time development service', { error: error.message });
    }

    // Initialize team collaboration service
    try {
      await teamCollaborationService.initialize({
        maxTeamSize: 50,
        maxConcurrentReviews: 10,
        enableRealTimeNotifications: true,
        enableTeamAnalytics: true,
        autoAssignReviewers: true
      });
      logger.info('Team collaboration service initialized');
    } catch (error) {
      logger.error('Failed to initialize team collaboration service', { error: error.message });
    }

    // Initialize shared workspace analytics
    try {
      await sharedWorkspaceAnalytics.initialize({
        metricsRetentionDays: 90,
        realTimeUpdateInterval: 30000,
        enableDetailedTracking: true,
        enableUserPrivacy: true
      });
      logger.info('Shared workspace analytics initialized');
    } catch (error) {
      logger.error('Failed to initialize shared workspace analytics', { error: error.message });
    }

    // Initialize real-time monitoring if enabled
    if (process.env.ENABLE_REAL_TIME_MONITORING === 'true') {
      await realTimeMonitoringService.initialize({
        autoStart: true,
        enableMEVDetection: true,
        enableAnomalyDetection: true
      });
      logger.info('Real-time monitoring service initialized');
    }

    logger.info('All enhanced services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
    // Don't exit, continue with basic functionality
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info(`Enhanced Smart Contract Auditor Backend running on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    version: '2.0.0',
    features: [
      'Multi-Agent AI Analysis',
      'Multi-Chain Support',
      'DeFi Specialized Analysis',
      'Real-Time Monitoring',
      'Advanced Analytics',
      'JWT Authentication',
      'Advanced Rate Limiting',
      'ChainIDE Integration',
      'Collaborative Development',
      'Real-Time Code Analysis',
      'Plugin Architecture',
      'Instant Feedback System',
      'Live Vulnerability Detection',
      'Advanced Code Completion',
      'Syntax Validation Engine',
      'Team Collaboration Tools',
      'Real-Time Code Reviews',
      'Shared Workspace Analytics',
      'Multi-User Development'
    ],
    timestamp: new Date().toISOString(),
  });

  // Initialize enhanced services
  await initializeServices();
});

module.exports = app;
