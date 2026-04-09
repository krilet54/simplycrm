# PowerShell script to run Prisma migrations
Write-Host "🔄 Starting Prisma migration..." -ForegroundColor Cyan
Write-Host "📍 Database URL configured: postgresql://..." -ForegroundColor Gray

# Run the migration
$env:NODE_ENV = "production"
& npm run prisma:migrate

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host "📱 phoneNumber column is now available in the users table" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "📋 Check the error message above for details" -ForegroundColor Yellow
}
