# Complete API Test Cases for Multi-Company Accounting System

Base URL: `https://multitenantapistaging.tebs.co.in`

## Verified Working Endpoints (Using Authentic Data)

### 1. Health Check & System Status
```bash
# Test Case 1.1: Health Check
curl -s "https://multitenantapistaging.tebs.co.in/health"
# Expected: {"status":"healthy","database":"connected to 135.235.154.222"}

# Test Case 1.2: API Documentation
curl -I "https://multitenantapistaging.tebs.co.in/api-docs"
# Expected: HTTP 200 OK
```

### 2. Company Management (23 Authentic Companies)
```bash
# Test Case 2.1: Get All Companies
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '. | length'
# Expected: 23

# Test Case 2.2: Verify Company 7 Details (Manufacturer)
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '.[] | select(.id == 7)'
# Expected: Company with 84 sales orders

# Test Case 2.3: Verify Company 8 Details (Distributor)
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '.[] | select(.id == 8)'
# Expected: Company with purchase orders and bills
```

### 3. Sales Orders (Authentic Transaction Data)
```bash
# Test Case 3.1: Company 7 Sales Orders (84 orders)
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq '. | length'
# Expected: 84

# Test Case 3.2: Sales Order Details Structure
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq '.[0] | keys'
# Expected: ["company_id", "created_at", "customer_id", "id", "order_number", "status", "total", "updated_at"]

# Test Case 3.3: Sales Order Summary
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders/summary?companyId=7"
# Expected: Summary with totalOrders and totalAmount

# Test Case 3.4: Company 8 Sales Orders (Should be empty)
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=8" | jq '. | length'
# Expected: 0
```

### 4. Purchase Orders (Authentic Data)
```bash
# Test Case 4.1: Company 8 Purchase Orders
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-orders?companyId=8"
# Expected: Array of purchase orders

# Test Case 4.2: Purchase Order Summary
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-orders/summary?companyId=8"
# Expected: {"totalOrders": "X", "totalAmount": "153000.00"}

# Test Case 4.3: Company 7 Purchase Orders (Should be empty)
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-orders?companyId=7" | jq '. | length'
# Expected: 0
```

### 5. Invoices (Real Financial Data)
```bash
# Test Case 5.1: Company 7 Invoice Summary ($442K total)
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7"
# Expected: {"totalinvoices":"67","totalamount":"442000.00","paidinvoices":"1","paidamount":"10000.00"}

# Test Case 5.2: Outstanding Invoice Calculation
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7" | jq '(.totalamount | tonumber) - (.paidamount | tonumber)'
# Expected: 432000 (outstanding amount)

# Test Case 5.3: Invoice Payment Percentage
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7" | jq '((.paidamount | tonumber) / (.totalamount | tonumber)) * 100'
# Expected: ~2.26 (approximately 2.3% paid)

# Test Case 5.4: Company 8 Invoices (Should be empty)
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=8"
# Expected: {"totalinvoices":"0","totalamount":"0.00"}
```

### 6. Bills (Authentic Payable Data)
```bash
# Test Case 6.1: Company 8 Bill Summary ($229.6K total)
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8"
# Expected: {"totalbills":"28","totalamount":"229600.00","paidbills":"2","paidamount":"17200.00"}

# Test Case 6.2: Outstanding Bills Calculation
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8" | jq '(.totalamount | tonumber) - (.paidamount | tonumber)'
# Expected: 212400 (outstanding amount)

# Test Case 6.3: Bill Payment Rate
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8" | jq '((.paidamount | tonumber) / (.totalamount | tonumber)) * 100'
# Expected: ~7.49 (approximately 7.5% paid)

# Test Case 6.4: Company 7 Bills (Should be empty)
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=7"
# Expected: {"totalbills":"0","totalamount":"0.00"}
```

### 7. Receipts and Payments
```bash
# Test Case 7.1: Company 7 Receipt Summary
curl -s "https://multitenantapistaging.tebs.co.in/api/receipts/summary?companyId=7"
# Expected: Receipt data related to invoice payments

# Test Case 7.2: Company 8 Payment Summary
curl -s "https://multitenantapistaging.tebs.co.in/api/payments/summary?companyId=8"
# Expected: Payment data related to bill payments

# Test Case 7.3: Company 1209 Receipts (Test company)
curl -s "https://multitenantapistaging.tebs.co.in/api/receipts/summary?companyId=1209"
# Expected: {"totalReceipts":0,"totalAmount":0}
```

### 8. Intercompany Operations (Complete Workflow)
```bash
# Test Case 8.1: Intercompany Balance Check Company 7
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=7"
# Expected: {"companyId":7,"accountsReceivable":X,"accountsPayable":Y,"relatedCompanies":[]}

# Test Case 8.2: Intercompany Balance Check Company 8
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=8"
# Expected: Related company balance data

# Test Case 8.3: Create Intercompany Sales Order
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [{"name": "Manufacturing Product A", "quantity": 10, "price": 100}],
    "total": 1000
  }'
# Expected: Created sales order with ID and reference number

# Test Case 8.4: Create Intercompany Invoice from Sales Order
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 133,
    "total": 1000
  }'
# Expected: Created invoice linked to sales order

# Test Case 8.5: Create Intercompany Purchase Order
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/purchase-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "products": [{"name": "Service Request B", "quantity": 5, "price": 200}],
    "total": 1000
  }'
# Expected: Created purchase order with proper linking

# Test Case 8.6: Create Intercompany Bill from Purchase Order
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/bill" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "purchaseOrderId": 29,
    "total": 1000
  }'
# Expected: Created bill linked to purchase order

# Test Case 8.7: Create Intercompany Receipt Payment
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/receipt-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "invoiceId": 1,
    "amount": 1000,
    "paymentMethod": "bank_transfer"
  }'
# Expected: Payment recorded with proper AR/AP updates

# Test Case 8.8: Complete Intercompany Workflow (End-to-End)
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/complete-workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [{"name": "Complete Workflow Test", "quantity": 1, "price": 500}],
    "total": 500
  }'
# Expected: Complete transaction chain from sales order to payment

# Test Case 8.9: Purchase Order Tracking (From Swagger)
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-order-tracking"
# Expected: Purchase orders with connected bills and payments
```

### 9. Financial Reports (Authentic Data)
```bash
# Test Case 9.1: AR Tracking Report Company 7
curl -s "https://multitenantapistaging.tebs.co.in/api/reports/ar-tracking?companyId=7"
# Expected: AR data with $432K outstanding

# Test Case 9.2: AP Tracking Report Company 8
curl -s "https://multitenantapistaging.tebs.co.in/api/reports/ap-tracking?companyId=8"
# Expected: AP data with $212.4K outstanding

# Test Case 9.3: Balance Sheet Summary
curl -s "https://multitenantapistaging.tebs.co.in/api/reports/balance-sheet/summary?companyId=7"
# Expected: Balance sheet with assets, liabilities, equity

# Test Case 9.4: Comprehensive AR Summary
curl -s "https://multitenantapistaging.tebs.co.in/api/comprehensive/ar-summary?companyId=7"
# Expected: Detailed AR breakdown

# Test Case 9.5: Comprehensive AP Summary
curl -s "https://multitenantapistaging.tebs.co.in/api/comprehensive/ap-summary?companyId=8"
# Expected: Detailed AP breakdown
```

### 10. Dashboard Analytics
```bash
# Test Case 10.1: Dashboard Statistics
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/stats"
# Expected: Overall system statistics

# Test Case 10.2: Recent Transactions
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/recent-transactions"
# Expected: Array of recent transaction objects

# Test Case 10.3: Pending Actions
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/pending-actions"
# Expected: {"pendingInvoices":X,"overduePayments":Y}

# Test Case 10.4: Cash Flow Report
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/cash-flow"
# Expected: {"inflows":X,"outflows":Y,"net":Z}

# Test Case 10.5: P&L Monthly Report
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/pl-monthly"
# Expected: {"revenue":X,"expenses":Y,"profit":Z}
```

### 11. Chart of Accounts
```bash
# Test Case 11.1: Get Chart of Accounts Company 7
curl -s "https://multitenantapistaging.tebs.co.in/api/accounts?companyId=7"
# Expected: Array of account objects

# Test Case 11.2: Get Chart of Accounts Company 8
curl -s "https://multitenantapistaging.tebs.co.in/api/accounts?companyId=8"
# Expected: Array of account objects

# Test Case 11.3: Create New Account (If available)
curl -X POST "https://multitenantapistaging.tebs.co.in/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 7,
    "accountType": "Asset",
    "accountName": "Test Account",
    "accountCode": "1001",
    "description": "Test account creation"
  }'
# Expected: Success response or error message
```

### 12. Transaction Lookup
```bash
# Test Case 12.1: Lookup by Sales Order Reference
curl -s "https://multitenantapistaging.tebs.co.in/api/reference/SO-7-1748501505"
# Expected: Transaction details for sales order

# Test Case 12.2: Lookup Invalid Reference
curl -s "https://multitenantapistaging.tebs.co.in/api/reference/INVALID-REF"
# Expected: Not found or appropriate error message
```

### 13. Error Handling & Edge Cases
```bash
# Test Case 13.1: Invalid Company ID
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=999"
# Expected: Empty array or error message

# Test Case 13.2: Missing Parameters
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders"
# Expected: Error about missing companyId

# Test Case 13.3: Invalid Endpoint
curl -I "https://multitenantapistaging.tebs.co.in/api/nonexistent"
# Expected: HTTP 404

# Test Case 13.4: Invalid POST Data
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
# Expected: Validation error message
```

### 14. Performance & Response Time Tests
```bash
# Test Case 14.1: Large Dataset Response Time
time curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" > /dev/null
# Expected: Under 2 seconds for 84 records

# Test Case 14.2: Company List Performance
time curl -s "https://multitenantapistaging.tebs.co.in/api/companies" > /dev/null
# Expected: Under 1 second for 23 companies

# Test Case 14.3: Dashboard Stats Performance
time curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/stats" > /dev/null
# Expected: Under 3 seconds
```

### 15. CORS & Security Headers
```bash
# Test Case 15.1: CORS Headers Check
curl -I "https://multitenantapistaging.tebs.co.in/api/companies"
# Expected: Access-Control-Allow-Origin header present

# Test Case 15.2: Content Type Validation
curl -I "https://multitenantapistaging.tebs.co.in/api/companies"
# Expected: Content-Type: application/json

# Test Case 15.3: OPTIONS Request
curl -X OPTIONS "https://multitenantapistaging.tebs.co.in/api/companies"
# Expected: HTTP 200 with appropriate CORS headers
```

## Key Data Validation Points

**Authentic Financial Data Confirmed:**
- Company 7 (Manufacturer): 84 sales orders, 67 invoices ($442K), 1 payment ($10K)
- Company 8 (Distributor): Purchase orders ($153K), 28 bills ($229.6K), 2 payments ($17.2K)
- Outstanding AR: $432,000 (Company 7)
- Outstanding AP: $212,400 (Company 8)
- Database: External connection to 135.235.154.222 working

**Working Creation Endpoints:**
- Intercompany sales orders
- Intercompany invoices
- Intercompany purchase orders
- Complete intercompany workflows

**Missing Creation Endpoints:**
- Direct invoice creation
- Direct bill creation
- Direct receipt creation
- Direct payment creation

The system provides comprehensive reporting and intercompany transaction capabilities using authentic financial data from your external database.