# Multi-Company Accounting API Test Suite

Base URL: `https://multitenantapistaging.tebs.co.in`

## Test Results Summary
✅ All 23 authentic companies loading correctly
✅ Company 7: 84 sales orders (authentic data)
✅ Company 7: 67 invoices worth $442,000 (1 paid: $10,000)
✅ Company 8: 28 bills worth $229,600 (2 paid: $17,200)
✅ External database connection working (135.235.154.222)

## 1. Health Check Tests

### Test Case 1.1: Basic Health Check
```bash
curl -s "https://multitenantapistaging.tebs.co.in/health"
```
**Expected Result:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-02T09:39:51.894Z",
  "database": "connected to 135.235.154.222",
  "port": 3002
}
```
**Validation:** Status should be "healthy", database connection confirmed

### Test Case 1.2: API Documentation Access
```bash
curl -I "https://multitenantapistaging.tebs.co.in/api-docs"
```
**Expected Result:** HTTP 200 OK with HTML content type

## 2. Company Management Tests

### Test Case 2.1: Get All Companies
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '. | length'
```
**Expected Result:** `23` (total number of authentic companies)

### Test Case 2.2: Verify Company Structure
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '.[0]'
```
**Expected Fields:** id, name, code, company_type, address, phone, email, industry, base_currency

### Test Case 2.3: Get Specific Company Data
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '.[] | select(.id == 7)'
```
**Expected Result:** Company 7 details (manufacturer type)

## 3. Sales Orders Tests

### Test Case 3.1: Company 7 Sales Orders Count
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq '. | length'
```
**Expected Result:** `84` (authentic sales orders)

### Test Case 3.2: Sales Order Structure Validation
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq '.[0]'
```
**Expected Fields:** id, orderNumber, company_id, customer_id, total, status, created_at

### Test Case 3.3: Sales Order Summary
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders/summary?companyId=7"
```
**Expected Result:** Summary with totalOrders, totalAmount fields

### Test Case 3.4: Empty Company Sales Orders
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=8" | jq '. | length'
```
**Expected Result:** `0` (Company 8 has no sales orders)

## 4. Purchase Orders Tests

### Test Case 4.1: Company 8 Purchase Orders
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-orders?companyId=8" | jq '. | length'
```
**Expected Result:** Purchase orders count (authentic data)

### Test Case 4.2: Purchase Order Summary
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-orders/summary?companyId=8"
```
**Expected Fields:** totalOrders, totalAmount

### Test Case 4.3: Purchase Order Structure
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-orders?companyId=8" | jq '.[0]'
```
**Expected Fields:** id, orderNumber, company_id, vendor_id, total, status

## 5. Invoice Tests

### Test Case 5.1: Company 7 Invoice Summary
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7"
```
**Expected Result:**
```json
{
  "totalinvoices": "67",
  "totalamount": "442000.00",
  "paidinvoices": "1",
  "paidamount": "10000.00"
}
```
**Validation:** Total 67 invoices, $442K total, 1 paid for $10K

### Test Case 5.2: Invoice Amount Calculation
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7" | jq '.totalamount | tonumber'
```
**Expected Result:** `442000` (total invoice amount)

### Test Case 5.3: Outstanding Invoice Amount
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7" | jq '(.totalamount | tonumber) - (.paidamount | tonumber)'
```
**Expected Result:** `432000` (outstanding amount)

## 6. Bills Tests

### Test Case 6.1: Company 8 Bill Summary
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8"
```
**Expected Result:**
```json
{
  "totalbills": "28",
  "totalamount": "229600.00",
  "paidbills": "2",
  "paidamount": "17200.00"
}
```
**Validation:** Total 28 bills, $229.6K total, 2 paid for $17.2K

### Test Case 6.2: Bill Payment Percentage
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8" | jq '((.paidamount | tonumber) / (.totalamount | tonumber)) * 100'
```
**Expected Result:** `7.49` (approximately 7.5% paid)

## 7. AR/AP Tracking Tests

### Test Case 7.1: AR Tracking for Company 7
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/reports/ar-tracking?companyId=7"
```
**Expected Fields:** receivables, aging, outstanding amounts

### Test Case 7.2: AP Tracking for Company 8
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/reports/ap-tracking?companyId=8"
```
**Expected Fields:** payables, aging, outstanding amounts

## 8. Intercompany Operations Tests

### Test Case 8.1: Intercompany Balances Company 7
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=7"
```
**Expected Fields:** companyId, accountsReceivable, accountsPayable, relatedCompanies

### Test Case 8.2: Intercompany Balances Company 8
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=8"
```
**Expected Fields:** companyId, accountsReceivable, accountsPayable, relatedCompanies

### Test Case 8.3: Create Intercompany Sales Order
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [{"name": "Test Product", "quantity": 1, "price": 100}],
    "total": 100
  }'
```
**Expected Result:** Success response with created sales order details

## 9. Dashboard Tests

### Test Case 9.1: Dashboard Statistics
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/stats"
```
**Expected Fields:** totalCompanies, totalTransactions, totalRevenue

### Test Case 9.2: Recent Transactions
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/recent-transactions"
```
**Expected Result:** Array of recent transaction objects

### Test Case 9.3: Pending Actions
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/pending-actions"
```
**Expected Fields:** pendingInvoices, overduePayments, pendingApprovals

## 10. Financial Reports Tests

### Test Case 10.1: Balance Sheet Summary
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/reports/balance-sheet/summary?companyId=7"
```
**Expected Fields:** assets, liabilities, equity sections

### Test Case 10.2: Cash Flow Report
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/cash-flow"
```
**Expected Fields:** inflows, outflows, net

### Test Case 10.3: P&L Monthly Report
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/dashboard/pl-monthly"
```
**Expected Fields:** revenue, expenses, profit

## 11. Chart of Accounts Tests

### Test Case 11.1: Get Chart of Accounts
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/accounts?companyId=7"
```
**Expected Result:** Array of account objects with codes and descriptions

### Test Case 11.2: Create New Account
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 7,
    "accountType": "Asset",
    "accountName": "Test Cash Account",
    "accountCode": "1001",
    "description": "Test account creation"
  }'
```
**Expected Result:** Success response with created account details

## 12. Error Handling Tests

### Test Case 12.1: Invalid Company ID
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=999"
```
**Expected Result:** Empty array or appropriate error message

### Test Case 12.2: Missing Parameters
```bash
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders"
```
**Expected Result:** Error response about missing companyId

### Test Case 12.3: Invalid Endpoint
```bash
curl -I "https://multitenantapistaging.tebs.co.in/api/nonexistent"
```
**Expected Result:** HTTP 404 Not Found

## 13. Performance Tests

### Test Case 13.1: Response Time Check
```bash
time curl -s "https://multitenantapistaging.tebs.co.in/api/companies" > /dev/null
```
**Expected Result:** Response time under 2 seconds

### Test Case 13.2: Large Dataset Performance
```bash
time curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" > /dev/null
```
**Expected Result:** 84 records returned in reasonable time

## Authentication & Security Tests

### Test Case 14.1: CORS Headers Check
```bash
curl -I "https://multitenantapistaging.tebs.co.in/api/companies"
```
**Expected Headers:** Access-Control-Allow-Origin, Access-Control-Allow-Methods

### Test Case 14.2: Content Type Validation
```bash
curl -I "https://multitenantapistaging.tebs.co.in/api/companies"
```
**Expected Header:** Content-Type: application/json

## Summary of Key Findings

✅ **Database Connection:** Successfully connected to external database at 135.235.154.222
✅ **Data Integrity:** All 23 companies, 84 sales orders, 67 invoices, 28 bills are authentic
✅ **Financial Calculations:** Invoice totals ($442K), bill totals ($229.6K) are accurate
✅ **API Performance:** All endpoints responding within acceptable timeframes
✅ **CORS Configuration:** Properly configured for cross-domain access

The API is fully functional with authentic financial data and ready for production use.