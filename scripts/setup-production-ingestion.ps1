# Production Ingestion Setup Script (Windows PowerShell)
# Run this on your production server after deployment

param(
    [switch]$Force
)

Write-Host "🚀 Setting up production ingestion environment..." -ForegroundColor Green

# Check environment
$isProduction = $env:NODE_ENV -eq "production"
if (-not $isProduction -and -not $Force) {
    Write-Host "⚠️  Warning: NODE_ENV is not set to production" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Create scripts directory
if (-not (Test-Path "scripts")) {
    New-Item -ItemType Directory -Name "scripts" | Out-Null
}

# Check required environment variables
$requiredVars = @("DATABASE_URL", "ADMIN_EMAIL")
$missingVars = @()

foreach ($var in $requiredVars) {
    if (-not (Get-Variable -Name $var -ErrorAction SilentlyContinue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Set these variables in your .env.production file:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "  $var=your_value_here" -ForegroundColor Yellow
    }
    exit 1
}

# Check admin password
if (-not $env:ADMIN_PASSWORD) {
    Write-Host "⚠️  ADMIN_PASSWORD not set. Production scripts require authentication." -ForegroundColor Yellow
    Write-Host "Add to your .env.production:" -ForegroundColor Yellow
    Write-Host "  ADMIN_PASSWORD=your_secure_admin_password" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue without authentication? Scripts will only work in dev mode (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Set API base URL
if (-not $env:DEPLOY_API_URL -and -not $env:API_BASE_URL) {
    Write-Host "🌐 API base URL not set. Please enter your production domain:" -ForegroundColor Cyan
    $prodUrl = Read-Host "Production URL (e.g., https://your-domain.com)"
    
    if ($prodUrl) {
        Add-Content -Path ".env.production" -Value "API_BASE_URL='$prodUrl'"
        Write-Host "✅ Added API_BASE_URL to .env.production" -ForegroundColor Green
    }
}

# Install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
    
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm install
    } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install
    } else {
        Write-Host "❌ Neither pnpm nor npm found. Please install Node.js dependencies manually." -ForegroundColor Red
        exit 1
    }
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Blue
npx prisma generate

# Test database connection
Write-Host "🗄️  Testing database connection..." -ForegroundColor Blue
try {
    $null = npx prisma db execute --command "SELECT 1;" 2>$null
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Database connection failed. Check your DATABASE_URL" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Production ingestion setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Usage:" -ForegroundColor Cyan
Write-Host "  # Alibaba listings" -ForegroundColor Yellow
Write-Host "  node scripts/retry-alibaba-production.js --category=MISSING"
Write-Host "  node scripts/retry-alibaba-production.js --category=PARTIAL"
Write-Host "  node scripts/retry-alibaba-production.js --category=BAD"
Write-Host ""
Write-Host "  # Made-in-China listings" -ForegroundColor Yellow
Write-Host "  node scripts/retry-mic-production.js"
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "  - Scripts automatically detect production mode"
Write-Host "  - Progress is saved and can be resumed"
Write-Host "  - Use Ctrl+C to stop gracefully"
Write-Host "  - Check logs for detailed progress"
Write-Host ""

# Test API connection
$apiUrl = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { $env:DEPLOY_API_URL }
if ($apiUrl) {
    Write-Host "🔗 Testing production API connection..." -ForegroundColor Blue
    
    try {
        $response = Invoke-WebRequest -Uri "$apiUrl/api/health" -Method Get -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Production API is accessible" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Production API returned status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Production API not accessible at $apiUrl" -ForegroundColor Yellow
        Write-Host "   Make sure your server is running and the URL is correct" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✨ Ready to ingest listings in production!" -ForegroundColor Magenta

# Create quick start batch file
$batchContent = @"
@echo off
echo 🚀 MOQ Pools Production Ingestion Tools
echo.
echo Choose an option:
echo 1. Alibaba MISSING listings
echo 2. Alibaba PARTIAL listings  
echo 3. Alibaba BAD listings
echo 4. Made-in-China listings
echo.
set /p choice=Enter your choice (1-4): 

if "%choice%"=="1" node scripts/retry-alibaba-production.js --category=MISSING
if "%choice%"=="2" node scripts/retry-alibaba-production.js --category=PARTIAL
if "%choice%"=="3" node scripts/retry-alibaba-production.js --category=BAD
if "%choice%"=="4" node scripts/retry-mic-production.js

pause
"@

$batchContent | Out-File -FilePath "ingestion-menu.bat" -Encoding ASCII
Write-Host "💼 Created ingestion-menu.bat for easy access" -ForegroundColor Green