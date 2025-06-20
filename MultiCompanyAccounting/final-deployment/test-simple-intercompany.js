/**
 * Simple test for intercompany adjustment API
 */

const http = require('http');

async function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: endpoint,
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

async function testIntercompanyAdjustment() {
  console.log('Testing Intercompany Adjustment API...\n');
  
  try {
    // Test 1: Get existing sales orders to see if products are included
    console.log('1. Testing sales orders with products:');
    const salesOrdersResponse = await makeRequest('/api/sales-orders?companyId=7');
    
    if (salesOrdersResponse.status === 200 && salesOrdersResponse.data.length > 0) {
      const firstOrder = salesOrdersResponse.data[0];
      console.log(`   Sales Order: ${firstOrder.order_number}`);
      console.log(`   Reference: ${firstOrder.reference_number || 'None'}`);
      console.log(`   Product Lines: ${firstOrder.product_count || 0}`);
      console.log(`   Line Items: ${firstOrder.line_items ? firstOrder.line_items.length : 0}`);
      
      // Test 2: Create intercompany adjustment with existing reference
      if (firstOrder.reference_number) {
        console.log('\n2. Testing intercompany adjustment with existing reference:');
        
        const adjustmentData = {
          referenceNumber: firstOrder.reference_number,
          adjustmentAmount: 500.00,
          adjustmentReason: 'Test adjustment for API verification',
          products: [
            {
              productId: 1,
              quantity: 5,
              unitPrice: 100.00,
              totalAmount: 500.00,
              reason: 'Product adjustment test'
            }
          ]
        };

        const adjustmentResponse = await makeRequest('/api/intercompany/adjustment', 'POST', adjustmentData);
        
        console.log(`   Status: ${adjustmentResponse.status}`);
        if (adjustmentResponse.status === 201) {
          console.log(`   Success: ${adjustmentResponse.data.success}`);
          console.log(`   Adjustments Created: ${adjustmentResponse.data.adjustments.length}`);
          console.log(`   Product Lines Added: ${adjustmentResponse.data.summary.productLinesAdded}`);
          
          // Test 3: Retrieve adjustment history
          console.log('\n3. Testing adjustment history retrieval:');
          const historyResponse = await makeRequest(`/api/intercompany/adjustment/${firstOrder.reference_number}`);
          
          console.log(`   Status: ${historyResponse.status}`);
          if (historyResponse.status === 200) {
            console.log(`   Credit Notes: ${historyResponse.data.summary.totalCreditNotes}`);
            console.log(`   Debit Notes: ${historyResponse.data.summary.totalDebitNotes}`);
            console.log(`   Has Product Details: ${historyResponse.data.summary.hasProductDetails}`);
          }
        } else {
          console.log(`   Error: ${JSON.stringify(adjustmentResponse.data)}`);
        }
      }
    } else {
      console.log('   No sales orders found or error occurred');
    }

    // Test 4: Test parameter validation
    console.log('\n4. Testing parameter validation:');
    const validationResponse = await makeRequest('/api/intercompany/adjustment', 'POST', {});
    console.log(`   Empty request status: ${validationResponse.status} (should be 400)`);

    console.log('\n✅ Intercompany Adjustment API tests completed');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

testIntercompanyAdjustment();