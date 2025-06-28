#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🏥 DAO Smart Contract Auditor Health Check\n');

// Configuration
const BACKEND_PORT = process.env.PORT || 3001;
const FRONTEND_PORT = 5173;
const TIMEOUT = 10000; // 10 seconds

// Health check functions
async function checkBackend() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: '/health',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const healthData = JSON.parse(data);
          resolve({
            status: 'healthy',
            statusCode: res.statusCode,
            data: healthData,
            responseTime: Date.now() - startTime
          });
        } catch (error) {
          resolve({
            status: 'unhealthy',
            statusCode: res.statusCode,
            error: 'Invalid JSON response',
            responseTime: Date.now() - startTime
          });
        }
      });
    });

    const startTime = Date.now();
    
    req.on('error', (error) => {
      resolve({
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        error: 'Request timeout',
        responseTime: TIMEOUT
      });
    });

    req.end();
  });
}

async function checkFrontend() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: FRONTEND_PORT,
      path: '/',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      resolve({
        status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime
      });
    });

    const startTime = Date.now();
    
    req.on('error', (error) => {
      resolve({
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        error: 'Request timeout',
        responseTime: TIMEOUT
      });
    });

    req.end();
  });
}

function checkEnvironmentFiles() {
  const files = [
    'frontend/.env',
    'backend/.env',
    'package.json',
    'frontend/package.json',
    'backend/package.json'
  ];

  const results = {};
  
  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    results[file] = {
      exists: fs.existsSync(filePath),
      path: filePath
    };
  });

  return results;
}

function checkDirectories() {
  const directories = [
    'frontend',
    'backend',
    'backend/data',
    'backend/logs',
    'scripts'
  ];

  const results = {};
  
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    results[dir] = {
      exists: fs.existsSync(dirPath),
      path: dirPath
    };
  });

  return results;
}

function printStatus(name, result) {
  const status = result.status === 'healthy' ? '✅' : '❌';
  const responseTime = result.responseTime ? ` (${result.responseTime}ms)` : '';
  
  console.log(`${status} ${name}${responseTime}`);
  
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  
  if (result.data) {
    console.log(`   Version: ${result.data.version || 'Unknown'}`);
    console.log(`   Environment: ${result.data.environment || 'Unknown'}`);
    
    if (result.data.services) {
      console.log('   Services:');
      Object.entries(result.data.services).forEach(([service, info]) => {
        const serviceStatus = info.status === 'active' ? '✅' : '❌';
        console.log(`     ${serviceStatus} ${service}: ${info.status}`);
      });
    }
  }
  
  console.log();
}

function printFileStatus(name, result) {
  const status = result.exists ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (!result.exists) {
    console.log(`   Missing: ${result.path}`);
  }
}

async function runHealthCheck() {
  console.log('🔍 Checking services...\n');

  // Check backend
  console.log('Backend Service:');
  const backendResult = await checkBackend();
  printStatus('Backend API', backendResult);

  // Check frontend (only if backend is healthy)
  if (backendResult.status === 'healthy') {
    console.log('Frontend Service:');
    const frontendResult = await checkFrontend();
    printStatus('Frontend App', frontendResult);
  } else {
    console.log('❌ Frontend Service: Skipped (backend unhealthy)\n');
  }

  // Check environment files
  console.log('📄 Checking configuration files...\n');
  const envFiles = checkEnvironmentFiles();
  Object.entries(envFiles).forEach(([file, result]) => {
    printFileStatus(file, result);
  });

  // Check directories
  console.log('\n📁 Checking directories...\n');
  const directories = checkDirectories();
  Object.entries(directories).forEach(([dir, result]) => {
    printFileStatus(dir, result);
  });

  // Overall status
  console.log('\n📊 Overall Status:');
  const overallHealthy = backendResult.status === 'healthy';
  const configComplete = Object.values(envFiles).every(f => f.exists);
  const dirsComplete = Object.values(directories).every(d => d.exists);

  console.log(`${overallHealthy ? '✅' : '❌'} Services: ${overallHealthy ? 'Healthy' : 'Unhealthy'}`);
  console.log(`${configComplete ? '✅' : '❌'} Configuration: ${configComplete ? 'Complete' : 'Incomplete'}`);
  console.log(`${dirsComplete ? '✅' : '❌'} Directory Structure: ${dirsComplete ? 'Complete' : 'Incomplete'}`);

  if (!overallHealthy || !configComplete || !dirsComplete) {
    console.log('\n🔧 Suggested fixes:');
    
    if (!configComplete) {
      console.log('- Run: npm run setup:env');
    }
    
    if (!dirsComplete) {
      console.log('- Run: npm run setup');
    }
    
    if (!overallHealthy) {
      console.log('- Check if backend is running: npm run dev:backend');
      console.log('- Check backend logs for errors');
    }
    
    process.exit(1);
  } else {
    console.log('\n🎉 All systems operational!');
  }
}

// Run the health check
runHealthCheck().catch(error => {
  console.error('❌ Health check failed:', error.message);
  process.exit(1);
});
