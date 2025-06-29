#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Flash Audit environment...\n');

// Environment configurations
const environments = {
  development: {
    frontend: {
      VITE_API_BASE_URL: '/api',
      VITE_API_URL: '/api',
      VITE_APP_NAME: 'FlashAudit',
      VITE_APP_VERSION: '2.0.0',
      NODE_ENV: 'development',
      VITE_DEV_MODE: 'true',
      VITE_DEBUG_MODE: 'true',
      VITE_JWT_STORAGE_KEY: 'flashaudit_token',
      VITE_ENABLE_AUTH: 'true',
      VITE_ENABLE_MULTI_CHAIN: 'true',
      VITE_ENABLE_AI_ANALYSIS: 'true',
      VITE_ENABLE_TEAM_COLLABORATION: 'true',
      VITE_ENABLE_REAL_TIME_MONITORING: 'true',
      // Supabase Configuration
      VITE_SUPABASE_URL: 'https://gqdbmvtgychgwztlbaus.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZGJtdnRneWNoZ3d6dGxiYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDc2MDAsImV4cCI6MjA2NjUyMzYwMH0.Q889SrVOiIFfKi2S9Ma4xVhjkAE3nKaE_B03G7S6Ibo',
      // Clerk Configuration
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_ZnVua3ktcGFuZGEtNDYuY2xlcmsuYWNjb3VudHMuZGV2JA'
    },
    api: {
      NODE_ENV: 'development',
      // Supabase Configuration
      SUPABASE_URL: 'https://gqdbmvtgychgwztlbaus.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZGJtdnRneWNoZ3d6dGxiYXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDc2MDAsImV4cCI6MjA2NjUyMzYwMH0.Q889SrVOiIFfKi2S9Ma4xVhjkAE3nKaE_B03G7S6Ibo',
      SUPABASE_SERVICE_ROLE_KEY: 'your-supabase-service-role-key',
      // Clerk Configuration
      CLERK_SECRET_KEY: 'your-clerk-secret-key',
      CLERK_PUBLISHABLE_KEY: 'pk_test_ZnVua3ktcGFuZGEtNDYuY2xlcmsuYWNjb3VudHMuZGV2JA',
      // OpenRouter API Configuration
      OPENROUTER_API_KEY: 'your-openrouter-api-key-here',
      OPENROUTER_API_KEY_KIMI: 'your-openrouter-api-key-here',
      KIMI_MODEL: 'moonshotai/kimi-dev-72b:free',
      OPENROUTER_API_KEY_GEMMA: 'your-openrouter-api-key-here',
      GEMMA_MODEL: 'google/gemma-3n-e4b-it:free',
      OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
      DEFAULT_MODEL_STRATEGY: 'dual',
      // Blockchain RPC URLs
      ETHEREUM_RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      POLYGON_RPC_URL: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
      BSC_RPC_URL: 'https://bsc-dataseed.binance.org/',
      ARBITRUM_RPC_URL: 'https://arb1.arbitrum.io/rpc',
      OPTIMISM_RPC_URL: 'https://mainnet.optimism.io',
      BASE_RPC_URL: 'https://mainnet.base.org',
      // Security Configuration
      JWT_SECRET: 'smart-contract-auditor-secret-key-2024',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '100',
      // Audit Configuration
      MAX_CONTRACT_SIZE_BYTES: '1048576',
      AUDIT_TIMEOUT_MS: '30000',
      VULNERABILITY_THRESHOLD_HIGH: '80',
      VULNERABILITY_THRESHOLD_MEDIUM: '50',
      // Logging Configuration
      LOG_LEVEL: 'info',
      // TEE Monitor Configuration
      TEE_LOG_ENABLED: 'true',
      TEE_ENCRYPTION_KEY: 'your-development-tee-encryption-key',
      // CORS Configuration
      CORS_ORIGIN: '*',
      SITE_URL: 'http://localhost:5174'
    }
  },
  production: {
    frontend: {
      VITE_API_BASE_URL: '/api',
      VITE_API_URL: '/api',
      VITE_APP_NAME: 'FlashAudit',
      VITE_APP_VERSION: '2.0.0',
      NODE_ENV: 'production',
      VITE_NODE_ENV: 'production',
      VITE_DEV_MODE: 'false',
      VITE_DEBUG_MODE: 'false',
      VITE_ENABLE_AUTH: 'true',
      VITE_ENABLE_MULTI_CHAIN: 'true',
      VITE_ENABLE_AI_ANALYSIS: 'true',
      VITE_ENABLE_TEAM_COLLABORATION: 'true',
      VITE_ENABLE_REAL_TIME_MONITORING: 'true',
      VITE_JWT_STORAGE_KEY: 'flashaudit_token'
    },
    api: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn',
      CORS_ORIGIN: 'https://your-vercel-app.vercel.app',
      SITE_URL: 'https://your-vercel-app.vercel.app'
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
  ensureDirectoryExists('api');
  ensureDirectoryExists('logs');
  ensureDirectoryExists('data');
  ensureDirectoryExists('scripts');

  // Create frontend .env file
  const frontendEnvPath = path.join('frontend', '.env');
  createEnvFile(frontendEnvPath, config.frontend);

  // Create API .env file (for local development)
  const apiEnvPath = path.join('api', '.env');
  createEnvFile(apiEnvPath, config.api);

  // Create .env.example files
  const frontendExamplePath = path.join('frontend', '.env.example');
  const frontendExampleConfig = Object.keys(config.frontend).reduce((acc, key) => {
    acc[key] = `# ${key}`;
    return acc;
  }, {});
  createEnvFile(frontendExamplePath, frontendExampleConfig);

  const apiExamplePath = path.join('api', '.env.example');
  const apiExampleConfig = Object.keys(config.api).reduce((acc, key) => {
    acc[key] = `# ${key}`;
    return acc;
  }, {});
  createEnvFile(apiExamplePath, apiExampleConfig);

  console.log('\n🎉 Environment setup complete!');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: npm run install:all');
  console.log('2. Start development server: npm run dev');
  console.log('3. Deploy to Vercel: vercel --prod');
  console.log('\n📝 Note: For production deployment, configure environment variables in Vercel dashboard');
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