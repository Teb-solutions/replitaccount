# Complete API Test Cases

## Prerequisites
1. Ensure server is running on port 3002
2. Database connection to 135.235.154.222 is active
3. Companies exist in the system (Company 17: 03 June Plant, Company 26: June4Dist)

## 1. Products API Test Cases

### Test 1.1: Get All Products
```bash
curl -X GET "http://localhost:3002/api/products/tested" \
  -H "Content-Type: application/json"
```
**Expected Response:** JSON with success=true, count, and products array

### Test 1.2: Get Products by Company
```bash
curl -X GET "http://localhost:3002/api/products/tested/by-company/17" \
  -H "Content-Type: application/json"
```
**Expected Response:** Products for Company 17 with usage statistics

### Test 1.3: Get Products Summary
```bash
curl -X GET "http://localhost:3002/api/products/tested/summary" \
  -H "Content-Type: application/json"
```
**Expected Response:** Summary statistics across all companies

## 2. Credit Notes API Test Cases

### Test 2.1: Get All Credit Notes
```bash
curl -X GET "http://localhost:3002/api/credit-notes" \
  -H "Content-Type: application/json"
```

### Test 2.2: Get Credit Notes by Company
```bash
curl -X GET "http://localhost:3002/api/credit-notes?companyId=17" \
  -H "Content-Type: application/json"
```

### Test 2.3: Create Credit Note with Products
```bash
curl -X POST "http://localhost:3002/api/credit-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": 45,
    "company_id": 17,
    "customer_id": 26,
    "amount": 1500.00,
    "reason": "Product return and quality issues",
    "credit_note_date": "2025-06-13T10:00:00Z",
    "products": [
      {
        "product_id": 101,
        "quantity": 5,
        "unit_price": 200.00,
        "total_amount": 1000.00,
        "reason": "Defective units"
      },
      {
        "product_id": 102,
        "quantity": 10,
        "unit_price": 50.00,
        "total_amount": 500.00,
        "reason": "Quality below standard"
      }
    ]
  }'
```
**Expected Response:** Credit note created with items array

## 3. Debit Notes API Test Cases

### Test 3.1: Get All Debit Notes
```bash
curl -X GET "http://localhost:3002/api/debit-notes" \
  -H "Content-Type: application/json"
```

### Test 3.2: Create Debit Note with Products
```bash
curl -X POST "http://localhost:3002/api/debit-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_id": 23,
    "company_id": 26,
    "vendor_id": 17,
    "amount": 800.00,
    "reason": "Additional shipping charges and handling fees",
    "debit_note_date": "2025-06-13T10:00:00Z",
    "products": [
      {
        "product_id": 101,
        "quantity": 2,
        "unit_price": 300.00,
        "total_amount": 600.00,
        "reason": "Express shipping charges"
      },
      {
        "product_id": 103,
        "quantity": 4,
        "unit_price": 50.00,
        "total_amount": 200.00,
        "reason": "Special handling fee"
      }
    ]
  }'
```

## 4. Intercompany Adjustment API Test Cases

### Test 4.1: Create Intercompany Adjustment
```bash
curl -X POST "http://localhost:3002/api/intercompany-adjustment" \
  -H "Content-Type: application/json" \
  -d '{
    "source_company_id": 17,
    "target_company_id": 26,
    "invoice_id": 45,
    "bill_id": 23,
    "amount": 2000.00,
    "reason": "Quality adjustment for damaged goods in transit",
    "adjustment_date": "2025-06-13T10:00:00Z",
    "products": [
      {
        "product_id": 101,
        "quantity": 8,
        "unit_price": 150.00,
        "total_amount": 1200.00,
        "reason": "Damaged in transit"
      },
      {
        "product_id": 102,
        "quantity": 16,
        "unit_price": 50.00,
        "total_amount": 800.00,
        "reason": "Quality variance"
      }
    ],
    "reference_number": "IC-ADJ-17-26-TEST-001"
  }'
```
**Expected Response:** Both credit note and debit note created with same reference

### Test 4.2: Get Intercompany Adjustments
```bash
curl -X GET "http://localhost:3002/api/intercompany-adjustments?companyId=17" \
  -H "Content-Type: application/json"
```

### Test 4.3: Get Adjustment by Reference
```bash
curl -X GET "http://localhost:3002/api/intercompany-adjustments?reference=IC-ADJ-17-26-TEST-001" \
  -H "Content-Type: application/json"
```

## 5. Summary and Reporting Test Cases

### Test 5.1: Credit/Debit Notes Summary
```bash
curl -X GET "http://localhost:3002/api/credit-debit-notes/summary?companyId=17" \
  -H "Content-Type: application/json"
```

### Test 5.2: Invoice Summary (Existing)
```bash
curl -X GET "http://localhost:3002/api/invoices/summary?companyId=17" \
  -H "Content-Type: application/json"
```

### Test 5.3: Bills Summary (Existing)
```bash
curl -X GET "http://localhost:3002/api/bills/summary?companyId=26" \
  -H "Content-Type: application/json"
```

## 6. Existing API Endpoints Test Cases

### Test 6.1: Companies API
```bash
curl -X GET "http://localhost:3002/api/companies" \
  -H "Content-Type: application/json"
```

### Test 6.2: Sales Orders Summary
```bash
curl -X GET "http://localhost:3002/api/sales-orders?companyId=17" \
  -H "Content-Type: application/json"
```

### Test 6.3: Purchase Orders Summary
```bash
curl -X GET "http://localhost:3002/api/purchase-orders?companyId=26" \
  -H "Content-Type: application/json"
```

### Test 6.4: Intercompany Sales Order Creation
```bash
curl -X POST "http://localhost:3002/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 17,
    "targetCompanyId": 26,
    "products": [
      {
        "productId": 101,
        "quantity": 10,
        "unitPrice": 150.00
      }
    ],
    "orderTotal": 1500.00,
    "referenceNumber": "TEST-SO-001"
  }'
```

## Test Execution Steps

### Step 1: Environment Setup
```bash
# Start the server
npm run dev

# Verify server is running
curl -X GET "http://localhost:3002/health"
```

### Step 2: Run Basic Tests
```bash
# Test products API
curl -s "http://localhost:3002/api/products/tested/summary" | jq .

# Test companies API
curl -s "http://localhost:3002/api/companies" | jq '.[:2]'
```

### Step 3: Test Credit/Debit Notes Flow
```bash
# 1. Create credit note
CREDIT_RESPONSE=$(curl -s -X POST "http://localhost:3002/api/credit-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": 45,
    "company_id": 17,
    "customer_id": 26,
    "amount": 500.00,
    "reason": "Test credit note",
    "products": [{"product_id": 101, "quantity": 1, "unit_price": 500.00, "total_amount": 500.00}]
  }')

echo "Credit Note Response: $CREDIT_RESPONSE"

# 2. Create debit note
DEBIT_RESPONSE=$(curl -s -X POST "http://localhost:3002/api/debit-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_id": 23,
    "company_id": 26,
    "vendor_id": 17,
    "amount": 300.00,
    "reason": "Test debit note",
    "products": [{"product_id": 101, "quantity": 1, "unit_price": 300.00, "total_amount": 300.00}]
  }')

echo "Debit Note Response: $DEBIT_RESPONSE"

# 3. Test intercompany adjustment
ADJUSTMENT_RESPONSE=$(curl -s -X POST "http://localhost:3002/api/intercompany-adjustment" \
  -H "Content-Type: application/json" \
  -d '{
    "source_company_id": 17,
    "target_company_id": 26,
    "amount": 1000.00,
    "reason": "Test intercompany adjustment",
    "products": [{"product_id": 101, "quantity": 2, "unit_price": 500.00, "total_amount": 1000.00}]
  }')

echo "Intercompany Adjustment Response: $ADJUSTMENT_RESPONSE"
```

### Step 4: Verify Results
```bash
# Check credit notes
curl -s "http://localhost:3002/api/credit-notes?companyId=17" | jq .

# Check debit notes
curl -s "http://localhost:3002/api/debit-notes?companyId=26" | jq .

# Check intercompany adjustments
curl -s "http://localhost:3002/api/intercompany-adjustments" | jq .

# Check summary
curl -s "http://localhost:3002/api/credit-debit-notes/summary?companyId=17" | jq .
```

## Expected Results

### Successful Credit Note Creation
```json
{
  "success": true,
  "creditNote": {
    "id": 15,
    "credit_note_number": "CN-17-1749804567890",
    "amount": 1500.00,
    "status": "issued"
  },
  "creditNoteItems": [
    {
      "product_id": 101,
      "quantity": 5,
      "total_amount": 1000.00
    }
  ]
}
```

### Successful Intercompany Adjustment
```json
{
  "success": true,
  "intercompanyAdjustment": {
    "reference": "IC-ADJ-17-26-1749804567890",
    "sourceCompany": 17,
    "targetCompany": 26,
    "amount": 2000.00,
    "status": "completed"
  },
  "creditNote": {
    "credit_note_number": "CN-IC-17-1749804567890"
  },
  "debitNote": {
    "debit_note_number": "DN-IC-26-1749804567890"
  }
}
```

## Error Testing

### Test Invalid Company ID
```bash
curl -X GET "http://localhost:3002/api/credit-notes?companyId=999999"
```
**Expected:** Valid response with empty array

### Test Missing Required Fields
```bash
curl -X POST "http://localhost:3002/api/intercompany-adjustment" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```
**Expected:** 400 error with missing fields message

## Performance Testing

### Test Response Times
```bash
time curl -s "http://localhost:3002/api/products/tested/summary" > /dev/null
time curl -s "http://localhost:3002/api/credit-debit-notes/summary?companyId=17" > /dev/null
```
**Expected:** All responses under 2 seconds