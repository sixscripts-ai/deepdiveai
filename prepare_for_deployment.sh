#!/bin/bash

# Script to prepare the DeepDive AI application for deployment
# This script checks for common issues and configures the environment for deployment

echo "========================================="
echo "DeepDive AI - Deployment Preparation Script"
echo "========================================="

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo "⚠️  No .env or .env.local file found. Creating .env template..."
  cat > .env << EOL
GEMINI_API_KEY=your_api_key_here
NODE_ENV=production
PORT=8080
EOL
  echo "✅ Created .env template. Please edit it with your actual API key."
else
  echo "✅ Environment file found."
  
  # Check if GEMINI_API_KEY is set
  if [ -f ".env" ] && ! grep -q "GEMINI_API_KEY" .env; then
    echo "⚠️  GEMINI_API_KEY not found in .env file."
  elif [ -f ".env.local" ] && ! grep -q "GEMINI_API_KEY" .env.local; then
    echo "⚠️  GEMINI_API_KEY not found in .env.local file."
  else
    echo "✅ GEMINI_API_KEY found in environment file."
  fi
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js to continue."
  exit 1
else
  NODE_VERSION=$(node -v | cut -d 'v' -f 2)
  echo "✅ Node.js version $NODE_VERSION found."
  
  # Simple version comparison
  MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
  if [ "$MAJOR_VERSION" -lt 14 ]; then
    echo "⚠️  Node.js version $NODE_VERSION may be too old. Version 14 or higher is recommended."
  fi
fi

# Check for npm and install dependencies
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed. Please install npm to continue."
  exit 1
else
  echo "✅ npm found. Checking dependencies..."
  
  # Check if node_modules exists and package-lock.json is up to date
  if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
      echo "❌ Failed to install dependencies. Please check for errors above."
      exit 1
    fi
    echo "✅ Dependencies installed successfully."
  else
    echo "✅ Dependencies appear to be up to date."
  fi
fi

# Test build process
echo "🔨 Testing build process..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix the errors before deploying."
  exit 1
fi
echo "✅ Build successful."

# Check database
echo "🔍 Checking database configuration..."
if [ -f "deepdive.db" ]; then
  echo "✅ Database file found."
  echo "⚠️  Note: SQLite database will not persist on DigitalOcean App Platform."
  echo "   Please refer to DATABASE_MIGRATION_GUIDE.md for production database options."
else
  echo "⚠️  Database file not found. It will be created on first run."
fi

# Check for deployment configuration file
if [ -f ".do/deploy.template.yaml" ]; then
  echo "✅ DigitalOcean deployment configuration found."
else
  echo "⚠️  No DigitalOcean deployment configuration found (.do/deploy.template.yaml)."
  echo "   Refer to DIGITALOCEAN_DEPLOYMENT.md for configuration details."
fi

echo ""
echo "========================================="
echo "✅ Deployment preparation checks completed"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review DEPLOYMENT_CHECKLIST.md for a complete deployment checklist"
echo "2. Review TESTING_PROCEDURE.md for testing procedures"
echo "3. Consider database migration options in DATABASE_MIGRATION_GUIDE.md"
echo "4. Deploy your application to DigitalOcean App Platform"
echo ""
echo "For detailed deployment instructions, see DIGITALOCEAN_DEPLOYMENT.md"
echo ""