# Endpoint Verification for Required Functionality

## Required Endpoints Status Check

### 1. Company Management
```bash
# Get all companies (23 authentic companies)
curl -s "http://localhost:3002/api/companies"

# Create new company
curl -X POST "http://localhost:3002/api/companies" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Manufacturing Co",
    "code": "TMC001",
    "company_type": "Manufacturing",
    "address": "123 Industrial Ave",
    "phone": "555-0123",
    "email": "info@testmfg.com"
  }'
```

### 2. Intercompany Sales Order Creation
```bash
# Create intercompany sales order between Gas Manufacturing (7) and Gas Distributor (8)
curl -X POST "http://localhost:3002/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [
      {
        "productId": 1,
        "name": "Natural Gas Supply",
        "quantity": 100,
        "unitPrice": 50
      }
    ],
    "orderTotal": 5000
  }'
```

### 3. Intercompany Invoice Creation
```bash
# Create invoice from existing sales order 134
curl -X POST "http://localhost:3002/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 134,
    "total": 5000
  }'
```

### 4. Intercompany Bill Creation
```bash
# Create bill from purchase order
curl -X POST "http://localhost:3002/api/intercompany/bill" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "purchaseOrderId": 29,
    "total": 8000
  }'
```

### 5. Transaction Reference Lookup
```bash
# Lookup existing transaction by reference
curl -s "http://localhost:3002/api/reference/SO-7-1748501505"

# Lookup intercompany reference
curl -s "http://localhost:3002/api/reference/IC-REF-7-8-1748533915314"
```

### 6. Chart of Accounts by Company ID
```bash
# Get chart of accounts for Gas Manufacturing Company
curl -s "http://localhost:3002/api/accounts?companyId=7"

# Get chart of accounts for Gas Distributor Company  
curl -s "http://localhost:3002/api/accounts?companyId=8"
```

## Deployment Status Check

The deployment should include all these endpoints working with your authentic data:
- 23 real companies from external database
- Gas Manufacturing Company (ID: 7) with 84 sales orders
- Gas Distributor Company (ID: 8) with purchase orders and bills
- Existing intercompany transaction (Sales Order 134)

## Missing Endpoints Analysis

Based on previous tests, these endpoints may need to be added or fixed:
- Company creation endpoint
- Chart of accounts endpoint
- Transaction reference lookup endpoint

Let me verify which are working and which need implementation.