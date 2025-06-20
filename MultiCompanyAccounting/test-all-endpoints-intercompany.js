/**
 * Comprehensive Test Suite for ALL GET/POST and Intercompany Reference Endpoints
 * Tests authentic data endpoints against external database
 */

const http = require('http');
const querystring = require('querystring');

const BASE_URL = 'http://127.0.0.1:3002';
const TEST_COMPANY_ID = 17; // 03 June Plant
const TEST_VENDOR_COMPANY_ID = 18; // 03 June Plant2

class EndpointTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: 3002,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = body ? JSON.parse(body) : {};
            resolve({
              status: res.statusCode,
              data: jsonData,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: body,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 0,
          error: err.message,
          data: null
        });
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  logTest(name, passed, details = '') {
    this.results.total++;
    if (passed) {
      this.results.passed++;
      console.log(`✅ ${name}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${name}`);
    }
    if (details) console.log(`   ${details}`);
    
    this.results.tests.push({ name, passed, details });
  }

  async testAllGETEndpoints() {
    console.log('\n📊 Testing ALL GET Endpoints');
    console.log('='.repeat(60));

    const getEndpoints = [
      // Core Data Endpoints
      { path: '/api/companies', name: 'Companies List' },
      { path: `/api/products?companyId=${TEST_COMPANY_ID}`, name: 'Products List' },
      { path: `/api/products/1`, name: 'Single Product' },
      
      // Financial Summary Endpoints
      { path: `/api/invoices/summary?companyId=${TEST_COMPANY_ID}`, name: 'Invoices Summary' },
      { path: `/api/bills/summary?companyId=${TEST_COMPANY_ID}`, name: 'Bills Summary' },
      { path: `/api/receipts/summary?companyId=${TEST_COMPANY_ID}`, name: 'Receipts Summary' },
      { path: `/api/payments/summary?companyId=${TEST_COMPANY_ID}`, name: 'Payments Summary' },
      
      // Orders Endpoints
      { path: `/api/sales-orders?companyId=${TEST_COMPANY_ID}`, name: 'Sales Orders List' },
      { path: `/api/sales-orders/summary?companyId=${TEST_COMPANY_ID}`, name: 'Sales Orders Summary' },
      { path: `/api/purchase-orders?companyId=${TEST_COMPANY_ID}`, name: 'Purchase Orders List' },
      { path: `/api/purchase-orders/summary?companyId=${TEST_COMPANY_ID}`, name: 'Purchase Orders Summary' },
      
      // Credit/Debit Notes
      { path: `/api/credit-notes?companyId=${TEST_COMPANY_ID}`, name: 'Credit Notes List' },
      { path: `/api/debit-notes?companyId=${TEST_COMPANY_ID}`, name: 'Debit Notes List' },
      { path: `/api/credit-accounts?companyId=${TEST_COMPANY_ID}`, name: 'Credit Accounts' },
      { path: `/api/debit-accounts?companyId=${TEST_COMPANY_ID}`, name: 'Debit Accounts' },
      
      // Intercompany Endpoints
      { path: `/api/intercompany-balances?companyId=${TEST_COMPANY_ID}`, name: 'Intercompany Balances' },
      { path: `/api/intercompany-adjustments?companyId=${TEST_COMPANY_ID}`, name: 'Intercompany Adjustments' },
      { path: `/api/intercompany-transactions?companyId=${TEST_COMPANY_ID}`, name: 'Intercompany Transactions' },
      
      // Financial Reports
      { path: `/api/reports/balance-sheet/summary?companyId=${TEST_COMPANY_ID}`, name: 'Balance Sheet Summary' },
      { path: `/api/dashboard/stats?companyId=${TEST_COMPANY_ID}`, name: 'Dashboard Stats' },
      { path: `/api/dashboard/recent-transactions`, name: 'Recent Transactions' },
      { path: `/api/dashboard/cash-flow?companyId=${TEST_COMPANY_ID}`, name: 'Cash Flow' },
      { path: `/api/dashboard/pl-monthly?companyId=${TEST_COMPANY_ID}`, name: 'P&L Monthly' },
      { path: `/api/dashboard/pending-actions?companyId=${TEST_COMPANY_ID}`, name: 'Pending Actions' },
      
      // Chart of Accounts
      { path: `/api/chart-of-accounts?companyId=${TEST_COMPANY_ID}`, name: 'Chart of Accounts' },
      
      // Reference and Lookup Endpoints
      { path: `/api/transaction-references?companyId=${TEST_COMPANY_ID}`, name: 'Transaction References' },
      { path: `/api/products/search?companyId=${TEST_COMPANY_ID}&query=gas`, name: 'Product Search' },
      { path: `/api/products/category?companyId=${TEST_COMPANY_ID}&category=gas`, name: 'Products by Category' },
      { path: `/api/products/low-stock?companyId=${TEST_COMPANY_ID}`, name: 'Low Stock Products' }
    ];

    for (const endpoint of getEndpoints) {
      const result = await this.makeRequest(endpoint.path);
      const passed = result.status === 200 || result.status === 304;
      
      let details = `Status: ${result.status}`;
      if (passed && result.data) {
        if (Array.isArray(result.data)) {
          details += `, Count: ${result.data.length}`;
        } else if (result.data.totalInvoices !== undefined) {
          details += `, Total: ${result.data.totalInvoices}`;
        } else if (result.data.totalBills !== undefined) {
          details += `, Total: ${result.data.totalBills}`;
        } else if (result.data.companyId !== undefined) {
          details += `, CompanyId: ${result.data.companyId}`;
        }
      }
      
      this.logTest(`GET ${endpoint.name}`, passed, details);
    }
  }

  async testAllPOSTEndpoints() {
    console.log('\n🔧 Testing ALL POST Endpoints');
    console.log('='.repeat(60));

    // Test Product Creation
    const productData = {
      companyId: TEST_COMPANY_ID,
      name: `Test Product ${Date.now()}`,
      code: `TEST-${Date.now()}`,
      category: 'Test Category',
      unitPrice: 100.00,
      stock: 50,
      description: 'Test product for endpoint validation'
    };

    const productResult = await this.makeRequest('/api/products', 'POST', productData);
    const productPassed = productResult.status === 201 && productResult.data.id;
    this.logTest(
      'POST Create Product',
      productPassed,
      productPassed ? `Created ID: ${productResult.data.id}` : `Status: ${productResult.status}`
    );

    // Test Credit Note Creation
    const creditNoteData = {
      companyId: TEST_COMPANY_ID,
      customerCompanyId: TEST_VENDOR_COMPANY_ID,
      amount: 1000.00,
      reason: 'Test Credit Note for Endpoint Validation',
      referenceNumber: `TEST-CREDIT-${Date.now()}`,
      items: [
        {
          productId: 1,
          quantity: 10,
          unitPrice: 100.00,
          amount: 1000.00,
          description: 'Test credit note item'
        }
      ]
    };

    const creditResult = await this.makeRequest('/api/credit-notes', 'POST', creditNoteData);
    const creditPassed = creditResult.status === 201 && creditResult.data.id;
    this.logTest(
      'POST Create Credit Note',
      creditPassed,
      creditPassed ? `Created ID: ${creditResult.data.id}` : `Status: ${creditResult.status}`
    );

    // Test Debit Note Creation
    const debitNoteData = {
      companyId: TEST_COMPANY_ID,
      vendorCompanyId: TEST_VENDOR_COMPANY_ID,
      amount: 500.00,
      reason: 'Test Debit Note for Endpoint Validation',
      referenceNumber: `TEST-DEBIT-${Date.now()}`,
      items: [
        {
          productId: 1,
          quantity: 5,
          unitPrice: 100.00,
          amount: 500.00,
          description: 'Test debit note item'
        }
      ]
    };

    const debitResult = await this.makeRequest('/api/debit-notes', 'POST', debitNoteData);
    const debitPassed = debitResult.status === 201 && debitResult.data.id;
    this.logTest(
      'POST Create Debit Note',
      debitPassed,
      debitPassed ? `Created ID: ${debitResult.data.id}` : `Status: ${debitResult.status}`
    );

    // Test Intercompany Adjustment Creation
    const adjustmentData = {
      companyId: TEST_COMPANY_ID,
      partnerCompanyId: TEST_VENDOR_COMPANY_ID,
      amount: 750.00,
      type: 'adjustment',
      reason: 'Test Intercompany Adjustment',
      referenceNumber: `TEST-ADJ-${Date.now()}`,
      items: [
        {
          productId: 1,
          quantity: 7,
          unitPrice: 100.00,
          amount: 700.00,
          description: 'Test adjustment item'
        }
      ]
    };

    const adjustmentResult = await this.makeRequest('/api/intercompany-adjustments', 'POST', adjustmentData);
    const adjustmentPassed = adjustmentResult.status === 201 && adjustmentResult.data.id;
    this.logTest(
      'POST Create Intercompany Adjustment',
      adjustmentPassed,
      adjustmentPassed ? `Created ID: ${adjustmentResult.data.id}` : `Status: ${adjustmentResult.status}`
    );

    return {
      productPassed,
      creditPassed,
      debitPassed,
      adjustmentPassed,
      createdProductId: productResult.data?.id,
      createdCreditId: creditResult.data?.id,
      createdDebitId: debitResult.data?.id,
      createdAdjustmentId: adjustmentResult.data?.id
    };
  }

  async testIntercompanyReferenceEndpoints() {
    console.log('\n🔄 Testing Intercompany Reference Endpoints');
    console.log('='.repeat(60));

    // Test Transaction Reference Lookup
    const refResult = await this.makeRequest(`/api/transaction-references?companyId=${TEST_COMPANY_ID}`);
    const refPassed = refResult.status === 200;
    this.logTest(
      'GET Transaction References',
      refPassed,
      refPassed ? `Found ${Array.isArray(refResult.data) ? refResult.data.length : 'data'}` : `Status: ${refResult.status}`
    );

    // Test Intercompany Sales Orders Reference
    const salesRefResult = await this.makeRequest(`/api/intercompany-sales-orders?companyId=${TEST_COMPANY_ID}`);
    const salesRefPassed = salesRefResult.status === 200;
    this.logTest(
      'GET Intercompany Sales Orders',
      salesRefPassed,
      salesRefPassed ? `Found ${Array.isArray(salesRefResult.data) ? salesRefResult.data.length : 'data'}` : `Status: ${salesRefResult.status}`
    );

    // Test Intercompany Purchase Orders Reference
    const purchaseRefResult = await this.makeRequest(`/api/intercompany-purchase-orders?companyId=${TEST_COMPANY_ID}`);
    const purchaseRefPassed = purchaseRefResult.status === 200;
    this.logTest(
      'GET Intercompany Purchase Orders',
      purchaseRefPassed,
      purchaseRefPassed ? `Found ${Array.isArray(purchaseRefResult.data) ? purchaseRefResult.data.length : 'data'}` : `Status: ${purchaseRefResult.status}`
    );

    // Test Intercompany Invoices Reference
    const invoiceRefResult = await this.makeRequest(`/api/intercompany-invoices?companyId=${TEST_COMPANY_ID}`);
    const invoiceRefPassed = invoiceRefResult.status === 200;
    this.logTest(
      'GET Intercompany Invoices',
      invoiceRefPassed,
      invoiceRefPassed ? `Found ${Array.isArray(invoiceRefResult.data) ? invoiceRefResult.data.length : 'data'}` : `Status: ${invoiceRefResult.status}`
    );

    // Test Intercompany Receipts Reference
    const receiptRefResult = await this.makeRequest(`/api/intercompany-receipts?companyId=${TEST_COMPANY_ID}`);
    const receiptRefPassed = receiptRefResult.status === 200;
    this.logTest(
      'GET Intercompany Receipts',
      receiptRefPassed,
      receiptRefPassed ? `Found ${Array.isArray(receiptRefResult.data) ? receiptRefResult.data.length : 'data'}` : `Status: ${receiptRefResult.status}`
    );

    // Test Reference Number Lookup
    const refLookupResult = await this.makeRequest(`/api/reference-lookup?referenceNumber=TXN-GROUP-17-26&companyId=${TEST_COMPANY_ID}`);
    const refLookupPassed = refLookupResult.status === 200;
    this.logTest(
      'GET Reference Number Lookup',
      refLookupPassed,
      refLookupPassed ? 'Reference lookup working' : `Status: ${refLookupResult.status}`
    );

    return {
      refPassed,
      salesRefPassed,
      purchaseRefPassed,
      invoiceRefPassed,
      receiptRefPassed,
      refLookupPassed
    };
  }

  async testSpecializedEndpoints() {
    console.log('\n🎯 Testing Specialized Endpoints');
    console.log('='.repeat(60));

    // Test Database Setup
    const dbSetupResult = await this.makeRequest('/api/database-setup', 'POST');
    const dbSetupPassed = dbSetupResult.status === 200;
    this.logTest(
      'POST Database Setup',
      dbSetupPassed,
      dbSetupPassed ? 'Database setup successful' : `Status: ${dbSetupResult.status}`
    );

    // Test Authentication
    const authResult = await this.makeRequest('/api/auth/me');
    const authPassed = authResult.status === 200 || authResult.status === 401;
    this.logTest(
      'GET Auth Check',
      authPassed,
      authPassed ? 'Auth endpoint responding' : `Status: ${authResult.status}`
    );

    // Test Swagger Documentation
    const swaggerResult = await this.makeRequest('/api/swagger.json');
    const swaggerPassed = swaggerResult.status === 200;
    this.logTest(
      'GET Swagger Documentation',
      swaggerPassed,
      swaggerPassed ? 'Swagger docs available' : `Status: ${swaggerResult.status}`
    );

    return { dbSetupPassed, authPassed, swaggerPassed };
  }

  async runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive Endpoint Testing');
    console.log('='.repeat(80));
    console.log(`Test Start Time: ${new Date().toISOString()}`);
    console.log(`Server: ${BASE_URL}`);
    console.log(`Test Company ID: ${TEST_COMPANY_ID}`);
    console.log(`Vendor Company ID: ${TEST_VENDOR_COMPANY_ID}`);

    try {
      // Test all GET endpoints
      await this.testAllGETEndpoints();
      
      // Test all POST endpoints
      const postResults = await this.testAllPOSTEndpoints();
      
      // Test intercompany reference endpoints
      const referenceResults = await this.testIntercompanyReferenceEndpoints();
      
      // Test specialized endpoints
      const specialResults = await this.testSpecializedEndpoints();

      // Final comprehensive report
      console.log('\n📋 COMPREHENSIVE TEST RESULTS');
      console.log('='.repeat(80));
      console.log(`Total Tests: ${this.results.total}`);
      console.log(`Passed: ${this.results.passed}`);
      console.log(`Failed: ${this.results.failed}`);
      console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
      
      const overallPassed = this.results.failed === 0;
      console.log(`\n${overallPassed ? '✅' : '❌'} Overall Result: ${overallPassed ? 'ALL ENDPOINTS OPERATIONAL' : 'SOME ENDPOINTS NEED ATTENTION'}`);
      
      if (overallPassed) {
        console.log('\n🎉 PERFECT SCORE: All endpoints functioning correctly!');
        console.log('✅ GET endpoints: Fully operational');
        console.log('✅ POST endpoints: Creating data successfully');
        console.log('✅ Intercompany references: Working correctly');
        console.log('✅ Credit/Debit notes: Integrated with products');
        console.log('✅ Database connectivity: Stable');
      }

      // Detailed breakdown
      console.log('\n📊 DETAILED BREAKDOWN:');
      const getTests = this.results.tests.filter(t => t.name.includes('GET'));
      const postTests = this.results.tests.filter(t => t.name.includes('POST'));
      const intercompanyTests = this.results.tests.filter(t => t.name.includes('Intercompany'));
      
      console.log(`GET Endpoints: ${getTests.filter(t => t.passed).length}/${getTests.length} passed`);
      console.log(`POST Endpoints: ${postTests.filter(t => t.passed).length}/${postTests.length} passed`);
      console.log(`Intercompany Endpoints: ${intercompanyTests.filter(t => t.passed).length}/${intercompanyTests.length} passed`);

      console.log(`\nTest Completion Time: ${new Date().toISOString()}`);
      return { passed: overallPassed, results: this.results };

    } catch (error) {
      console.error('💥 Test suite execution failed:', error.message);
      return { passed: false, error: error.message, results: this.results };
    }
  }
}

// Run the comprehensive tests
const tester = new EndpointTester();
tester.runComprehensiveTests().then(result => {
  process.exit(result.passed ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});