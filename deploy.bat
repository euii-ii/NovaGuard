@echo off
echo 🚀 Starting Flash-Audit deployment process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

REM Install all dependencies
echo 📦 Installing dependencies...
call npm run install:all
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

REM Check if TypeScript is available in frontend
echo 🔍 Checking TypeScript installation...
cd frontend
call npx tsc --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  TypeScript not found, installing...
    call npm install typescript --save-dev
)
cd ..

REM Build the project
echo 🏗️  Building project...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
call vercel --prod
if errorlevel 1 (
    echo ❌ Deployment failed
    exit /b 1
)

echo 🎉 Deployment successful!
echo 📝 Don't forget to set up environment variables in Vercel dashboard
echo 📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions
