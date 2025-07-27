#!/bin/bash

# Production Startup Script for BauStructura
# This script sets up the environment and starts the application in production mode

set -e

echo "🚀 Starting BauStructura in production mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required environment variables
required_vars=("DATABASE_URL" "SESSION_SECRET" "SMTP_HOST" "SMTP_USER" "SMTP_PASS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables loaded"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --only=production
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Setup database if needed
echo "🗄️  Setting up database..."
node scripts/setup-database.js

# Start the application
echo "🌟 Starting BauStructura server..."
NODE_ENV=production npm start