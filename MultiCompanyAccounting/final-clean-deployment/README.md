# Multi-Company Accounting System - Clean Deployment

## Features
- **No Hardcoded URLs**: Dynamic URL detection for any domain
- **External Database**: Connected to 135.235.154.222 without SSL
- **23 Companies**: All authentic data from your database
- **Complete API**: All accounting endpoints with Swagger documentation

## Complete API Endpoints
### Core Data
- `/health` - System status and database connection
- `/api/companies` - All 23 companies from your database
- `POST /api/companies` - Create new company

### Sales Operations
- `/api/sales-orders?companyId=X` - Sales orders by company
- `/api/invoices/summary?companyId=X` - Invoice summaries
- `/api/receipts/summary?companyId=X` - Receipt summaries

### Purchase Operations
- `/api/purchase-orders/summary?companyId=X` - Purchase order summaries
- `/api/bills/summary?companyId=X` - Bills summaries
- `/api/payments/summary?companyId=X` - Payment summaries

### AR/AP Reports
- `/api/ar-ap-summary?companyId=X` - Complete AR/AP summary with outstanding amounts
- `/api/reports/ar-tracking?companyId=X` - AR tracking
- `/api/reports/ap-tracking?companyId=X` - AP tracking

### Chart of Accounts
- `/api/chart-of-accounts?companyId=X` - Chart of accounts for company
- `POST /api/chart-of-accounts` - Create new chart of accounts entry

### Intercompany Operations
- `/api/intercompany-balances?companyId=X` - Intercompany balances
- `POST /api/intercompany/sales-order` - Create intercompany sales order
- `POST /api/intercompany/invoice` - Create intercompany invoice
- `POST /api/intercompany/purchase-order` - Create intercompany purchase order

### Transaction Lookup
- `/api/reference/{number}` - Transaction reference lookup across all types

### Documentation
- `/api-docs` - Swagger UI documentation
- `/api/swagger.json` - Complete API specification

## Database Configuration
- Host: 135.235.154.222
- Database: account_replit_staging
- SSL: Disabled (as required)
- Connection: Verified working with 23 companies

## Deployment
1. Extract files to your server
2. Run: `npm install`
3. Run: `npm start`
4. Access documentation at: `your-domain/api-docs`

The system will automatically detect your public URL and configure all endpoints accordingly.