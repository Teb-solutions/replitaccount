# Final Intercompany Test Suite - Production Ready

**Production System:** https://multitenantapistaging.tebs.co.in/  
**Companies:** Gas Manufacturing Company (ID: 7) ↔ Gas Distributor Company (ID: 8)

## Current System Status

### Verified Working Data
- Gas Manufacturing Company: 84 sales orders, 67 invoices ($442,000)
- Gas Distributor Company: Purchase orders ($153,000), 28 bills ($229,600)
- Existing intercompany transaction: Sales Order 134 ($5,000)

### Intercompany Endpoints to Test

#### 1. Sales Order Creation
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [
      {
        "productId": 1,
        "name": "Natural Gas Supply Contract",
        "quantity": 500,
        "unitPrice": 25
      }
    ],
    "orderTotal": 12500,
    "referenceNumber": "IC-GAS-2025-001"
  }'
```

#### 2. Invoice Creation
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 134,
    "total": 5000,
    "invoiceType": "full",
    "description": "Natural gas supply for December 2024"
  }'
```

#### 3. Bill Creation
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/bill" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "purchaseOrderId": 29,
    "total": 8000,
    "description": "Distribution services invoice"
  }'
```

#### 4. Payment Processing
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/payment" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "invoiceId": 1,
    "amount": 5000,
    "paymentMethod": "Bank Transfer",
    "reference": "PAY-GAS-2025-001"
  }'
```

## Expected Results

### Successful Sales Order Response
```json
{
  "success": true,
  "salesOrder": {
    "id": 135,
    "orderNumber": "SO-7-1748870123456",
    "total": 12500,
    "status": "Pending",
    "sourceCompany": "Gas Manufacturing Company",
    "targetCompany": "Gas Distributor Company"
  },
  "purchaseOrder": {
    "id": 30,
    "orderNumber": "PO-8-1748870123456", 
    "total": 12500,
    "status": "Pending"
  }
}
```

### Successful Invoice Response
```json
{
  "success": true,
  "invoice": {
    "id": 2,
    "invoiceNumber": "INV-7-1748870123456",
    "total": 5000,
    "status": "pending",
    "salesOrderId": 134
  }
}
```

## Validation Workflow

### 1. Pre-Test Verification
```bash
# Verify companies exist
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '.[] | select(.id == 7 or .id == 8) | {id, name}'

# Check current balances
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=8"
```

### 2. Execute Test Transactions
```bash
# Test each endpoint in sequence
# Document response codes and error messages
# Capture transaction IDs for follow-up tests
```

### 3. Post-Test Validation
```bash
# Verify new transactions appear
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq 'length'

# Check updated balances
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8"
```

## Deployment Package Requirements

### Core Functionality
- All existing reporting endpoints working
- Dashboard analytics with authentic data
- Complete financial summaries
- Intercompany balance tracking

### New Intercompany Features
- Sales order creation between companies
- Invoice generation from sales orders
- Bill creation from purchase orders
- Payment processing and receipt recording

### Data Integrity
- All transactions use authentic company data
- Proper referential integrity between related records
- Accurate balance calculations
- Transaction audit trail

### Performance Requirements
- API responses under 3 seconds
- Database connection stability
- Proper error handling and validation
- CORS configured for production deployment

This test suite validates the intercompany workflow using your real business data between Gas Manufacturing Company and Gas Distributor Company, ensuring all transactions maintain data integrity and proper business relationships.