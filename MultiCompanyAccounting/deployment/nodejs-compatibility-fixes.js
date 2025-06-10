/**
 * Node.js Compatibility Fixes for Multi-Company Accounting System
 * Addresses database schema mismatches and API routing issues
 */

import { pool as externalPool } from '../server/db-config.js';

export function applyNodeJSFixes(app) {
  
  // Override existing routes with corrected database queries
  
  // Fix 1: Sales Orders API with correct company_id handling
  app.get('/api/sales-orders', async (req, res) => {
    try {
      const { company_id, companyId } = req.query;
      const targetCompanyId = company_id || companyId;
      
      let query = `
        SELECT 
          so.id,
          so.order_number as "orderNumber",
          so.order_date as "orderDate", 
          so.expected_date as "expectedDate",
          so.total,
          so.status,
          c.name as company_name,
          cc.name as customer_name,
          so.company_id,
          so.customer_company_id
        FROM sales_orders so
        JOIN companies c ON so.company_id = c.id
        LEFT JOIN companies cc ON so.customer_company_id = cc.id
      `;
      
      let params = [];
      if (targetCompanyId && targetCompanyId !== 'all') {
        query += ' WHERE so.company_id = $1';
        params.push(targetCompanyId);
      }
      
      query += ' ORDER BY so.order_date DESC';
      
      const result = await externalPool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      res.status(500).json({ error: 'Failed to fetch sales orders' });
    }
  });

  // Fix 2: Invoices API with correct date column
  app.get('/api/invoices', async (req, res) => {
    try {
      const { company_id, companyId } = req.query;
      const targetCompanyId = company_id || companyId;
      
      let query = `
        SELECT 
          i.id,
          i.invoice_number as "invoiceNumber",
          i.invoice_date as "invoiceDate",
          i.total,
          i.status,
          c.name as company_name,
          cc.name as customer_name,
          i.company_id,
          i.customer_company_id
        FROM invoices i
        JOIN companies c ON i.company_id = c.id
        LEFT JOIN companies cc ON i.customer_company_id = cc.id
      `;
      
      let params = [];
      if (targetCompanyId && targetCompanyId !== 'all') {
        query += ' WHERE i.company_id = $1';
        params.push(targetCompanyId);
      }
      
      query += ' ORDER BY i.invoice_date DESC';
      
      const result = await externalPool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Fix 3: Bills API with correct column names
  app.get('/api/bills', async (req, res) => {
    try {
      const { company_id, companyId } = req.query;
      const targetCompanyId = company_id || companyId;
      
      let query = `
        SELECT 
          b.id,
          b.bill_number as "billNumber",
          b.bill_date as "billDate",
          b.total,
          b.status,
          c.name as company_name,
          cc.name as vendor_name,
          b.company_id,
          b.vendor_company_id
        FROM bills b
        JOIN companies c ON b.company_id = c.id
        LEFT JOIN companies cc ON b.vendor_company_id = cc.id
      `;
      
      let params = [];
      if (targetCompanyId && targetCompanyId !== 'all') {
        query += ' WHERE b.company_id = $1';
        params.push(targetCompanyId);
      }
      
      query += ' ORDER BY b.bill_date DESC';
      
      const result = await externalPool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching bills:', error);
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  });

  // Fix 4: Receipts API with correct date column
  app.get('/api/receipts', async (req, res) => {
    try {
      const { company_id, companyId } = req.query;
      const targetCompanyId = company_id || companyId;
      
      let query = `
        SELECT 
          r.id,
          r.receipt_number as "receiptNumber",
          r.receipt_date as "receiptDate",
          r.amount,
          r.payment_method as "paymentMethod",
          r.status,
          c.name as company_name,
          cc.name as customer_name,
          r.company_id,
          r.customer_company_id
        FROM receipts r
        JOIN companies c ON r.company_id = c.id
        LEFT JOIN companies cc ON r.customer_company_id = cc.id
      `;
      
      let params = [];
      if (targetCompanyId && targetCompanyId !== 'all') {
        query += ' WHERE r.company_id = $1';
        params.push(targetCompanyId);
      }
      
      query += ' ORDER BY r.receipt_date DESC';
      
      const result = await externalPool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ error: 'Failed to fetch receipts' });
    }
  });

  // Fix 5: Balance Sheet API with account_type_id handling
  app.get('/api/reports/balance-sheet', async (req, res) => {
    try {
      const { company_id, companyId } = req.query;
      const targetCompanyId = company_id || companyId;

      // Get accounts with account type information
      let accountsQuery = `
        SELECT 
          a.id,
          a.account_name,
          a.balance,
          a.company_id,
          at.type_name,
          c.name as company_name
        FROM accounts a
        JOIN account_types at ON a.account_type_id = at.id
        JOIN companies c ON a.company_id = c.id
      `;
      
      let params = [];
      if (targetCompanyId && targetCompanyId !== 'all') {
        accountsQuery += ' WHERE a.company_id = $1';
        params.push(targetCompanyId);
      }
      
      const accountsResult = await externalPool.query(accountsQuery, params);
      const accounts = accountsResult.rows;

      // Categorize accounts by type
      const assets = accounts.filter(acc => 
        acc.type_name && acc.type_name.toLowerCase().includes('asset')
      );

      const liabilities = accounts.filter(acc => 
        acc.type_name && acc.type_name.toLowerCase().includes('liability')
      );

      const equity = accounts.filter(acc => 
        acc.type_name && (acc.type_name.toLowerCase().includes('equity') || 
                         acc.type_name.toLowerCase().includes('capital'))
      );

      // Calculate totals
      const totalAssets = assets.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
      const totalLiabilities = liabilities.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
      const totalEquity = equity.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

      res.json({
        assets: {
          accounts: assets,
          total: totalAssets
        },
        liabilities: {
          accounts: liabilities,
          total: totalLiabilities
        },
        equity: {
          accounts: equity,
          total: totalEquity
        },
        totalAssets,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity
      });

    } catch (error) {
      console.error('Error generating balance sheet:', error);
      res.status(500).json({ error: 'Failed to generate balance sheet' });
    }
  });

  // Fix 6: Intercompany Transactions with proper error handling
  app.get('/api/intercompany/transactions', async (req, res) => {
    try {
      const { company_id, companyId } = req.query;
      const targetCompanyId = company_id || companyId;

      let salesQuery = `
        SELECT 
          'sales_order' as transaction_type,
          so.id,
          so.order_number as reference,
          so.order_date as date,
          so.total,
          c.name as company_name,
          cc.name as counterparty_name
        FROM sales_orders so
        JOIN companies c ON so.company_id = c.id
        LEFT JOIN companies cc ON so.customer_company_id = cc.id
        WHERE so.customer_company_id IS NOT NULL
      `;

      let purchaseQuery = `
        SELECT 
          'purchase_order' as transaction_type,
          po.id,
          po.order_number as reference,
          po.order_date as date,
          po.total,
          c.name as company_name,
          cc.name as counterparty_name
        FROM purchase_orders po
        JOIN companies c ON po.company_id = c.id
        LEFT JOIN companies cc ON po.vendor_id = cc.id
        WHERE po.vendor_id IS NOT NULL
      `;

      let params = [];
      if (targetCompanyId && targetCompanyId !== 'all') {
        salesQuery += ' AND so.company_id = $1';
        purchaseQuery += ' AND po.company_id = $1';
        params.push(targetCompanyId);
      }

      const fullQuery = `(${salesQuery}) UNION ALL (${purchaseQuery}) ORDER BY date DESC`;

      const result = await externalPool.query(fullQuery, params);
      res.json(result.rows);

    } catch (error) {
      console.error('Error fetching intercompany transactions:', error);
      res.status(500).json({ error: 'Failed to fetch intercompany transactions' });
    }
  });

  console.log('✅ Node.js compatibility fixes applied successfully');
}

export default applyNodeJSFixes;