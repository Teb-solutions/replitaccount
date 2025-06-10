# Multi-Company Accounting System - Production Deployment

## Package Contents
- `production-server.js` - Main server file with all API endpoints
- `package.json` - Production dependencies
- `README.md` - This deployment guide

## Quick Start
1. Extract the tar.gz file
2. Install dependencies: `npm install`
3. Start server: `npm start`

## Server Features
- External database connection to 135.235.154.222
- Fixed Swagger UI at `/api-docs`
- All 23 companies with authentic data
- Complete API endpoints for accounting operations

## API Endpoints
- GET `/api/companies` - All companies
- GET `/api/sales-orders?companyId=X` - Sales orders
- GET `/api/invoices/summary?companyId=X` - Invoice summaries
- GET `/api/bills/summary?companyId=X` - Bills summaries
- GET `/api/purchase-orders/summary?companyId=X` - Purchase order summaries
- GET `/api/receipts/summary?companyId=X` - Receipt summaries
- GET `/api/payments/summary?companyId=X` - Payment summaries
- GET `/api/intercompany-balances?companyId=X` - Intercompany data
- POST `/api/intercompany/sales-order` - Create intercompany transactions
- POST `/api/intercompany/invoice` - Create intercompany invoices
- GET `/api/reference/{referenceNumber}` - Transaction reference lookup
- GET `/api/reports/ar-tracking?companyId=X` - AR tracking with outstanding invoices
- GET `/api/reports/ap-tracking?companyId=X` - AP tracking with outstanding bills
- GET `/api/ar-ap-summary?companyId=X` - Complete AR/AP summary
- GET `/api/reports/balance-sheet/summary?companyId=X` - Balance sheet
- GET `/api-docs` - Complete Swagger documentation
- GET `/health` - Health check

## Configuration
- Port: 3002 (configurable via PORT environment variable)
- Database: Pre-configured for 135.235.154.222
- CORS: Enabled for public access

## Production Ready
This package includes all tested endpoints and is ready for immediate deployment on any Node.js hosting platform.