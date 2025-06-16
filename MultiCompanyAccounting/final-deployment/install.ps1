# Multi-Company Accounting System - PowerShell Installation Script
# Credit/Debit Notes with Application Insights for IIS

param(
    [string]$SiteName = "Multi-Company-Accounting",
    [string]$AppPoolName = "AccountingAppPool",
    [int]$Port = 80,
    [string]$PhysicalPath = "C:\inetpub\wwwroot\accounting"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Multi-Company Accounting System - IIS Automated Setup" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click and 'Run as Administrator'" -ForegroundColor Red
    exit 1
}

# Check Node.js installation
Write-Host "`nChecking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install IIS features if needed
Write-Host "`nChecking IIS installation..." -ForegroundColor Yellow
$iisFeatures = @(
    "IIS-WebServerRole",
    "IIS-WebServer",
    "IIS-CommonHttpFeatures",
    "IIS-StaticContent",
    "IIS-DefaultDocument",
    "IIS-DirectoryBrowsing",
    "IIS-HttpErrors",
    "IIS-HttpRedirect",
    "IIS-ApplicationDevelopment",
    "IIS-ASPNET45",
    "IIS-NetFxExtensibility45",
    "IIS-ISAPIExtensions",
    "IIS-ISAPIFilter",
    "IIS-ManagementConsole"
)

foreach ($feature in $iisFeatures) {
    $featureState = Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue
    if ($featureState -and $featureState.State -eq "Disabled") {
        Write-Host "Enabling IIS feature: $feature" -ForegroundColor Yellow
        Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart
    }
}

# Import WebAdministration module
Import-Module WebAdministration -ErrorAction SilentlyContinue
if (-not (Get-Module WebAdministration)) {
    Write-Host "ERROR: WebAdministration module not available. Please install IIS Management Tools." -ForegroundColor Red
    exit 1
}

# Create physical directory
Write-Host "`nCreating application directory..." -ForegroundColor Yellow
if (Test-Path $PhysicalPath) {
    Write-Host "Directory already exists: $PhysicalPath" -ForegroundColor Yellow
} else {
    New-Item -ItemType Directory -Path $PhysicalPath -Force
    Write-Host "Created directory: $PhysicalPath" -ForegroundColor Green
}

# Copy application files
Write-Host "`nCopying application files..." -ForegroundColor Yellow
$currentPath = Get-Location
Copy-Item -Path "$currentPath\*" -Destination $PhysicalPath -Recurse -Force -Exclude @("install.ps1", "install.bat")
Write-Host "Application files copied successfully" -ForegroundColor Green

# Install Node.js dependencies
Write-Host "`nInstalling Node.js dependencies..." -ForegroundColor Yellow
Push-Location $PhysicalPath
try {
    npm install --production
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

# Create Application Pool
Write-Host "`nConfiguring IIS Application Pool..." -ForegroundColor Yellow
if (Get-IISAppPool -Name $AppPoolName -ErrorAction SilentlyContinue) {
    Remove-WebAppPool -Name $AppPoolName
    Write-Host "Removed existing application pool: $AppPoolName" -ForegroundColor Yellow
}

New-WebAppPool -Name $AppPoolName
Set-ItemProperty -Path "IIS:\AppPools\$AppPoolName" -Name "managedRuntimeVersion" -Value ""
Set-ItemProperty -Path "IIS:\AppPools\$AppPoolName" -Name "enable32BitAppOnWin64" -Value $false
Set-ItemProperty -Path "IIS:\AppPools\$AppPoolName" -Name "processModel.identityType" -Value "ApplicationPoolIdentity"
Write-Host "Application pool created: $AppPoolName" -ForegroundColor Green

# Create IIS Site
Write-Host "`nConfiguring IIS Website..." -ForegroundColor Yellow
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Remove-Website -Name $SiteName
    Write-Host "Removed existing website: $SiteName" -ForegroundColor Yellow
}

New-Website -Name $SiteName -PhysicalPath $PhysicalPath -Port $Port -ApplicationPool $AppPoolName
Write-Host "Website created: $SiteName on port $Port" -ForegroundColor Green

# Set permissions
Write-Host "`nSetting file permissions..." -ForegroundColor Yellow
$acl = Get-Acl $PhysicalPath
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($accessRule)

$logsPath = Join-Path $PhysicalPath "logs"
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath -Force
}
$logsAccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$logsAcl = Get-Acl $logsPath
$logsAcl.SetAccessRule($logsAccessRule)
Set-Acl -Path $logsPath -AclObject $logsAcl

Set-Acl -Path $PhysicalPath -AclObject $acl
Write-Host "Permissions configured successfully" -ForegroundColor Green

# Test configuration
Write-Host "`nTesting configuration..." -ForegroundColor Yellow
try {
    Start-Sleep -Seconds 3
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "Health check successful!" -ForegroundColor Green
    } else {
        Write-Host "Health check returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Health check failed - this is normal for initial setup" -ForegroundColor Yellow
    Write-Host "You may need to initialize the database first" -ForegroundColor Yellow
}

# Initialize database
Write-Host "`nInitializing database..." -ForegroundColor Yellow
try {
    $dbResponse = Invoke-RestMethod -Uri "http://localhost:$Port/api/setup-database" -Method POST -TimeoutSec 30
    Write-Host "Database initialized successfully!" -ForegroundColor Green
    Write-Host "Tables created: $($dbResponse.tablesCreated.Count)" -ForegroundColor Green
} catch {
    Write-Host "Database initialization failed - you may need to run this manually later" -ForegroundColor Yellow
    Write-Host "POST http://localhost:$Port/api/setup-database" -ForegroundColor Yellow
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "`nConfiguration Summary:" -ForegroundColor White
Write-Host "- Website Name: $SiteName" -ForegroundColor Cyan
Write-Host "- Application Pool: $AppPoolName" -ForegroundColor Cyan
Write-Host "- Port: $Port" -ForegroundColor Cyan
Write-Host "- Physical Path: $PhysicalPath" -ForegroundColor Cyan

Write-Host "`nAccess Points:" -ForegroundColor White
Write-Host "- Health Check: http://localhost:$Port/api/health" -ForegroundColor Cyan
Write-Host "- Companies API: http://localhost:$Port/api/companies" -ForegroundColor Cyan
Write-Host "- Credit Notes UI: http://localhost:$Port/credit-notes-management" -ForegroundColor Cyan
Write-Host "- Debit Notes UI: http://localhost:$Port/debit-notes-management" -ForegroundColor Cyan
Write-Host "- Intercompany UI: http://localhost:$Port/intercompany-adjustments" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Test the health endpoint in your browser" -ForegroundColor Yellow
Write-Host "2. Verify database connection and data" -ForegroundColor Yellow
Write-Host "3. Access the UI components for credit/debit notes" -ForegroundColor Yellow
Write-Host "4. Configure HTTPS for production use" -ForegroundColor Yellow
Write-Host "5. Set up monitoring and backup procedures" -ForegroundColor Yellow

Write-Host "`nFor detailed documentation, see IIS_DEPLOYMENT_README.md" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan