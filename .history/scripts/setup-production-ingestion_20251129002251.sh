#!/bin/bash

# Production Ingestion Setup Script
# Run this on your production server after deployment

set -e

echo "🚀 Setting up production ingestion environment..."

# Check if we're on the production server
if [[ "$NODE_ENV" != "production" ]]; then
  echo "⚠️  Warning: NODE_ENV is not set to production"
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Check required environment variables
required_vars=("DATABASE_URL" "ADMIN_EMAIL")
missing_vars=()

for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    missing_vars+=("$var")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "❌ Missing required environment variables:"
  printf '   %s\n' "${missing_vars[@]}"
  echo ""
  echo "Set these variables in your .env.production file:"
  for var in "${missing_vars[@]}"; do
    echo "  $var=your_value_here"
  done
  exit 1
fi

# Check if admin password is set for production authentication
if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "⚠️  ADMIN_PASSWORD not set. Production scripts require authentication."
  echo "Add to your .env.production:"
  echo "  ADMIN_PASSWORD=your_secure_admin_password"
  echo ""
  read -p "Continue without authentication? Scripts will only work in dev mode (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Set API base URL for production
if [[ -z "$DEPLOY_API_URL" && -z "$API_BASE_URL" ]]; then
  echo "🌐 API base URL not set. Please enter your production domain:"
  read -p "Production URL (e.g., https://your-domain.com): " prod_url
  
  if [[ -n "$prod_url" ]]; then
    echo "export API_BASE_URL='$prod_url'" >> .env.production
    echo "✅ Added API_BASE_URL to .env.production"
  fi
fi

# Install Node.js dependencies if needed
if [[ ! -d "node_modules" ]]; then
  echo "📦 Installing dependencies..."
  if command -v pnpm &> /dev/null; then
    pnpm install
  elif command -v npm &> /dev/null; then
    npm install
  else
    echo "❌ Neither pnpm nor npm found. Please install Node.js dependencies manually."
    exit 1
  fi
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Test database connection
echo "🗄️  Testing database connection..."
if npx prisma db execute --command "SELECT 1;" &> /dev/null; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed. Check your DATABASE_URL"
  exit 1
fi

# Make scripts executable
chmod +x scripts/retry-alibaba-production.js
chmod +x scripts/retry-mic-production.js

echo ""
echo "🎉 Production ingestion setup complete!"
echo ""
echo "📋 Usage:"
echo "  # Alibaba listings"
echo "  node scripts/retry-alibaba-production.js --category=MISSING"
echo "  node scripts/retry-alibaba-production.js --category=PARTIAL"
echo "  node scripts/retry-alibaba-production.js --category=BAD"
echo ""
echo "  # Made-in-China listings"
echo "  node scripts/retry-mic-production.js"
echo ""
echo "💡 Tips:"
echo "  - Scripts automatically detect production mode"
echo "  - Progress is saved and can be resumed"
echo "  - Use Ctrl+C to stop gracefully"
echo "  - Check logs for detailed progress"
echo ""

# Check if production server is running
if [[ -n "$API_BASE_URL" || -n "$DEPLOY_API_URL" ]]; then
  api_url="${API_BASE_URL:-$DEPLOY_API_URL}"
  echo "🔗 Testing production API connection..."
  
  if curl -s -f "${api_url}/api/health" > /dev/null; then
    echo "✅ Production API is accessible"
  else
    echo "⚠️  Production API not accessible at ${api_url}"
    echo "   Make sure your server is running and the URL is correct"
  fi
fi

echo ""
echo "✨ Ready to ingest listings in production!"