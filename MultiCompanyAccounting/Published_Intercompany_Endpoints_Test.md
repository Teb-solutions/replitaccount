# Published Intercompany Endpoints Test Case

**Production System:** https://multitenantapistaging.tebs.co.in/  
**Authentic Companies:** Gas Manufacturing Company (ID: 7) ↔ Gas Distributor Company (ID: 8)

## Current Authentic Data Baseline

### Gas Manufacturing Company (ID: 7)
- Sales Orders: 84 transactions
- Invoices: 67 invoices totaling $442,000
- Outstanding Receivables: $432,000
- Existing intercompany transaction: Sales Order 134 to Company 8 ($5,000)

### Gas Distributor Company (ID: 8)
- Purchase Orders: $153,000 total
- Bills: 28 bills totaling $229,600
- Outstanding Payables: $212,400

## Test Case 1: Intercompany Sales Order Creation

### Endpoint: POST /api/intercompany/sales-order

```bash
# Create new intercompany sales order from Gas Manufacturing to Gas Distributor
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [
      {
        "productId": 1,
        "name": "Industrial Natural Gas",
        "quantity": 1000,
        "unitPrice": 15
      }
    ],
    "orderTotal": 15000,
    "referenceNumber": "IC-GAS-SUPPLY-2025"
  }'
```

**Expected Outcome:**
- Creates sales order 135+ for Gas Manufacturing Company
- Creates corresponding purchase order 30+ for Gas Distributor Company
- Updates sales order count from 84 to 85 for Company 7

**Validation:**
```bash
# Verify new sales order count
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq 'length'
# Expected: 85 (increased from 84)

# Check for new purchase order
curl -s "https://multitenantapistaging.tebs.co.in/api/purchase-orders?companyId=8" | jq 'length'
# Expected: Increased count
```

## Test Case 2: Intercompany Invoice Creation

### Endpoint: POST /api/intercompany/invoice

```bash
# Create invoice from existing sales order 134
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 134,
    "total": 5000,
    "invoiceType": "full",
    "description": "Gas supply invoice for existing order"
  }'
```

**Expected Outcome:**
- Creates invoice linked to sales order 134
- Updates invoice count from 67 to 68 for Company 7
- Invoice total increases from $442,000 to $447,000

**Validation:**
```bash
# Check updated invoice summary
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7"
# Expected: {"totalinvoices":"68","totalamount":"447000.00",...}
```

## Test Case 3: Intercompany Bill Creation

### Endpoint: POST /api/intercompany/bill

```bash
# Create bill for Gas Distributor from existing purchase order
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/bill" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "purchaseOrderId": 29,
    "total": 8000,
    "description": "Distribution service charges"
  }'
```

**Expected Outcome:**
- Creates bill for Gas Distributor Company
- Updates bill count from 28 to 29 for Company 8
- Bill total increases from $229,600 to $237,600

**Validation:**
```bash
# Check updated bill summary
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8"
# Expected: {"totalbills":"29","totalamount":"237600.00",...}
```

## Test Case 4: Intercompany Payment Processing

### Endpoint: POST /api/intercompany/payment

```bash
# Record payment from Gas Distributor to Gas Manufacturing
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/payment" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "invoiceId": 1,
    "amount": 5000,
    "paymentMethod": "Bank Transfer",
    "reference": "PAYMENT-GAS-001"
  }'
```

**Expected Outcome:**
- Records payment from Company 8 to Company 7
- Updates payment records for Company 8
- Affects intercompany balance calculations

**Validation:**
```bash
# Check updated payment summary
curl -s "https://multitenantapistaging.tebs.co.in/api/payments/summary?companyId=8"

# Verify intercompany balance changes
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=8"
```

## Complete Workflow Test

### Sequential Transaction Chain
```bash
#!/bin/bash

echo "=== Starting Intercompany Workflow Test ==="

# Step 1: Create Sales Order
echo "Creating intercompany sales order..."
SALES_RESPONSE=$(curl -s -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [{"name": "Gas Supply", "quantity": 100, "unitPrice": 30}],
    "orderTotal": 3000
  }')

echo "Sales Order Response: $SALES_RESPONSE"

# Extract sales order ID if successful
SALES_ORDER_ID=$(echo $SALES_RESPONSE | jq -r '.salesOrder.id // .id // empty')

if [ ! -z "$SALES_ORDER_ID" ]; then
  echo "Sales Order Created: ID $SALES_ORDER_ID"
  
  # Step 2: Create Invoice
  echo "Creating invoice for sales order..."
  INVOICE_RESPONSE=$(curl -s -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
    -H "Content-Type: application/json" \
    -d "{
      \"sourceCompanyId\": 7,
      \"targetCompanyId\": 8,
      \"salesOrderId\": $SALES_ORDER_ID,
      \"total\": 3000
    }")
  
  echo "Invoice Response: $INVOICE_RESPONSE"
  
  # Extract invoice ID
  INVOICE_ID=$(echo $INVOICE_RESPONSE | jq -r '.invoice.id // .id // empty')
  
  if [ ! -z "$INVOICE_ID" ]; then
    echo "Invoice Created: ID $INVOICE_ID"
    
    # Step 3: Process Payment
    echo "Processing payment..."
    PAYMENT_RESPONSE=$(curl -s -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/payment" \
      -H "Content-Type: application/json" \
      -d "{
        \"sourceCompanyId\": 8,
        \"targetCompanyId\": 7,
        \"invoiceId\": $INVOICE_ID,
        \"amount\": 3000,
        \"paymentMethod\": \"Bank Transfer\"
      }")
    
    echo "Payment Response: $PAYMENT_RESPONSE"
  fi
fi

echo "=== Workflow Test Complete ==="
```

## Performance and Validation Metrics

### Response Time Benchmarks
```bash
# Test endpoint performance with timing
time curl -s -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{"sourceCompanyId": 7, "targetCompanyId": 8, "orderTotal": 1000}' \
  > /dev/null

# Expected: Under 3 seconds
```

### Data Integrity Checks
```bash
# Before testing - record baseline
echo "Baseline Data:"
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders/summary?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8"

# After testing - verify changes
echo "Post-Test Data:"
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders/summary?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/bills/summary?companyId=8"
```

## Error Handling Tests

### Invalid Data Tests
```bash
# Test with invalid company IDs
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{"sourceCompanyId": 999, "targetCompanyId": 8, "orderTotal": 1000}'
# Expected: Error about invalid company

# Test missing required fields
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{"sourceCompanyId": 7}'
# Expected: Validation error
```

This test case uses your authentic company data and existing transaction relationships to validate the complete intercompany workflow between Gas Manufacturing Company and Gas Distributor Company.