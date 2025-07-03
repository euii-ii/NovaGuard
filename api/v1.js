const express = require('express');
const { logger, notFound } = require('./middleware');
const { errorMiddleware } = require('./services/ErrorHandler');

// Import route handlers
const projectRoutes = require('./projects');
const contractRoutes = require('./contracts/upload');
const auditRoutes = require('./audit');
const analyticsRoutes = require('./analytics/dashboard');
const collaborationRoutes = require('./collaboration/workspace');

// Create an Express router
const router = express.Router();

// --- Core Middleware ---
router.use(express.json({ limit: '5mb' })); // Support larger contract uploads
router.use(logger); // Log all incoming requests

// --- API Routes ---
// Define routes for each resource
router.use('/projects', projectRoutes);
router.use('/contracts', contractRoutes);
router.use('/audit', auditRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/collaboration', collaborationRoutes);

// --- Health Check ---
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API v1 is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// --- Error Handling ---
// Handle requests to undefined routes
router.use(notFound);

// Centralized error handling middleware
router.use(errorMiddleware);

module.exports = router;