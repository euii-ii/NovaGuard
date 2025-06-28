#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Flash Audit with Supabase integration...\n');

// Function to run commands
function runCommand(command, cwd = process.cwd()) {
  console.log(`📦 Running: ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    console.log('✅ Success!\n');
  } catch (error) {
    console.error(`❌ Error running command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Function to check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Step 1: Install backend dependencies
console.log('1️⃣ Installing backend dependencies...');
const backendPath = path.join(__dirname, 'backend');
if (fileExists(backendPath)) {
  runCommand('npm install', backendPath);
} else {
  console.log('❌ Backend directory not found');
  process.exit(1);
}

// Step 2: Install frontend dependencies
console.log('2️⃣ Installing frontend dependencies...');
const frontendPath = path.join(__dirname, 'frontend');
if (fileExists(frontendPath)) {
  runCommand('npm install', frontendPath);
} else {
  console.log('❌ Frontend directory not found');
  process.exit(1);
}

// Step 3: Create database tables
console.log('3️⃣ Database Setup Instructions:');
console.log('📋 To complete the setup, please:');
console.log('1. Go to https://supabase.com and create a new project');
console.log('2. Copy the SQL from backend/src/database/schema.sql');
console.log('3. Run it in your Supabase SQL Editor');
console.log('4. Update the environment variables in backend/.env and frontend/.env');
console.log('5. Replace the placeholder values with your actual Supabase credentials');

// Step 4: Create logs directory
console.log('\n4️⃣ Creating logs directory...');
const logsPath = path.join(backendPath, 'logs');
if (!fileExists(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
  console.log('✅ Logs directory created');
}

// Step 5: Create data directory
console.log('\n5️⃣ Creating data directory...');
const dataPath = path.join(backendPath, 'data');
if (!fileExists(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
  console.log('✅ Data directory created');
}

console.log('\n🎉 Setup complete! Next steps:');
console.log('\n📝 Manual Configuration Required:');
console.log('1. Set up your Supabase project and run the SQL schema');
console.log('2. Update environment variables with your actual Supabase credentials');
console.log('3. Configure your AI model API keys in backend/.env');
console.log('\n🏃 To start the application:');
console.log('Backend: cd backend && npm run dev');
console.log('Frontend: cd frontend && npm run dev');
console.log('\n📚 Documentation:');
console.log('- Supabase setup: https://supabase.com/docs');
console.log('- Project README: ./README.md');
console.log('\n✨ Happy auditing!');