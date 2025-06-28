const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV
  });
});

// Basic audit endpoint
app.post('/api/audit/contract', (req, res) => {
  res.json({
    success: true,
    auditId: 'test-audit-' + Date.now(),
    vulnerabilities: [],
    riskLevel: 'Low',
    message: 'Basic audit endpoint working'
  });
});

// Basic deployment endpoint
app.post('/api/v1/deployment/deploy', (req, res) => {
  res.json({
    success: true,
    transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
    contractAddress: '0x' + Math.random().toString(16).substr(2, 40),
    gasUsed: 500000,
    explorerUrl: 'https://etherscan.io/tx/0x' + Math.random().toString(16).substr(2, 64)
  });
});

// Networks endpoint
app.get('/api/v1/deployment/networks', (req, res) => {
  res.json({
    networks: [
      {
        id: 'ethereum',
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
        explorerUrl: 'https://etherscan.io',
        currency: 'ETH',
        testnet: false
      },
      {
        id: 'sepolia',
        name: 'Ethereum Sepolia',
        chainId: 11155111,
        rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
        explorerUrl: 'https://sepolia.etherscan.io',
        currency: 'ETH',
        testnet: true
      }
    ]
  });
});

// ChainIDE endpoints
app.post('/api/v1/chainide/workspaces', (req, res) => {
  res.json({
    success: true,
    workspaceId: 'workspace-' + Date.now(),
    message: 'Workspace created'
  });
});

app.post('/api/v1/chainide/code/analyze', (req, res) => {
  res.json({
    success: true,
    analysis: {
      syntaxValid: true,
      warnings: [],
      suggestions: []
    }
  });
});

// Real-time development endpoints
app.post('/api/v1/realtime/code/analyze', (req, res) => {
  res.json({
    success: true,
    analysis: {
      syntaxValid: true,
      vulnerabilities: [],
      gasOptimizations: []
    }
  });
});

app.post('/api/v1/realtime/completion', (req, res) => {
  res.json({
    success: true,
    completions: [
      { text: 'function', type: 'keyword' },
      { text: 'contract', type: 'keyword' },
      { text: 'mapping', type: 'keyword' }
    ]
  });
});

// Collaboration endpoints
app.post('/api/v1/collaboration/teams', (req, res) => {
  res.json({
    success: true,
    teamId: 'team-' + Date.now(),
    message: 'Team created'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Debug Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
