# Safe Database Migration Script
# This script backs up your database before applying the Review system migration

# Step 1: Create backup directory
$backupDir = "database-backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# Step 2: Create timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupFile = "$backupDir/backup_before_reviews_$timestamp.sql"

Write-Host "🔄 Creating database backup..." -ForegroundColor Cyan

# Step 3: Backup current database schema and data
$env:PGPASSWORD = "rGWtqTkNDxMzMuKCPiPkqWfkKhbzZwKa"
pg_dump -h yamanote.proxy.rlwy.net -p 31859 -U postgres -d railway -F p -f $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green
    $fileSize = (Get-Item $backupFile).Length / 1MB
    Write-Host "   Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "❌ Backup failed! Aborting migration." -ForegroundColor Red
    exit 1
}

# Step 4: Ask for confirmation
Write-Host ""
Write-Host "⚠️  Ready to apply migration that will:" -ForegroundColor Yellow
Write-Host "   • Create 'Review' table" -ForegroundColor Gray
Write-Host "   • Create 'ReviewHelpfulVote' table" -ForegroundColor Gray
Write-Host "   • Add indexes and foreign keys" -ForegroundColor Gray
Write-Host "   • NO existing data will be modified or deleted" -ForegroundColor Green
Write-Host ""
$confirm = Read-Host "Continue with migration? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

# Step 5: Apply migration
Write-Host ""
Write-Host "🔄 Applying migration..." -ForegroundColor Cyan

$env:PGPASSWORD = "rGWtqTkNDxMzMuKCPiPkqWfkKhbzZwKa"
psql -h yamanote.proxy.rlwy.net -p 31859 -U postgres -d railway -f manual-migration-reviews.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    
    # Step 6: Regenerate Prisma Client
    Write-Host ""
    Write-Host "🔄 Regenerating Prisma Client..." -ForegroundColor Cyan
    pnpm prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma Client regenerated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 All done! Review system is ready to use." -ForegroundColor Green
        Write-Host "   Backup location: $backupFile" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Prisma generate failed, but migration was successful" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "   Your backup is safe at: $backupFile" -ForegroundColor Gray
    Write-Host "   To restore: psql -h yamanote.proxy.rlwy.net -p 31859 -U postgres -d railway < $backupFile" -ForegroundColor Gray
    exit 1
}
