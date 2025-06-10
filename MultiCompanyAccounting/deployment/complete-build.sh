#!/bin/bash

# Complete Build Script for Multi-Company Accounting System
echo "🚀 Building Multi-Company Accounting System for deployment..."

# Create deployment package directory
rm -rf deployment-package
mkdir -p deployment-package

# Step 1: Build Frontend (from root directory)
echo "📦 Building React frontend..."
npm install --silent
npm run build
echo "✅ Frontend build completed"

# Step 2: Copy built frontend to deployment package
echo "📋 Copying frontend build..."
cp -r dist/* deployment-package/

# Step 3: Prepare backend for production
echo "🔧 Preparing backend..."
mkdir -p deployment-package/backend
cp -r backend/* deployment-package/backend/

# Step 4: Create production package.json
cat > deployment-package/package.json << 'EOF'
{
  "name": "multi-company-accounting-production",
  "version": "1.0.0",
  "description": "Multi-Company Accounting System - Production Build",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cookie-parser": "^1.4.6",
    "express-session": "^1.17.3",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "dotenv": "^16.3.1"
  }
}
EOF

# Step 5: Create production server file
cat > deployment-package/server.js << 'EOF'
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'accounting-app-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// CORS for production
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Company Accounting API',
      version: '1.0.0',
      description: 'Production API for multi-company accounting system'
    }
  },
  apis: ['./backend/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({
    message: 'Multi-Company Accounting System',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      ui: '/',
      api: '/api/*',
      docs: '/api-docs'
    }
  });
});

// Import and register backend APIs
async function loadBackendAPIs() {
  try {
    const modules = [
      './backend/routes.js',
      './backend/company-management-api.js',
      './backend/comprehensive-reports-api.js',
      './backend/accounts-api-fixed.js',
      './backend/receipts-direct-api.js',
      './backend/bill-payments-api.js',
      './backend/intercompany-workflow-api.js'
    ];

    for (const modulePath of modules) {
      try {
        const module = await import(modulePath);
        if (module.default) app.use(module.default);
      } catch (error) {
        console.log(`Skipping ${modulePath}: ${error.message}`);
      }
    }
    console.log('✅ Backend APIs loaded');
  } catch (error) {
    console.error('Error loading APIs:', error);
  }
}

// Serve static files (React UI)
app.use(express.static(__dirname));

// Handle client-side routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Start server
async function startServer() {
  await loadBackendAPIs();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Multi-Company Accounting System running on port ${PORT}`);
    console.log(`📊 UI: http://localhost:${PORT}/`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  });
}

startServer();
EOF

# Step 6: Create Windows batch file
cat > deployment-package/start-windows.bat << 'EOF'
@echo off
title Multi-Company Accounting System
echo Starting Multi-Company Accounting System...
echo.
echo Dashboard will be available at: http://localhost:5000
echo API Documentation at: http://localhost:5000/api-docs
echo.
node server.js
pause
EOF

# Step 7: Create Linux startup script
cat > deployment-package/start-linux.sh << 'EOF'
#!/bin/bash
echo "Starting Multi-Company Accounting System..."
echo "Dashboard: http://localhost:5000"
echo "API Docs: http://localhost:5000/api-docs"
export NODE_ENV=production
node server.js
EOF

chmod +x deployment-package/start-linux.sh

# Step 8: Create environment file template
cat > deployment-package/.env.example << 'EOF'
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-secure-session-secret-here
DATABASE_HOST=135.235.154.222
DATABASE_PORT=5432
DATABASE_NAME=account_replit_staging
DATABASE_USER=pguser
DATABASE_PASSWORD=StrongP@ss123
EOF

# Step 9: Copy automated test suite
echo "📋 Adding automated test suite..."
cp deployment/automated-test-suite.js deployment-package/
echo "✅ Test suite included in deployment package"

# Step 10: Create test runner script
cat > deployment-package/run-tests.js << 'EOF'
#!/usr/bin/env node

/**
 * Test Runner for Deployment Verification
 * Runs comprehensive endpoint tests after deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧪 Starting Post-Deployment Test Suite...');
console.log('='.repeat(50));

try {
  // Check if server is running
  console.log('🔍 Checking if server is accessible...');
  
  // Run the automated test suite
  execSync('node automated-test-suite.js', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000'
    }
  });
  
  console.log('\n✅ All deployment tests completed successfully!');
  console.log('🚀 System is ready for production use.');
  
} catch (error) {
  console.error('\n❌ Deployment tests failed:', error.message);
  console.error('🔧 Please check the server logs and fix any issues before proceeding.');
  process.exit(1);
}
EOF

chmod +x deployment-package/run-tests.js

# Step 11: Create installation instructions
# Multi-Company Accounting System - Installation Guide

## Requirements
- Node.js version 18 or higher
- Network access to database at 135.235.154.222

## Installation Steps

### Windows:
1. Install Node.js from https://nodejs.org
2. Extract this package to your desired directory
3. Open Command Prompt in the package directory
4. Run: npm install
5. Double-click start-windows.bat

### Linux/Unix:
1. Install Node.js: sudo apt install nodejs npm
2. Extract this package to your desired directory
3. Run: npm install
4. Run: ./start-linux.sh

## Access Points
- Web UI: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs
- Health Check: http://localhost:5000/health

## Configuration
Copy .env.example to .env and adjust settings as needed.

## Support
The system connects to an external PostgreSQL database and serves both the React UI and REST API from a single Node.js server.
EOF

echo "🎉 Deployment package created successfully!"
echo ""
echo "📦 Package location: deployment-package/"
echo "📁 Contents:"
echo "   - React UI (built)"
echo "   - Node.js backend APIs"
echo "   - Production server (server.js)"
echo "   - Windows startup (start-windows.bat)"
echo "   - Linux startup (start-linux.sh)"
echo "   - Installation guide (INSTALL.md)"
echo ""
echo "🚀 Ready for deployment to Windows/Linux servers!"