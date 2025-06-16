/**
 * IIS Deployment Package Test Verification
 * Tests the credit/debit notes system for IIS deployment
 */

import fs from 'fs';
import path from 'path';

const PACKAGE_DIR = 'credit-debit-notes-iis-deployment';

function testPackageStructure() {
  console.log('🔍 Testing IIS deployment package structure...');
  
  const requiredFiles = [
    'server.js',
    'package.json',
    'install.bat',
    'README.md',
    'server/apis/credit-debit-notes-api.js',
    'server/apis/credit-debit-accounts-api.js',
    'server/apis/database-setup-api.js',
    'server/apis/application-insights-logger.js',
    'client/src/pages/credit-notes-management.tsx',
    'client/src/pages/debit-notes-management.tsx',
    'client/src/pages/intercompany-adjustments.tsx',
    'iis-config/web.config',
    'documentation/IIS_DEPLOYMENT_GUIDE.md',
    'documentation/REACT_INTEGRATION.md',
    'tests/test-credit-debit-system.js'
  ];
  
  const missingFiles = [];
  const existingFiles = [];
  
  for (const file of requiredFiles) {
    const fullPath = path.join(PACKAGE_DIR, file);
    if (fs.existsSync(fullPath)) {
      existingFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  }
  
  console.log(`✅ Found ${existingFiles.length}/${requiredFiles.length} required files`);
  
  if (missingFiles.length > 0) {
    console.log('❌ Missing files:', missingFiles);
    return false;
  }
  
  return true;
}

function testAPIEndpoints() {
  console.log('\n🔍 Testing API endpoint definitions...');
  
  const apiFiles = [
    'server/apis/credit-debit-notes-api.js',
    'server/apis/credit-debit-accounts-api.js',
    'server/apis/database-setup-api.js'
  ];
  
  const expectedEndpoints = [
    '/api/credit-notes',
    '/api/debit-notes',
    '/api/intercompany-adjustment',
    '/api/setup-database',
    '/api/credit-accounts',
    '/api/debit-accounts'
  ];
  
  let endpointsFound = 0;
  
  for (const apiFile of apiFiles) {
    const fullPath = path.join(PACKAGE_DIR, apiFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const endpoint of expectedEndpoints) {
        if (content.includes(endpoint)) {
          endpointsFound++;
        }
      }
    }
  }
  
  console.log(`✅ Found ${endpointsFound} API endpoint references`);
  return endpointsFound >= expectedEndpoints.length;
}

function testUIComponents() {
  console.log('\n🔍 Testing UI component structure...');
  
  const uiFiles = [
    'client/src/pages/credit-notes-management.tsx',
    'client/src/pages/debit-notes-management.tsx',
    'client/src/pages/intercompany-adjustments.tsx'
  ];
  
  const requiredUIElements = [
    'useState',
    'useQuery',
    'useMutation',
    'Card',
    'Button',
    'Dialog',
    'Table'
  ];
  
  let validComponents = 0;
  
  for (const uiFile of uiFiles) {
    const fullPath = path.join(PACKAGE_DIR, uiFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const foundElements = requiredUIElements.filter(element => 
        content.includes(element)
      );
      
      if (foundElements.length >= 5) {
        validComponents++;
      }
    }
  }
  
  console.log(`✅ Validated ${validComponents}/${uiFiles.length} UI components`);
  return validComponents === uiFiles.length;
}

function testIISConfiguration() {
  console.log('\n🔍 Testing IIS configuration...');
  
  const webConfigPath = path.join(PACKAGE_DIR, 'iis-config/web.config');
  const serverJsPath = path.join(PACKAGE_DIR, 'server.js');
  
  if (!fs.existsSync(webConfigPath)) {
    console.log('❌ web.config not found');
    return false;
  }
  
  if (!fs.existsSync(serverJsPath)) {
    console.log('❌ server.js not found');
    return false;
  }
  
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');
  const serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
  
  const webConfigChecks = [
    'iisnode',
    'rewrite',
    'api/.*',
    'node_env'
  ];
  
  const serverJsChecks = [
    'express',
    'import',
    'credit-debit-notes-api',
    'application-insights-logger'
  ];
  
  const webConfigValid = webConfigChecks.every(check => 
    webConfigContent.includes(check)
  );
  
  const serverJsValid = serverJsChecks.every(check => 
    serverJsContent.includes(check)
  );
  
  console.log(`✅ web.config validation: ${webConfigValid ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ server.js validation: ${serverJsValid ? 'PASSED' : 'FAILED'}`);
  
  return webConfigValid && serverJsValid;
}

function testDocumentation() {
  console.log('\n🔍 Testing documentation completeness...');
  
  const docFiles = [
    'documentation/IIS_DEPLOYMENT_GUIDE.md',
    'documentation/REACT_INTEGRATION.md',
    'README.md'
  ];
  
  const requiredTopics = [
    'Installation',
    'Configuration',
    'Database',
    'API',
    'UI',
    'Troubleshooting'
  ];
  
  let validDocs = 0;
  
  for (const docFile of docFiles) {
    const fullPath = path.join(PACKAGE_DIR, docFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const foundTopics = requiredTopics.filter(topic => 
        content.toLowerCase().includes(topic.toLowerCase())
      );
      
      if (foundTopics.length >= 4) {
        validDocs++;
      }
    }
  }
  
  console.log(`✅ Documentation validation: ${validDocs}/${docFiles.length} files complete`);
  return validDocs >= docFiles.length - 1; // Allow one missing
}

function testDatabaseIntegration() {
  console.log('\n🔍 Testing database integration...');
  
  const dbSetupPath = path.join(PACKAGE_DIR, 'server/apis/database-setup-api.js');
  
  if (!fs.existsSync(dbSetupPath)) {
    console.log('❌ Database setup API not found');
    return false;
  }
  
  const content = fs.readFileSync(dbSetupPath, 'utf8');
  
  const requiredTables = [
    'credit_notes',
    'credit_note_items',
    'debit_notes',
    'debit_note_items',
    'intercompany_adjustments'
  ];
  
  const tablesFound = requiredTables.filter(table => 
    content.includes(table)
  );
  
  console.log(`✅ Database tables: ${tablesFound.length}/${requiredTables.length} defined`);
  
  const hasConnectionConfig = content.includes('135.235.154.222') && 
                             content.includes('account_replit_staging');
  
  console.log(`✅ Database connection: ${hasConnectionConfig ? 'CONFIGURED' : 'MISSING'}`);
  
  return tablesFound.length === requiredTables.length && hasConnectionConfig;
}

function runAllTests() {
  console.log('🚀 Starting IIS Deployment Package Verification');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Package Structure', test: testPackageStructure },
    { name: 'API Endpoints', test: testAPIEndpoints },
    { name: 'UI Components', test: testUIComponents },
    { name: 'IIS Configuration', test: testIISConfiguration },
    { name: 'Documentation', test: testDocumentation },
    { name: 'Database Integration', test: testDatabaseIntegration }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const result = test();
      results.push({ name, passed: result });
    } catch (error) {
      console.log(`❌ ${name} test failed:`, error.message);
      results.push({ name, passed: false });
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary:');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(({ name, passed }) => {
    console.log(`${passed ? '✅' : '❌'} ${name}`);
  });
  
  console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 IIS deployment package is ready for production!');
    return true;
  } else {
    console.log('⚠️  Some tests failed - package needs review');
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const packageExists = fs.existsSync(PACKAGE_DIR);
  
  if (!packageExists) {
    console.log(`❌ Package directory '${PACKAGE_DIR}' not found`);
    console.log('Please run the deployment package creation script first');
    process.exit(1);
  }
  
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

export { runAllTests };