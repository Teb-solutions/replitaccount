/**
 * Comprehensive Test Suite for Multi-Company Accounting System
 * Tests all APIs, database connections, and deployment readiness
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Test configuration
const testConfig = {
  timeout: 10000,
  maxRetries: 3
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const makeRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      timeout: testConfig.timeout,
      ...options
    });
    return {
      status: response.status,
      data: await response.text(),
      headers: response.headers
    };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
};

// Test cases
const tests = [
  {
    name: 'Health Check',
    test: async () => {
      const response = await fetch(`${BASE_URL}/health`);
      const data = await response.json();
      if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
      if (!data.message) throw new Error('Missing health message');
      return 'System health check passed';
    }
  },
  {
    name: 'Database Connection',
    test: async () => {
      const response = await makeRequest('/companies');
      if (response.status !== 200) throw new Error(`Database connection failed: ${response.status}`);
      const companies = JSON.parse(response.data);
      if (!Array.isArray(companies)) throw new Error('Invalid companies response format');
      return `Database connected - ${companies.length} companies found`;
    }
  },
  {
    name: 'Authentication Endpoint',
    test: async () => {
      const response = await makeRequest('/auth/me');
      // Should return 401 for unauthenticated user
      if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
      return 'Authentication endpoint working';
    }
  },
  {
    name: 'Companies API',
    test: async () => {
      const response = await makeRequest('/companies');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const companies = JSON.parse(response.data);
      if (companies.length === 0) throw new Error('No companies found');
      
      // Test specific company retrieval
      const firstCompany = companies[0];
      const companyResponse = await makeRequest(`/companies/${firstCompany.id}`);
      if (companyResponse.status !== 200) throw new Error('Company detail fetch failed');
      
      return `Companies API working - ${companies.length} companies loaded`;
    }
  },
  {
    name: 'Sales Orders API',
    test: async () => {
      const response = await makeRequest('/sales-orders');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const orders = JSON.parse(response.data);
      
      // Test with company filter
      if (orders.length > 0) {
        const companyId = orders[0].company_id;
        const filteredResponse = await makeRequest(`/sales-orders?company_id=${companyId}`);
        if (filteredResponse.status !== 200) throw new Error('Filtered orders fetch failed');
      }
      
      return `Sales Orders API working - ${orders.length} orders found`;
    }
  },
  {
    name: 'Invoices API',
    test: async () => {
      const response = await makeRequest('/invoices');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const invoices = JSON.parse(response.data);
      
      // Test invoice totals calculation
      let totalAmount = 0;
      invoices.forEach(invoice => {
        if (invoice.total && !isNaN(parseFloat(invoice.total))) {
          totalAmount += parseFloat(invoice.total);
        }
      });
      
      return `Invoices API working - ${invoices.length} invoices, $${totalAmount.toFixed(2)} total`;
    }
  },
  {
    name: 'Bills API',
    test: async () => {
      const response = await makeRequest('/bills');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const bills = JSON.parse(response.data);
      
      let totalAmount = 0;
      bills.forEach(bill => {
        if (bill.total && !isNaN(parseFloat(bill.total))) {
          totalAmount += parseFloat(bill.total);
        }
      });
      
      return `Bills API working - ${bills.length} bills, $${totalAmount.toFixed(2)} total`;
    }
  },
  {
    name: 'Receipts API',
    test: async () => {
      const response = await makeRequest('/receipts');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const receipts = JSON.parse(response.data);
      
      let totalAmount = 0;
      receipts.forEach(receipt => {
        if (receipt.amount && !isNaN(parseFloat(receipt.amount))) {
          totalAmount += parseFloat(receipt.amount);
        }
      });
      
      return `Receipts API working - ${receipts.length} receipts, $${totalAmount.toFixed(2)} total`;
    }
  },
  {
    name: 'Accounts API',
    test: async () => {
      const response = await makeRequest('/accounts');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const accounts = JSON.parse(response.data);
      
      // Test accounts by type
      const accountTypes = [...new Set(accounts.map(acc => acc.account_type_id))];
      
      return `Accounts API working - ${accounts.length} accounts, ${accountTypes.length} types`;
    }
  },
  {
    name: 'Financial Reports API',
    test: async () => {
      const response = await makeRequest('/reports/balance-sheet');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const balanceSheet = JSON.parse(response.data);
      
      if (!balanceSheet.assets || !balanceSheet.liabilities) {
        throw new Error('Invalid balance sheet structure');
      }
      
      return `Financial Reports API working - Balance sheet generated`;
    }
  },
  {
    name: 'Intercompany Workflow API',
    test: async () => {
      const response = await makeRequest('/intercompany/transactions');
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const transactions = JSON.parse(response.data);
      
      return `Intercompany API working - ${transactions.length} transactions found`;
    }
  },
  {
    name: 'Reference Tracking API',
    test: async () => {
      // Test reference lookup
      const response = await makeRequest('/references/lookup?reference=tryten295');
      // Should return 404 or 200 depending on if reference exists
      if (response.status !== 200 && response.status !== 404) {
        throw new Error(`Unexpected status: ${response.status}`);
      }
      
      return 'Reference tracking API working';
    }
  },
  {
    name: 'API Documentation',
    test: async () => {
      const response = await fetch(`${BASE_URL}/api-docs`);
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      const content = await response.text();
      if (!content.includes('swagger')) throw new Error('Swagger docs not loading');
      
      return 'API documentation accessible';
    }
  }
];

// Performance tests
const performanceTests = [
  {
    name: 'API Response Times',
    test: async () => {
      const endpoints = ['/companies', '/sales-orders', '/invoices', '/bills'];
      const times = [];
      
      for (const endpoint of endpoints) {
        const start = Date.now();
        await makeRequest(endpoint);
        const time = Date.now() - start;
        times.push({ endpoint, time });
      }
      
      const avgTime = times.reduce((sum, t) => sum + t.time, 0) / times.length;
      if (avgTime > 5000) throw new Error(`Average response time too high: ${avgTime}ms`);
      
      return `Average API response time: ${avgTime.toFixed(0)}ms`;
    }
  },
  {
    name: 'Concurrent Requests',
    test: async () => {
      const promises = Array(10).fill().map(() => makeRequest('/companies'));
      const results = await Promise.all(promises);
      
      const failedRequests = results.filter(r => r.status !== 200).length;
      if (failedRequests > 0) throw new Error(`${failedRequests} requests failed`);
      
      return 'Concurrent request handling working';
    }
  }
];

// Run tests
async function runTest(test) {
  try {
    const result = await test.test();
    log(`${test.name}: ${result}`, 'success');
    testResults.passed++;
    return true;
  } catch (error) {
    log(`${test.name}: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: test.name, error: error.message });
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting comprehensive test suite...');
  log('Testing deployment package and APIs...');
  
  console.log('\n=== Core API Tests ===');
  for (const test of tests) {
    await runTest(test);
  }
  
  console.log('\n=== Performance Tests ===');
  for (const test of performanceTests) {
    await runTest(test);
  }
  
  console.log('\n=== Test Summary ===');
  log(`✅ Passed: ${testResults.passed}`);
  log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n=== Error Details ===');
    testResults.errors.forEach(error => {
      log(`${error.test}: ${error.error}`, 'error');
    });
  }
  
  console.log('\n=== Deployment Status ===');
  if (testResults.failed === 0) {
    log('🎉 All tests passed! Deployment package is ready.', 'success');
  } else {
    log(`⚠️ ${testResults.failed} test(s) failed. Review errors above.`, 'error');
  }
  
  return testResults.failed === 0;
}

// Export for use as module or run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runAllTests, tests, performanceTests };