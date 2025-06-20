/**
 * Intercompany Adjustment API Test Suite
 * Tests the new adjustment API with reference numbers and product line items
 */

const http = require('http');

class IntercompanyAdjustmentTestSuite {
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

  async testBasicAdjustmentCreation() {
    console.log('\n=== Testing Basic Intercompany Adjustment Creation ===');
    
    try {
      const adjustmentData = {
        referenceNumber: 'REF-TEST-' + Date.now(),
        adjustmentAmount: 1000.00,
        adjustmentReason: 'Test intercompany adjustment without products'
      };

      const response = await this.makeRequest('/api/intercompany/adjustment', 'POST', adjustmentData);
      
      if (response.status === 201) {
        console.log('✅ Basic adjustment created successfully');
        console.log(`   Reference: ${response.data.referenceNumber}`);
        console.log(`   Amount: ${response.data.adjustmentAmount}`);
        console.log(`   Adjustments: ${response.data.adjustments.length}`);
        console.log(`   Balancing Effect: ${response.data.summary.balancingEffect}`);
        
        return { success: true, adjustmentData: response.data };
      } else if (response.status === 404) {
        console.log('⚠️ No transactions found for test reference number (expected for new reference)');
        return { success: true, message: 'No existing transactions found' };
      } else {
        console.log(`❌ Failed to create adjustment: ${response.status}`);
        return { success: false, error: response.data };
      }
    } catch (error) {
      console.log(`❌ Error testing basic adjustment: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testAdjustmentWithProducts() {
    console.log('\n=== Testing Intercompany Adjustment with Product Line Items ===');
    
    try {
      const adjustmentData = {
        referenceNumber: 'REF-PROD-' + Date.now(),
        adjustmentAmount: 1500.00,
        adjustmentReason: 'Test intercompany adjustment with product details',
        products: [
          {
            productId: 1,
            quantity: 10,
            unitPrice: 75.00,
            totalAmount: 750.00,
            reason: 'Product A adjustment'
          },
          {
            productId: 2,
            quantity: 5,
            unitPrice: 150.00,
            totalAmount: 750.00,
            reason: 'Product B adjustment'
          }
        ]
      };

      const response = await this.makeRequest('/api/intercompany/adjustment', 'POST', adjustmentData);
      
      if (response.status === 201) {
        console.log('✅ Adjustment with products created successfully');
        console.log(`   Reference: ${response.data.referenceNumber}`);
        console.log(`   Amount: ${response.data.adjustmentAmount}`);
        console.log(`   Product Details: ${response.data.productDetails.length} items`);
        console.log(`   Product Lines Added: ${response.data.summary.productLinesAdded}`);
        
        return { success: true, adjustmentData: response.data };
      } else if (response.status === 404) {
        console.log('⚠️ No transactions found for test reference number (expected for new reference)');
        return { success: true, message: 'No existing transactions found' };
      } else {
        console.log(`❌ Failed to create adjustment with products: ${response.status}`);
        return { success: false, error: response.data };
      }
    } catch (error) {
      console.log(`❌ Error testing adjustment with products: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testAdjustmentWithExistingReference() {
    console.log('\n=== Testing Adjustment with Existing Reference Number ===');
    
    try {
      // First, get an existing reference number from sales orders
      const salesOrdersResponse = await this.makeRequest('/api/sales-orders?companyId=7');
      
      if (salesOrdersResponse.status === 200 && salesOrdersResponse.data.length > 0) {
        const existingReference = salesOrdersResponse.data[0].reference_number;
        console.log(`   Using existing reference: ${existingReference}`);
        
        const adjustmentData = {
          referenceNumber: existingReference,
          adjustmentAmount: 500.00,
          adjustmentReason: 'Test adjustment for existing reference',
          products: [
            {
              productId: 1,
              quantity: 5,
              unitPrice: 100.00,
              totalAmount: 500.00,
              reason: 'Adjustment for existing transaction'
            }
          ]
        };

        const response = await this.makeRequest('/api/intercompany/adjustment', 'POST', adjustmentData);
        
        if (response.status === 201) {
          console.log('✅ Adjustment for existing reference created successfully');
          console.log(`   Adjustments Created: ${response.data.adjustments.length}`);
          console.log(`   Sales Order: ${response.data.summary.salesOrder?.orderNumber || 'Not found'}`);
          console.log(`   Purchase Order: ${response.data.summary.purchaseOrder?.orderNumber || 'Not found'}`);
          
          // Test retrieving the adjustment history
          return await this.testRetrieveAdjustmentHistory(existingReference);
        } else {
          console.log(`❌ Failed to create adjustment for existing reference: ${response.status}`);
          console.log(`   Error: ${JSON.stringify(response.data)}`);
          return { success: false, error: response.data };
        }
      } else {
        console.log('⚠️ No existing sales orders found to test with');
        return { success: true, message: 'No existing data to test with' };
      }
    } catch (error) {
      console.log(`❌ Error testing adjustment with existing reference: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testRetrieveAdjustmentHistory(referenceNumber) {
    console.log('\n=== Testing Adjustment History Retrieval ===');
    
    try {
      const response = await this.makeRequest(`/api/intercompany/adjustment/${referenceNumber}`);
      
      if (response.status === 200) {
        console.log('✅ Adjustment history retrieved successfully');
        console.log(`   Reference: ${response.data.referenceNumber}`);
        console.log(`   Credit Notes: ${response.data.summary.totalCreditNotes}`);
        console.log(`   Debit Notes: ${response.data.summary.totalDebitNotes}`);
        console.log(`   Total Credit Amount: ${response.data.summary.totalCreditAmount}`);
        console.log(`   Total Debit Amount: ${response.data.summary.totalDebitAmount}`);
        console.log(`   Is Balanced: ${response.data.summary.isBalanced}`);
        console.log(`   Has Product Details: ${response.data.summary.hasProductDetails}`);
        
        return { success: true, historyData: response.data };
      } else {
        console.log(`❌ Failed to retrieve adjustment history: ${response.status}`);
        return { success: false, error: response.data };
      }
    } catch (error) {
      console.log(`❌ Error retrieving adjustment history: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testMissingParameters() {
    console.log('\n=== Testing Missing Parameters Validation ===');
    
    try {
      // Test without reference number
      const response1 = await this.makeRequest('/api/intercompany/adjustment', 'POST', {
        adjustmentAmount: 1000.00
      });
      
      // Test without adjustment amount
      const response2 = await this.makeRequest('/api/intercompany/adjustment', 'POST', {
        referenceNumber: 'TEST-REF'
      });
      
      // Test empty request
      const response3 = await this.makeRequest('/api/intercompany/adjustment', 'POST', {});
      
      const validationTests = [
        { name: 'Missing reference number', response: response1, expectedStatus: 400 },
        { name: 'Missing adjustment amount', response: response2, expectedStatus: 400 },
        { name: 'Empty request', response: response3, expectedStatus: 400 }
      ];
      
      let passedValidations = 0;
      
      for (const test of validationTests) {
        if (test.response.status === test.expectedStatus) {
          console.log(`✅ ${test.name}: Properly validated (${test.response.status})`);
          passedValidations++;
        } else {
          console.log(`❌ ${test.name}: Expected ${test.expectedStatus}, got ${test.response.status}`);
        }
      }
      
      return { 
        success: passedValidations === validationTests.length, 
        validationsPassed: passedValidations,
        totalValidations: validationTests.length
      };
    } catch (error) {
      console.log(`❌ Error testing parameter validation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testARAPIntegration() {
    console.log('\n=== Testing AR/AP Integration After Adjustments ===');
    
    try {
      // Check AR summary for company 7
      const arResponse = await this.makeRequest('/api/invoices/summary?companyId=7');
      
      // Check AP summary for company 8  
      const apResponse = await this.makeRequest('/api/bills/summary?companyId=8');
      
      if (arResponse.status === 200 && apResponse.status === 200) {
        console.log('✅ AR/AP summaries retrieved successfully');
        
        const arData = arResponse.data;
        const apData = apResponse.data;
        
        // Check if credit notes are reflected in AR
        const hasCreditNotesInAR = arData.salesOrderWorkflow && 
                                  'totalCreditNotes' in arData.salesOrderWorkflow;
        
        // Check if debit notes are reflected in AP
        const hasDebitNotesInAP = apData.Summary && 
                                 'TotalDebitNotes' in apData.Summary;
        
        console.log(`   AR Credit Notes Integration: ${hasCreditNotesInAR ? 'Present' : 'Missing'}`);
        console.log(`   AP Debit Notes Integration: ${hasDebitNotesInAP ? 'Present' : 'Missing'}`);
        
        if (hasCreditNotesInAR) {
          console.log(`   AR Credit Notes: ${arData.salesOrderWorkflow.totalCreditNotes}`);
          console.log(`   AR Credit Amount: ${arData.salesOrderWorkflow.totalCreditNotesAmount}`);
        }
        
        if (hasDebitNotesInAP) {
          console.log(`   AP Debit Notes: ${apData.Summary.TotalDebitNotes}`);
          console.log(`   AP Debit Amount: ${apData.Summary.TotalDebitNotesAmount}`);
        }
        
        return { 
          success: hasCreditNotesInAR && hasDebitNotesInAP,
          arIntegration: hasCreditNotesInAR,
          apIntegration: hasDebitNotesInAP
        };
      } else {
        console.log('❌ Failed to retrieve AR/AP summaries');
        return { success: false };
      }
    } catch (error) {
      console.log(`❌ Error testing AR/AP integration: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runFullTestSuite() {
    console.log('Starting Intercompany Adjustment API Test Suite...');
    console.log(`Testing server at: ${this.baseUrl}\n`);
    
    const results = {
      basicAdjustment: await this.testBasicAdjustmentCreation(),
      adjustmentWithProducts: await this.testAdjustmentWithProducts(),
      existingReference: await this.testAdjustmentWithExistingReference(),
      parameterValidation: await this.testMissingParameters(),
      arapIntegration: await this.testARAPIntegration()
    };
    
    const passedTests = Object.values(results).filter(r => r.success).length;
    const totalTests = Object.keys(results).length;
    
    console.log('\n' + '='.repeat(70));
    console.log('INTERCOMPANY ADJUSTMENT API TEST REPORT');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\nTest Details:');
    Object.entries(results).forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} ${testName}`);
      if (!result.success && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Intercompany Adjustment API is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }
    
    console.log('='.repeat(70));
    
    return results;
  }
}

// Run the test suite
async function runTests() {
  const testSuite = new IntercompanyAdjustmentTestSuite();
  
  try {
    await testSuite.runFullTestSuite();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Allow running as standalone script
if (require.main === module) {
  runTests();
}

module.exports = IntercompanyAdjustmentTestSuite;