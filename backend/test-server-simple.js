const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3002; // Use a different port to avoid conflicts

// Basic middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'apikey'],
}));

app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Simple test server is running'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

// Test audit endpoint for project creation
app.post('/api/audit/contract', (req, res) => {
  console.log('Received project creation request:', req.body);
  console.log('Headers:', req.headers);

  const projectData = {
    id: 'test-project-' + Date.now(),
    name: req.body.name || 'Test Project',
    description: req.body.description || 'Test project description',
    template: req.body.template || 'basic',
    network: req.body.network || 'ethereum',
    contract_code: req.body.contract_code || '// Sample contract code',
    contract_address: null,
    user_id: req.body.user_id || 'test-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('Returning project data:', projectData);

  res.json({
    success: true,
    message: 'Project created successfully',
    data: projectData
  });
});

// Test endpoint to get user projects
app.get('/api/audit/history', (req, res) => {
  console.log('Received get projects request');
  console.log('Headers:', req.headers);

  res.json({
    success: true,
    data: [
      {
        id: 'sample-project-1',
        name: 'Sample DeFi Project',
        description: 'A sample DeFi project',
        template: 'defi',
        network: 'ethereum',
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
