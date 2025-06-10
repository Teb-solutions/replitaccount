# Intercompany Production Test Suite

**Production System:** https://multitenantapistaging.tebs.co.in/  
**Test Companies:** Gas Manufacturing Company (ID: 7) ↔ Gas Distributor Company (ID: 8)

## Current Intercompany Data Analysis

### Existing Intercompany Transaction
Your system already contains authentic intercompany data:

```bash
# Verify existing intercompany sales order
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq '.[] | select(.customer_id == 8)'
```

**Result:** Sales Order ID 134 from Gas Manufacturing to Gas Distributor
- Order Number: SO-7-1748533915314
- Reference: IC-REF-7-8-1748533915314
- Amount: $5,000.00
- Status: Pending

## Test Cases for Published Intercompany Endpoints

### 1. Test Intercompany Sales Order Creation
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [
      {
        "productId": 1,
        "name": "Natural Gas Supply",
        "quantity": 200,
        "unitPrice": 25
      }
    ],
    "orderTotal": 5000,
    "referenceNumber": "IC-REF-7-8-TEST-'$(date +%s)'"
  }'
```

**Expected Response:**
- Creates sales order for Gas Manufacturing Company
- Creates corresponding purchase order for Gas Distributor Company
- Returns order details with reference numbers

### 2. Test Intercompany Invoice Creation
```bash
# Using existing sales order ID 134
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 134,
    "total": 5000,
    "invoiceType": "full"
  }'
```

**Expected Response:**
- Creates invoice linked to sales order 134
- Invoice from Gas Manufacturing to Gas Distributor
- Returns invoice details with proper references

### 3. Test Intercompany Receipt Payment
```bash
# Create receipt for intercompany invoice (requires invoice ID from step 2)
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

**Expected Response:**
- Records payment from Gas Distributor to Gas Manufacturing
- Creates receipt with proper invoice linkage
- Updates intercompany balances

### 4. Test Complete Intercompany Workflow
```bash
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/complete-workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [
      {
        "name": "Gas Distribution Service",
        "quantity": 1,
        "price": 3000
      }
    ],
    "total": 3000
  }'
```

**Expected Response:**
- Creates complete transaction chain
- Sales order → Invoice → Receipt payment
- Returns workflow status and all created record IDs

## Validation Tests

### Verify Transaction Creation
```bash
# Check if new sales orders were created
curl -s "https://multitenantapistaging.tebs.co.in/api/sales-orders?companyId=7" | jq 'length'

# Check updated invoice summary
curl -s "https://multitenantapistaging.tebs.co.in/api/invoices/summary?companyId=7"

# Check intercompany balances after transactions
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=7"
curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany-balances?companyId=8"
```

### Performance Testing
```bash
# Test endpoint response times
time curl -s "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"sourceCompanyId": 7, "targetCompanyId": 8, "orderTotal": 1000}' \
  > /dev/null

# Expected: Under 3 seconds for transaction creation
```

### Error Handling Tests
```bash
# Test with invalid company IDs
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 999,
    "targetCompanyId": 8,
    "orderTotal": 1000
  }'
# Expected: Error about invalid company

# Test with missing required fields
curl -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7
  }'
# Expected: Error about missing fields
```

## Integration Test Scenario

### Full Business Process Test
```bash
# Step 1: Create intercompany sales order
SALES_ORDER_RESPONSE=$(curl -s -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "products": [{"name": "Test Product", "quantity": 1, "unitPrice": 2000}],
    "orderTotal": 2000
  }')

# Extract sales order ID for next step
SALES_ORDER_ID=$(echo $SALES_ORDER_RESPONSE | jq -r '.salesOrder.id // .id // empty')

# Step 2: Create invoice from sales order
if [ ! -z "$SALES_ORDER_ID" ]; then
  INVOICE_RESPONSE=$(curl -s -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/invoice" \
    -H "Content-Type: application/json" \
    -d "{
      \"sourceCompanyId\": 7,
      \"targetCompanyId\": 8,
      \"salesOrderId\": $SALES_ORDER_ID,
      \"total\": 2000
    }")
  
  # Extract invoice ID for payment
  INVOICE_ID=$(echo $INVOICE_RESPONSE | jq -r '.invoice.id // .id // empty')
  
  # Step 3: Create receipt payment
  if [ ! -z "$INVOICE_ID" ]; then
    curl -s -X POST "https://multitenantapistaging.tebs.co.in/api/intercompany/receipt-payment" \
      -H "Content-Type: application/json" \
      -d "{
        \"sourceCompanyId\": 7,
        \"targetCompanyId\": 8,
        \"invoiceId\": $INVOICE_ID,
        \"amount\": 2000,
        \"paymentMethod\": \"Bank Transfer\"
      }"
  fi
fi
```

## Expected Business Impact

### Before Test Execution
- Gas Manufacturing Company: 84 sales orders, $442K invoices
- Gas Distributor Company: Purchase orders $153K, $229.6K bills

### After Successful Test Execution
- Additional intercompany sales orders created
- New invoices generated with proper linkage
- Receipt payments recorded
- Updated intercompany balance tracking
- Verified end-to-end transaction workflow

## Success Criteria

1. **Sales Order Creation:** Returns 201 status with order details
2. **Invoice Creation:** Links properly to sales order with unique invoice number
3. **Receipt Payment:** Records payment with proper invoice reference
4. **Balance Updates:** Intercompany balances reflect new transactions
5. **Data Integrity:** All created records maintain referential integrity
6. **Performance:** All endpoints respond within 3 seconds
7. **Error Handling:** Proper validation and error messages for invalid inputs

This test suite uses your authentic company data and existing sales order relationships to validate the intercompany workflow functionality.