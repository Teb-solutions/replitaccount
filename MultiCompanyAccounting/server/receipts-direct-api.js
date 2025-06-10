/**
 * Direct Receipts API - Access Authentic Payment Data
 * 
 * Direct access to receipts table to see actual payment data from external database
 */

import express from 'express';
import pg from 'pg';

const { Pool } = pg;

// External database connection - same pattern as working test scripts
const pool = new Pool({
  host: '135.235.154.222',
  user: 'pguser',
  password: 'StrongP@ss123',
  database: 'account_replit_staging',
  port: 5432
});

const router = express.Router();

// Get all receipts for a company - direct database query
router.get('/api/receipts-direct', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log(`💰 Getting receipts directly from database for company ${companyId}`);

    // First, let's see what columns exist in receipts table
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'receipts' 
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    console.log('Available columns in receipts table:', columnsResult.rows.map(r => r.column_name));

    // Get all receipts data
    const query = `
      SELECT * 
      FROM receipts 
      WHERE company_id = $1
      ORDER BY receipt_date DESC
    `;

    const result = await pool.query(query, [companyId]);
    
    console.log(`✅ Found ${result.rows.length} receipts for company ${companyId}`);
    
    // Calculate total amount
    const totalAmount = result.rows.reduce((sum, receipt) => {
      return sum + parseFloat(receipt.amount || receipt.total || 0);
    }, 0);

    res.json({
      receipts: result.rows,
      totalReceipts: result.rows.length,
      totalAmount: totalAmount,
      columns: columnsResult.rows.map(r => r.column_name)
    });

  } catch (error) {
    console.error('❌ Direct receipts API error:', error.message);
    res.status(500).json({ error: 'Failed to get receipts directly', details: error.message });
  }
});

// Get receipts summary with detailed breakdown
router.get('/api/receipts-summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log(`💰 Getting receipts summary for company ${companyId}`);

    const query = `
      SELECT 
        COUNT(*) as total_receipts,
        SUM(amount) as total_amount,
        MIN(receipt_date) as earliest_receipt,
        MAX(receipt_date) as latest_receipt,
        COUNT(DISTINCT sales_order_id) as unique_sales_orders,
        COUNT(DISTINCT invoice_id) as unique_invoices
      FROM receipts 
      WHERE company_id = $1
    `;

    const result = await pool.query(query, [companyId]);
    const summary = result.rows[0];

    res.json({
      totalReceipts: parseInt(summary.total_receipts || 0),
      totalAmount: parseFloat(summary.total_amount || 0),
      earliestReceipt: summary.earliest_receipt,
      latestReceipt: summary.latest_receipt,
      uniqueSalesOrders: parseInt(summary.unique_sales_orders || 0),
      uniqueInvoices: parseInt(summary.unique_invoices || 0)
    });

  } catch (error) {
    console.error('❌ Receipts summary API error:', error.message);
    res.status(500).json({ error: 'Failed to get receipts summary', details: error.message });
  }
});

// Check all receipts across all companies
router.get('/api/receipts-all', async (req, res) => {
  try {
    console.log('💰 Getting all receipts from database');

    const query = `
      SELECT 
        r.*,
        c.name as company_name
      FROM receipts r
      LEFT JOIN companies c ON r.company_id = c.id
      ORDER BY r.receipt_date DESC
      LIMIT 50
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} total receipts in database`);

    res.json({
      receipts: result.rows,
      totalReceipts: result.rows.length
    });

  } catch (error) {
    console.error('❌ All receipts API error:', error.message);
    res.status(500).json({ error: 'Failed to get all receipts', details: error.message });
  }
});

export { router as receiptsDirectRouter };