/**
 * Credit/Debit Notes AR/AP Integration Test
 * Verifies that credit and debit notes properly reflect in AR/AP summaries
 */

const http = require('http');

class CreditDebitARAPTestSuite {
  constructor() {
    this.baseUrl = 'http://localhost:3002';
    this.testResults = [];
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async testARWithCreditNotes(companyId = 7) {
    console.log('\n=== Testing AR Summary with Credit Notes Integration ===');
    
    try {
      // Get current AR summary
      const response = await this.makeRequest(`/api/invoices/summary?companyId=${companyId}`);
      
      if (response.status === 200) {
        const data = response.data;
        
        console.log('✅ AR Summary Response Structure:');
        console.log(`   Sales Orders: ${data.salesOrderWorkflow?.totalSalesOrders || 'N/A'}`);
        console.log(`   Invoices: ${data.salesOrderWorkflow?.totalSalesInvoices || 'N/A'}`);
        console.log(`   Receipts: ${data.salesOrderWorkflow?.totalSalesReceipts || 'N/A'}`);
        console.log(`   Credit Notes: ${data.salesOrderWorkflow?.totalCreditNotes || 'N/A'}`);
        console.log(`   Outstanding AR: ${data.salesOrderWorkflow?.outstandingReceivables || 'N/A'}`);
        
        // Verify credit notes are included in response
        const hasCreditNotesField = data.salesOrderWorkflow && 
                                   'totalCreditNotes' in data.salesOrderWorkflow &&
                                   'totalCreditNotesAmount' in data.salesOrderWorkflow;
        
        if (hasCreditNotesField) {
          console.log('✅ Credit Notes fields present in AR summary');
          
          // Verify outstanding AR calculation includes credit notes
          const invoicesTotal = parseFloat(data.salesOrderWorkflow.totalSalesInvoiceAmount || 0);
          const receiptsTotal = parseFloat(data.salesOrderWorkflow.totalSalesReceiptAmount || 0);
          const creditNotesTotal = parseFloat(data.salesOrderWorkflow.totalCreditNotesAmount || 0);
          const outstandingAR = parseFloat(data.salesOrderWorkflow.outstandingReceivables || 0);
          const expectedOutstanding = invoicesTotal - receiptsTotal - creditNotesTotal;
          
          console.log(`   Calculation: ${invoicesTotal} - ${receiptsTotal} - ${creditNotesTotal} = ${expectedOutstanding}`);
          console.log(`   Actual Outstanding: ${outstandingAR}`);
          
          if (Math.abs(outstandingAR - expectedOutstanding) < 0.01) {
            console.log('✅ Outstanding AR calculation correctly includes credit notes');
            return true;
          } else {
            console.log('❌ Outstanding AR calculation may not include credit notes properly');
            return false;
          }
        } else {
          console.log('❌ Credit Notes fields missing from AR summary');
          return false;
        }
      } else {
        console.log(`❌ Failed to fetch AR summary: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error testing AR with credit notes: ${error.message}`);
      return false;
    }
  }

  async testAPWithDebitNotes(companyId = 8) {
    console.log('\n=== Testing AP Summary with Debit Notes Integration ===');
    
    try {
      // Get current AP summary
      const response = await this.makeRequest(`/api/bills/summary?companyId=${companyId}`);
      
      if (response.status === 200) {
        const data = response.data;
        
        console.log('✅ AP Summary Response Structure:');
        console.log(`   Purchase Orders: ${data.Summary?.TotalOrders || 'N/A'}`);
        console.log(`   Total Billed: ${data.Summary?.TotalBilled || 'N/A'}`);
        console.log(`   Total Paid: ${data.Summary?.TotalPaid || 'N/A'}`);
        console.log(`   Debit Notes: ${data.Summary?.TotalDebitNotes || 'N/A'}`);
        console.log(`   Outstanding AP: ${data.Summary?.PendingPaymentValue || 'N/A'}`);
        
        // Verify debit notes are included in response
        const hasDebitNotesField = data.Summary && 
                                  'TotalDebitNotes' in data.Summary &&
                                  'TotalDebitNotesAmount' in data.Summary;
        
        if (hasDebitNotesField) {
          console.log('✅ Debit Notes fields present in AP summary');
          
          // Verify outstanding AP calculation includes debit notes
          const billedTotal = parseFloat(data.Summary.TotalBilled || 0);
          const paidTotal = parseFloat(data.Summary.TotalPaid || 0);
          const debitNotesTotal = parseFloat(data.Summary.TotalDebitNotesAmount || 0);
          const outstandingAP = parseFloat(data.Summary.PendingPaymentValue || 0);
          const expectedOutstanding = billedTotal - paidTotal + debitNotesTotal;
          
          console.log(`   Calculation: ${billedTotal} - ${paidTotal} + ${debitNotesTotal} = ${expectedOutstanding}`);
          console.log(`   Actual Outstanding: ${outstandingAP}`);
          
          if (Math.abs(outstandingAP - expectedOutstanding) < 0.01) {
            console.log('✅ Outstanding AP calculation correctly includes debit notes');
            return true;
          } else {
            console.log('❌ Outstanding AP calculation may not include debit notes properly');
            return false;
          }
        } else {
          console.log('❌ Debit Notes fields missing from AP summary');
          return false;
        }
      } else {
        console.log(`❌ Failed to fetch AP summary: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error testing AP with debit notes: ${error.message}`);
      return false;
    }
  }

  async testCreditNoteCreation(companyId = 7) {
    console.log('\n=== Testing Credit Note Creation and AR Impact ===');
    
    try {
      // Create a test credit note
      const creditNoteData = {
        companyId: companyId,
        customerId: 1,
        amount: 500.00,
        reason: 'Test credit note for AR integration',
        creditNoteDate: new Date().toISOString().split('T')[0],
        lineItems: [
          {
            productId: 1,
            quantity: 1,
            unitPrice: 500.00,
            totalAmount: 500.00,
            reason: 'Test product credit'
          }
        ]
      };

      const createResponse = await this.makeRequest('/api/credit-notes', 'POST', creditNoteData);
      
      if (createResponse.status === 201) {
        console.log('✅ Credit note created successfully');
        
        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if AR summary now reflects the credit note
        const arResponse = await this.makeRequest(`/api/invoices/summary?companyId=${companyId}`);
        
        if (arResponse.status === 200) {
          const creditNotesCount = parseInt(arResponse.data.salesOrderWorkflow?.totalCreditNotes || 0);
          const creditNotesAmount = parseFloat(arResponse.data.salesOrderWorkflow?.totalCreditNotesAmount || 0);
          
          console.log(`   Credit Notes Count: ${creditNotesCount}`);
          console.log(`   Credit Notes Amount: ${creditNotesAmount}`);
          
          if (creditNotesCount > 0 && creditNotesAmount >= 500) {
            console.log('✅ Credit note properly reflected in AR summary');
            return true;
          } else {
            console.log('❌ Credit note not properly reflected in AR summary');
            return false;
          }
        } else {
          console.log('❌ Failed to fetch updated AR summary');
          return false;
        }
      } else {
        console.log(`❌ Failed to create credit note: ${createResponse.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error testing credit note creation: ${error.message}`);
      return false;
    }
  }

  async testDebitNoteCreation(companyId = 8) {
    console.log('\n=== Testing Debit Note Creation and AP Impact ===');
    
    try {
      // Create a test debit note
      const debitNoteData = {
        companyId: companyId,
        vendorId: 1,
        amount: 300.00,
        reason: 'Test debit note for AP integration',
        debitNoteDate: new Date().toISOString().split('T')[0],
        lineItems: [
          {
            productId: 1,
            quantity: 1,
            unitPrice: 300.00,
            totalAmount: 300.00,
            reason: 'Test product debit'
          }
        ]
      };

      const createResponse = await this.makeRequest('/api/debit-notes', 'POST', debitNoteData);
      
      if (createResponse.status === 201) {
        console.log('✅ Debit note created successfully');
        
        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if AP summary now reflects the debit note
        const apResponse = await this.makeRequest(`/api/bills/summary?companyId=${companyId}`);
        
        if (apResponse.status === 200) {
          const debitNotesCount = parseInt(apResponse.data.Summary?.TotalDebitNotes || 0);
          const debitNotesAmount = parseFloat(apResponse.data.Summary?.TotalDebitNotesAmount || 0);
          
          console.log(`   Debit Notes Count: ${debitNotesCount}`);
          console.log(`   Debit Notes Amount: ${debitNotesAmount}`);
          
          if (debitNotesCount > 0 && debitNotesAmount >= 300) {
            console.log('✅ Debit note properly reflected in AP summary');
            return true;
          } else {
            console.log('❌ Debit note not properly reflected in AP summary');
            return false;
          }
        } else {
          console.log('❌ Failed to fetch updated AP summary');
          return false;
        }
      } else {
        console.log(`❌ Failed to create debit note: ${createResponse.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error testing debit note creation: ${error.message}`);
      return false;
    }
  }

  async runFullIntegrationTest() {
    console.log('Starting Credit/Debit Notes AR/AP Integration Test Suite...');
    console.log(`Testing server at: ${this.baseUrl}\n`);
    
    const results = {
      arWithCreditNotes: await this.testARWithCreditNotes(),
      apWithDebitNotes: await this.testAPWithDebitNotes(),
      creditNoteCreation: await this.testCreditNoteCreation(),
      debitNoteCreation: await this.testDebitNoteCreation()
    };
    
    const passedTests = Object.values(results).filter(r => r).length;
    const totalTests = Object.keys(results).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('CREDIT/DEBIT NOTES AR/AP INTEGRATION TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Credit and debit notes are properly integrated with AR/AP summaries.');
    } else {
      console.log('\n⚠️ Some tests failed. Credit/debit notes integration may need adjustment.');
    }
    
    console.log('='.repeat(60));
    
    return results;
  }
}

// Run the integration test
async function runIntegrationTest() {
  const testSuite = new CreditDebitARAPTestSuite();
  
  try {
    await testSuite.runFullIntegrationTest();
  } catch (error) {
    console.error('❌ Integration test suite failed:', error.message);
    process.exit(1);
  }
}

// Allow running as standalone script
if (require.main === module) {
  runIntegrationTest();
}

module.exports = CreditDebitARAPTestSuite;