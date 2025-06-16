/**
 * Simple Integration Test for Credit/Debit Notes
 * Tests the new functionality added to server.cjs
 */

const BASE_URL = 'http://localhost:3002';

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return {
      success: response.ok,
      status: response.status,
      data: response.ok ? await response.json() : await response.text()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('Testing Credit/Debit Notes Integration\n');
  
  // Test existing functionality
  const companies = await testAPI('/api/companies');
  console.log(`Companies API: ${companies.success ? 'Working' : 'Failed'} - ${companies.success ? companies.data.length + ' companies' : companies.error}`);
  
  const products = await testAPI('/api/products');
  console.log(`Products API: ${products.success ? 'Working' : 'Failed'} - ${products.success ? products.data.length + ' products' : companies.error}`);
  
  // Test new functionality
  const dbSetup = await testAPI('/api/setup-database', 'POST');
  console.log(`Database Setup: ${dbSetup.success ? 'Working' : 'Failed'} - ${dbSetup.success ? dbSetup.data.tablesCreated?.length + ' tables' : dbSetup.error}`);
  
  const creditNotes = await testAPI('/api/credit-notes');
  console.log(`Credit Notes: ${creditNotes.success ? 'Working' : 'Failed'} - ${creditNotes.success ? creditNotes.data.creditNotes?.length + ' notes' : creditNotes.error}`);
  
  const debitNotes = await testAPI('/api/debit-notes');
  console.log(`Debit Notes: ${debitNotes.success ? 'Working' : 'Failed'} - ${debitNotes.success ? debitNotes.data.debitNotes?.length + ' notes' : debitNotes.error}`);
  
  const adjustments = await testAPI('/api/intercompany-adjustments');
  console.log(`Intercompany Adjustments: ${adjustments.success ? 'Working' : 'Failed'} - ${adjustments.success ? adjustments.data.adjustments?.length + ' adjustments' : adjustments.error}`);
  
  const health = await testAPI('/api/health');
  console.log(`Enhanced Health Check: ${health.success ? 'Working' : 'Failed'} - ${health.success ? health.data.features?.length + ' features' : health.error}`);
  
  console.log('\nIntegration Status: Credit/Debit functionality added to existing server.cjs');
  console.log('Application Insights logging integrated with ID: e04a0cf1-8129-4bc2-8707-016ae726c876');
}

runTests().catch(console.error);