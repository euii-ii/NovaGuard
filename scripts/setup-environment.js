#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up DAO Smart Contract Auditor environment...\n');

// Environment configurations
const environments = {
  development: {
    frontend: {
      VITE_API_BASE_URL: 'http://localhost:3001',
      VITE_APP_NAME: 'FlashAudit',
      VITE_APP_VERSION: '2.0.0',
      VITE_BACKEND_PORT: '3001',
      VITE_BACKEND_HOST: 'localhost',
      NODE_ENV: 'development',
      VITE_DEV_MODE: 'true',
      VITE_DEBUG_MODE: 'true',
      VITE_JWT_STORAGE_KEY: 'flashaudit_token',
      VITE_ENABLE_AUTH: 'false',
      VITE_ENABLE_MULTI_CHAIN: 'true',
      VITE_ENABLE_AI_ANALYSIS: 'true',
      VITE_ENABLE_TEAM_COLLABORATION: 'true',
      VITE_ENABLE_REAL_TIME_MONITORING: 'true'
    },
    backend: {
      PORT: '3001',
      NODE_ENV: 'development',
      // OpenRouter API Configuration
      OPENROUTER_API_KEY_KIMI: 'your-openrouter-api-key-here',
      KIMI_MODEL: 'moonshot/kimi-dev-72b',
      OPENROUTER_API_KEY_GEMMA: 'your-openrouter-api-key-here',
      GEMMA_MODEL: 'google/gemma-2-3b-it',
      OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
      DEFAULT_MODEL_STRATEGY: 'dual',
      // Blockchain RPC URLs
      ETHEREUM_RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      POLYGON_RPC_URL: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
      BSC_RPC_URL: 'https://bsc-dataseed.binance.org/',
      APTOS_RPC_URL: 'https://fullnode.mainnet.aptoslabs.com/v1',
      SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
      SUI_RPC_URL: 'https://fullnode.mainnet.sui.io:443',
      // Security Configuration
      JWT_SECRET: 'smart-contract-auditor-secret-key-2024',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      // Database Configuration
      DATABASE_URL: 'sqlite:./data/auditor.db',
      // Features
      ENABLE_REAL_TIME_MONITORING: 'false',
      ENABLE_CHAINIDE_INTEGRATION: 'true',
      CHAINIDE_WS_PORT: '8080',
      LOG_LEVEL: 'info'
    }
  },
  production: {
    frontend: {
      VITE_API_BASE_URL: 'https://your-production-api.com',
      VITE_APP_NAME: 'FlashAudit',
      VITE_APP_VERSION: '2.0.0',
      NODE_ENV: 'production',
      VITE_DEV_MODE: 'false',
      VITE_DEBUG_MODE: 'false',
      VITE_ENABLE_AUTH: 'true',
      VITE_ENABLE_MULTI_CHAIN: 'true',
      VITE_ENABLE_AI_ANALYSIS: 'true',
      VITE_ENABLE_TEAM_COLLABORATION: 'true',
      VITE_ENABLE_REAL_TIME_MONITORING: 'true'
    },
    backend: {
      PORT: '3001',
      NODE_ENV: 'production',
      // Add production-specific configurations here
      LOG_LEVEL: 'warn',
      ENABLE_REAL_TIME_MONITORING: 'true'
    }
  }
};

function createEnvFile(filePath, config) {
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(filePath, envContent + '\n');
  console.log(`✅ Created ${filePath}`);
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory ${dirPath}`);
  }
}

function setupEnvironment(env = 'development') {
  console.log(`Setting up ${env} environment...\n`);
  
  const config = environments[env];
  if (!config) {
    console.error(`❌ Unknown environment: ${env}`);
    process.exit(1);
  }

  // Ensure directories exist
  ensureDirectoryExists('frontend');
  ensureDirectoryExists('backend');
  ensureDirectoryExists('backend/data');
  ensureDirectoryExists('backend/logs');
  ensureDirectoryExists('scripts');

  // Create frontend .env file
  const frontendEnvPath = path.join('frontend', '.env');
  createEnvFile(frontendEnvPath, config.frontend);

  // Create backend .env file
  const backendEnvPath = path.join('backend', '.env');
  createEnvFile(backendEnvPath, config.backend);

  // Create .env.example files
  const frontendExamplePath = path.join('frontend', '.env.example');
  const frontendExampleConfig = Object.keys(config.frontend).reduce((acc, key) => {
    acc[key] = `# ${key}`;
    return acc;
  }, {});
  createEnvFile(frontendExamplePath, frontendExampleConfig);

  const backendExamplePath = path.join('backend', '.env.example');
  const backendExampleConfig = Object.keys(config.backend).reduce((acc, key) => {
    acc[key] = `# ${key}`;
    return acc;
  }, {});
  createEnvFile(backendExamplePath, backendExampleConfig);

  console.log('\n🎉 Environment setup complete!');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: npm run install:all');
  console.log('2. Start development servers: npm run dev');
  console.log('3. Check health: npm run check:health');
}

// Check command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'development';

// Validate environment
if (!environments[environment]) {
  console.error(`❌ Invalid environment: ${environment}`);
  console.log('Available environments:', Object.keys(environments).join(', '));
  process.exit(1);
}

setupEnvironment(environment);
