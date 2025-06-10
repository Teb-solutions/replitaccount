/**
 * Database Schema Verification and Comprehensive Endpoint Fixes
 * Verifies actual database structure and fixes comprehensive endpoints
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration for external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 20
});

async function verifyDatabaseSchema() {
  try {
    console.log('🔍 Verifying database schema...');
    
    // Check invoices table structure
    const invoicesSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Invoices table columns:', invoicesSchema.rows);
    
    // Check bills table structure
    const billsSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Bills table columns:', billsSchema.rows);
    
    // Check sales_orders table structure
    const salesOrdersSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_orders' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Sales Orders table columns:', salesOrdersSchema.rows);
    
    // Test actual data structure
    console.log('\n🧪 Testing actual data structure...');
    
    const sampleInvoice = await pool.query('SELECT * FROM invoices LIMIT 1');
    if (sampleInvoice.rows.length > 0) {
      console.log('📊 Sample invoice structure:', Object.keys(sampleInvoice.rows[0]));
    }
    
    const sampleBill = await pool.query('SELECT * FROM bills LIMIT 1');
    if (sampleBill.rows.length > 0) {
      console.log('📊 Sample bill structure:', Object.keys(sampleBill.rows[0]));
    }
    
    const sampleSalesOrder = await pool.query('SELECT * FROM sales_orders LIMIT 1');
    if (sampleSalesOrder.rows.length > 0) {
      console.log('📊 Sample sales order structure:', Object.keys(sampleSalesOrder.rows[0]));
    }
    
    return {
      invoices: invoicesSchema.rows,
      bills: billsSchema.rows,
      salesOrders: salesOrdersSchema.rows
    };
    
  } catch (error) {
    console.error('❌ Error verifying database schema:', error.message);
    return null;
  }
}

export function setupSchemaVerificationAPI(app) {
  // Schema verification endpoint
  app.get('/api/admin/verify-schema', async (req, res) => {
    try {
      const schema = await verifyDatabaseSchema();
      if (schema) {
        res.json({
          success: true,
          schema: schema,
          message: 'Database schema verified successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to verify database schema'
        });
      }
    } catch (error) {
      console.error('❌ Schema verification error:', error);
      res.status(500).json({
        error: 'Failed to verify schema',
        details: error.message
      });
    }
  });
  
  console.log('✅ Schema verification API loaded');
}

// Auto-run schema verification on startup
verifyDatabaseSchema();