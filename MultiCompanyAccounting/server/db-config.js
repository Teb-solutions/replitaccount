/**
 * Database Configuration Module
 * Centralized database connection for all API modules
 */

import pkg from 'pg';
const { Pool } = pkg;

// Production-ready database configuration
const dbConfig = {
  host: process.env.PGHOST || '135.235.154.222',
  port: parseInt(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'account_replit_staging',
  user: process.env.PGUSER || 'pguser',
  password: process.env.PGPASSWORD || 'StrongP@ss123',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Export pool for API modules
export { pool };
export { pool as externalPool };
export default pool;