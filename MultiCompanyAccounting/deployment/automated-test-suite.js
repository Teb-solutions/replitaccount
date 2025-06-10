/**
 * Automated Test Suite for Multi-Company Accounting System
 * Runs comprehensive endpoint tests on each deployment
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_COMPANY_ID = 2; // Acme Manufacturing Inc

class DeploymentTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      performance: {},
      timestamp: new Date().toISOString()
    };
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const startTime = performance.now();
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null
      });
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      const data = await response.json();
      
      return {
        success: response.ok,
        status: response.status,
        data,
        duration
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        success: false,
        status: 0,
        error: error.message,
        duration
      };
    }
  }

  async testEndpoint(name, endpoint, expectedFields = [], minResponseTime = 0, maxResponseTime = 5000) {
    console.log(`Testing ${name}...`);
    
    const result = await this.makeRequest(endpoint);
    this.results.performance[name] = result.duration;
    
    if (!result.success) {
      this.results.failed++;
      this.results.errors.push({
        test: name,
        endpoint,
        error: result.error || `HTTP ${result.status}`,
        response: result.data
      });
      console.log(`❌ ${name} - Failed: ${result.error || result.status}`);
      return false;
    }
    
    // Validate response structure
    if (expectedFields.length > 0) {
      const missingFields = expectedFields.filter(field => 
        !this.hasNestedProperty(result.data, field)
      );
      
      if (missingFields.length > 0) {
        this.results.failed++;
        this.results.errors.push({
          test: name,
          endpoint,
          error: `Missing fields: ${missingFields.join(', ')}`,
          response: result.data
        });
        console.log(`❌ ${name} - Missing fields: ${missingFields.join(', ')}`);
        return false;
      }
    }
    
    // Performance check
    if (result.duration > maxResponseTime) {
      console.log(`⚠️ ${name} - Slow response: ${result.duration}ms`);
    }
    
    this.results.passed++;
    console.log(`✅ ${name} - Passed (${result.duration}ms)`);
    return true;
  }

  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined;
    }, obj) !== undefined;
  }

  async runSystemTests() {
    console.log('\n=== SYSTEM HEALTH TESTS ===');
    
    await this.testEndpoint(
      'Health Check',
      '/api/health',
      ['status', 'message', 'timestamp', 'database']
    );
  }

  async runDataIntegrityTests() {
    console.log('\n=== DATA INTEGRITY TESTS ===');
    
    await this.testEndpoint(
      'Companies List',
      '/api/companies',
      [], // Array response
      0, 3000
    );
    
    await this.testEndpoint(
      'Company Accounts',
      `/api/accounts?companyId=${TEST_COMPANY_ID}`,
      [], // Array response
      0, 2000
    );
  }

  async runTransactionTests() {
    console.log('\n=== TRANSACTION ENDPOINT TESTS ===');
    
    await this.testEndpoint(
      'Sales Orders',
      `/api/sales-orders?companyId=${TEST_COMPANY_ID}`,
      []
    );
    
    await this.testEndpoint(
      'Purchase Orders',
      `/api/purchase-orders?companyId=${TEST_COMPANY_ID}`,
      []
    );
    
    await this.testEndpoint(
      'Invoice Summary',
      `/api/invoices/summary?companyId=${TEST_COMPANY_ID}`,
      ['totalInvoices', 'totalAmount']
    );
    
    await this.testEndpoint(
      'Bill Summary',
      `/api/bills/summary?companyId=${TEST_COMPANY_ID}`,
      ['totalBills', 'totalAmount']
    );
    
    await this.testEndpoint(
      'Receipt Summary',
      `/api/receipts/summary?companyId=${TEST_COMPANY_ID}`,
      ['totalReceipts', 'totalAmount']
    );
    
    await this.testEndpoint(
      'Purchase Order Summary',
      `/api/purchase-orders/summary?companyId=${TEST_COMPANY_ID}`,
      ['totalOrders', 'totalAmount']
    );
  }

  async runReportingTests() {
    console.log('\n=== FINANCIAL REPORTING TESTS ===');
    
    await this.testEndpoint(
      'Balance Sheet Summary',
      `/api/reports/balance-sheet/summary?companyId=${TEST_COMPANY_ID}`,
      ['assets', 'liabilities', 'equity']
    );
    
    await this.testEndpoint(
      'Dashboard Stats',
      `/api/dashboard/stats?companyId=${TEST_COMPANY_ID}`,
      ['revenue', 'expenses', 'receivables', 'payables']
    );
    
    await this.testEndpoint(
      'Intercompany Balances',
      `/api/intercompany-balances?companyId=${TEST_COMPANY_ID}`,
      ['companyId', 'accountsReceivable', 'accountsPayable']
    );
  }

  async runComprehensiveTests() {
    console.log('\n=== COMPREHENSIVE ENDPOINT TESTS ===');
    
    // Test AR/AP comprehensive endpoints
    await this.testEndpoint(
      'Accounts Receivable Comprehensive',
      `/api/accounts-receivable/comprehensive?companyId=${TEST_COMPANY_ID}`,
      ['companyId', 'summary', 'details']
    );
    
    await this.testEndpoint(
      'Accounts Payable Comprehensive',
      `/api/accounts-payable/comprehensive?companyId=${TEST_COMPANY_ID}`,
      ['companyId', 'summary', 'details']
    );
    
    // Test reference lookup
    await this.testEndpoint(
      'Transaction Reference Lookup',
      '/api/transactions/reference?reference=SO-REF-2-1',
      ['reference', 'transactions']
    );
    
    // Test chart of accounts
    await this.testEndpoint(
      'Chart of Accounts',
      `/api/accounts/chart?companyId=${TEST_COMPANY_ID}`,
      ['companyId', 'accounts']
    );
    
    // Test comprehensive sales order summary
    await this.testEndpoint(
      'Sales Order Summary Comprehensive',
      `/api/sales-orders/summary/comprehensive?companyId=${TEST_COMPANY_ID}`,
      ['companyId', 'summary', 'salesOrders']
    );
  }

  async runPerformanceTests() {
    console.log('\n=== PERFORMANCE TESTS ===');
    
    const performanceThresholds = {
      'Health Check': 500,
      'Companies List': 2000,
      'Invoice Summary': 1500,
      'Dashboard Stats': 3000
    };
    
    for (const [testName, threshold] of Object.entries(performanceThresholds)) {
      const duration = this.results.performance[testName];
      if (duration && duration > threshold) {
        console.log(`⚠️ Performance Warning: ${testName} took ${duration}ms (threshold: ${threshold}ms)`);
      }
    }
  }

  async runFullTestSuite() {
    console.log('🚀 Starting Automated Deployment Test Suite');
    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Test Company ID: ${TEST_COMPANY_ID}`);
    console.log('='.repeat(60));
    
    const startTime = performance.now();
    
    await this.runSystemTests();
    await this.runDataIntegrityTests();
    await this.runTransactionTests();
    await this.runReportingTests();
    await this.runComprehensiveTests();
    await this.runPerformanceTests();
    
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUITE RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️ Total Duration: ${totalDuration}ms`);
    console.log(`📅 Timestamp: ${this.results.timestamp}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.errors.forEach(error => {
        console.log(`- ${error.test}: ${error.error}`);
        if (error.response) {
          console.log(`  Response: ${JSON.stringify(error.response).substring(0, 100)}...`);
        }
      });
    }
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed)) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    // Exit with error code if tests failed
    if (this.results.failed > 0) {
      process.exit(1);
    }
    
    console.log('\n🎉 All tests passed! Deployment verified.');
    return this.results;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new DeploymentTestSuite();
  testSuite.runFullTestSuite().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export default DeploymentTestSuite;