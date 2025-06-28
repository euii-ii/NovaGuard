#!/bin/bash

# Flash-Audit Deployment Script for Vercel

echo "🚀 Starting Flash-Audit deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install all dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Check if TypeScript is available in frontend
echo "🔍 Checking TypeScript installation..."
cd frontend
if ! npx tsc --version > /dev/null 2>&1; then
    echo "⚠️  TypeScript not found, installing..."
    npm install typescript --save-dev
fi
cd ..

# Build the project
echo "🏗️  Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "📝 Don't forget to set up environment variables in Vercel dashboard"
        echo "📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions"
    else
        echo "❌ Deployment failed"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi
