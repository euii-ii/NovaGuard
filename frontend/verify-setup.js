#!/usr/bin/env node

/**
 * Verification script to check if the setup is correct
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying Project Setup...\n');

// Check critical files
const criticalFiles = [
    { file: 'package.json', desc: 'Package configuration' },
    { file: 'vite.config.ts', desc: 'Vite configuration' },
    { file: 'landing.html', desc: 'Landing page' },
    { file: 'react_app.html', desc: 'React app entry' },
    { file: 'src/main.tsx', desc: 'React main entry' },
    { file: 'src/App.tsx', desc: 'React app component' },
    { file: 'public/script.js', desc: 'Landing page scripts' },
    { file: 'public/style.css', desc: 'Landing page styles' }
];

console.log('📁 Checking critical files:');
criticalFiles.forEach(({ file, desc }) => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file} - ${desc}`);
});

// Check Vite config
console.log('\n⚙️ Checking Vite configuration:');
try {
    const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
    
    const checks = [
        { test: viteConfig.includes('port: 5174'), desc: 'Server port set to 5174' },
        { test: viteConfig.includes('open: \'/landing.html\''), desc: 'Opens landing page by default' },
        { test: viteConfig.includes('main: \'landing.html\''), desc: 'Landing page as main entry' },
        { test: viteConfig.includes('app: \'react_app.html\''), desc: 'React app as secondary entry' }
    ];
    
    checks.forEach(check => {
        console.log(`  ${check.test ? '✅' : '❌'} ${check.desc}`);
    });
} catch (error) {
    console.log('  ❌ Error reading vite.config.ts:', error.message);
}

// Check package.json scripts
console.log('\n📦 Checking package.json scripts:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = ['dev', 'build', 'preview'];
    requiredScripts.forEach(script => {
        const exists = packageJson.scripts && packageJson.scripts[script];
        console.log(`  ${exists ? '✅' : '❌'} ${script}: ${exists || 'Missing'}`);
    });
    
    // Check dependencies
    console.log('\n📚 Checking key dependencies:');
    const keyDeps = ['react', 'react-dom', 'react-router-dom'];
    keyDeps.forEach(dep => {
        const version = packageJson.dependencies && packageJson.dependencies[dep];
        console.log(`  ${version ? '✅' : '❌'} ${dep}: ${version || 'Missing'}`);
    });
    
} catch (error) {
    console.log('  ❌ Error reading package.json:', error.message);
}

// Check React app structure
console.log('\n⚛️ Checking React app structure:');
try {
    const reactAppHtml = fs.readFileSync('react_app.html', 'utf8');
    const mainTsx = fs.readFileSync('src/main.tsx', 'utf8');
    const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
    
    const checks = [
        { test: reactAppHtml.includes('id="root"'), desc: 'React root element in HTML' },
        { test: reactAppHtml.includes('main.tsx'), desc: 'Main.tsx script reference' },
        { test: mainTsx.includes('ReactDOM.createRoot'), desc: 'React 18+ createRoot usage' },
        { test: appTsx.includes('HashRouter'), desc: 'Hash router configured' },
        { test: appTsx.includes('path="/app"'), desc: 'App route defined' },
        { test: appTsx.includes('VulnerabilityPage'), desc: 'Vulnerability page component' }
    ];
    
    checks.forEach(check => {
        console.log(`  ${check.test ? '✅' : '❌'} ${check.desc}`);
    });
} catch (error) {
    console.log('  ❌ Error checking React app structure:', error.message);
}

// Check landing page navigation
console.log('\n🏠 Checking landing page navigation:');
try {
    const landingHtml = fs.readFileSync('landing.html', 'utf8');
    
    const checks = [
        { test: landingHtml.includes('function openReactApp()'), desc: 'Navigation function defined' },
        { test: landingHtml.includes('onclick="openReactApp()"'), desc: 'Buttons have onclick handlers' },
        { test: landingHtml.includes('/react_app.html#/app'), desc: 'Correct navigation target' },
        { test: landingHtml.includes('console.log'), desc: 'Debug logging present' }
    ];
    
    checks.forEach(check => {
        console.log(`  ${check.test ? '✅' : '❌'} ${check.desc}`);
    });
} catch (error) {
    console.log('  ❌ Error checking landing page:', error.message);
}

console.log('\n🚀 Setup Verification Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Run: npm install (if not done already)');
console.log('2. Run: npm run dev');
console.log('3. Open: http://localhost:5174/landing.html');
console.log('4. Test: Click "Get Started" buttons');
console.log('5. Debug: Check browser console for any errors');

console.log('\n🔧 If Get Started button still not working:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Check Console tab for error messages');
console.log('3. Check Network tab to see if react_app.html loads');
console.log('4. Try direct navigation to: http://localhost:5174/react_app.html#/app');
console.log('5. Use debug tool: http://localhost:5174/debug-navigation.html');

console.log('\n✨ Happy debugging!');
