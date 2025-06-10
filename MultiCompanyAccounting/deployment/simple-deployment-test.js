// Simple deployment test for the separated frontend/backend structure

const API_BASE = 'http://localhost:5000';

const criticalEndpoints = [
  '/health',
  '/api/auth/me', 
  '/api/companies',
  '/api/sales-orders?companyId=7',
  '/api/invoices/summary?companyId=7',
  '/api-docs'
];

async function testEndpoint(path) {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    return {
      path,
      status: response.status,
      success: response.status >= 200 && response.status < 400
    };
  } catch (error) {
    return {
      path,
      status: 'ERROR',
      success: false,
      error: error.message
    };
  }
}

async function testDeploymentEndpoints() {
  console.log('Testing deployment endpoints...');
  
  let successCount = 0;
  
  for (const endpoint of criticalEndpoints) {
    const result = await testEndpoint(endpoint);
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint} - ${result.status}`);
    
    if (result.success) successCount++;
  }
  
  console.log(`\nResults: ${successCount}/${criticalEndpoints.length} endpoints working`);
  return successCount === criticalEndpoints.length;
}

testDeploymentEndpoints();