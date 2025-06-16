#!/bin/bash

# Multi-Company Accounting API Test Suite
# Comprehensive testing for all endpoints

API_BASE="http://localhost:3002"
COMPANY_17=17  # 03 June Plant
COMPANY_26=26  # June4Dist

echo "🚀 Starting Multi-Company Accounting API Test Suite"
echo "=================================================="

# Check if server is running
echo "1. Checking server status..."
if curl -s "$API_BASE/health" > /dev/null; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start with: npm run dev"
    exit 1
fi

echo ""
echo "2. Testing Products API..."
echo "--------------------------"

# Test products summary
echo "Testing products summary..."
curl -s "$API_BASE/api/products/tested/summary" | jq '{success, summary}' || echo "❌ Products summary failed"

# Test products by company
echo "Testing products for Company $COMPANY_17..."
curl -s "$API_BASE/api/products/tested/by-company/$COMPANY_17" | jq '{success, companyId, count}' || echo "❌ Products by company failed"

echo ""
echo "3. Testing Credit Notes API..."
echo "------------------------------"

# Create credit note with products
echo "Creating credit note..."
CREDIT_NOTE_RESPONSE=$(curl -s -X POST "$API_BASE/api/credit-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": 45,
    "company_id": '$COMPANY_17',
    "customer_id": '$COMPANY_26',
    "amount": 1000.00,
    "reason": "Test credit note - API automated test",
    "credit_note_date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "products": [
      {
        "product_id": 101,
        "quantity": 5,
        "unit_price": 200.00,
        "total_amount": 1000.00,
        "reason": "Test product adjustment"
      }
    ]
  }' 2>/dev/null)

if echo "$CREDIT_NOTE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Credit note created successfully"
    echo "$CREDIT_NOTE_RESPONSE" | jq '{success, creditNote: .creditNote | {id, credit_note_number, amount}}'
else
    echo "❌ Credit note creation failed"
    echo "$CREDIT_NOTE_RESPONSE"
fi

# Get credit notes
echo "Retrieving credit notes for Company $COMPANY_17..."
curl -s "$API_BASE/api/credit-notes?companyId=$COMPANY_17" | jq '{success, count}' || echo "❌ Failed to get credit notes"

echo ""
echo "4. Testing Debit Notes API..."
echo "-----------------------------"

# Create debit note with products
echo "Creating debit note..."
DEBIT_NOTE_RESPONSE=$(curl -s -X POST "$API_BASE/api/debit-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_id": 23,
    "company_id": '$COMPANY_26',
    "vendor_id": '$COMPANY_17',
    "amount": 500.00,
    "reason": "Test debit note - API automated test",
    "debit_note_date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "products": [
      {
        "product_id": 101,
        "quantity": 2,
        "unit_price": 250.00,
        "total_amount": 500.00,
        "reason": "Test additional charges"
      }
    ]
  }' 2>/dev/null)

if echo "$DEBIT_NOTE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Debit note created successfully"
    echo "$DEBIT_NOTE_RESPONSE" | jq '{success, debitNote: .debitNote | {id, debit_note_number, amount}}'
else
    echo "❌ Debit note creation failed"
    echo "$DEBIT_NOTE_RESPONSE"
fi

# Get debit notes
echo "Retrieving debit notes for Company $COMPANY_26..."
curl -s "$API_BASE/api/debit-notes?companyId=$COMPANY_26" | jq '{success, count}' || echo "❌ Failed to get debit notes"

echo ""
echo "5. Testing Intercompany Adjustment API..."
echo "----------------------------------------"

# Create intercompany adjustment
echo "Creating intercompany adjustment..."
ADJUSTMENT_RESPONSE=$(curl -s -X POST "$API_BASE/api/intercompany-adjustment" \
  -H "Content-Type: application/json" \
  -d '{
    "source_company_id": '$COMPANY_17',
    "target_company_id": '$COMPANY_26',
    "amount": 1500.00,
    "reason": "Test intercompany adjustment - automated test",
    "adjustment_date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "products": [
      {
        "product_id": 101,
        "quantity": 3,
        "unit_price": 500.00,
        "total_amount": 1500.00,
        "reason": "Test quality adjustment"
      }
    ],
    "reference_number": "TEST-IC-ADJ-'$(date +%s)'"
  }' 2>/dev/null)

if echo "$ADJUSTMENT_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Intercompany adjustment created successfully"
    echo "$ADJUSTMENT_RESPONSE" | jq '{success, intercompanyAdjustment: .intercompanyAdjustment | {reference, amount, status}}'
    
    # Get the reference for further testing
    ADJUSTMENT_REF=$(echo "$ADJUSTMENT_RESPONSE" | jq -r '.intercompanyAdjustment.reference')
    
    # Test retrieving by reference
    echo "Retrieving adjustment by reference: $ADJUSTMENT_REF..."
    curl -s "$API_BASE/api/intercompany-adjustments?reference=$ADJUSTMENT_REF" | jq '{success, count}' || echo "❌ Failed to get adjustment by reference"
else
    echo "❌ Intercompany adjustment creation failed"
    echo "$ADJUSTMENT_RESPONSE"
fi

echo ""
echo "6. Testing Credit/Debit Accounts API..."
echo "---------------------------------------"

# Test credit accounts
echo "Testing credit accounts for Company $COMPANY_17..."
CREDIT_ACCOUNTS_RESPONSE=$(curl -s "$API_BASE/api/credit-accounts?companyId=$COMPANY_17" 2>/dev/null)

if echo "$CREDIT_ACCOUNTS_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Credit accounts retrieved successfully"
    echo "$CREDIT_ACCOUNTS_RESPONSE" | jq '{success, companyId, count, summary}' 2>/dev/null || echo "Response format OK"
else
    echo "⚠️ Credit accounts API response (may need table creation):"
    echo "$CREDIT_ACCOUNTS_RESPONSE" | head -3
fi

# Test debit accounts
echo "Testing debit accounts for Company $COMPANY_26..."
DEBIT_ACCOUNTS_RESPONSE=$(curl -s "$API_BASE/api/debit-accounts?companyId=$COMPANY_26" 2>/dev/null)

if echo "$DEBIT_ACCOUNTS_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Debit accounts retrieved successfully"
    echo "$DEBIT_ACCOUNTS_RESPONSE" | jq '{success, companyId, count, summary}' 2>/dev/null || echo "Response format OK"
else
    echo "⚠️ Debit accounts API response (may need table creation):"
    echo "$DEBIT_ACCOUNTS_RESPONSE" | head -3
fi

echo ""
echo "7. Testing Summary APIs..."
echo "-------------------------"

# Test credit/debit notes summary
echo "Testing credit/debit notes summary..."
curl -s "$API_BASE/api/credit-debit-notes/summary?companyId=$COMPANY_17" | jq '{success, companyId, creditNotes, debitNotes, summary}' || echo "❌ Summary failed"

# Test account reconciliation
echo "Testing account reconciliation..."
RECONCILIATION_RESPONSE=$(curl -s "$API_BASE/api/account-reconciliation?companyId=$COMPANY_17" 2>/dev/null)

if echo "$RECONCILIATION_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Account reconciliation completed"
    echo "$RECONCILIATION_RESPONSE" | jq '{success, companyId, reconciliation}' 2>/dev/null || echo "Response format OK"
else
    echo "⚠️ Account reconciliation response (may need table creation):"
    echo "$RECONCILIATION_RESPONSE" | head -3
fi

echo ""
echo "8. Testing Existing API Endpoints..."
echo "------------------------------------"

# Test companies API
echo "Testing companies API..."
curl -s "$API_BASE/api/companies" | jq 'length' | xargs -I {} echo "✅ Found {} companies" || echo "❌ Companies API failed"

# Test sales orders
echo "Testing sales orders for Company $COMPANY_17..."
curl -s "$API_BASE/api/sales-orders?companyId=$COMPANY_17" | jq 'length' | xargs -I {} echo "✅ Found {} sales orders" || echo "❌ Sales orders API failed"

# Test purchase orders
echo "Testing purchase orders for Company $COMPANY_26..."
curl -s "$API_BASE/api/purchase-orders?companyId=$COMPANY_26" | jq 'length' | xargs -I {} echo "✅ Found {} purchase orders" || echo "❌ Purchase orders API failed"

# Test invoice summary
echo "Testing invoice summary for Company $COMPANY_17..."
curl -s "$API_BASE/api/invoices/summary?companyId=$COMPANY_17" | jq '{totalInvoices, totalAmount}' || echo "❌ Invoice summary failed"

# Test bills summary
echo "Testing bills summary for Company $COMPANY_26..."
curl -s "$API_BASE/api/bills/summary?companyId=$COMPANY_26" | jq '{totalBills, totalAmount}' || echo "❌ Bills summary failed"

echo ""
echo "9. Performance Testing..."
echo "------------------------"

echo "Testing response times..."
start_time=$(date +%s%N)
curl -s "$API_BASE/api/products/tested/summary" > /dev/null
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))
echo "Products summary: ${duration}ms"

start_time=$(date +%s%N)
curl -s "$API_BASE/api/credit-debit-notes/summary?companyId=$COMPANY_17" > /dev/null
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))
echo "Credit/Debit summary: ${duration}ms"

echo ""
echo "10. API Documentation Test..."
echo "-----------------------------"

echo "Testing Swagger documentation..."
if curl -s "$API_BASE/api-docs" | grep -q "Multi-Company Accounting"; then
    echo "✅ Swagger documentation is accessible"
else
    echo "❌ Swagger documentation failed"
fi

echo ""
echo "=================================================="
echo "🎉 API Test Suite Completed!"
echo ""
echo "Summary:"
echo "- All major endpoints tested"
echo "- Credit/Debit notes with product details"
echo "- Intercompany adjustments"
echo "- Account management and reconciliation"
echo "- Performance metrics collected"
echo ""
echo "Next steps:"
echo "1. Review any failed tests above"
echo "2. Check server logs for detailed error information"
echo "3. Verify database table existence for account APIs"
echo "4. Access full API documentation at: $API_BASE/api-docs"
echo "=================================================="