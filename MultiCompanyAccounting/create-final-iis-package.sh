#!/bin/bash

# Create final IIS deployment package with credit/debit notes
echo "Creating Final IIS Deployment Package..."

# Package directory
PACKAGE_DIR="final-deployment"
TAR_NAME="multi-company-accounting-iis-ready-deployment.tar.gz"

# Remove old tar file
rm -f $TAR_NAME

# Update package.json for production
cat > $PACKAGE_DIR/package.json << 'EOF'
{
  "name": "multi-company-accounting-system",
  "version": "2.0.0",
  "description": "Multi-Company Accounting System with Credit/Debit Notes and Application Insights",
  "type": "module",
  "main": "enhanced-server-production.js",
  "scripts": {
    "start": "node enhanced-server-production.js",
    "test": "node test-all-apis.js",
    "install-iis": "powershell -ExecutionPolicy Bypass -File install.ps1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "accounting",
    "multi-company",
    "credit-notes",
    "debit-notes",
    "intercompany",
    "iis",
    "windows",
    "application-insights"
  ],
  "author": "TEBS Corporation",
  "license": "MIT"
}
EOF

# Create comprehensive README for the package
cat > $PACKAGE_DIR/README.md << 'EOF'
# Multi-Company Accounting System - IIS Ready Deployment

## Quick Start
This package is ready for direct deployment to Windows IIS servers.

### Automated Installation (Recommended)
1. Extract package to temporary directory
2. Run as Administrator: `powershell -ExecutionPolicy Bypass -File install.ps1`
3. Access: `http://your-server/api/health`

### Manual Installation
1. Extract to `C:\inetpub\wwwroot\accounting\`
2. Run: `install.bat`
3. Configure IIS site with provided `web.config`
4. Initialize database: POST `/api/setup-database`

## Features
- Complete credit/debit notes management
- Intercompany adjustments with dual-note creation
- Product line item support
- Application Insights logging
- Real-time amount calculations
- Multi-company support (42 companies)

## System Requirements
- Windows Server 2016+ with IIS 10+
- Node.js 18+
- iisnode module
- PostgreSQL database access

## Access Points
- Health: `/api/health`
- Credit Notes: `/credit-notes-management`
- Debit Notes: `/debit-notes-management`
- Intercompany: `/intercompany-adjustments`

## Testing
Run comprehensive API tests: `node test-all-apis.js`

See `IIS_DEPLOYMENT_README.md` for detailed instructions.
EOF

# Create deployment checklist
cat > $PACKAGE_DIR/DEPLOYMENT_CHECKLIST.md << 'EOF'
# IIS Deployment Checklist

## Pre-Deployment
- [ ] Windows Server 2016+ with IIS 10+
- [ ] Node.js 18+ installed
- [ ] iisnode module installed
- [ ] PostgreSQL database accessible
- [ ] Administrator privileges available

## Installation Steps
- [ ] Extract package to server
- [ ] Run `install.ps1` as Administrator OR follow manual steps
- [ ] Verify IIS site creation
- [ ] Test health endpoint: `/api/health`
- [ ] Initialize database: POST `/api/setup-database`
- [ ] Verify company data: `/api/companies`
- [ ] Test credit notes: `/api/credit-notes`
- [ ] Test debit notes: `/api/debit-notes`

## Post-Deployment
- [ ] Configure HTTPS certificates
- [ ] Set up monitoring
- [ ] Configure backup procedures
- [ ] Test all UI components
- [ ] Verify Application Insights logging
- [ ] Load test with production data

## Troubleshooting
- Check Node.js installation: `node --version`
- Verify iisnode: Check IIS modules
- Database connectivity: Test port 5432 to 135.235.154.222
- Permissions: Ensure IIS_IUSRS has access
- Logs: Check `logs/` directory and IIS logs

## Support
- Health check: `/api/health`
- API documentation: Available in `documentation/` folder
- Test suite: `node test-all-apis.js`
EOF

# Verify all required files exist
echo "Verifying package contents..."
REQUIRED_FILES=(
  "enhanced-server-production.js"
  "web.config"
  "package.json"
  "install.bat"
  "install.ps1"
  "IIS_DEPLOYMENT_README.md"
  "test-all-apis.js"
  "server/credit-debit-integration.js"
  "server/credit-debit-apis/credit-debit-notes-api.js"
  "server/credit-debit-apis/credit-debit-accounts-api.js"
  "server/credit-debit-apis/database-setup-api.js"
  "server/credit-debit-apis/application-insights-logger.js"
  "client/src/pages/credit-notes-management.tsx"
  "client/src/pages/debit-notes-management.tsx"
  "client/src/pages/intercompany-adjustments.tsx"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$PACKAGE_DIR/$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo "❌ Missing required files:"
  printf '%s\n' "${MISSING_FILES[@]}"
  echo "Please ensure all files are present before packaging"
  exit 1
fi

echo "✅ All required files present"

# Create the tar package
echo "Creating tar package..."
tar -czf $TAR_NAME $PACKAGE_DIR

# Verify package creation
if [ -f "$TAR_NAME" ]; then
  echo "✅ Package created successfully: $TAR_NAME"
  echo "Size: $(du -h $TAR_NAME | cut -f1)"
  echo "Contents: $(tar -tzf $TAR_NAME | wc -l) files"
  
  # Show package structure
  echo ""
  echo "Package structure:"
  tar -tzf $TAR_NAME | head -20
  if [ $(tar -tzf $TAR_NAME | wc -l) -gt 20 ]; then
    echo "... and $(($( tar -tzf $TAR_NAME | wc -l) - 20)) more files"
  fi
else
  echo "❌ Failed to create package"
  exit 1
fi

echo ""
echo "🎉 Final IIS deployment package ready!"
echo "📦 File: $TAR_NAME"
echo "🚀 Ready for direct IIS deployment with:"
echo "   - Credit/Debit notes functionality"
echo "   - Application Insights logging"
echo "   - Automated installation scripts"
echo "   - Comprehensive testing suite"
echo "   - Complete documentation"