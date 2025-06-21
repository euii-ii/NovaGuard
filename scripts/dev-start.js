#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting DAO Smart Contract Auditor Development Environment\n');

// Configuration
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5173;
const STARTUP_DELAY = 3000; // 3 seconds delay between backend and frontend

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'cyan');
  
  const requiredFiles = [
    'frontend/.env',
    'backend/.env',
    'frontend/package.json',
    'backend/package.json'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    log('❌ Missing required files:', 'red');
    missingFiles.forEach(file => log(`   - ${file}`, 'red'));
    log('\n💡 Run the following commands to fix:', 'yellow');
    log('   npm run setup', 'yellow');
    log('   npm run install:all', 'yellow');
    process.exit(1);
  }

  log('✅ All prerequisites met', 'green');
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(true);
    });
  });
}

async function checkPorts() {
  log('🔌 Checking ports...', 'cyan');
  
  const backendInUse = await isPortInUse(BACKEND_PORT);
  const frontendInUse = await isPortInUse(FRONTEND_PORT);
  
  if (backendInUse) {
    log(`❌ Backend port ${BACKEND_PORT} is already in use`, 'red');
    log('   Please stop the existing process or change the port', 'yellow');
    process.exit(1);
  }
  
  if (frontendInUse) {
    log(`❌ Frontend port ${FRONTEND_PORT} is already in use`, 'red');
    log('   Please stop the existing process or change the port', 'yellow');
    process.exit(1);
  }
  
  log(`✅ Ports ${BACKEND_PORT} and ${FRONTEND_PORT} are available`, 'green');
}

function startBackend() {
  return new Promise((resolve, reject) => {
    log('🔧 Starting backend server...', 'blue');
    
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'backend'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let backendReady = false;
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${colors.blue}[Backend]${colors.reset} ${output.trim()}`);
      
      // Check if backend is ready
      if (output.includes('running on port') || output.includes('Server started')) {
        if (!backendReady) {
          backendReady = true;
          log('✅ Backend server is ready', 'green');
          resolve(backend);
        }
      }
    });

    backend.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`${colors.red}[Backend Error]${colors.reset} ${output.trim()}`);
    });

    backend.on('error', (error) => {
      log(`❌ Failed to start backend: ${error.message}`, 'red');
      reject(error);
    });

    backend.on('exit', (code) => {
      if (code !== 0) {
        log(`❌ Backend exited with code ${code}`, 'red');
        reject(new Error(`Backend process exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!backendReady) {
        log('❌ Backend startup timeout', 'red');
        backend.kill();
        reject(new Error('Backend startup timeout'));
      }
    }, 30000);
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    log('🎨 Starting frontend development server...', 'magenta');
    
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'frontend'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let frontendReady = false;
    
    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${colors.magenta}[Frontend]${colors.reset} ${output.trim()}`);
      
      // Check if frontend is ready
      if (output.includes('Local:') || output.includes('ready in')) {
        if (!frontendReady) {
          frontendReady = true;
          log('✅ Frontend development server is ready', 'green');
          resolve(frontend);
        }
      }
    });

    frontend.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`${colors.red}[Frontend Error]${colors.reset} ${output.trim()}`);
    });

    frontend.on('error', (error) => {
      log(`❌ Failed to start frontend: ${error.message}`, 'red');
      reject(error);
    });

    frontend.on('exit', (code) => {
      if (code !== 0) {
        log(`❌ Frontend exited with code ${code}`, 'red');
        reject(new Error(`Frontend process exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!frontendReady) {
        log('❌ Frontend startup timeout', 'red');
        frontend.kill();
        reject(new Error('Frontend startup timeout'));
      }
    }, 30000);
  });
}

async function startDevelopment() {
  try {
    // Check prerequisites
    checkPrerequisites();
    
    // Check ports
    await checkPorts();
    
    // Start backend first
    const backendProcess = await startBackend();
    
    // Wait a bit for backend to fully initialize
    log(`⏳ Waiting ${STARTUP_DELAY/1000} seconds for backend to initialize...`, 'yellow');
    await new Promise(resolve => setTimeout(resolve, STARTUP_DELAY));
    
    // Start frontend
    const frontendProcess = await startFrontend();
    
    // Setup graceful shutdown
    const cleanup = () => {
      log('\n🛑 Shutting down development servers...', 'yellow');
      
      if (backendProcess) {
        backendProcess.kill('SIGTERM');
      }
      
      if (frontendProcess) {
        frontendProcess.kill('SIGTERM');
      }
      
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Success message
    log('\n🎉 Development environment is ready!', 'green');
    log(`📱 Frontend: http://localhost:${FRONTEND_PORT}`, 'cyan');
    log(`🔧 Backend API: http://localhost:${BACKEND_PORT}`, 'blue');
    log(`🏥 Health Check: http://localhost:${BACKEND_PORT}/health`, 'blue');
    log('\n💡 Press Ctrl+C to stop all servers', 'yellow');
    
  } catch (error) {
    log(`❌ Failed to start development environment: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Start the development environment
startDevelopment();
