# Multi-Company Accounting System - Enhanced with Credit/Debit Notes

## Overview
Complete multi-company accounting system with credit/debit notes functionality integrated into your existing server.cjs. All existing APIs are preserved and working.

## Key Files
- **server.cjs** - Main server with all APIs (existing + new credit/debit functionality)
- **web.config** - IIS configuration for direct deployment
- **install.ps1** - Automated PowerShell installation script
- **test-integration.js** - Test script to verify functionality

## Enhanced Features (Integrated)
- **Existing APIs**: All your sales orders, purchase orders, companies, products APIs unchanged
- **Credit Notes**: Complete management with product line items
- **Debit Notes**: Vendor charge tracking with product details
- **Intercompany Adjustments**: Automated dual credit/debit note creation
- **Application Insights**: Structured logging with ID e04a0cf1-8129-4bc2-8707-016ae726c876
- **Multi-Company Support**: Works with your 42 authentic companies

## API Endpoints

### Existing (Unchanged)
- `GET /api/companies` - Your 42 companies
- `GET /api/products` - Product catalog
- `GET /api/sales-orders` - Sales order management
- `GET /api/purchase-orders` - Purchase order tracking
- `POST /api/intercompany/sales-order` - Intercompany transactions
- `GET /api/reference/:reference` - Transaction lookup
- `GET /api/accounts` - Chart of accounts

### New Credit/Debit Functionality
- `POST /api/setup-database` - Initialize credit/debit tables
- `GET/POST /api/credit-notes` - Credit notes management
- `GET/POST /api/debit-notes` - Debit notes management
- `GET/POST /api/intercompany-adjustments` - Cross-company adjustments
- `GET /api/credit-accounts` - Credit account types
- `GET /api/debit-accounts` - Debit account types
- `GET /api/health` - Enhanced health check with all features

## Deployment Options

### Option 1: IIS Deployment (Recommended)
1. Extract package to Windows Server
2. Run as Administrator: `powershell -ExecutionPolicy Bypass -File install.ps1`
3. Initialize database: `curl -X POST http://your-server/api/setup-database`
4. Test: `http://your-server/api/health`

### Option 2: Direct Node.js
1. Extract package
2. `npm install` (if needed)
3. `node server.cjs`
4. Test: `node test-integration.js`

## Testing Your Integration
```bash
# Test all functionality
node test-integration.js

# Should show:
# Companies API: Working - 42 companies
# Products API: Working - X products  
# Database Setup: Working - 5 tables
# Credit Notes: Working - X notes
# Debit Notes: Working - X notes
# Intercompany Adjustments: Working - X adjustments
# Enhanced Health Check: Working - 8 features
```

## Database Configuration
Connects to your external database at 135.235.154.222:
- Database: account_replit_staging
- User: pguser
- SSL: disabled (as required)
- Creates 5 new tables for credit/debit functionality

## System Requirements
- Windows Server 2016+ with IIS 10+ (for IIS deployment)
- Node.js 18+
- iisnode module (for IIS)
- Network access to 135.235.154.222:5432

## Production Ready
- All existing functionality preserved
- New credit/debit features added seamlessly
- Application Insights logging integrated
- Comprehensive error handling
- Transaction integrity with rollbacks
- Authentic data integration
