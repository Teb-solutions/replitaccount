/**
 * Summary Endpoints for Dashboard - Missing API Routes Fix
 * 
 * This module provides all the missing summary endpoints that the dashboard requires:
 * - /api/invoices/summary
 * - /api/receipts/summary  
 * - /api/payments/summary
 * - /api/intercompany-balances
 * 
 * All endpoints return authentic data from your external database.
 */

import { Pool } from 'pg';

// External database connection
const externalPool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123'
});

export function setupSummaryEndpoints(app) {
  console.log('🔧 Setting up missing summary endpoints for dashboard...');

  // Invoice Summary API
  app.get('/api/invoices/summary', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting invoice summary for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(total), 0) as total_amount,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count
        FROM invoices 
        WHERE company_id = $1
      `, [companyId]);

      const summary = result.rows[0];
      res.json({
        totalInvoices: parseInt(summary.total_count),
        totalAmount: parseFloat(summary.total_amount || 0),
        paidInvoices: parseInt(summary.paid_count),
        pendingInvoices: parseInt(summary.pending_count)
      });
    } catch (error) {
      console.error('❌ Invoice summary error:', error.message);
      res.status(500).json({ error: 'Failed to get invoice summary' });
    }
  });

  // Receipts Summary API  
  app.get('/api/receipts/summary', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting receipts summary for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM receipts 
        WHERE company_id = $1
      `, [companyId]);

      const summary = result.rows[0];
      res.json({
        totalReceipts: parseInt(summary.total_count),
        totalAmount: parseFloat(summary.total_amount || 0)
      });
    } catch (error) {
      console.error('❌ Receipts summary error:', error.message);
      res.status(500).json({ error: 'Failed to get receipts summary' });
    }
  });

  // Payments Summary API (same as receipts for compatibility)
  app.get('/api/payments/summary', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting payments summary for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM receipts 
        WHERE company_id = $1
      `, [companyId]);

      const summary = result.rows[0];
      res.json({
        totalPayments: parseInt(summary.total_count),
        totalAmount: parseFloat(summary.total_amount || 0)
      });
    } catch (error) {
      console.error('❌ Payments summary error:', error.message);
      res.status(500).json({ error: 'Failed to get payments summary' });
    }
  });

  // Intercompany Balances API
  app.get('/api/intercompany-balances', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting intercompany balances for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          target_company_id,
          c.name as company_name,
          COALESCE(SUM(amount), 0) as balance
        FROM intercompany_transactions it
        JOIN companies c ON it.target_company_id = c.id
        WHERE it.source_company_id = $1
        GROUP BY target_company_id, c.name
      `, [companyId]);

      res.json(result.rows.map(row => ({
        companyId: row.target_company_id,
        companyName: row.company_name,
        balance: parseFloat(row.balance || 0)
      })));
    } catch (error) {
      console.error('❌ Intercompany balances error:', error.message);
      res.status(500).json({ error: 'Failed to get intercompany balances' });
    }
  });


  // Bills Summary API
  app.get('/api/bills/summary', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting bill summary for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(total), 0) as total_amount,
          COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count
        FROM bills 
        WHERE company_id = $1
      `, [companyId]);

      const summary = result.rows[0];
      res.json({
        totalBills: parseInt(summary.total_count),
        totalAmount: parseFloat(summary.total_amount || 0),
        paidBills: parseInt(summary.paid_count),
        pendingBills: parseInt(summary.pending_count)
      });
    } catch (error) {
      console.error('❌ Error fetching bill summary:', error.message);
      res.status(500).json({ error: 'Failed to retrieve bill summary' });
    }
  });

  // Purchase Orders Summary API
  app.get('/api/purchase-orders/summary', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting purchase order summary for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(total), 0) as total_amount,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count
        FROM purchase_orders 
        WHERE company_id = $1
      `, [companyId]);

      const summary = result.rows[0];
      res.json({
        totalOrders: parseInt(summary.total_count),
        totalAmount: parseFloat(summary.total_amount || 0),
        openOrders: parseInt(summary.open_count),
        closedOrders: parseInt(summary.closed_count)
      });
    } catch (error) {
      console.error('❌ Error fetching purchase order summary:', error.message);
      res.status(500).json({ error: 'Failed to retrieve purchase order summary' });
    }
  });

  console.log('✅ Summary endpoints setup complete');
}