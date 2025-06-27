const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import Supabase-based controllers and services
const unifiedAuditController = require('./controllers/auditController');
const chainIDEController = require('./controllers/chainIDEController');
const realTimeDevelopmentController = require('./controllers/realTimeDevelopmentController');
const collaborativeToolsController = require('./controllers/collaborativeToolsController');
const pitchController = require('./controllers/pitchController');
const monitoringController = require('./controllers/monitoringController');
const supabaseService = require('./services/supabaseService');
const supabaseAuth = require('./middleware/supabaseAuth');
const logger = require('./utils/logger');

// Import existing services that we still need
const realTimeMonitoringService = require('./services/realTimeMonitoringService');
const analyticsService = require('./services/analyticsService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc: ['\'self\'', 'https://api.openrouter.ai', 'https://gqdbmvtgychgwztlbaus.supabase.co', 'wss://gqdbmvtgychgwztlbaus.supabase.co'],
      fontSrc: ['\'self\'', 'https:', 'data:'],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\'']
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration for Supabase integration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'apikey'],
}));

// Body parsing middleware
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

// Logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check Supabase connection
    const { data, error } = await supabaseService.admin
      .from('users')
      .select('count')
      .limit(1);

    const supabaseStatus = error ? 'disconnected' : 'connected';

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0-supabase',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        supabase: {
          status: supabaseStatus,
          url: process.env.SUPABASE_URL
        },
        aiModels: {
          status: 'active',
          models: ['kimi-dev-72b', 'gemma-2-3b-it']
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes using Supabase-only architecture
app.use('/api/audit', unifiedAuditController);
app.use('/api/v1/contracts', unifiedAuditController);
app.use('/api/v1/ai', unifiedAuditController);
app.use('/api/v1/defi', unifiedAuditController);
app.use('/api/v1/chains', unifiedAuditController);
app.use('/api/v1/agents', unifiedAuditController);
app.use('/api/v1/user', unifiedAuditController);
app.use('/api/v1/auth', unifiedAuditController);

// Update other controllers to use Supabase auth
app.use('/api/v1/chainide', chainIDEController);
app.use('/api/v1/realtime', realTimeDevelopmentController);
app.use('/api/v1/collaboration', collaborativeToolsController);
app.use('/api/pitch', pitchController);

// Monitoring routes
app.get('/api/contracts/:id/monitoring', monitoringController.getMonitoringEvents);
app.post('/api/contracts/:id/monitoring/flag', monitoringController.flagMonitoringEvent);

// Legacy monitoring endpoints (still using existing services)
app.post('/api/v1/monitoring/start', async (req, res) => {
  try {
    const { contractAddress, chain = 'ethereum', ...options } = req.body;
    
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Contract address is required'
      });
    }

    // Get user from Supabase auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseService.client.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication'
      });
    }

    // Create monitoring session in Supabase
    const sessionResult = await supabaseService.createMonitoringSession({
      user_id: user.id,
      contract_address: contractAddress,
      chain,
      status: 'active',
      configuration: options
    });

    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create monitoring session'
      });
    }

    // Start monitoring with existing service
    const result = await realTimeMonitoringService.startMonitoring(contractAddress, { chain, ...options });
    
    res.json({
      success: true,
      message: 'Real-time monitoring started',
      data: {
        session: sessionResult.data,
        monitoring: result
      }
    });
  } catch (error) {
    logger.error('Failed to start monitoring', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring'
    });
  }
});

// Analytics endpoint with Supabase integration
app.get('/api/v1/analytics/dashboard', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Get user from auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseService.client.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication'
      });
    }

    // Get analytics from Supabase
    const analyticsResult = await supabaseService.getAnalytics(user.id, timeRange);
    const apiUsageResult = await supabaseService.getApiUsage(user.id, timeRange);
    const auditResults = await supabaseService.getUserAuditResults(user.id, 100, 0);

    const dashboard = {
      user: {
        id: user.id,
        email: user.email
      },
      analytics: analyticsResult.data || [],
      apiUsage: apiUsageResult.data || [],
      auditStats: {
        total: auditResults.data?.length || 0,
        completed: auditResults.data?.filter(a => a.status === 'completed').length || 0,
        pending: auditResults.data?.filter(a => a.status === 'processing').length || 0,
        failed: auditResults.data?.filter(a => a.status === 'failed').length || 0
      },
      timeRange
    };

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
});

// AI model status endpoint
app.get('/api/v1/ai/models/status', (req, res) => {
  res.json({
    success: true,
    models: {
      primary: {
        name: 'Kimi Dev 72b',
        model: 'moonshot/kimi-dev-72b',
        status: 'active',
        usage: 'Security analysis, DeFi risks, Cross-chain analysis'
      },
      secondary: {
        name: 'Google Gemma',
        model: 'google/gemma-2-3b-it',
        status: 'active',
        usage: 'Code quality, Gas optimization'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /health',
      'POST /api/contracts/upload',
      'GET /api/contracts/:contractId/results',
      'POST /api/contracts/analyze-address',
      'GET /api/audit/history',
      'GET /api/contracts',
      'POST /api/ai/multi-agent-analysis',
      'POST /api/v1/monitoring/start',
      'GET /api/v1/analytics/dashboard',
      'GET /api/v1/ai/models/status'
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Stop real-time monitoring if running
    if (realTimeMonitoringService.isRunning) {
      await realTimeMonitoringService.stopMonitoring();
      logger.info('Real-time monitoring stopped');
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
}

// Process event handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
async function startServer() {
  try {
    // Test Supabase connection (non-blocking)
    try {
      const { data, error } = await supabaseService.admin
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        logger.warn('Supabase connection test failed:', error.message);
        logger.warn('Server will continue without database verification');
      } else {
        logger.info('Supabase connection successful');
      }
    } catch (dbError) {
      logger.warn('Database connection test failed:', dbError.message);
      logger.warn('Server will continue without database verification');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Supabase-powered Flash Audit server running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🗄️  Database: Supabase (${process.env.SUPABASE_URL})`);
      logger.info(`🤖 AI Models: Kimi Dev 72b, Google Gemma`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize server
if (require.main === module) {
  startServer();
}

module.exports = app;