import { spawn } from 'child_process';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:6000';
const TEST_PORT = 6000;

// Test configuration
const testEndpoints = [
  { method: 'GET', path: '/health', description: 'Health check' },
  { method: 'GET', path: '/api/auth/me', description: 'Authentication check' },
  { method: 'GET', path: '/api/companies', description: 'Companies API' },
  { method: 'GET', path: '/api/sales-orders?companyId=7', description: 'Sales orders' },
  { method: 'GET', path: '/api/invoices/summary?companyId=7', description: 'Invoice summary' },
  { method: 'GET', path: '/api/bills/summary?companyId=8', description: 'Bills summary' },
  { method: 'GET', path: '/api/receipts/summary?companyId=7', description: 'Receipts summary' },
  { method: 'GET', path: '/api/intercompany-balances?companyId=7', description: 'Intercompany balances' },
  { method: 'GET', path: '/api-docs', description: 'Swagger documentation' },
  { method: 'GET', path: '/api/reports/balance-sheet/summary?companyId=7', description: 'Balance sheet' }
];

async function testEndpoint(endpoint) {
  try {
    const url = `${API_BASE}${endpoint.path}`;
    const response = await fetch(url, {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.text();
    const status = response.status;
    
    return {
      endpoint: endpoint.description,
      path: endpoint.path,
      status,
      success: status >= 200 && status < 400,
      response: data.length > 200 ? data.substring(0, 200) + '...' : data
    };
  } catch (error) {
    return {
      endpoint: endpoint.description,
      path: endpoint.path,
      status: 'ERROR',
      success: false,
      response: error.message
    };
  }
}

async function runDeploymentTests() {
  console.log('🧪 Starting deployment endpoint tests...\n');
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.endpoint} (${result.path}) - Status: ${result.status}`);
    
    if (!result.success) {
      console.log(`   Error: ${result.response}`);
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${successful}/${total} endpoints working`);
  
  if (successful === total) {
    console.log('🎉 All endpoints are working correctly!');
  } else {
    console.log('⚠️ Some endpoints need attention.');
  }
  
  // Test database connectivity
  console.log('\n🔍 Testing database connectivity...');
  try {
    const dbTest = await testEndpoint({
      method: 'GET',
      path: '/api/companies',
      description: 'Database connection test'
    });
    
    if (dbTest.success) {
      console.log('✅ Database connection working');
    } else {
      console.log('❌ Database connection issues detected');
    }
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
  }
  
  process.exit(0);
}

runDeploymentTests();