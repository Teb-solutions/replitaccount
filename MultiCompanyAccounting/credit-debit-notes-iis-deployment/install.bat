@echo off
echo Installing Credit/Debit Notes System...

REM Install Node.js dependencies
echo Installing dependencies...
npm install

REM Create logs directory
mkdir logs

echo Installation complete!
echo.
echo Next steps:
echo 1. Configure database connection in server/apis/ files
echo 2. Copy web.config to IIS directory
echo 3. Run database setup: POST /api/setup-database
echo 4. Access UI at: /credit-notes-management
echo.
pause
