@echo off
REM Windows batch script to regenerate Prisma client and deploy migrations

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  PRISMA CLIENT GENERATION AND MIGRATION DEPLOYMENT         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "c:\Users\kirpe\Downloads\simplycrm\simplycrm\wacrm"

echo [1/2] Regenerating Prisma Client...
echo.
call npx prisma generate

if errorlevel 1 (
    echo ❌ Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo ✅ Prisma Client regenerated successfully
echo.
echo [2/2] Deploying migrations to database...
echo.
call npx prisma migrate deploy

if errorlevel 1 (
    echo ❌ Migration deploy failed!
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ SUCCESS - ALL STEPS COMPLETED                         ║
echo ║  📱 phoneNumber column is now available in database       ║
echo ║  ✅ Prisma client types updated                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo  1. Try saving your phone number again
echo  2. Go to Settings → Workspace → Your Profile
echo  3. Enter your phone number and click "Save Profile"
echo.
pause
