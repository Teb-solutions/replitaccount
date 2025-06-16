#!/bin/bash

# Create IIS deployment package for credit/debit notes with Application Insights
echo "Creating IIS Credit/Debit Notes Deployment Package..."

# Create package directory
PACKAGE_DIR="credit-debit-notes-iis-deployment"
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Create directory structure for IIS deployment
mkdir -p $PACKAGE_DIR/server/apis
mkdir -p $PACKAGE_DIR/client/src/pages
mkdir -p $PACKAGE_DIR/client/src/components/ui
mkdir -p $PACKAGE_DIR/database
mkdir -p $PACKAGE_DIR/documentation
mkdir -p $PACKAGE_DIR/iis-config
mkdir -p $PACKAGE_DIR/tests

# Copy only credit/debit notes specific APIs
echo "Copying credit/debit notes APIs..."
cp server/credit-debit-notes-api.js $PACKAGE_DIR/server/apis/
cp server/credit-debit-accounts-api.js $PACKAGE_DIR/server/apis/
cp server/database-setup-api.js $PACKAGE_DIR/server/apis/
cp server/application-insights-logger.js $PACKAGE_DIR/server/apis/

# Copy UI components
echo "Copying UI components..."
cp client/src/pages/credit-notes-management.tsx $PACKAGE_DIR/client/src/pages/
cp client/src/pages/debit-notes-management.tsx $PACKAGE_DIR/client/src/pages/
cp client/src/pages/intercompany-adjustments.tsx $PACKAGE_DIR/client/src/pages/

# Copy essential UI components for credit/debit notes
UI_COMPONENTS=(
  "button.tsx"
  "input.tsx"
  "label.tsx"
  "select.tsx"
  "textarea.tsx"
  "table.tsx"
  "card.tsx"
  "dialog.tsx"
  "badge.tsx"
  "form.tsx"
  "toast.tsx"
  "toaster.tsx"
)

for component in "${UI_COMPONENTS[@]}"; do
  if [ -f "client/src/components/ui/$component" ]; then
    cp "client/src/components/ui/$component" "$PACKAGE_DIR/client/src/components/ui/"
  fi
done

# Copy hooks needed for UI
mkdir -p $PACKAGE_DIR/client/src/hooks
if [ -f "client/src/hooks/use-toast.tsx" ]; then
  cp client/src/hooks/use-toast.tsx $PACKAGE_DIR/client/src/hooks/
fi

# Copy lib files needed
mkdir -p $PACKAGE_DIR/client/src/lib
if [ -f "client/src/lib/utils.ts" ]; then
  cp client/src/lib/utils.ts $PACKAGE_DIR/client/src/lib/
fi

# Copy test files
echo "Copying test files..."
cp test-credit-debit-system.js $PACKAGE_DIR/tests/
cp test-server.js $PACKAGE_DIR/tests/

# Create IIS-specific configuration
cat > $PACKAGE_DIR/iis-config/web.config << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <!-- API routes -->
        <rule name="API Routes" stopProcessing="true">
          <match url="^api/.*" />
          <action type="Rewrite" url="server.js" />
        </rule>
        <!-- Static files -->
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}" />
        </rule>
        <!-- React SPA -->
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <iisnode 
      node_env="production"
      nodeProcessCountPerApplication="1"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="3"
      namedPipeConnectionRetryDelay="2000"
      maxNamedPipeConnectionPoolSize="512"
      maxNamedPipePooledConnectionAge="30000"
      asyncCompletionThreadCount="0"
      initialRequestBufferSize="4096"
      maxRequestBufferSize="65536"
      watchedFiles="*.js"
      uncFileChangesPollingInterval="5000"
      gracefulShutdownTimeout="60000"
      loggingEnabled="true"
      logDirectoryNameSuffix="logs"
      debuggingEnabled="false"
      devErrorsEnabled="false" />
  </system.webServer>
</configuration>
EOF

# Create IIS-compatible server entry point
cat > $PACKAGE_DIR/server.js << 'EOF'
/**
 * IIS-Compatible Server for Credit/Debit Notes System
 * Designed for Windows IIS deployment with iisnode
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Import credit/debit notes APIs
async function setupAPIs() {
  try {
    // Import credit/debit notes API
    const { default: creditDebitNotesAPI } = await import('./server/apis/credit-debit-notes-api.js');
    app.use(creditDebitNotesAPI);
    console.log('✅ Credit/Debit notes API loaded');

    // Import credit/debit accounts API
    const { default: creditDebitAccountsAPI } = await import('./server/apis/credit-debit-accounts-api.js');
    app.use(creditDebitAccountsAPI);
    console.log('✅ Credit/Debit accounts API loaded');

    // Import database setup API
    const { default: databaseSetupAPI } = await import('./server/apis/database-setup-api.js');
    app.use(databaseSetupAPI);
    console.log('✅ Database setup API loaded');

    // Import Application Insights logger
    const { requestIdMiddleware, appLogger } = await import('./server/apis/application-insights-logger.js');
    app.use(requestIdMiddleware);
    console.log('✅ Application Insights logging enabled');

  } catch (error) {
    console.error('❌ Error loading APIs:', error.message);
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Credit/Debit Notes System',
    timestamp: new Date().toISOString(),
    environment: 'IIS Production'
  });
});

// Serve static files (React build)
app.use(express.static(path.join(__dirname, 'public')));

// Handle React routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Initialize APIs
setupAPIs();

// For IIS, listen on the port provided by iisnode
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Credit/Debit Notes Server running on port ${port}`);
  console.log(`📊 Health check: /api/health`);
  console.log(`🏢 Environment: IIS Production`);
});

export default app;
EOF

# Create package.json for deployment
cat > $PACKAGE_DIR/package.json << 'EOF'
{
  "name": "credit-debit-notes-system",
  "version": "1.0.0",
  "description": "Credit and Debit Notes System for Multi-Company Accounting",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node tests/test-credit-debit-system.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": ["accounting", "credit-notes", "debit-notes", "multi-company", "iis"],
  "author": "TEBS Corporation",
  "license": "MIT"
}
EOF

# Create deployment documentation
cat > $PACKAGE_DIR/documentation/IIS_DEPLOYMENT_GUIDE.md << 'EOF'
# IIS Deployment Guide - Credit/Debit Notes System

## Prerequisites
- Windows Server with IIS 10+
- Node.js 18+ installed
- iisnode module installed
- PostgreSQL connection available

## Installation Steps

### 1. Prepare IIS
1. Install iisnode module from https://github.com/Azure/iisnode
2. Enable IIS features: Static Content, Default Document, Directory Browsing
3. Configure application pool to use "No Managed Code"

### 2. Deploy Application
1. Extract package to `C:\inetpub\wwwroot\credit-debit-notes\`
2. Copy `iis-config/web.config` to root directory
3. Install dependencies: `npm install`
4. Set appropriate file permissions for IIS_IUSRS

### 3. Database Configuration
Update database connection in API files:
- Host: 135.235.154.222
- Database: account_replit_staging
- User: pguser
- Password: StrongP@ss123
- SSL: false

### 4. Create IIS Site
1. Open IIS Manager
2. Add Website:
   - Site name: "Credit-Debit-Notes"
   - Physical path: C:\inetpub\wwwroot\credit-debit-notes
   - Port: 80 (or your preferred port)
3. Set application pool to use Node.js

### 5. Setup Database Tables
Navigate to: http://your-server/api/setup-database (POST request)

### 6. Test Installation
- Health check: http://your-server/api/health
- UI Access: http://your-server/credit-notes-management

## API Endpoints

### Core Endpoints
- POST /api/setup-database - Initialize database tables
- GET /api/credit-notes - List credit notes
- POST /api/credit-notes - Create credit note
- GET /api/debit-notes - List debit notes
- POST /api/debit-notes - Create debit note
- GET /api/intercompany-adjustments - List adjustments
- POST /api/intercompany-adjustment - Create adjustment

### Account Management
- GET /api/credit-accounts - Credit account tracking
- GET /api/debit-accounts - Debit account tracking

## UI Routes
- /credit-notes-management - Credit notes interface
- /debit-notes-management - Debit notes interface
- /intercompany-adjustments - Adjustments interface

## Application Insights
- Request ID tracking enabled
- Structured logging format
- Application ID: e04a0cf1-8129-4bc2-8707-016ae726c876

## Troubleshooting

### Common Issues
1. **500 Error**: Check node.js path in web.config
2. **Database Connection**: Verify network access to PostgreSQL
3. **Permission Errors**: Ensure IIS_IUSRS has read/execute on files
4. **API Not Found**: Verify URL rewrite rules in web.config

### Log Locations
- IIS logs: C:\inetpub\logs\LogFiles
- Node.js logs: Application directory/logs
- Application Insights: Azure portal

## Performance Optimization
- Enable compression in IIS
- Configure caching headers
- Monitor memory usage
- Set up load balancing if needed

## Security Considerations
- Use HTTPS in production
- Configure proper authentication
- Restrict database access
- Enable request filtering
EOF

# Create React integration guide
cat > $PACKAGE_DIR/documentation/REACT_INTEGRATION.md << 'EOF'
# React Integration Guide

## Adding UI Components to Existing React App

### 1. Copy Components
Copy the following files to your React application:

```
client/src/pages/credit-notes-management.tsx
client/src/pages/debit-notes-management.tsx
client/src/pages/intercompany-adjustments.tsx
```

### 2. Add Routes
Add these routes to your App.tsx or router configuration:

```tsx
import CreditNotesManagement from '@/pages/credit-notes-management';
import DebitNotesManagement from '@/pages/debit-notes-management';
import IntercompanyAdjustments from '@/pages/intercompany-adjustments';

// Add these routes
<Route path="/credit-notes-management" component={CreditNotesManagement} />
<Route path="/debit-notes-management" component={DebitNotesManagement} />
<Route path="/intercompany-adjustments" component={IntercompanyAdjustments} />
```

### 3. Required Dependencies
Ensure these packages are installed:

```bash
npm install @tanstack/react-query @hookform/resolvers
npm install react-hook-form zod lucide-react
```

### 4. UI Components
Copy required Shadcn UI components from the components/ui folder.

### 5. Navigation
Add navigation links to your sidebar or menu:

```tsx
<Link to="/credit-notes-management">Credit Notes</Link>
<Link to="/debit-notes-management">Debit Notes</Link>
<Link to="/intercompany-adjustments">Intercompany Adjustments</Link>
```
EOF

# Create simple installation script
cat > $PACKAGE_DIR/install.bat << 'EOF'
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
EOF

# Copy documentation
echo "Copying documentation..."
cp CREDIT_DEBIT_NOTES_DEPLOYMENT_COMPLETE.md $PACKAGE_DIR/documentation/ 2>/dev/null
cp FINAL_DEPLOYMENT_PACKAGE_SUMMARY.md $PACKAGE_DIR/documentation/ 2>/dev/null

# Create README
cat > $PACKAGE_DIR/README.md << 'EOF'
# Credit/Debit Notes System - IIS Deployment Package

## Overview
This package contains the complete credit and debit notes system specifically configured for Windows IIS deployment.

## Package Contents
- **Server APIs**: Credit/debit notes functionality with Application Insights
- **UI Components**: React TypeScript components for management interfaces
- **IIS Configuration**: web.config and deployment scripts
- **Documentation**: Complete setup and integration guides
- **Tests**: Comprehensive test suite

## Quick Start
1. Extract to IIS directory
2. Run `install.bat` or `npm install`
3. Configure database connection
4. Set up IIS site with provided web.config
5. Initialize database: POST /api/setup-database
6. Access UI at configured domain

## Features
- Credit notes management with product line items
- Debit notes management for vendor adjustments
- Intercompany adjustments with dual-note creation
- Application Insights logging integration
- IIS-optimized configuration
- Production-ready error handling

## System Requirements
- Windows Server with IIS 10+
- Node.js 18+
- iisnode module
- PostgreSQL database access

See documentation/ folder for detailed setup instructions.
EOF

echo "Creating deployment package..."
tar -czf credit-debit-notes-iis-deployment.tar.gz $PACKAGE_DIR

echo "IIS deployment package created: credit-debit-notes-iis-deployment.tar.gz"
echo "Size: $(du -h credit-debit-notes-iis-deployment.tar.gz | cut -f1)"
echo "Contents: $(find $PACKAGE_DIR -type f | wc -l) files"

ls -la credit-debit-notes-iis-deployment.tar.gz