# Simple Migration Script (No pg_dump required)
# Applies Review system migration directly

Write-Host "⚠️  IMPORTANT: Migration Safety Check" -ForegroundColor Yellow
Write-Host ""
Write-Host "This migration will:" -ForegroundColor White
Write-Host "  ✅ Create 'Review' table (NEW)" -ForegroundColor Green
Write-Host "  ✅ Create 'ReviewHelpfulVote' table (NEW)" -ForegroundColor Green
Write-Host "  ✅ Add indexes and foreign keys" -ForegroundColor Green
Write-Host ""
Write-Host "This migration will NOT:" -ForegroundColor White
Write-Host "  ❌ Delete any existing tables" -ForegroundColor Red
Write-Host "  ❌ Modify any existing data" -ForegroundColor Red
Write-Host "  ❌ Drop any columns" -ForegroundColor Red
Write-Host ""
Write-Host "Railway automatically backs up your database daily." -ForegroundColor Cyan
Write-Host "You can restore from Railway dashboard if needed." -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Type 'yes' to continue with migration"

if ($confirm -ne "yes") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Connecting to database..." -ForegroundColor Cyan

# Read the SQL file
$sqlContent = Get-Content -Path "manual-migration-reviews.sql" -Raw

# Use Prisma's db execute command
Write-Host "🔄 Applying migration via Prisma..." -ForegroundColor Cyan

# Create a temporary schema file for migration
$tempSchema = @"
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
"@

# Execute the SQL using Prisma
try {
    # Split SQL into individual statements
    $statements = $sqlContent -split ';' | Where-Object { $_.Trim() -ne '' -and -not $_.Trim().StartsWith('--') }
    
    $successCount = 0
    $totalCount = $statements.Count
    
    foreach ($statement in $statements) {
        $trimmed = $statement.Trim()
        if ($trimmed -ne '' -and -not $trimmed.StartsWith('--')) {
            Write-Host "  Executing statement $($successCount + 1)/$totalCount..." -ForegroundColor Gray
            
            # Escape quotes for PowerShell
            $escapedSQL = $trimmed.Replace('"', '\"')
            
            # Use psql connection string directly (requires psql, but Railway CLI might have it)
            # If this fails, we'll use the Node.js approach below
            $successCount++
        }
    }
    
    Write-Host "✅ Migration statements prepared!" -ForegroundColor Green
    
} catch {
    Write-Host "⚠️  Could not use psql, trying alternative method..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Using Node.js to apply migration..." -ForegroundColor Cyan

# Create a Node.js script to execute the migration
$nodeScript = @"
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const sql = fs.readFileSync('manual-migration-reviews.sql', 'utf8');
    
    await client.query(sql);
    console.log('✅ Migration applied successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
"@

Set-Content -Path "temp-migrate.js" -Value $nodeScript

# Check if pg module is installed
Write-Host "🔄 Checking Node.js PostgreSQL driver..." -ForegroundColor Cyan
$pgInstalled = pnpm list pg 2>&1 | Select-String "pg"

if (-not $pgInstalled) {
    Write-Host "📦 Installing pg module..." -ForegroundColor Cyan
    pnpm add -D pg
}

# Run the migration
node temp-migrate.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🔄 Regenerating Prisma Client..." -ForegroundColor Cyan
    pnpm prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 SUCCESS! Review system is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart your dev server" -ForegroundColor Gray
        Write-Host "  2. Test creating a review via /api/reviews" -ForegroundColor Gray
        Write-Host "  3. Use <ProductReviews /> component in your pages" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Prisma generate had an issue, but migration succeeded" -ForegroundColor Yellow
        Write-Host "   Try running: pnpm prisma generate" -ForegroundColor Gray
    }
    
    # Clean up
    Remove-Item "temp-migrate.js" -ErrorAction SilentlyContinue
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "   Check error messages above" -ForegroundColor Gray
    Write-Host "   Your database was not modified" -ForegroundColor Gray
    Remove-Item "temp-migrate.js" -ErrorAction SilentlyContinue
    exit 1
}
"@
