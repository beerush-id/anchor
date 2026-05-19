#!/bin/bash

# Build script for Cloudflare deployments
# Adapted from .github/workflows/deploy.yml

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "🔧 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "ℹ️  No .env file found, using default environment variables"
fi

echo "🚀 Starting Cloudflare build process..."

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build packages in the correct order
# echo "🔨 Building Core Package..."
# bun run --filter "@anchorlib/core" build
# 
# echo "🔨 Building Devtool Package..."
# bun run --filter "@anchorlib/devtool" build
# 
# echo "🔨 Building Storage Package..."
# bun run --filter "@anchorlib/storage" build
# 
# echo "🔨 Building Router Package..."
# bun run --filter "@anchorlib/router" build
# 
# echo "🔨 Building React Package..."
# bun run --filter "@anchorlib/react" build
# 
# echo "🔨 Building React (Classic) Package..."
# bun run --filter "@anchorlib/react-classic" build
# 
# echo "🔨 Building React Kit Package..."
# bun run --filter "@anchorlib/react-kit" build
# 
# echo "🔨 Building IRPC Package..."
# bun run --filter "@irpclib/irpc" build
# 
# echo "🔨 Building IRPC HTTP Transport Package..."
# bun run --filter "@irpclib/http" build
# 
# echo "🔨 Building IRPC WS Transport Package..."
# bun run --filter "@irpclib/ws" build
# 
# echo "🔨 Building IRPC Broadcast Transport Package..."
# bun run --filter "@irpclib/broadcast" build

# Build documentation
echo "📚 Building documentation..."
bun run docs:build

# Run tests to generate coverage in the dist folder
echo "🧪 Running tests and generating coverage..."
bun run test

# Build React app
# echo "⚛️  Building React app..."
# bun run --filter "@anchor-app/next" cf:build

# Verify builds
echo "✅ Verifying builds..."
if [ -d "docs/.vitepress/dist" ]; then
    echo "📁 Build output contents:"
    ls -la docs/.vitepress/dist
    
    # For Cloudflare, we typically deploy to a dist directory
    echo "📂 Preparing Cloudflare deployment..."
    # The dist directory is already created by the build process
    echo "✅ Cloudflare build completed successfully!"
else
    echo "❌ Build output directory not found: docs/.vitepress/dist"
    exit 1
fi