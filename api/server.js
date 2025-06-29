require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API routes
const projectsHandler = require('./projects');
const healthHandler = require('./health');
const vulnerabilityScanHandler = require('./v1/vulnerability/scan');
const deploymentHandler = require('./deployment/deploy');

// Route handlers
app.use('/api/projects', projectsHandler);
app.use('/api/health', healthHandler);
app.use('/api/v1/vulnerability/scan', vulnerabilityScanHandler);
app.use('/api/deployment/deploy', deploymentHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Flash Audit API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      deployment: '/api/deployment/deploy',
      vulnerability: '/api/v1/vulnerability/scan'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Projects endpoint: http://localhost:${PORT}/api/projects`);
});

module.exports = app;
