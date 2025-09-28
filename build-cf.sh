#!/bin/bash

# Build script for Cloudflare deployments
# Adapted from .github/workflows/deploy.yml

echo "🚀 Starting Cloudflare build process..."

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build packages in the correct order
echo "🔨 Building Core Package..."
bun run --filter "@anchorlib/core" build

echo "🔨 Building Devtool Package..."
bun run --filter "@anchorlib/devtool" build

echo "🔨 Building Storage Package..."
bun run --filter "@anchorlib/storage" build

echo "🔨 Building React Package..."
bun run --filter "@anchorlib/react" build

# Run tests
echo "🧪 Running tests..."
bun run test

# Build documentation
echo "📚 Building documentation..."
bun run docs:build

# Build React app
echo "⚛️  Building React app..."
bun run --filter "@anchor-app/next" cf:build

# Verify builds
echo "✅ Verifying builds..."
if [ -d "apps/next/.open-next" ]; then
    echo "📁 Build output contents:"
    ls -la apps/next/.open-next
    
    # For Cloudflare, we typically deploy to a dist directory
    echo "📂 Preparing Cloudflare deployment..."
    # The dist directory is already created by the build process
    echo "✅ Cloudflare build completed successfully!"
else
    echo "❌ Build output directory not found: apps/next/.open-next"
    exit 1
fi