#!/bin/bash

# Build script for Vercel deployments
# Adapted from .github/workflows/deploy.yml

echo "🚀 Starting Vercel build process..."

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
bun run --filter "@anchor-app/react" build

# Verify builds
echo "✅ Verifying builds..."
if [ -d "apps/react/dist" ]; then
    echo "📁 Build output contents:"
    ls -la apps/react/dist
    
    # For Vercel, we need to ensure output is in the correct directory
    echo "📂 Preparing Vercel deployment..."
    # Vercel typically looks for output in the root or specified directory
    echo "✅ Vercel build completed successfully!"
else
    echo "❌ Build output directory not found: apps/react/dist"
    exit 1
fi