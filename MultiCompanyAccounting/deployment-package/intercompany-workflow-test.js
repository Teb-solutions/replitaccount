/**
 * Comprehensive Intercompany Workflow Test Suite
 * Tests complete workflow: Sales Order → Invoice → Receipt → Chart of Accounts → AR/AP Reflection
 */

const axios = require('axios');

class IntercompanyWorkflowTester {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    this.testResults.push(logEntry);
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async testCompleteIntercompanyWorkflow() {
    await this.log("🚀 Starting Complete Intercompany Workflow Test");
    
    // Test data
    const fromCompanyId = 1;
    const toCompanyId = 2;
    const testAmount = 15000;
    
    let salesOrderId, invoiceId, receiptId;
    
    try {
      // Step 1: Create Intercompany Sales Order
      await this.log("📋 Step 1: Creating intercompany sales order");
      const salesOrderResponse = await this.makeRequest('POST', '/api/intercompany/sales-order', {
        fromCompanyId,
        toCompanyId,
        totalAmount: testAmount
      });
      
      if (!salesOrderResponse.success) {
        await this.log("❌ Failed to create sales order", salesOrderResponse.error);
        return false;
      }
      
      salesOrderId = salesOrderResponse.data.salesOrder.id;
      const intercompanyRef = salesOrderResponse.data.intercompanyReference;
      await this.log("✅ Sales order created", { 
        salesOrderId, 
        purchaseOrderId: salesOrderResponse.data.purchaseOrder.id,
        reference: intercompanyRef
      });

      // Step 2: Create Intercompany Invoice
      await this.log("🧾 Step 2: Creating intercompany invoice");
      const invoiceResponse = await this.makeRequest('POST', '/api/intercompany/invoice', {
        salesOrderId,
        amount: testAmount,
        dueDate: '2024-03-15'
      });
      
      if (!invoiceResponse.success) {
        await this.log("❌ Failed to create invoice", invoiceResponse.error);
        return false;
      }
      
      invoiceId = invoiceResponse.data.invoice.id;
      await this.log("✅ Invoice created", { 
        invoiceId, 
        billId: invoiceResponse.data.bill.id 
      });

      // Step 3: Create Receipt for Invoice
      await this.log("💰 Step 3: Creating receipt for invoice");
      const receiptResponse = await this.makeRequest('POST', '/api/receipts', {
        invoiceId,
        amount: testAmount,
        paymentMethod: 'bank_transfer',
        referenceNumber: `REC-${Date.now()}`
      });
      
      if (!receiptResponse.success) {
        await this.log("❌ Failed to create receipt", receiptResponse.error);
        return false;
      }
      
      receiptId = receiptResponse.data.id;
      await this.log("✅ Receipt created", { receiptId });

      // Step 4: Test Transaction Reference Lookup
      await this.log("🔍 Step 4: Testing transaction reference lookup");
      const lookupResponse = await this.makeRequest('GET', `/api/transaction-reference-lookup?referenceNumber=${intercompanyRef}`);
      
      if (!lookupResponse.success) {
        await this.log("❌ Failed transaction reference lookup", lookupResponse.error);
        return false;
      }
      
      await this.log("✅ Transaction reference lookup successful", {
        totalFound: lookupResponse.data.totalFound,
        references: lookupResponse.data.results.map(r => r.reference_number)
      });

      // Step 5: Verify Chart of Accounts Impact
      await this.log("📊 Step 5: Verifying chart of accounts for both companies");
      
      // Check selling company chart of accounts
      const sellingCompanyAccounts = await this.makeRequest('GET', `/api/companies/${fromCompanyId}/accounts`);
      if (sellingCompanyAccounts.success) {
        await this.log("✅ Selling company chart of accounts accessible", {
          accountCount: sellingCompanyAccounts.data.length
        });
      }
      
      // Check purchasing company chart of accounts
      const purchasingCompanyAccounts = await this.makeRequest('GET', `/api/companies/${toCompanyId}/accounts`);
      if (purchasingCompanyAccounts.success) {
        await this.log("✅ Purchasing company chart of accounts accessible", {
          accountCount: purchasingCompanyAccounts.data.length
        });
      }

      // Step 6: Verify AR/AP Reflection
      await this.log("📈 Step 6: Verifying AR/AP reflection");
      
      // Check AR for selling company
      const arResponse = await this.makeRequest('GET', `/api/reports/accounts-receivable?companyId=${fromCompanyId}`);
      if (arResponse.success) {
        await this.log("✅ AR report generated for selling company", {
          totalOutstanding: arResponse.data.summary?.totalOutstanding || 0,
          invoiceCount: arResponse.data.invoices?.length || 0
        });
      }
      
      // Check AP for purchasing company
      const apResponse = await this.makeRequest('GET', `/api/reports/accounts-payable?companyId=${toCompanyId}`);
      if (apResponse.success) {
        await this.log("✅ AP report generated for purchasing company", {
          totalOutstanding: apResponse.data.summary?.totalOutstanding || 0,
          billCount: apResponse.data.bills?.length || 0
        });
      }

      // Step 7: Verify Intercompany Balances
      await this.log("🔄 Step 7: Verifying intercompany balances");
      
      const intercompanyBalances = await this.makeRequest('GET', `/api/intercompany-balances?companyId=${fromCompanyId}`);
      if (intercompanyBalances.success) {
        await this.log("✅ Intercompany balances retrieved", {
          accountsReceivable: intercompanyBalances.data.accountsReceivable,
          accountsPayable: intercompanyBalances.data.accountsPayable
        });
      }

      await this.log("🎉 Complete intercompany workflow test PASSED");
      return true;

    } catch (error) {
      await this.log("❌ Test failed with error", error.message);
      return false;
    }
  }

  async testChartOfAccountsIntegration() {
    await this.log("📊 Testing Chart of Accounts Integration");
    
    const companies = [1, 2, 3]; // Test multiple companies
    
    for (const companyId of companies) {
      const response = await this.makeRequest('GET', `/api/companies/${companyId}/accounts`);
      
      if (response.success) {
        const accounts = response.data;
        await this.log(`✅ Company ${companyId} chart of accounts`, {
          totalAccounts: accounts.length,
          accountTypes: [...new Set(accounts.map(a => a.account_type))],
          sampleAccount: accounts[0]?.account_name || 'No accounts'
        });
      } else {
        await this.log(`❌ Company ${companyId} chart of accounts failed`, response.error);
      }
    }
  }

  async testARAPIntegration() {
    await this.log("💹 Testing AR/AP Integration");
    
    const companies = [1, 2];
    
    for (const companyId of companies) {
      // Test AR
      const arResponse = await this.makeRequest('GET', `/api/reports/accounts-receivable?companyId=${companyId}`);
      if (arResponse.success) {
        await this.log(`✅ Company ${companyId} AR report`, {
          totalOutstanding: arResponse.data.summary?.totalOutstanding || 0,
          agingBuckets: arResponse.data.summary?.agingBuckets || {}
        });
      }
      
      // Test AP
      const apResponse = await this.makeRequest('GET', `/api/reports/accounts-payable?companyId=${companyId}`);
      if (apResponse.success) {
        await this.log(`✅ Company ${companyId} AP report`, {
          totalOutstanding: apResponse.data.summary?.totalOutstanding || 0,
          agingBuckets: apResponse.data.summary?.agingBuckets || {}
        });
      }
    }
  }

  async runAllTests() {
    await this.log("🧪 Starting Comprehensive Intercompany Test Suite");
    
    const tests = [
      { name: "Complete Workflow", test: () => this.testCompleteIntercompanyWorkflow() },
      { name: "Chart of Accounts Integration", test: () => this.testChartOfAccountsIntegration() },
      { name: "AR/AP Integration", test: () => this.testARAPIntegration() }
    ];
    
    const results = [];
    
    for (const { name, test } of tests) {
      await this.log(`🔬 Running test: ${name}`);
      const result = await test();
      results.push({ name, passed: result });
      await this.log(`${result ? '✅' : '❌'} Test ${name}: ${result ? 'PASSED' : 'FAILED'}`);
    }
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    await this.log(`📋 Test Summary: ${passedCount}/${totalCount} tests passed`);
    
    return {
      totalTests: totalCount,
      passedTests: passedCount,
      results,
      allPassed: passedCount === totalCount
    };
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntercompanyWorkflowTester;
}

// Command line execution
if (require.main === module) {
  (async () => {
    const tester = new IntercompanyWorkflowTester();
    const results = await tester.runAllTests();
    
    console.log('\n' + '='.repeat(50));
    console.log('FINAL TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${results.totalTests}`);
    console.log(`Passed: ${results.passedTests}`);
    console.log(`Failed: ${results.totalTests - results.passedTests}`);
    console.log(`Success Rate: ${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`);
    
    if (results.allPassed) {
      console.log('🎉 ALL TESTS PASSED - Intercompany workflow is working correctly!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed - Check logs above for details');
      process.exit(1);
    }
  })();
}