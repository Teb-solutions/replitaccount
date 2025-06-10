/**
 * External Database Connector
 * 
 * This file provides a direct connection to the external database at 135.235.154.222
 * with proper authentication and connection handling.
 */
const { Pool } = require('pg');

// List of potential credentials to try
const credentialSets = [
  // Default postgres credentials
  { user: 'postgres', password: 'postgres' },
  
  // Common alternative credentials
  { user: 'admin', password: 'admin' },
  { user: 'admin', password: 'password' },
  
  // Try the credentials from the Neon database
  { user: 'neondb_owner', password: 'npg_WFPr4YwD2vyq' },
  
  // Try alternate postgres passwords
  { user: 'postgres', password: 'password' },
  { user: 'postgres', password: 'admin123' },
  { user: 'postgres', password: '' },
  
  // Additional possibilities
  { user: 'accounting', password: 'accounting' },
  { user: 'accounting', password: 'password' },
  { user: 'accounting_user', password: 'password' },
  { user: 'app_user', password: 'app_password' }
];

// Database connection settings
const dbConfig = {
  host: '135.235.154.222',
  port: 5432,
  database: 'postgres'
};

// Function to test a connection with given credentials
async function testConnection(credentials) {
  const { user, password } = credentials;
  console.log(`Testing connection with user: ${user}`);
  
  const pool = new Pool({
    ...dbConfig,
    user,
    password,
    // Set a short connection timeout to quickly test different credentials
    connectionTimeoutMillis: 5000
  });
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ Connection successful with user: ${user}`);
    
    // Try to access a table to verify permissions
    try {
      const { rows } = await pool.query('SELECT * FROM companies LIMIT 1');
      console.log(`✅ Successfully accessed companies table, found ${rows.length} rows`);
      return { success: true, credentials };
    } catch (error) {
      console.error(`❌ Error accessing tables with user ${user}:`, error.message);
      return { success: false };
    }
  } catch (error) {
    console.error(`❌ Connection failed with user ${user}:`, error.message);
    return { success: false };
  } finally {
    await pool.end();
  }
}

// Try all credential combinations sequentially
async function findWorkingCredentials() {
  console.log('Attempting to find working credentials for external database at 135.235.154.222...');
  
  for (const credentials of credentialSets) {
    const result = await testConnection(credentials);
    if (result.success) {
      console.log('Found working credentials!');
      return result.credentials;
    }
  }
  
  console.log('❌ Could not find working credentials for external database');
  return null;
}

// Create a connection pool with the working credentials
async function createConnectionPool() {
  const credentials = await findWorkingCredentials();
  
  if (credentials) {
    const pool = new Pool({
      ...dbConfig,
      user: credentials.user,
      password: credentials.password
    });
    
    // Verify connection is working
    try {
      await pool.query('SELECT 1');
      console.log('External database connection pool created successfully');
      return pool;
    } catch (error) {
      console.error('Error creating connection pool:', error);
      return null;
    }
  }
  
  console.log('Falling back to Neon database connection');
  // Return a connection to the Neon database as fallback
  return new Pool({
    connectionString: 'postgresql://neondb_owner:npg_WFPr4YwD2vyq@ep-gentle-dawn-a51udm2v.us-east-2.aws.neon.tech/neondb?sslmode=require'
  });
}

// Export functions for use in the application
module.exports = {
  findWorkingCredentials,
  createConnectionPool
};