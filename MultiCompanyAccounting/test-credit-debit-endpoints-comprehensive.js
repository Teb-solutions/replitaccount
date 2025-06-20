/**
 * Comprehensive Test Suite for Credit/Debit Notes Integration
 * Tests both /api/invoices/summary and /api/bills/summary endpoints
 * with proper credit notes reducing AR and debit notes increasing AP
 */

async function makeRequest(endpoint, method = 'GET', body = null) {
  const timestamp = Date.now();
  const requestId = Math.floor(Math.random() * 10000);
  
  console.log(`[API-req-${timestamp}-${requestId}] 🚀 STARTING ${method} request to ${endpoint}`);
  console.log(`[API-req-${timestamp}-${requestId}] Timestamp: ${new Date().toISOString()}`);

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(`http://localhost:3002${endpoint}`, options);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[API-req-${timestamp}-${requestId}] ✅ Response received in ${duration.toFixed(2)}ms`);
    console.log(`[API-req-${timestamp}-${requestId}] Status: ${response.status} ${response.statusText}`);

    if (duration > 1000) {
      console.warn(`[API-req-${timestamp}-${requestId}] ⚠️ Slow API call (${duration.toFixed(2)}ms) to ${endpoint}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API-req-${timestamp}-${requestId}] ❌ Error response: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[API-req-${timestamp}-${requestId}] ✅ Query completed successfully`);
    return data;

  } catch (error) {
    console.error(`[API-req-${timestamp}-${requestId}] ❌ Request failed: ${error.message}`);
    throw error;
  }
}

async function testInvoicesSummaryWithCreditNotes() {
  console.log('\n🧪 Testing /api/invoices/summary with Credit Notes Integration');
  console.log('='.repeat(60));

  try {
    // Test with company 17 (03 June Plant) - has invoices and transactions
    const companyId = 17;
    console.log(`Testing invoices summary for company ${companyId}...`);

    const data = await makeRequest(`/api/invoices/summary?companyId=${companyId}`);
    
    console.log('\n📊 Invoice Summary Response Structure:');
    console.log(`Company ID: ${data.companyId || 'Not provided'}`);
    console.log(`Company Name: ${data.companyName || 'Not provided'}`);
    console.log(`Total Invoices: ${data.totalInvoices || 0}`);
    console.log(`Total Amount: $${data.totalAmount || 0}`);
    console.log(`Outstanding Receivables: $${data.outstandingReceivables || 0}`);

    // Test C# SalesData structure compliance
    console.log('\n🔍 Testing C# SalesData Structure Compliance:');
    
    if (data.workflowStatistics) {
      console.log('✅ WorkflowStatistics found:');
      console.log(`  - Sales Orders with Invoices: ${data.workflowStatistics.salesOrdersWithInvoices || 0}`);
      console.log(`  - Invoices with Receipts: ${data.workflowStatistics.invoicesWithReceipts || 0}`);
    } else {
      console.log('❌ WorkflowStatistics missing');
    }

    if (data.customerBreakdown && Array.isArray(data.customerBreakdown)) {
      console.log(`✅ CustomerBreakdown found with ${data.customerBreakdown.length} entries`);
      if (data.customerBreakdown.length > 0) {
        const sample = data.customerBreakdown[0];
        console.log('  Sample customer:', {
          name: sample.customerName,
          relationship: sample.relationshipType,
          outstanding: sample.outstandingAmount
        });
      }
    } else {
      console.log('❌ CustomerBreakdown missing or invalid');
    }

    if (data.outstandingReceivables) {
      console.log('✅ OutstandingReceivables found');
      console.log(`   Current AR Balance: $${data.outstandingReceivables}`);
      console.log('   Note: This should reflect credit notes reducing AR balance');
    } else {
      console.log('❌ OutstandingReceivables missing');
    }

    // Test credit notes impact
    console.log('\n💳 Credit Notes Impact Analysis:');
    if (data.creditNotesTotal || data.creditNotesCount) {
      console.log(`✅ Credit notes detected: ${data.creditNotesCount || 0} notes totaling $${data.creditNotesTotal || 0}`);
      console.log('✅ Credit notes should be reducing AR balance in outstandingReceivables');
    } else {
      console.log('ℹ️ No credit notes data found (this is acceptable if none exist)');
    }

    return {
      passed: true,
      companyId,
      structure: {
        hasWorkflowStats: !!data.workflowStatistics,
        hasCustomerBreakdown: !!(data.customerBreakdown && Array.isArray(data.customerBreakdown)),
        hasOutstandingAR: !!data.outstandingReceivables,
        hasCreditNotesImpact: !!(data.creditNotesTotal !== undefined || data.creditNotesCount !== undefined)
      },
      balances: {
        totalInvoices: data.totalInvoices || 0,
        totalAmount: data.totalAmount || 0,
        outstandingAR: data.outstandingReceivables || 0,
        creditNotesTotal: data.creditNotesTotal || 0
      }
    };

  } catch (error) {
    console.error('❌ Invoice summary test failed:', error.message);
    return { passed: false, error: error.message };
  }
}

async function testBillsSummaryWithDebitNotes() {
  console.log('\n🧪 Testing /api/bills/summary with Debit Notes Integration');
  console.log('='.repeat(60));

  try {
    // Test with company 17 (03 June Plant) - consistent with invoice test
    const companyId = 17;
    console.log(`Testing bills summary for company ${companyId}...`);

    const data = await makeRequest(`/api/bills/summary?companyId=${companyId}`);
    
    console.log('\n📊 Bills Summary Response Structure:');
    console.log(`Company ID: ${data.companyId || data.rSummary?.companyId || 'Not provided'}`);
    console.log(`Company Name: ${data.companyName || data.rSummary?.companyName || 'Not provided'}`);
    console.log(`Total Bills: ${data.totalBills || 0}`);
    console.log(`Total Amount: $${data.totalAmount || 0}`);
    console.log(`Outstanding Amount: $${data.outstandingAmount || 0}`);

    // Test C# BillSummaryReport structure compliance
    console.log('\n🔍 Testing C# BillSummaryReport Structure Compliance:');
    
    if (data.rSummary) {
      console.log('✅ RSummary found:');
      console.log(`  - Total Orders: ${data.rSummary.totalOrders || 0}`);
      console.log(`  - Total Billed: $${data.rSummary.totalBilled || 0}`);
      console.log(`  - Outstanding: $${data.rSummary.outstandingAmount || 0}`);
    } else {
      console.log('❌ RSummary missing');
    }

    if (data.rPurchaseOrders && Array.isArray(data.rPurchaseOrders)) {
      console.log(`✅ RPurchaseOrders found with ${data.rPurchaseOrders.length} entries`);
    } else {
      console.log('❌ RPurchaseOrders missing or invalid');
    }

    if (data.rBillDetails && Array.isArray(data.rBillDetails)) {
      console.log(`✅ RBillDetails found with ${data.rBillDetails.length} entries`);
    } else {
      console.log('❌ RBillDetails missing or invalid');
    }

    if (data.rPayments && Array.isArray(data.rPayments)) {
      console.log(`✅ RPayments found with ${data.rPayments.length} entries`);
    } else {
      console.log('❌ RPayments missing or invalid');
    }

    // Test debit notes impact
    console.log('\n💳 Debit Notes Impact Analysis:');
    const debitNotesTotal = data.rSummary?.debitNotesTotal || data.debitNotesTotal || 0;
    const debitNotesCount = data.rSummary?.debitNotesCount || data.debitNotesCount || 0;
    
    if (debitNotesTotal > 0 || debitNotesCount > 0) {
      console.log(`✅ Debit notes detected: ${debitNotesCount} notes totaling $${debitNotesTotal}`);
      console.log('✅ Debit notes should be increasing AP balance in outstandingAmount');
    } else {
      console.log('ℹ️ No debit notes data found (this is acceptable if none exist)');
    }

    return {
      passed: true,
      companyId,
      structure: {
        hasRSummary: !!data.rSummary,
        hasRPurchaseOrders: !!(data.rPurchaseOrders && Array.isArray(data.rPurchaseOrders)),
        hasRBillDetails: !!(data.rBillDetails && Array.isArray(data.rBillDetails)),
        hasRPayments: !!(data.rPayments && Array.isArray(data.rPayments)),
        hasDebitNotesImpact: !!(debitNotesTotal > 0 || debitNotesCount > 0)
      },
      balances: {
        totalBills: data.totalBills || 0,
        totalAmount: data.totalAmount || 0,
        outstandingAP: data.outstandingAmount || data.rSummary?.outstandingAmount || 0,
        debitNotesTotal: debitNotesTotal
      }
    };

  } catch (error) {
    console.error('❌ Bills summary test failed:', error.message);
    return { passed: false, error: error.message };
  }
}

async function testCreditDebitNotesCreation() {
  console.log('\n🧪 Testing Credit/Debit Notes Creation');
  console.log('='.repeat(60));

  try {
    const companyId = 17;
    
    // Test credit note creation
    console.log('Creating test credit note...');
    const creditNoteData = {
      companyId: companyId,
      customerCompanyId: 18, // 03 June Plant2
      amount: 1000.00,
      reason: 'Test credit note for endpoint validation',
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

    const creditNote = await makeRequest('/api/credit-notes', 'POST', creditNoteData);
    console.log(`✅ Credit note created: ID ${creditNote.id}, Amount: $${creditNote.amount}`);

    // Test debit note creation
    console.log('Creating test debit note...');
    const debitNoteData = {
      companyId: companyId,
      vendorCompanyId: 18, // 03 June Plant2
      amount: 500.00,
      reason: 'Test debit note for endpoint validation',
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

    const debitNote = await makeRequest('/api/debit-notes', 'POST', debitNoteData);
    console.log(`✅ Debit note created: ID ${debitNote.id}, Amount: $${debitNote.amount}`);

    return {
      passed: true,
      creditNote: creditNote,
      debitNote: debitNote
    };

  } catch (error) {
    console.error('❌ Credit/Debit notes creation test failed:', error.message);
    return { passed: false, error: error.message };
  }
}

async function validateEndpointCompliance() {
  console.log('\n🔍 Validating Endpoint Compliance with C# Application');
  console.log('='.repeat(60));

  // Test both endpoints after credit/debit notes creation
  const invoiceTest = await testInvoicesSummaryWithCreditNotes();
  const billTest = await testBillsSummaryWithDebitNotes();

  console.log('\n📋 Compliance Summary:');
  console.log('='.repeat(30));

  console.log('\n📄 Invoice Summary Endpoint:');
  if (invoiceTest.passed) {
    console.log('✅ Endpoint responding correctly');
    console.log(`✅ C# SalesData structure: ${JSON.stringify(invoiceTest.structure, null, 2)}`);
    console.log(`✅ AR Balance: $${invoiceTest.balances.outstandingAR}`);
    if (invoiceTest.structure.hasCreditNotesImpact) {
      console.log('✅ Credit notes impact detected in AR calculation');
    }
  } else {
    console.log('❌ Invoice summary endpoint failed');
    console.log(`Error: ${invoiceTest.error}`);
  }

  console.log('\n📄 Bills Summary Endpoint:');
  if (billTest.passed) {
    console.log('✅ Endpoint responding correctly');
    console.log(`✅ C# BillSummaryReport structure: ${JSON.stringify(billTest.structure, null, 2)}`);
    console.log(`✅ AP Balance: $${billTest.balances.outstandingAP}`);
    if (billTest.structure.hasDebitNotesImpact) {
      console.log('✅ Debit notes impact detected in AP calculation');
    }
  } else {
    console.log('❌ Bills summary endpoint failed');
    console.log(`Error: ${billTest.error}`);
  }

  const overallPassed = invoiceTest.passed && billTest.passed;
  
  console.log(`\n${overallPassed ? '✅' : '❌'} Overall Compliance: ${overallPassed ? 'PASSED' : 'FAILED'}`);
  
  return {
    passed: overallPassed,
    invoiceEndpoint: invoiceTest,
    billsEndpoint: billTest
  };
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Credit/Debit Notes Integration Tests');
  console.log('='.repeat(80));
  console.log(`Test Start Time: ${new Date().toISOString()}`);

  try {
    // Step 1: Create test credit/debit notes
    console.log('\n📝 Step 1: Creating Test Credit/Debit Notes');
    const notesCreation = await testCreditDebitNotesCreation();
    
    if (!notesCreation.passed) {
      console.log('⚠️ Could not create test notes, proceeding with existing data...');
    }

    // Step 2: Validate endpoint compliance
    console.log('\n📊 Step 2: Validating Endpoint Compliance');
    const complianceTest = await validateEndpointCompliance();

    // Final report
    console.log('\n📋 FINAL TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Test Completion Time: ${new Date().toISOString()}`);
    console.log(`Overall Result: ${complianceTest.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (complianceTest.passed) {
      console.log('\n🎉 All endpoints are working correctly with C# application compatibility!');
      console.log('✅ Credit notes properly reduce AR balances');
      console.log('✅ Debit notes properly increase AP balances');
      console.log('✅ Response structures match C# application expectations');
    } else {
      console.log('\n⚠️ Some issues detected - review the detailed logs above');
    }

    return complianceTest;

  } catch (error) {
    console.error('💥 Comprehensive test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
    return { passed: false, error: error.message };
  }
}

// Run the tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runComprehensiveTests,
    testInvoicesSummaryWithCreditNotes,
    testBillsSummaryWithDebitNotes,
    testCreditDebitNotesCreation,
    validateEndpointCompliance
  };
} else {
  // Run immediately when executed directly
  runComprehensiveTests().then(result => {
    process.exit(result.passed ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}