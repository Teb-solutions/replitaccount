/**
 * Database Configuration for Multi-Company Accounting System
 * Provides connection management for external PostgreSQL database
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection configuration
const dbConfig = {
  host: process.env.PGHOST || '135.235.154.222',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'account_replit_staging',
  user: process.env.PGUSER || 'pguser',
  password: process.env.PGPASSWORD || 'StrongP@ss123',
  ssl: false, // SSL disabled for external database
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Connection error handling
pool.on('error', (err) => {
  console.error('🔴 Database connection error:', err);
});

// Connection success logging
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

// Test database connection
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('📊 Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

// Export pool for use in API modules
export { pool };
export { pool as externalPool }; // For compatibility with existing imports
export default pool;