#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🏥 Flash Audit Health Check\n');

const FRONTEND_PORT = 5174;

// Health check functions
async function checkAPI() {
  return new Promise((resolve) => {
    // For serverless functions, we check if the API endpoints are accessible
    // This would typically be done against the deployed Vercel URL
    const apiUrl = process.env.VERCEL_URL || 'http://localhost:3000';
    
    const options = {
      hostname: apiUrl.includes('localhost') ? 'localhost' : apiUrl.replace('https://', '').replace('http://', ''),
      port: apiUrl.includes('localhost') ? 3000 : (apiUrl.includes('https') ? 443 : 80),
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const client = apiUrl.includes('https') ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
            statusCode: res.statusCode,
            response: response
          });
        } catch (error) {
          resolve({
            status: 'unhealthy',
            error: 'Invalid JSON response',
            statusCode: res.statusCode
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 'unhealthy',
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        error: 'Request timeout'
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
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve({
        status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
        statusCode: res.statusCode
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 'unhealthy',
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

function checkFiles() {
  const requiredFiles = [
    'package.json',
    'frontend/package.json',
    'api/package.json',
    'vercel.json'
  ];

  const envFiles = {
    'frontend/.env': { exists: false, required: true },
    'api/.env': { exists: false, required: false }, // Optional for serverless
    '.env.production.example': { exists: false, required: true }
  };

  // Check required files
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  // Check environment files
  Object.keys(envFiles).forEach(file => {
    envFiles[file].exists = fs.existsSync(file);
  });

  return { missingFiles, envFiles };
}

function checkDirectories() {
  const requiredDirs = [
    'frontend',
    'api',
    'scripts'
  ];

  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
  return missingDirs;
}

function printStatus(service, result) {
  const status = result.status === 'healthy' ? '✅' : '❌';
  console.log(`${status} ${service}: ${result.status}`);
  
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  
  if (result.statusCode) {
    console.log(`   Status Code: ${result.statusCode}`);
  }
  
  if (result.response) {
    console.log(`   Version: ${result.response.version || 'unknown'}`);
    console.log(`   Environment: ${result.response.environment || 'unknown'}`);
  }
  
  console.log();
}

async function main() {
  // Check file structure
  console.log('📁 File Structure:');
  const { missingFiles, envFiles } = checkFiles();
  
  if (missingFiles.length === 0) {
    console.log('✅ All required files present');
  } else {
    console.log('❌ Missing files:', missingFiles.join(', '));
  }

  Object.entries(envFiles).forEach(([file, info]) => {
    const status = info.exists ? '✅' : (info.required ? '❌' : '⚠️');
    const label = info.required ? 'required' : 'optional';
    console.log(`${status} ${file} (${label})`);
  });

  // Check directories
  const missingDirs = checkDirectories();
  if (missingDirs.length === 0) {
    console.log('✅ All required directories present');
  } else {
    console.log('❌ Missing directories:', missingDirs.join(', '));
  }

  console.log();

  // Check API (serverless functions)
  console.log('🔌 API Services:');
  const apiResult = await checkAPI();
  printStatus('API Endpoints', apiResult);

  // Check frontend (only if running locally)
  console.log('🌐 Frontend Service:');
  const frontendResult = await checkFrontend();
  printStatus('Frontend Server', frontendResult);

  // Overall status
  console.log('📊 Overall Status:');
  const overallHealthy = apiResult.status === 'healthy';
  const configComplete = Object.values(envFiles).every(f => f.exists || !f.required);
  
  if (overallHealthy && configComplete) {
    console.log('✅ System is healthy and ready');
  } else {
    console.log('❌ System has issues that need attention');
    
    if (!overallHealthy) {
      console.log('- API endpoints are not responding properly');
      console.log('- Check Vercel deployment status');
      console.log('- Verify environment variables in Vercel dashboard');
    }
    
    if (!configComplete) {
      console.log('- Some required configuration files are missing');
      console.log('- Run: npm run setup:env');
    }
  }

  console.log('\n🔗 Useful URLs:');
  console.log(`- Frontend (local): http://localhost:${FRONTEND_PORT}`);
  console.log('- API Health: /api/health');
  console.log('- API Status: /api/status');
  console.log('- API Docs: /api/docs');
}

main().catch(console.error);