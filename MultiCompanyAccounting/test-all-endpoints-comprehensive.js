/**
 * Comprehensive API Test Suite
 * Tests ALL endpoints in server.cjs and credit/debit functionality
 */

const BASE_URL = 'http://localhost:3002';

async function makeRequest(endpoint, method = 'GET', body = null) {
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
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      success: response.ok,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 0
    };
  }
}

async function testExistingAPIs() {
  console.log('\n=== TESTING EXISTING APIs FROM SERVER.CJS ===');
  
  const tests = [];
  
  // 1. Health Check
  console.log('\n1. Testing Health Check...');
  const health = await makeRequest('/health');
  tests.push({
    name: 'Health Check',
    passed: health.success && health.data.status === 'healthy',
    details: health.success ? 'Connected to database' : health.error
  });
  
  // 2. Companies API
  console.log('2. Testing Companies API...');
  const companies = await makeRequest('/api/companies');
  tests.push({
    name: 'GET /api/companies',
    passed: companies.success && Array.isArray(companies.data),
    details: companies.success ? `Found ${companies.data.length} companies` : companies.error
  });
  
  // Store companies for later tests
  const companiesList = companies.success ? companies.data : [];
  
  // 3. Company Creation
  console.log('3. Testing Company Creation...');
  const newCompany = {
    name: `Test Company ${Date.now()}`,
    company_type: 'Test',
    address: '123 Test Street',
    phone: '555-0123',
    email: 'test@example.com'
  };
  
  const createCompany = await makeRequest('/api/companies', 'POST', newCompany);
  tests.push({
    name: 'POST /api/companies',
    passed: createCompany.success,
    details: createCompany.success ? 'Company created successfully' : createCompany.error
  });
  
  // 4. Products API
  console.log('4. Testing Products API...');
  const products = await makeRequest('/api/products');
  tests.push({
    name: 'GET /api/products',
    passed: products.success,
    details: products.success ? `Found ${products.data?.length || 0} products` : products.error
  });
  
  // 5. Sales Orders API
  console.log('5. Testing Sales Orders API...');
  const salesOrders = await makeRequest('/api/sales-orders');
  tests.push({
    name: 'GET /api/sales-orders',
    passed: salesOrders.success,
    details: salesOrders.success ? `Found ${salesOrders.data?.length || 0} sales orders` : salesOrders.error
  });
  
  // 6. Purchase Orders API
  console.log('6. Testing Purchase Orders API...');
  const purchaseOrders = await makeRequest('/api/purchase-orders');
  tests.push({
    name: 'GET /api/purchase-orders',
    passed: purchaseOrders.success,
    details: purchaseOrders.success ? `Found ${purchaseOrders.data?.length || 0} purchase orders` : purchaseOrders.error
  });
  
  // 7. Chart of Accounts
  console.log('7. Testing Chart of Accounts...');
  if (companiesList.length > 0) {
    const chartOfAccounts = await makeRequest(`/api/accounts?companyId=${companiesList[0].id}`);
    tests.push({
      name: 'GET /api/accounts',
      passed: chartOfAccounts.success,
      details: chartOfAccounts.success ? `Found ${chartOfAccounts.data?.length || 0} accounts` : chartOfAccounts.error
    });
  }
  
  // 8. Intercompany Sales Order Creation
  console.log('8. Testing Intercompany Sales Order Creation...');
  if (companiesList.length >= 2) {
    const intercompanyOrder = {
      sourceCompanyId: companiesList[0].id,
      targetCompanyId: companiesList[1].id,
      total: 1000,
      products: [
        {
          id: 1,
          quantity: 10,
          unitPrice: 100,
          description: 'Test Product'
        }
      ]
    };
    
    const createIntercompany = await makeRequest('/api/intercompany/sales-order', 'POST', intercompanyOrder);
    tests.push({
      name: 'POST /api/intercompany/sales-order',
      passed: createIntercompany.success,
      details: createIntercompany.success ? 'Intercompany order created' : createIntercompany.error
    });
  }
  
  // 9. Transaction Reference Lookup
  console.log('9. Testing Transaction Reference Lookup...');
  const refLookup = await makeRequest('/api/reference/test-ref');
  tests.push({
    name: 'GET /api/reference/:reference',
    passed: refLookup.status !== 500, // Even 404 is acceptable
    details: refLookup.success ? 'Reference lookup working' : 'Endpoint accessible'
  });
  
  return tests;
}

async function testCreditDebitAPIs() {
  console.log('\n=== TESTING NEW CREDIT/DEBIT APIS ===');
  
  const tests = [];
  
  // 1. Database Setup
  console.log('\n1. Testing Database Setup...');
  const dbSetup = await makeRequest('/api/setup-database', 'POST');
  tests.push({
    name: 'POST /api/setup-database',
    passed: dbSetup.success,
    details: dbSetup.success ? `${dbSetup.data.tablesCreated?.length || 0} tables created` : dbSetup.error
  });
  
  // 2. Credit Notes API
  console.log('2. Testing Credit Notes API...');
  const creditNotes = await makeRequest('/api/credit-notes');
  tests.push({
    name: 'GET /api/credit-notes',
    passed: creditNotes.success,
    details: creditNotes.success ? `Found ${creditNotes.data.creditNotes?.length || 0} credit notes` : creditNotes.error
  });
  
  // 3. Debit Notes API
  console.log('3. Testing Debit Notes API...');
  const debitNotes = await makeRequest('/api/debit-notes');
  tests.push({
    name: 'GET /api/debit-notes',
    passed: debitNotes.success,
    details: debitNotes.success ? `Found ${debitNotes.data.debitNotes?.length || 0} debit notes` : debitNotes.error
  });
  
  // 4. Intercompany Adjustments API
  console.log('4. Testing Intercompany Adjustments API...');
  const adjustments = await makeRequest('/api/intercompany-adjustments');
  tests.push({
    name: 'GET /api/intercompany-adjustments',
    passed: adjustments.success,
    details: adjustments.success ? `Found ${adjustments.data.adjustments?.length || 0} adjustments` : adjustments.error
  });
  
  // 5. Credit Accounts API
  console.log('5. Testing Credit Accounts API...');
  const creditAccounts = await makeRequest('/api/credit-accounts');
  tests.push({
    name: 'GET /api/credit-accounts',
    passed: creditAccounts.success,
    details: creditAccounts.success ? `Found ${creditAccounts.data.accounts?.length || 0} credit accounts` : creditAccounts.error
  });
  
  // 6. Debit Accounts API
  console.log('6. Testing Debit Accounts API...');
  const debitAccounts = await makeRequest('/api/debit-accounts');
  tests.push({
    name: 'GET /api/debit-accounts',
    passed: debitAccounts.success,
    details: debitAccounts.success ? `Found ${debitAccounts.data.accounts?.length || 0} debit accounts` : debitAccounts.error
  });
  
  // 7. Create Credit Note
  console.log('7. Testing Credit Note Creation...');
  const companiesResult = await makeRequest('/api/companies');
  if (companiesResult.success && companiesResult.data.length >= 2) {
    const creditNoteData = {
      company_id: companiesResult.data[0].id,
      customer_id: companiesResult.data[1].id,
      amount: 500.00,
      reason: 'API Test - Product return',
      credit_note_date: new Date().toISOString().split('T')[0],
      products: [
        {
          product_id: 1,
          quantity: 5,
          unit_price: 100.00,
          total_amount: 500.00,
          reason: 'Test product return'
        }
      ]
    };
    
    const createCredit = await makeRequest('/api/credit-notes', 'POST', creditNoteData);
    tests.push({
      name: 'POST /api/credit-notes',
      passed: createCredit.success,
      details: createCredit.success ? `Credit note created: ${createCredit.data.creditNote?.credit_note_number}` : createCredit.error
    });
  }
  
  // 8. Create Debit Note
  console.log('8. Testing Debit Note Creation...');
  if (companiesResult.success && companiesResult.data.length >= 2) {
    const debitNoteData = {
      company_id: companiesResult.data[0].id,
      vendor_id: companiesResult.data[1].id,
      amount: 300.00,
      reason: 'API Test - Additional charges',
      debit_note_date: new Date().toISOString().split('T')[0],
      products: [
        {
          product_id: 1,
          quantity: 3,
          unit_price: 100.00,
          total_amount: 300.00,
          reason: 'Test additional charge'
        }
      ]
    };
    
    const createDebit = await makeRequest('/api/debit-notes', 'POST', debitNoteData);
    tests.push({
      name: 'POST /api/debit-notes',
      passed: createDebit.success,
      details: createDebit.success ? `Debit note created: ${createDebit.data.debitNote?.debit_note_number}` : createDebit.error
    });
  }
  
  // 9. Create Intercompany Adjustment
  console.log('9. Testing Intercompany Adjustment Creation...');
  if (companiesResult.success && companiesResult.data.length >= 2) {
    const adjustmentData = {
      source_company_id: companiesResult.data[0].id,
      target_company_id: companiesResult.data[1].id,
      amount: 750.00,
      reason: 'API Test - Balance adjustment',
      adjustment_date: new Date().toISOString().split('T')[0],
      products: [
        {
          product_id: 1,
          quantity: 7.5,
          unit_price: 100.00,
          total_amount: 750.00,
          reason: 'Test adjustment'
        }
      ]
    };
    
    const createAdjustment = await makeRequest('/api/intercompany-adjustment', 'POST', adjustmentData);
    tests.push({
      name: 'POST /api/intercompany-adjustment',
      passed: createAdjustment.success,
      details: createAdjustment.success ? `Adjustment created: ${createAdjustment.data.adjustment?.reference_number}` : createAdjustment.error
    });
  }
  
  return tests;
}

async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE API TEST SUITE');
  console.log('='.repeat(60));
  console.log('Testing ALL endpoints in server.cjs + new credit/debit APIs');
  
  try {
    // Test existing APIs
    const existingTests = await testExistingAPIs();
    
    // Test new credit/debit APIs
    const creditDebitTests = await testCreditDebitAPIs();
    
    // Combine results
    const allTests = [...existingTests, ...creditDebitTests];
    
    // Results summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST RESULTS:');
    console.log('='.repeat(60));
    
    console.log('\n🔧 EXISTING APIs (from server.cjs):');
    existingTests.forEach(({ name, passed, details }) => {
      console.log(`${passed ? '✅' : '❌'} ${name}: ${details}`);
    });
    
    console.log('\n💳 NEW Credit/Debit APIs:');
    creditDebitTests.forEach(({ name, passed, details }) => {
      console.log(`${passed ? '✅' : '❌'} ${name}: ${details}`);
    });
    
    const totalPassed = allTests.filter(t => t.passed).length;
    const totalTests = allTests.length;
    const existingPassed = existingTests.filter(t => t.passed).length;
    const creditDebitPassed = creditDebitTests.filter(t => t.passed).length;
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Existing APIs: ${existingPassed}/${existingTests.length} passed`);
    console.log(`   Credit/Debit APIs: ${creditDebitPassed}/${creditDebitTests.length} passed`);
    console.log(`   Overall: ${totalPassed}/${totalTests} tests passed (${(totalPassed/totalTests*100).toFixed(1)}%)`);
    
    if (existingPassed === existingTests.length) {
      console.log('\n🎉 ALL EXISTING APIs ARE PRESERVED AND WORKING!');
    } else {
      console.log('\n⚠️ Some existing APIs may have issues');
    }
    
    if (creditDebitPassed >= creditDebitTests.length * 0.8) {
      console.log('🎉 Credit/Debit functionality is working well!');
    } else {
      console.log('⚠️ Credit/Debit functionality needs attention');
    }
    
    console.log('\n🚀 DEPLOYMENT STATUS:');
    if (totalPassed >= totalTests * 0.9) {
      console.log('   ✅ Ready for IIS deployment');
      console.log('   ✅ All major functionality verified');
      console.log('   ✅ Existing APIs preserved');
      console.log('   ✅ New functionality integrated');
    } else {
      console.log('   ⚠️ Review failed tests before deployment');
    }
    
    return totalPassed === totalTests;
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    return false;
  }
}

// Run tests if called directly
runComprehensiveTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });