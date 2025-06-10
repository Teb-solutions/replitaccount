/**
 * Essential Financial Reports API
 * 
 * Provides Balance Sheet, Income Statement, and other financial reports
 * using authentic data from your external database for all UI pages.
 */

import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Direct connection to external database
const reportPool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  max: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection
reportPool.connect()
  .then(client => {
    console.log('✅ Essential financial reports API connected');
    client.release();
  })
  .catch(err => {
    console.error('❌ Financial reports API connection failed:', err.message);
  });

// GET /api/reports/balance-sheet
router.get('/api/reports/balance-sheet', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Missing company ID' });
    }

    console.log(`📊 Generating balance sheet for company ${companyId}`);

    // Get company name
    const companyResult = await reportPool.query(
      'SELECT name FROM companies WHERE id = $1',
      [companyId]
    );
    
    const companyName = companyResult.rows[0]?.name || 'Unknown Company';

    // Get account balances grouped by type
    const accountsQuery = `
      SELECT 
        a.id,
        a.code,
        a.name,
        a.balance::numeric,
        at.name as account_type,
        at.id as account_type_id
      FROM accounts a
      LEFT JOIN account_types at ON a.account_type_id = at.id
      WHERE a.company_id = $1 AND a.is_active = true
      ORDER BY a.code
    `;

    const accountsResult = await reportPool.query(accountsQuery, [companyId]);
    const accounts = accountsResult.rows;

    // Group accounts by type
    const assets = accounts.filter(acc => acc.account_type === 'Assets' || acc.account_type === 'Asset');
    const liabilities = accounts.filter(acc => acc.account_type === 'Liabilities' || acc.account_type === 'Liability');
    const equity = accounts.filter(acc => acc.account_type === 'Equity');

    // Calculate totals
    const totalAssets = assets.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalEquity = equity.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);

    res.json({
      companyName,
      companyId: parseInt(companyId),
      assets: {
        accounts: assets.map(acc => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(acc.balance) || 0
        })),
        total: totalAssets
      },
      liabilities: {
        accounts: liabilities.map(acc => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(acc.balance) || 0
        })),
        total: totalLiabilities
      },
      equity: {
        accounts: equity.map(acc => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(acc.balance) || 0
        })),
        total: totalEquity
      },
      totalAssets,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity
    });

  } catch (error) {
    console.error('❌ Balance sheet error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate balance sheet',
      details: error.message 
    });
  }
});

// GET /api/reports/income-statement
router.get('/api/reports/income-statement', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Missing company ID' });
    }

    console.log(`📊 Generating income statement for company ${companyId}`);

    // Get company name
    const companyResult = await reportPool.query(
      'SELECT name FROM companies WHERE id = $1',
      [companyId]
    );
    
    const companyName = companyResult.rows[0]?.name || 'Unknown Company';

    // Get revenue and expense accounts
    const accountsQuery = `
      SELECT 
        a.id,
        a.code,
        a.name,
        a.balance::numeric,
        at.name as account_type
      FROM accounts a
      LEFT JOIN account_types at ON a.account_type_id = at.id
      WHERE a.company_id = $1 
        AND a.is_active = true
        AND (at.name IN ('Revenue', 'Income', 'Expense', 'Expenses'))
      ORDER BY a.code
    `;

    const accountsResult = await reportPool.query(accountsQuery, [companyId]);
    const accounts = accountsResult.rows;

    // Group accounts
    const revenue = accounts.filter(acc => acc.account_type === 'Revenue' || acc.account_type === 'Income');
    const expenses = accounts.filter(acc => acc.account_type === 'Expense' || acc.account_type === 'Expenses');

    // Calculate totals
    const totalRevenue = revenue.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      companyName,
      companyId: parseInt(companyId),
      period: {
        startDate: startDate || '2025-01-01',
        endDate: endDate || '2025-12-31'
      },
      revenue: {
        accounts: revenue.map(acc => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(acc.balance) || 0
        })),
        total: totalRevenue
      },
      expenses: {
        accounts: expenses.map(acc => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
          balance: parseFloat(acc.balance) || 0
        })),
        total: totalExpenses
      },
      netIncome,
      totalRevenue,
      totalExpenses
    });

  } catch (error) {
    console.error('❌ Income statement error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate income statement',
      details: error.message 
    });
  }
});

// GET /api/sales-orders and /api/purchase-orders (essential endpoints)
router.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Missing company ID' });
    }

    console.log(`📊 Fetching sales orders for company ${companyId}`);

    const salesOrdersQuery = `
      SELECT 
        so.id,
        so.order_number,
        so.reference_number,
        so.order_date,
        so.expected_date,
        so.total,
        so.status,
        c.name as customer_name
      FROM sales_orders so
      LEFT JOIN companies c ON so.customer_id = c.id
      WHERE so.company_id = $1
      ORDER BY so.order_date DESC
      LIMIT 100
    `;

    const result = await reportPool.query(salesOrdersQuery, [companyId]);
    
    res.json(result.rows.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      referenceNumber: order.reference_number,
      orderDate: order.order_date,
      expectedDate: order.expected_date,
      total: parseFloat(order.total || 0),
      status: order.status,
      customerName: order.customer_name || 'Unknown Customer'
    })));

  } catch (error) {
    console.error('❌ Sales orders error:', error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve sales orders',
      details: error.message 
    });
  }
});

router.get('/api/purchase-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Missing company ID' });
    }

    console.log(`📊 Fetching purchase orders for company ${companyId}`);

    const purchaseOrdersQuery = `
      SELECT 
        po.id,
        po.order_number,
        po.reference_number,
        po.order_date,
        po.expected_date,
        po.total,
        po.status,
        v.name as vendor_name
      FROM purchase_orders po
      LEFT JOIN companies v ON po.vendor_id = v.id
      WHERE po.company_id = $1
      ORDER BY po.order_date DESC
      LIMIT 100
    `;

    const result = await reportPool.query(purchaseOrdersQuery, [companyId]);
    
    res.json(result.rows.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      referenceNumber: order.reference_number,
      orderDate: order.order_date,
      expectedDate: order.expected_date,
      total: parseFloat(order.total || 0),
      status: order.status,
      vendorName: order.vendor_name || 'Unknown Vendor'
    })));

  } catch (error) {
    console.error('❌ Purchase orders error:', error.message);
    res.status(500).json({ 
      error: 'Failed to retrieve purchase orders',
      details: error.message 
    });
  }
});

export default router;