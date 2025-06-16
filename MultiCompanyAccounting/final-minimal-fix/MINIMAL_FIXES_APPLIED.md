# Minimal Invoice and Receipt Endpoint Fixes

## Changes Applied (Only Two Endpoints)

### 1. POST /api/intercompany/invoice
**Problem**: Primary key constraint violation "duplicate key value violates unique constraint 'invoices_pkey'"
**Fix**: Added explicit ID generation using MAX(id) + 1 for both invoices and bills tables

### 2. POST /api/intercompany/payment  
**Problem**: Primary key constraint violation in receipts and bill_payments tables
**Fix**: Added explicit ID generation using MAX(id) + 1 for both receipts and bill_payments tables

## Request/Response Format (Unchanged)

### Invoice Creation
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 155,
    "total": 1000
  }'
```

### Payment/Receipt Creation
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/payment" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "amount": 500,
    "invoiceId": 123,
    "billId": 456
  }'
```

## What Remains Unchanged
- All other endpoints exactly as before
- Request/response formats identical
- Database connection to 135.235.154.222
- Custom reference number support
- All 23 authentic companies
- PM2 configuration for Windows IIS deployment
