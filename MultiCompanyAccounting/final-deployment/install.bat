@echo off
echo ====================================================================
echo Multi-Company Accounting System - IIS Installation
echo Credit/Debit Notes with Application Insights
echo ====================================================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version

REM Install dependencies
echo.
echo Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Create necessary directories
echo.
echo Creating application directories...
if not exist "logs" mkdir logs
if not exist "public" mkdir public

REM Set permissions (requires admin rights)
echo.
echo Setting up file permissions...
icacls . /grant "IIS_IUSRS:(OI)(CI)R" /T >nul 2>&1
icacls logs /grant "IIS_IUSRS:(OI)(CI)F" /T >nul 2>&1

echo.
echo ====================================================================
echo Installation Complete!
echo ====================================================================
echo.
echo Next Steps:
echo 1. Copy this folder to your IIS directory (e.g., C:\inetpub\wwwroot\accounting\)
echo 2. Create IIS site pointing to the application folder
echo 3. Set Application Pool to "No Managed Code"
echo 4. Copy web.config to the site root
echo 5. Test health endpoint: http://your-server/api/health
echo 6. Initialize database: POST http://your-server/api/setup-database
echo.
echo Access Points:
echo - Health Check: /api/health
echo - Credit Notes: /credit-notes-management
echo - Debit Notes: /debit-notes-management
echo - Intercompany: /intercompany-adjustments
echo.
echo For detailed instructions, see IIS_DEPLOYMENT_README.md
echo.
pause