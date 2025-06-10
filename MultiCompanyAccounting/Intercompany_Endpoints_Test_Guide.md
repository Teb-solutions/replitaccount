# Intercompany Endpoints Investigation & Test Guide

**Production System:** https://multitenantapistaging.tebs.co.in/  
**Test Companies:** Gas Manufacturing Company (ID: 7) ↔ Gas Distributor Company (ID: 8)

## Current Status Analysis

### Existing Intercompany Data Found
Your system already contains intercompany transactions:

```bash
# Existing intercompany sales order
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq '.[] | select(.customer_id == 8)'
```

Results show sales order with:
- ID: 134
- Order Number: SO-7-1748533915314
- Reference: IC-REF-7-8-1748533915314
- Total: $5,000.00
- Status: Pending

This confirms the database schema supports intercompany transactions.

## Test Cases for Intercompany Creation Endpoints

### 1. Create Intercompany Sales Order
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [
      {
        "name": "Natural Gas Supply",
        "quantity": 100,
        "price": 50
      }
    ],
    "total": 5000
  }'
```

**Expected Result:** Creates sales order for Gas Manufacturing Company and corresponding purchase order for Gas Distributor Company.

### 2. Create Intercompany Invoice
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 134,
    "total": 5000
  }'
```

**Expected Result:** Creates invoice for existing sales order between the companies.

### 3. Create Intercompany Purchase Order
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/purchase-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "products": [
      {
        "name": "Distribution Services",
        "quantity": 1,
        "price": 2000
      }
    ],
    "total": 2000
  }'
```

**Expected Result:** Creates purchase order from Gas Distributor to Gas Manufacturing Company.

### 4. Create Receipt Payment
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/receipt-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "invoiceId": 1,
    "amount": 5000,
    "paymentMethod": "Bank Transfer"
  }'
```

**Expected Result:** Records payment from Gas Distributor to Gas Manufacturing Company.

## Database Schema Analysis

Based on existing data structure:

**Sales Orders Table:**
- id, company_id, customer_id, order_number
- order_date, expected_date, status, total
- reference_number, created_at, created_by

**Purchase Orders Table:**
- id, company_id, vendor_id, order_number
- order_date, expected_date, status, total
- reference_number, created_at

**Invoices Table:**
- id, company_id, customer_id, sales_order_id
- invoice_number, invoice_date, due_date, total, status

**Receipts Table:**
- id, company_id, customer_id, invoice_id
- receipt_number, receipt_date, amount, payment_method

## Error Investigation Steps

### 1. Check Current Endpoint Responses
```bash
# Test current error messages
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{"sourceCompanyId": 7, "targetCompanyId": 8, "total": 1000}' \
  -v
```

### 2. Verify Database Connection
```bash
# Check if companies are accessible
curl -s "https://multitenantapistaging.tebs.co.in/api/companies" | jq '.[] | select(.id == 7 or .id == 8)'
```

### 3. Test Existing Workflows
```bash
# Verify intercompany balance tracking works
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=8"
```

## Recommended Fix Implementation

The endpoints should:

1. **Validate Company IDs:** Ensure both companies exist in the database
2. **Use Transactions:** Wrap creation operations in database transactions
3. **Generate Proper References:** Create unique order numbers and reference numbers
4. **Handle Relationships:** Create linked records (sales order → purchase order, invoice → receipt)
5. **Return Complete Data:** Include company names and relationships in responses

## Test Validation Criteria

**Successful Intercompany Sales Order Creation Should:**
- Create sales order record for source company (Gas Manufacturing)
- Create purchase order record for target company (Gas Distributor)
- Generate unique reference numbers for tracking
- Return both order details with company information

**Successful Invoice Creation Should:**
- Link to existing sales order
- Create invoice record with proper customer relationship
- Generate unique invoice number
- Return invoice details with sales order reference

**Successful Receipt Payment Should:**
- Link to existing invoice
- Create receipt record with payment details
- Update relevant balances
- Return payment confirmation with invoice reference

This investigation provides the foundation for implementing working intercompany transaction creation endpoints using your authentic company data.