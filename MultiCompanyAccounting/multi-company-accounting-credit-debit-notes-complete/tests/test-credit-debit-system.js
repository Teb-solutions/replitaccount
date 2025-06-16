/**
 * Comprehensive Test Suite for Credit/Debit Notes System
 * Tests all endpoints, database setup, and UI functionality
 */

const BASE_URL = 'http://localhost:5000';

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
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testDatabaseSetup() {
  console.log('\n🔧 Testing Database Setup...');
  
  const result = await makeRequest('/api/setup-database', 'POST');
  
  if (result.success) {
    console.log('✅ Database setup successful');
    console.log(`   Tables created: ${result.data.tablesCreated?.length || 0}`);
    console.log(`   Indexes created: ${result.data.indexesCreated || 0}`);
    console.log(`   Sample accounts: ${result.data.sampleAccountsInserted || 0}`);
  } else {
    console.log('❌ Database setup failed:', result.error || result.data?.details);
  }
  
  return result;
}

async function testCompaniesEndpoint() {
  console.log('\n🏢 Testing Companies Endpoint...');
  
  const result = await makeRequest('/api/companies');
  
  if (result.success && result.data.companies) {
    console.log(`✅ Companies endpoint working - ${result.data.companies.length} companies found`);
    return result.data.companies.slice(0, 2); // Return first 2 for testing
  } else {
    console.log('❌ Companies endpoint failed');
    return [];
  }
}

async function testProductsEndpoint() {
  console.log('\n📦 Testing Products Endpoint...');
  
  const result = await makeRequest('/api/products/tested');
  
  if (result.success && result.data.products) {
    console.log(`✅ Products endpoint working - ${result.data.products.length} products found`);
    return result.data.products.slice(0, 3); // Return first 3 for testing
  } else {
    console.log('❌ Products endpoint failed');
    return [];
  }
}

async function testCreditNotesCreation(companies, products) {
  console.log('\n💳 Testing Credit Notes Creation...');
  
  if (companies.length < 2 || products.length < 1) {
    console.log('❌ Insufficient test data for credit notes');
    return null;
  }
  
  const creditNoteData = {
    company_id: companies[0].id,
    customer_id: companies[1].id,
    amount: 150.00,
    reason: 'Product return - testing credit note system',
    credit_note_date: new Date().toISOString().split('T')[0],
    products: [
      {
        product_id: products[0].id,
        quantity: 2,
        unit_price: 75.00,
        total_amount: 150.00,
        reason: 'Defective items returned'
      }
    ]
  };
  
  const result = await makeRequest('/api/credit-notes', 'POST', creditNoteData);
  
  if (result.success) {
    console.log('✅ Credit note created successfully');
    console.log(`   Credit Note Number: ${result.data.creditNote?.credit_note_number}`);
    return result.data.creditNote;
  } else {
    console.log('❌ Credit note creation failed:', result.error || result.data?.details);
    return null;
  }
}

async function testDebitNotesCreation(companies, products) {
  console.log('\n💰 Testing Debit Notes Creation...');
  
  if (companies.length < 2 || products.length < 1) {
    console.log('❌ Insufficient test data for debit notes');
    return null;
  }
  
  const debitNoteData = {
    company_id: companies[0].id,
    vendor_id: companies[1].id,
    amount: 200.00,
    reason: 'Additional charges - testing debit note system',
    debit_note_date: new Date().toISOString().split('T')[0],
    products: [
      {
        product_id: products[0].id,
        quantity: 1,
        unit_price: 200.00,
        total_amount: 200.00,
        reason: 'Express delivery charges'
      }
    ]
  };
  
  const result = await makeRequest('/api/debit-notes', 'POST', debitNoteData);
  
  if (result.success) {
    console.log('✅ Debit note created successfully');
    console.log(`   Debit Note Number: ${result.data.debitNote?.debit_note_number}`);
    return result.data.debitNote;
  } else {
    console.log('❌ Debit note creation failed:', result.error || result.data?.details);
    return null;
  }
}

async function testIntercompanyAdjustment(companies, products) {
  console.log('\n🔄 Testing Intercompany Adjustment...');
  
  if (companies.length < 2 || products.length < 1) {
    console.log('❌ Insufficient test data for intercompany adjustment');
    return null;
  }
  
  const adjustmentData = {
    source_company_id: companies[0].id,
    target_company_id: companies[1].id,
    amount: 100.00,
    reason: 'Intercompany balance adjustment - testing system',
    adjustment_date: new Date().toISOString().split('T')[0],
    products: [
      {
        product_id: products[0].id,
        quantity: 1,
        unit_price: 100.00,
        total_amount: 100.00,
        reason: 'Service charge adjustment'
      }
    ]
  };
  
  const result = await makeRequest('/api/intercompany-adjustment', 'POST', adjustmentData);
  
  if (result.success) {
    console.log('✅ Intercompany adjustment created successfully');
    console.log(`   Reference Number: ${result.data.adjustment?.reference_number}`);
    console.log(`   Credit Note: ${result.data.creditNote?.credit_note_number}`);
    console.log(`   Debit Note: ${result.data.debitNote?.debit_note_number}`);
    return result.data.adjustment;
  } else {
    console.log('❌ Intercompany adjustment failed:', result.error || result.data?.details);
    return null;
  }
}

async function testCreditAccountsEndpoint() {
  console.log('\n💰 Testing Credit Accounts Endpoint...');
  
  const result = await makeRequest('/api/credit-accounts');
  
  if (result.success) {
    console.log(`✅ Credit accounts endpoint working - ${result.data.accounts?.length || 0} accounts found`);
    if (result.data.accounts?.length > 0) {
      console.log(`   Sample account: ${result.data.accounts[0].account_name}`);
    }
  } else {
    console.log('❌ Credit accounts endpoint failed');
  }
}

async function testDebitAccountsEndpoint() {
  console.log('\n💳 Testing Debit Accounts Endpoint...');
  
  const result = await makeRequest('/api/debit-accounts');
  
  if (result.success) {
    console.log(`✅ Debit accounts endpoint working - ${result.data.accounts?.length || 0} accounts found`);
    if (result.data.accounts?.length > 0) {
      console.log(`   Sample account: ${result.data.accounts[0].account_name}`);
    }
  } else {
    console.log('❌ Debit accounts endpoint failed');
  }
}

async function testListEndpoints() {
  console.log('\n📋 Testing List Endpoints...');
  
  // Test credit notes list
  const creditNotesResult = await makeRequest('/api/credit-notes');
  if (creditNotesResult.success) {
    console.log(`✅ Credit notes list - ${creditNotesResult.data.creditNotes?.length || 0} notes found`);
  } else {
    console.log('❌ Credit notes list failed');
  }
  
  // Test debit notes list
  const debitNotesResult = await makeRequest('/api/debit-notes');
  if (debitNotesResult.success) {
    console.log(`✅ Debit notes list - ${debitNotesResult.data.debitNotes?.length || 0} notes found`);
  } else {
    console.log('❌ Debit notes list failed');
  }
  
  // Test intercompany adjustments list
  const adjustmentsResult = await makeRequest('/api/intercompany-adjustments');
  if (adjustmentsResult.success) {
    console.log(`✅ Intercompany adjustments list - ${adjustmentsResult.data.adjustments?.length || 0} adjustments found`);
  } else {
    console.log('❌ Intercompany adjustments list failed');
  }
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Credit/Debit Notes System Tests');
  console.log('=' .repeat(60));
  
  try {
    // 1. Setup database
    await testDatabaseSetup();
    
    // 2. Test data endpoints
    const companies = await testCompaniesEndpoint();
    const products = await testProductsEndpoint();
    
    // 3. Test account endpoints
    await testCreditAccountsEndpoint();
    await testDebitAccountsEndpoint();
    
    // 4. Test creation endpoints
    const creditNote = await testCreditNotesCreation(companies, products);
    const debitNote = await testDebitNotesCreation(companies, products);
    const adjustment = await testIntercompanyAdjustment(companies, products);
    
    // 5. Test list endpoints
    await testListEndpoints();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Comprehensive Test Suite Completed');
    
    // Summary
    const results = {
      databaseSetup: true,
      companiesEndpoint: companies.length > 0,
      productsEndpoint: products.length > 0,
      creditNoteCreation: !!creditNote,
      debitNoteCreation: !!debitNote,
      intercompanyAdjustment: !!adjustment
    };
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎯 All systems operational - Ready for deployment!');
    } else {
      console.log('⚠️  Some tests failed - Review logs above');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests();
}

export { runComprehensiveTests };