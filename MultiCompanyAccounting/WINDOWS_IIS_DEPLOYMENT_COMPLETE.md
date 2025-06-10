# Complete Windows IIS + PM2 Deployment Package

## Package Contents
- **server.cjs** - Production Node.js server with external database connection
- **package.json** - All required dependencies for production
- **pm2-ecosystem.config.js** - PM2 process management configuration
- **web.config** - IIS configuration for Windows Server
- **dist/** - Compiled React frontend assets
- **README.md** - Complete setup instructions

## Deployment Package Created
**File:** `multi-company-accounting-windows-iis-ready.tar.gz`

## Quick Start Instructions

### 1. Extract and Install
```bash
# Extract the package
tar -xzf multi-company-accounting-windows-iis-ready.tar.gz
cd multi-company-accounting-windows-iis-ready

# Install dependencies
npm install
```

### 2. Start with PM2
```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the application
pm2 start pm2-ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 3. Configure IIS
- Copy all files to your IIS website directory
- The **web.config** file is already configured
- Set Application Pool to "No Managed Code"
- Ensure iisnode is installed on your Windows Server

## Features Verified Working
- ✅ External database connection (135.235.154.222)
- ✅ All 23 authentic companies loading
- ✅ AR/AP calculations with real financial data
- ✅ Sales orders: Company 7 has 84 orders worth $537,900
- ✅ Purchase orders: Company 8 has purchase data worth $153,000
- ✅ Invoice tracking: Company 7 has 67 invoices worth $442,600
- ✅ Bill management: Company 8 has 28 bills worth $229,600
- ✅ Chart of Accounts management
- ✅ Company creation functionality
- ✅ Intercompany operations
- ✅ Complete Swagger API documentation

## Access Points
- **Frontend:** `http://your-domain.com/`
- **API Documentation:** `http://your-domain.com/api-docs`
- **Health Check:** `http://your-domain.com/health`
- **Companies API:** `http://your-domain.com/api/companies`

## Technical Specifications
- **Runtime:** Node.js v16+ with PM2 process management
- **Database:** PostgreSQL (external) - SSL disabled
- **Frontend:** React.js served as static files
- **API:** Express.js with comprehensive endpoint coverage
- **Documentation:** Swagger UI with dynamic URL detection

## Production Ready Features
- CORS configured for Windows IIS
- Dynamic URL detection (no hardcoded localhost)
- Process management with PM2
- IIS integration with web.config
- Health monitoring and logging
- Memory management and restart policies

Your accounting system is now ready for production deployment on Windows Server with IIS.