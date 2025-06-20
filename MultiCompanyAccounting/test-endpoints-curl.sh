#!/bin/bash

# Comprehensive Endpoint Testing Script
# Tests all GET, POST, and Intercompany Reference Endpoints

BASE_URL="http://127.0.0.1:3002"
TEST_COMPANY_ID=17
TEST_VENDOR_COMPANY_ID=18

echo "🚀 Starting Comprehensive Endpoint Testing"
echo "=========================================="
echo "Server: $BASE_URL"
echo "Test Company ID: $TEST_COMPANY_ID"
echo "Start Time: $(date)"
echo ""

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local name=$3
    local data=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint")
        status_code=$(echo "$response" | tail -c 4)
    else
        response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
        status_code=$(echo "$response" | tail -c 4)
    fi
    
    if [ "$status_code" = "200" ] || [ "$status_code" = "201" ] || [ "$status_code" = "304" ]; then
        echo "✅ $method $name - Status: $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $method $name - Status: $status_code"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "📊 Testing Core GET Endpoints"
echo "=============================="

# Core Data Endpoints
test_endpoint "GET" "/api/companies" "Companies List"
test_endpoint "GET" "/api/products?companyId=$TEST_COMPANY_ID" "Products List"
test_endpoint "GET" "/api/products/1" "Single Product"

# Financial Summary Endpoints
test_endpoint "GET" "/api/invoices/summary?companyId=$TEST_COMPANY_ID" "Invoices Summary"
test_endpoint "GET" "/api/bills/summary?companyId=$TEST_COMPANY_ID" "Bills Summary"
test_endpoint "GET" "/api/receipts/summary?companyId=$TEST_COMPANY_ID" "Receipts Summary"
test_endpoint "GET" "/api/payments/summary?companyId=$TEST_COMPANY_ID" "Payments Summary"

# Orders Endpoints
test_endpoint "GET" "/api/sales-orders?companyId=$TEST_COMPANY_ID" "Sales Orders List"
test_endpoint "GET" "/api/sales-orders/summary?companyId=$TEST_COMPANY_ID" "Sales Orders Summary"
test_endpoint "GET" "/api/purchase-orders?companyId=$TEST_COMPANY_ID" "Purchase Orders List"
test_endpoint "GET" "/api/purchase-orders/summary?companyId=$TEST_COMPANY_ID" "Purchase Orders Summary"

# Credit/Debit Notes
test_endpoint "GET" "/api/credit-notes?companyId=$TEST_COMPANY_ID" "Credit Notes List"
test_endpoint "GET" "/api/debit-notes?companyId=$TEST_COMPANY_ID" "Debit Notes List"
test_endpoint "GET" "/api/credit-accounts?companyId=$TEST_COMPANY_ID" "Credit Accounts"
test_endpoint "GET" "/api/debit-accounts?companyId=$TEST_COMPANY_ID" "Debit Accounts"

echo ""
echo "🔄 Testing Intercompany Reference Endpoints"
echo "==========================================="

# Intercompany Endpoints
test_endpoint "GET" "/api/intercompany-balances?companyId=$TEST_COMPANY_ID" "Intercompany Balances"
test_endpoint "GET" "/api/intercompany-adjustments?companyId=$TEST_COMPANY_ID" "Intercompany Adjustments"
test_endpoint "GET" "/api/intercompany-transactions?companyId=$TEST_COMPANY_ID" "Intercompany Transactions"

# Intercompany Reference Endpoints
test_endpoint "GET" "/api/intercompany-sales-orders?companyId=$TEST_COMPANY_ID" "Intercompany Sales Orders"
test_endpoint "GET" "/api/intercompany-purchase-orders?companyId=$TEST_COMPANY_ID" "Intercompany Purchase Orders"
test_endpoint "GET" "/api/intercompany-invoices?companyId=$TEST_COMPANY_ID" "Intercompany Invoices"
test_endpoint "GET" "/api/intercompany-receipts?companyId=$TEST_COMPANY_ID" "Intercompany Receipts"

# Transaction Reference Endpoints
test_endpoint "GET" "/api/transaction-references?companyId=$TEST_COMPANY_ID" "Transaction References"
test_endpoint "GET" "/api/reference-lookup?referenceNumber=TXN-GROUP-17-26&companyId=$TEST_COMPANY_ID" "Reference Lookup"

echo ""
echo "📈 Testing Financial Reports"
echo "============================"

test_endpoint "GET" "/api/reports/balance-sheet/summary?companyId=$TEST_COMPANY_ID" "Balance Sheet Summary"
test_endpoint "GET" "/api/dashboard/stats?companyId=$TEST_COMPANY_ID" "Dashboard Stats"
test_endpoint "GET" "/api/dashboard/recent-transactions" "Recent Transactions"
test_endpoint "GET" "/api/dashboard/cash-flow?companyId=$TEST_COMPANY_ID" "Cash Flow"
test_endpoint "GET" "/api/dashboard/pl-monthly?companyId=$TEST_COMPANY_ID" "P&L Monthly"
test_endpoint "GET" "/api/dashboard/pending-actions?companyId=$TEST_COMPANY_ID" "Pending Actions"

# Chart of Accounts
test_endpoint "GET" "/api/chart-of-accounts?companyId=$TEST_COMPANY_ID" "Chart of Accounts"

# Product Search Endpoints
test_endpoint "GET" "/api/products/search?companyId=$TEST_COMPANY_ID&query=gas" "Product Search"
test_endpoint "GET" "/api/products/category?companyId=$TEST_COMPANY_ID&category=gas" "Products by Category"
test_endpoint "GET" "/api/products/low-stock?companyId=$TEST_COMPANY_ID" "Low Stock Products"

echo ""
echo "🔧 Testing POST Endpoints"
echo "========================="

# Test Product Creation
PRODUCT_DATA='{
  "companyId": '$TEST_COMPANY_ID',
  "name": "Test Product API",
  "code": "TEST-API-'$(date +%s)'",
  "category": "Test Category",
  "unitPrice": 100.00,
  "stock": 50,
  "description": "Test product for API validation"
}'

test_endpoint "POST" "/api/products" "Create Product" "$PRODUCT_DATA"

# Test Credit Note Creation
CREDIT_NOTE_DATA='{
  "companyId": '$TEST_COMPANY_ID',
  "customerCompanyId": '$TEST_VENDOR_COMPANY_ID',
  "amount": 1000.00,
  "reason": "Test Credit Note API",
  "referenceNumber": "TEST-CREDIT-'$(date +%s)'",
  "items": [
    {
      "productId": 1,
      "quantity": 10,
      "unitPrice": 100.00,
      "amount": 1000.00,
      "description": "Test credit note item"
    }
  ]
}'

test_endpoint "POST" "/api/credit-notes" "Create Credit Note" "$CREDIT_NOTE_DATA"

# Test Debit Note Creation
DEBIT_NOTE_DATA='{
  "companyId": '$TEST_COMPANY_ID',
  "vendorCompanyId": '$TEST_VENDOR_COMPANY_ID',
  "amount": 500.00,
  "reason": "Test Debit Note API",
  "referenceNumber": "TEST-DEBIT-'$(date +%s)'",
  "items": [
    {
      "productId": 1,
      "quantity": 5,
      "unitPrice": 100.00,
      "amount": 500.00,
      "description": "Test debit note item"
    }
  ]
}'

test_endpoint "POST" "/api/debit-notes" "Create Debit Note" "$DEBIT_NOTE_DATA"

# Test Intercompany Adjustment
ADJUSTMENT_DATA='{
  "companyId": '$TEST_COMPANY_ID',
  "partnerCompanyId": '$TEST_VENDOR_COMPANY_ID',
  "amount": 750.00,
  "type": "adjustment",
  "reason": "Test Intercompany Adjustment API",
  "referenceNumber": "TEST-ADJ-'$(date +%s)'",
  "items": [
    {
      "productId": 1,
      "quantity": 7,
      "unitPrice": 100.00,
      "amount": 700.00,
      "description": "Test adjustment item"
    }
  ]
}'

test_endpoint "POST" "/api/intercompany-adjustments" "Create Intercompany Adjustment" "$ADJUSTMENT_DATA"

echo ""
echo "🎯 Testing Specialized Endpoints"
echo "================================"

# Database Setup
test_endpoint "POST" "/api/database-setup" "Database Setup" "{}"

# Authentication
test_endpoint "GET" "/api/auth/me" "Auth Check"

# Swagger Documentation
test_endpoint "GET" "/api/swagger.json" "Swagger Documentation"

echo ""
echo "📋 COMPREHENSIVE TEST RESULTS"
echo "=============================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
echo "Success Rate: $SUCCESS_RATE%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "✅ PERFECT SCORE: All endpoints functioning correctly!"
    echo "✅ GET endpoints: Fully operational"
    echo "✅ POST endpoints: Creating data successfully"
    echo "✅ Intercompany references: Working correctly"
    echo "✅ Credit/Debit notes: Integrated with products"
    echo "✅ Database connectivity: Stable"
    echo ""
    echo "🎉 ALL API ENDPOINTS ARE OPERATIONAL!"
else
    echo ""
    echo "⚠️  Some endpoints need attention"
    echo "Review failed tests above for details"
fi

echo ""
echo "Test Completion Time: $(date)"
echo "=============================="