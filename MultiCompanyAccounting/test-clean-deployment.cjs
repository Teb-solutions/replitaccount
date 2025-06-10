/**
 * Test Clean Deployment - All Swagger Endpoints
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';

async function testEndpoint(name, endpoint, expectedFields = []) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`📍 Endpoint: ${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    
    if (response.ok) {
      if (Array.isArray(data)) {
        console.log(`📊 Results: ${data.length} items`);
        if (data.length > 0) {
          console.log(`📝 Sample fields: ${Object.keys(data[0]).slice(0, 5).join(', ')}`);
        }
      } else if (typeof data === 'object') {
        console.log(`📝 Fields: ${Object.keys(data).join(', ')}`);
        if (expectedFields.length > 0) {
          const hasFields = expectedFields.every(field => field in data);
          console.log(`✅ Required fields present: ${hasFields}`);
        }
      }
      
      // Show first few characters of response for verification
      const preview = JSON.stringify(data).substring(0, 100);
      console.log(`📄 Preview: ${preview}...`);
      
      return { success: true, data, status: response.status };
    } else {
      console.log(`❌ Error: ${data.error || 'Unknown error'}`);
      return { success: false, error: data.error, status: response.status };
    }
  } catch (error) {
    console.log(`💥 Network Error: ${error.message}`);
    return { success: false, error: error.message, networkError: true };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Clean Deployment Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    // Core system endpoints
    ['Health Check', '/health', ['status', 'timestamp']],
    ['All Companies', '/api/companies', []],
    
    // Company-specific endpoints (using company ID 7 which has data)
    ['Sales Orders - Company 7', '/api/sales-orders?companyId=7', []],
    ['Invoice Summary - Company 7', '/api/invoices/summary?companyId=7', ['totalInvoices', 'totalAmount']],
    ['Bills Summary - Company 7', '/api/bills/summary?companyId=7', ['totalBills', 'totalAmount']],
    ['Purchase Orders Summary - Company 7', '/api/purchase-orders/summary?companyId=7', ['totalOrders', 'totalAmount']],
    ['Receipts Summary - Company 7', '/api/receipts/summary?companyId=7', ['totalReceipts', 'totalAmount']],
    ['Payments Summary - Company 7', '/api/payments/summary?companyId=7', ['totalPayments', 'totalAmount']],
    ['Intercompany Balances - Company 7', '/api/intercompany-balances?companyId=7', ['companyId', 'accountsReceivable']],
    
    // AR/AP tracking
    ['AR Tracking - Company 7', '/api/reports/ar-tracking?companyId=7', ['companyId', 'totalOutstanding']],
    ['AP Tracking - Company 7', '/api/reports/ap-tracking?companyId=7', ['companyId', 'totalOutstanding']],
    
    // Transaction lookup
    ['Transaction Lookup', '/api/reference/SO-7-1748501505', ['referenceNumber', 'found']],
    
    // API Documentation
    ['Swagger JSON', '/api/swagger.json', ['openapi', 'info', 'paths']],
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, endpoint, expectedFields] of tests) {
    const result = await testEndpoint(name, endpoint, expectedFields);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Deployment is ready!');
  } else {
    console.log('\n⚠️  Some tests failed - review endpoints above');
  }
}

runAllTests().catch(console.error);