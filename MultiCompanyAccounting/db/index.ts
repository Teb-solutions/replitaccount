import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

console.log('Using external database connection to account_replit_staging at 135.235.154.222');

// Create connection pool with correct credentials
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123'
});

// Test external connection
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Successfully connected to external database at 135.235.154.222');
  })
  .catch(err => {
    console.warn('WARNING: Not connected to external database');
    console.warn(err.message);
  });

// Export pool and db
export const db = drizzle(pool);
export { pool };
