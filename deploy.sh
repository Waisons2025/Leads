#!/bin/bash

# Waisons Realty Lead Automation System - Deployment Script
# Usage: chmod +x deploy.sh && ./deploy.sh

echo "🏠 Waisons Realty Lead Automation System"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Setup environment file
if [ ! -f .env ]; then
    echo "📝 Setting up environment file..."
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   - SMTP settings for email"
    echo "   - Twilio settings for SMS (optional)"
    echo "   - Database URL (for production)"
    echo ""
else
    echo "✅ Environment file already exists"
fi

# Check PostgreSQL (optional for local development)
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is available"
else
    echo "⚠️  PostgreSQL not found locally (OK for Railway deployment)"
fi

echo ""
echo "🚀 Setup complete! Next steps:"
echo ""
echo "For Local Development:"
echo "  1. Edit .env file with your settings"
echo "  2. Run: npm start"
echo "  3. Open: http://localhost:3000"
echo ""
echo "For Railway Deployment:"
echo "  1. Push to GitHub:"
echo "     git init"
echo "     git add ."
echo "     git commit -m 'Initial commit'"
echo "     git remote add origin YOUR_GITHUB_REPO_URL"
echo "     git push -u origin main"
echo ""
echo "  2. Deploy to Railway:"
echo "     - Go to railway.app"
echo "     - New Project → Deploy from GitHub"
echo "     - Add PostgreSQL database"
echo "     - Set environment variables"
echo ""
echo "📊 Access Points:"
echo "  - Landing Page: /"
echo "  - Dashboard: /dashboard"
echo "  - System Overview: /index.html"
echo "  - API Health: /api/health"
echo ""
echo "📞 Support: admin@waisonsrealty.com | (313) 769-5353"
echo "🏠 Waisons Realty - Professional real estate in Allen Park, MI"