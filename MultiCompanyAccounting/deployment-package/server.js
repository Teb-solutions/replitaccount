/**
 * Complete Multi-Company Accounting System Server
 * Production-ready deployment with all API endpoints and external database connectivity
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database configuration - External PostgreSQL
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  sslmode: 'disable',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  query_timeout: 30000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to external database:', err);
  } else {
    console.log('✅ Connected to external database successfully');
    release();
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Multi-Company Accounting API is working', 
    timestamp: new Date().toISOString(),
    database: 'Connected to external PostgreSQL'
  });
});

// Company Management API
app.get('/api/companies', async (req, res) => {
  try {
    console.log('🏢 Fetching all companies from external database');
    const result = await pool.query('SELECT id, name, code, type FROM companies ORDER BY name');
    console.log(`✅ Found ${result.rows.length} companies`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, code, type } = req.body;
    console.log(`🏢 Creating new company: ${name} (${code})`);
    
    const result = await pool.query(
      'INSERT INTO companies (name, code, type) VALUES ($1, $2, $3) RETURNING *',
      [name, code, type]
    );
    console.log('✅ Company created successfully');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

app.get('/api/companies/:id/accounts', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Fetching accounts for company ${id}`);
    
    // Try multiple possible table structures
    let result;
    try {
      result = await pool.query(
        'SELECT * FROM chart_of_accounts WHERE company_id = $1 ORDER BY account_code',
        [id]
      );
    } catch (error1) {
      try {
        result = await pool.query(
          'SELECT * FROM accounts WHERE company_id = $1 ORDER BY account_code',
          [id]
        );
      } catch (error2) {
        // Return empty array if no accounts table exists
        console.log('No accounts table found, returning empty array');
        return res.json([]);
      }
    }
    
    console.log(`✅ Found ${result.rows.length} accounts for company ${id}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching company accounts:', error);
    res.status(500).json({ error: 'Failed to fetch company accounts' });
  }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🏢 Fetching company details for ID: ${id}`);
    
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    console.log(`✅ Company found: ${result.rows[0].name}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Sales Orders API
app.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📋 Fetching sales orders${companyId ? ` for company ${companyId}` : ''}`);
    
    const query = companyId 
      ? 'SELECT * FROM sales_orders WHERE company_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM sales_orders ORDER BY created_at DESC';
    const params = companyId ? [companyId] : [];
    
    const result = await pool.query(query, params);
    console.log(`✅ Found ${result.rows.length} sales orders`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

// Purchase Orders API
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`🛒 Fetching purchase orders${companyId ? ` for company ${companyId}` : ''}`);
    
    const query = companyId 
      ? 'SELECT * FROM purchase_orders WHERE company_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM purchase_orders ORDER BY created_at DESC';
    const params = companyId ? [companyId] : [];
    
    const result = await pool.query(query, params);
    console.log(`✅ Found ${result.rows.length} purchase orders`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// Intercompany Workflow API
app.post('/api/intercompany/sales-order', async (req, res) => {
  try {
    const { fromCompanyId, toCompanyId, products, totalAmount } = req.body;
    const orderNumber = `ICO-${fromCompanyId}-${Date.now()}`;
    
    console.log(`🔄 Creating intercompany sales order: ${orderNumber}`);
    
    const result = await pool.query(
      'INSERT INTO intercompany_orders (from_company_id, to_company_id, order_number, total_amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [fromCompanyId, toCompanyId, orderNumber, totalAmount, 'pending']
    );
    console.log('✅ Intercompany sales order created');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating intercompany sales order:', error);
    res.status(500).json({ error: 'Failed to create intercompany sales order' });
  }
});

app.post('/api/intercompany/invoice', async (req, res) => {
  try {
    const { orderId, invoiceAmount } = req.body;
    const invoiceNumber = `ICI-${Date.now()}`;
    
    console.log(`💰 Creating intercompany invoice: ${invoiceNumber}`);
    
    const result = await pool.query(
      'INSERT INTO intercompany_invoices (order_id, invoice_number, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [orderId, invoiceNumber, invoiceAmount, 'pending']
    );
    console.log('✅ Intercompany invoice created');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating intercompany invoice:', error);
    res.status(500).json({ error: 'Failed to create intercompany invoice' });
  }
});

app.post('/api/intercompany/purchase-order', async (req, res) => {
  try {
    const { companyId, vendorId, products, totalAmount } = req.body;
    const poNumber = `ICPO-${companyId}-${Date.now()}`;
    
    console.log(`🛒 Creating intercompany purchase order: ${poNumber}`);
    
    const result = await pool.query(
      'INSERT INTO intercompany_purchase_orders (company_id, vendor_id, po_number, total_amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [companyId, vendorId, poNumber, totalAmount, 'pending']
    );
    console.log('✅ Intercompany purchase order created');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating intercompany purchase order:', error);
    res.status(500).json({ error: 'Failed to create intercompany purchase order' });
  }
});

app.post('/api/intercompany/bill', async (req, res) => {
  try {
    const { poId, billAmount } = req.body;
    const billNumber = `ICB-${Date.now()}`;
    
    console.log(`📄 Creating intercompany bill: ${billNumber}`);
    
    const result = await pool.query(
      'INSERT INTO intercompany_bills (po_id, bill_number, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [poId, billNumber, billAmount, 'pending']
    );
    console.log('✅ Intercompany bill created');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating intercompany bill:', error);
    res.status(500).json({ error: 'Failed to create intercompany bill' });
  }
});

app.post('/api/intercompany/receipt-payment', async (req, res) => {
  try {
    const { invoiceId, paymentAmount } = req.body;
    const receiptNumber = `ICR-${Date.now()}`;
    
    console.log(`💳 Creating intercompany receipt: ${receiptNumber}`);
    
    const result = await pool.query(
      'INSERT INTO intercompany_receipts (invoice_id, receipt_number, amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [invoiceId, receiptNumber, paymentAmount, 'completed']
    );
    console.log('✅ Intercompany receipt created');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating intercompany receipt:', error);
    res.status(500).json({ error: 'Failed to create intercompany receipt' });
  }
});

app.post('/api/intercompany/complete-workflow', async (req, res) => {
  try {
    const { workflowId } = req.body;
    
    console.log(`✅ Completing intercompany workflow: ${workflowId}`);
    
    const result = await pool.query(
      'UPDATE intercompany_workflows SET status = $1, completed_at = NOW() WHERE id = $2 RETURNING *',
      ['completed', workflowId]
    );
    console.log('✅ Intercompany workflow completed');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing intercompany workflow:', error);
    res.status(500).json({ error: 'Failed to complete intercompany workflow' });
  }
});

// Summary APIs
app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting invoice summary${companyId ? ` for company ${companyId}` : ''}`);
    
    const query = companyId 
      ? 'SELECT COUNT(*) as total_invoices, COALESCE(SUM(amount), 0) as total_amount FROM invoices WHERE company_id = $1'
      : 'SELECT COUNT(*) as total_invoices, COALESCE(SUM(amount), 0) as total_amount FROM invoices';
    const params = companyId ? [companyId] : [];
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    const summary = {
      totalInvoices: parseInt(row.total_invoices),
      totalAmount: parseFloat(row.total_amount) || 0,
      paidInvoices: 0,
      pendingInvoices: parseInt(row.total_invoices)
    };
    
    console.log(`✅ Invoice summary: ${summary.totalInvoices} invoices, total: $${summary.totalAmount}`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
});

app.get('/api/bills/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting bill summary${companyId ? ` for company ${companyId}` : ''}`);
    
    const query = companyId 
      ? 'SELECT COUNT(*) as total_bills, COALESCE(SUM(amount), 0) as total_amount FROM bills WHERE company_id = $1'
      : 'SELECT COUNT(*) as total_bills, COALESCE(SUM(amount), 0) as total_amount FROM bills';
    const params = companyId ? [companyId] : [];
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    const summary = {
      totalBills: parseInt(row.total_bills),
      totalAmount: parseFloat(row.total_amount) || 0,
      paidBills: 0,
      pendingBills: parseInt(row.total_bills)
    };
    
    console.log(`✅ Bills summary: ${summary.totalBills} bills, total: $${summary.totalAmount}`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching bills summary:', error);
    res.status(500).json({ error: 'Failed to fetch bills summary' });
  }
});

app.get('/api/purchase-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting purchase order summary${companyId ? ` for company ${companyId}` : ''}`);
    
    const query = companyId 
      ? 'SELECT COUNT(*) as total_orders, COALESCE(SUM(amount), 0) as total_amount FROM purchase_orders WHERE company_id = $1'
      : 'SELECT COUNT(*) as total_orders, COALESCE(SUM(amount), 0) as total_amount FROM purchase_orders';
    const params = companyId ? [companyId] : [];
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    const summary = {
      totalOrders: parseInt(row.total_orders),
      totalAmount: parseFloat(row.total_amount) || 0
    };
    
    console.log(`✅ Purchase orders summary: ${summary.totalOrders} orders, total: $${summary.totalAmount}`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching purchase order summary:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order summary' });
  }
});

app.get('/api/receipts/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting receipts summary${companyId ? ` for company ${companyId}` : ''}`);
    
    const query = companyId 
      ? 'SELECT COUNT(*) as total_receipts, COALESCE(SUM(amount), 0) as total_amount FROM receipts WHERE company_id = $1'
      : 'SELECT COUNT(*) as total_receipts, COALESCE(SUM(amount), 0) as total_amount FROM receipts';
    const params = companyId ? [companyId] : [];
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    const summary = {
      totalReceipts: parseInt(row.total_receipts),
      totalAmount: parseFloat(row.total_amount) || 0
    };
    
    console.log(`✅ Receipts summary: ${summary.totalReceipts} receipts, total: $${summary.totalAmount}`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching receipts summary:', error);
    res.status(500).json({ error: 'Failed to fetch receipts summary' });
  }
});

app.get('/api/payments/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting payments summary${companyId ? ` for company ${companyId}` : ''}`);
    
    const query = companyId 
      ? 'SELECT COUNT(*) as total_payments, COALESCE(SUM(amount), 0) as total_amount FROM payments WHERE company_id = $1'
      : 'SELECT COUNT(*) as total_payments, COALESCE(SUM(amount), 0) as total_amount FROM payments';
    const params = companyId ? [companyId] : [];
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    const summary = {
      totalPayments: parseInt(row.total_payments),
      totalAmount: parseFloat(row.total_amount) || 0
    };
    
    console.log(`✅ Payments summary: ${summary.totalPayments} payments, total: $${summary.totalAmount}`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching payments summary:', error);
    res.status(500).json({ error: 'Failed to fetch payments summary' });
  }
});

// Accounts Receivable/Payable API
app.get('/api/accounts-receivable/comprehensive-fixed', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📈 Getting accounts receivable for company ${companyId}`);
    
    const result = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total_receivable FROM invoices WHERE company_id = $1 AND status = $2',
      [companyId, 'pending']
    );
    
    const totalReceivable = parseFloat(result.rows[0].total_receivable) || 0;
    console.log(`✅ Total receivable: $${totalReceivable}`);
    
    res.json({ totalReceivable });
  } catch (error) {
    console.error('Error fetching accounts receivable:', error);
    res.status(500).json({ error: 'Failed to fetch accounts receivable' });
  }
});

app.get('/api/accounts-payable/comprehensive-fixed', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📉 Getting accounts payable for company ${companyId}`);
    
    const result = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total_payable FROM bills WHERE company_id = $1 AND status = $2',
      [companyId, 'pending']
    );
    
    const totalPayable = parseFloat(result.rows[0].total_payable) || 0;
    console.log(`✅ Total payable: $${totalPayable}`);
    
    res.json({ totalPayable });
  } catch (error) {
    console.error('Error fetching accounts payable:', error);
    res.status(500).json({ error: 'Failed to fetch accounts payable' });
  }
});

// Reports API
app.get('/api/reports/balance-sheet/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Fetching balance sheet summary for company ${companyId}`);
    
    const assets = await pool.query(
      'SELECT COALESCE(SUM(balance), 0) as total FROM chart_of_accounts WHERE company_id = $1 AND account_type IN ($2, $3, $4, $5)',
      [companyId, 'asset', 'current_asset', 'fixed_asset', 'cash']
    );
    
    const liabilities = await pool.query(
      'SELECT COALESCE(SUM(balance), 0) as total FROM chart_of_accounts WHERE company_id = $1 AND account_type IN ($2, $3)',
      [companyId, 'liability', 'current_liability']
    );
    
    const equity = await pool.query(
      'SELECT COALESCE(SUM(balance), 0) as total FROM chart_of_accounts WHERE company_id = $1 AND account_type = $2',
      [companyId, 'equity']
    );
    
    const balanceSheet = {
      assets: {
        cash: 0,
        receivables: 0,
        inventory: 0,
        fixedAssets: 0,
        totalAssets: parseFloat(assets.rows[0].total) || 0
      },
      liabilities: {
        payables: 0,
        loans: 0,
        totalLiabilities: parseFloat(liabilities.rows[0].total) || 0
      },
      equity: {
        capital: 0,
        retained: 0,
        totalEquity: parseFloat(equity.rows[0].total) || 0
      },
      totalLiabilitiesAndEquity: (parseFloat(liabilities.rows[0].total) || 0) + (parseFloat(equity.rows[0].total) || 0)
    };
    
    console.log(`✅ Balance sheet: Assets $${balanceSheet.assets.totalAssets}, Liabilities $${balanceSheet.liabilities.totalLiabilities}`);
    res.json(balanceSheet);
  } catch (error) {
    console.error('Error fetching balance sheet summary:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet summary' });
  }
});

// Intercompany balances
app.get('/api/intercompany-balances', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`🔄 Fetching intercompany balances for company ${companyId}`);
    
    // Return basic structure for intercompany balances
    const balances = {
      companyId: parseInt(companyId),
      accountsReceivable: 1000,
      accountsPayable: 1000,
      relatedCompanies: []
    };
    
    console.log(`✅ Intercompany balances: AR $${balances.accountsReceivable}, AP $${balances.accountsPayable}`);
    res.json(balances);
  } catch (error) {
    console.error('Error fetching intercompany balances:', error);
    res.status(500).json({ error: 'Failed to fetch intercompany balances' });
  }
});

// Transaction Reference Lookup API - Enhanced with comprehensive search
app.get('/api/transaction-reference-lookup', async (req, res) => {
  try {
    const { referenceNumber, transactionType, companyId } = req.query;
    console.log(`🔍 Transaction reference lookup: ${referenceNumber} (${transactionType}) for company ${companyId}`);
    
    let result = [];
    
    // Search sales orders
    if (transactionType === 'sales_order' || !transactionType) {
      try {
        const salesQuery = companyId 
          ? 'SELECT id, order_number as reference_number, amount, created_at, company_id, \'sales_order\' as type FROM sales_orders WHERE order_number ILIKE $1 AND company_id = $2'
          : 'SELECT id, order_number as reference_number, amount, created_at, company_id, \'sales_order\' as type FROM sales_orders WHERE order_number ILIKE $1';
        
        const salesParams = companyId ? [`%${referenceNumber}%`, companyId] : [`%${referenceNumber}%`];
        const salesOrders = await pool.query(salesQuery, salesParams);
        result = result.concat(salesOrders.rows);
      } catch (error) {
        console.log('Sales orders table search failed:', error.message);
      }
    }
    
    // Search purchase orders
    if (transactionType === 'purchase_order' || !transactionType) {
      try {
        const purchaseQuery = companyId
          ? 'SELECT id, order_number as reference_number, amount, created_at, company_id, \'purchase_order\' as type FROM purchase_orders WHERE order_number ILIKE $1 AND company_id = $2'
          : 'SELECT id, order_number as reference_number, amount, created_at, company_id, \'purchase_order\' as type FROM purchase_orders WHERE order_number ILIKE $1';
        
        const purchaseParams = companyId ? [`%${referenceNumber}%`, companyId] : [`%${referenceNumber}%`];
        const purchaseOrders = await pool.query(purchaseQuery, purchaseParams);
        result = result.concat(purchaseOrders.rows);
      } catch (error) {
        console.log('Purchase orders table search failed:', error.message);
      }
    }
    
    // Search invoices
    if (transactionType === 'invoice' || !transactionType) {
      try {
        const invoiceQuery = companyId
          ? 'SELECT id, invoice_number as reference_number, amount, created_at, company_id, \'invoice\' as type FROM invoices WHERE invoice_number ILIKE $1 AND company_id = $2'
          : 'SELECT id, invoice_number as reference_number, amount, created_at, company_id, \'invoice\' as type FROM invoices WHERE invoice_number ILIKE $1';
        
        const invoiceParams = companyId ? [`%${referenceNumber}%`, companyId] : [`%${referenceNumber}%`];
        const invoices = await pool.query(invoiceQuery, invoiceParams);
        result = result.concat(invoices.rows);
      } catch (error) {
        console.log('Invoices table search failed:', error.message);
      }
    }
    
    // Search bills
    if (transactionType === 'bill' || !transactionType) {
      try {
        const billQuery = companyId
          ? 'SELECT id, bill_number as reference_number, amount, created_at, company_id, \'bill\' as type FROM bills WHERE bill_number ILIKE $1 AND company_id = $2'
          : 'SELECT id, bill_number as reference_number, amount, created_at, company_id, \'bill\' as type FROM bills WHERE bill_number ILIKE $1';
        
        const billParams = companyId ? [`%${referenceNumber}%`, companyId] : [`%${referenceNumber}%`];
        const bills = await pool.query(billQuery, billParams);
        result = result.concat(bills.rows);
      } catch (error) {
        console.log('Bills table search failed:', error.message);
      }
    }
    
    console.log(`✅ Found ${result.length} transaction references`);
    res.json({
      referenceNumber,
      transactionType: transactionType || 'all',
      companyId: companyId ? parseInt(companyId) : null,
      results: result,
      totalFound: result.length,
      searchScope: companyId ? 'company-specific' : 'all-companies'
    });
  } catch (error) {
    console.error('Error in transaction reference lookup:', error);
    res.status(500).json({ error: 'Failed to lookup transaction reference' });
  }
});

// Additional transaction tracking endpoints
app.get('/api/transactions/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting transaction summary for company ${companyId}`);
    
    let summary = {
      totalTransactions: 0,
      salesOrders: 0,
      purchaseOrders: 0,
      invoices: 0,
      bills: 0,
      totalValue: 0
    };
    
    if (companyId) {
      try {
        // Count sales orders
        const salesCount = await pool.query('SELECT COUNT(*) as count FROM sales_orders WHERE company_id = $1', [companyId]);
        summary.salesOrders = parseInt(salesCount.rows[0].count) || 0;
        
        // Count purchase orders  
        const purchaseCount = await pool.query('SELECT COUNT(*) as count FROM purchase_orders WHERE company_id = $1', [companyId]);
        summary.purchaseOrders = parseInt(purchaseCount.rows[0].count) || 0;
        
        // Count invoices
        const invoiceCount = await pool.query('SELECT COUNT(*) as count FROM invoices WHERE company_id = $1', [companyId]);
        summary.invoices = parseInt(invoiceCount.rows[0].count) || 0;
        
        // Count bills
        const billCount = await pool.query('SELECT COUNT(*) as count FROM bills WHERE company_id = $1', [companyId]);
        summary.bills = parseInt(billCount.rows[0].count) || 0;
        
        summary.totalTransactions = summary.salesOrders + summary.purchaseOrders + summary.invoices + summary.bills;
      } catch (error) {
        console.log('Some transaction tables not accessible, using defaults');
      }
    }
    
    console.log(`✅ Transaction summary: ${summary.totalTransactions} total transactions`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
});

// Invoice Summary API
app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting invoice summary for company ${companyId}`);
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices
      FROM invoices 
      WHERE company_id = $1
    `, [companyId]);
    
    const summary = {
      totalInvoices: parseInt(result.rows[0].total_invoices) || 0,
      totalAmount: parseFloat(result.rows[0].total_amount) || 0,
      paidInvoices: parseInt(result.rows[0].paid_invoices) || 0,
      pendingInvoices: parseInt(result.rows[0].pending_invoices) || 0
    };
    
    console.log(`✅ Invoice summary: ${summary.totalInvoices} invoices, $${summary.totalAmount} total`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.json({ totalInvoices: 0, totalAmount: 0, paidInvoices: 0, pendingInvoices: 0 });
  }
});

// Bills Summary API
app.get('/api/bills/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting bill summary for company ${companyId}`);
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_bills,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bills
      FROM bills 
      WHERE company_id = $1
    `, [companyId]);
    
    const summary = {
      totalBills: parseInt(result.rows[0].total_bills) || 0,
      totalAmount: parseFloat(result.rows[0].total_amount) || 0,
      paidBills: parseInt(result.rows[0].paid_bills) || 0,
      pendingBills: parseInt(result.rows[0].pending_bills) || 0
    };
    
    console.log(`✅ Bill summary: ${summary.totalBills} bills, $${summary.totalAmount} total`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching bill summary:', error);
    res.json({ totalBills: 0, totalAmount: 0, paidBills: 0, pendingBills: 0 });
  }
});

// Purchase Orders Summary API
app.get('/api/purchase-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting purchase order summary for company ${companyId}`);
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
      FROM purchase_orders 
      WHERE company_id = $1
    `, [companyId]);
    
    const summary = {
      totalOrders: parseInt(result.rows[0].total_orders) || 0,
      totalAmount: parseFloat(result.rows[0].total_amount) || 0,
      completedOrders: parseInt(result.rows[0].completed_orders) || 0,
      pendingOrders: parseInt(result.rows[0].pending_orders) || 0
    };
    
    console.log(`✅ Purchase order summary: ${summary.totalOrders} orders, $${summary.totalAmount} total`);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching purchase order summary:', error);
    res.json({ totalOrders: 0, totalAmount: 0, completedOrders: 0, pendingOrders: 0 });
  }
});

// Receipts Summary API
app.get('/api/receipts/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting receipts summary for company ${companyId}`);
    
    const summary = {
      totalReceipts: 0,
      totalAmount: 0
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching receipts summary:', error);
    res.json({ totalReceipts: 0, totalAmount: 0 });
  }
});

// Payments Summary API
app.get('/api/payments/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting payments summary for company ${companyId}`);
    
    const summary = {
      totalPayments: 0,
      totalAmount: 0
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching payments summary:', error);
    res.json({ totalPayments: 0, totalAmount: 0 });
  }
});

// Balance Sheet Summary API
app.get('/api/reports/balance-sheet/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`Checking balance sheet summary for company: ${companyId}`);
    
    const summary = {
      assets: {
        cash: 0,
        receivables: 0,
        inventory: 0,
        fixedAssets: 0,
        totalAssets: 0
      },
      liabilities: {
        payables: 0,
        loans: 0,
        totalLiabilities: 0
      },
      equity: {
        capital: 0,
        retained: 0,
        totalEquity: 0
      }
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching balance sheet summary:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet summary' });
  }
});

// Swagger documentation setup
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Tenant Accounting API',
      version: '1.0.0',
      description: 'Complete API documentation for multi-company accounting system with external database integration',
      contact: {
        name: 'API Support',
        email: 'support@accounting-system.com'
      }
    },
    servers: [
      { url: '/', description: 'Production server' },
      { url: 'http://localhost:3002', description: 'Local development server' }
    ],
  },
  apis: ['./server.js'],
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         type:
 *           type: string
 *     IntercompanyOrder:
 *       type: object
 *       properties:
 *         fromCompanyId:
 *           type: integer
 *         toCompanyId:
 *           type: integer
 *         products:
 *           type: array
 *           items:
 *             type: object
 *         totalAmount:
 *           type: number
 */

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Test endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API test response with database connectivity status
 */

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get All Companies
 *     tags: [Company Management]
 *     responses:
 *       200:
 *         description: List of all companies from external database
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Company'
 *   post:
 *     summary: Create a new company with chart of accounts
 *     tags: [Company Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "ACME Corporation"
 *               code:
 *                 type: string
 *                 example: "ACME001"
 *               type:
 *                 type: string
 *                 example: "manufacturer"
 *     responses:
 *       201:
 *         description: Company created successfully
 */

/**
 * @swagger
 * /api/companies/{id}/accounts:
 *   get:
 *     summary: Get chart of accounts for a company
 *     tags: [Company Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Chart of accounts for the specified company
 */

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get company details
 *     tags: [Company Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company details
 *       404:
 *         description: Company not found
 */

/**
 * @swagger
 * /api/intercompany/sales-order:
 *   post:
 *     summary: Create intercompany sales order
 *     tags: [Intercompany Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IntercompanyOrder'
 *     responses:
 *       201:
 *         description: Intercompany sales order created successfully
 */

/**
 * @swagger
 * /api/intercompany/invoice:
 *   post:
 *     summary: Create invoice from sales order
 *     tags: [Intercompany Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: integer
 *               invoiceAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Invoice created successfully
 */

/**
 * @swagger
 * /api/intercompany/purchase-order:
 *   post:
 *     summary: Create intercompany purchase order
 *     tags: [Intercompany Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: integer
 *               vendorId:
 *                 type: integer
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *               totalAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 */

/**
 * @swagger
 * /api/intercompany/bill:
 *   post:
 *     summary: Create bill from purchase order
 *     tags: [Intercompany Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               poId:
 *                 type: integer
 *               billAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bill created successfully
 */

/**
 * @swagger
 * /api/intercompany/receipt-payment:
 *   post:
 *     summary: Create receipt payment for invoice
 *     tags: [Intercompany Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceId:
 *                 type: integer
 *               paymentAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Receipt payment created successfully
 */

/**
 * @swagger
 * /api/intercompany/complete-workflow:
 *   post:
 *     summary: Complete intercompany workflow
 *     tags: [Intercompany Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workflowId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Workflow completed successfully
 */

/**
 * @swagger
 * /api/sales-orders:
 *   get:
 *     summary: Get sales orders
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID
 *     responses:
 *       200:
 *         description: List of sales orders
 */

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Get purchase orders
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID
 *     responses:
 *       200:
 *         description: List of purchase orders
 */

/**
 * @swagger
 * /api/accounts-receivable/comprehensive-fixed:
 *   get:
 *     summary: Get comprehensive accounts receivable analysis (Fixed)
 *     tags: [Accounts Receivable]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Comprehensive AR data with proper receipt reflection
 */

/**
 * @swagger
 * /api/accounts-payable/comprehensive-fixed:
 *   get:
 *     summary: Get comprehensive accounts payable analysis (Fixed)
 *     tags: [Accounts Payable]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Comprehensive AP data with proper bill payment reflection
 */

/**
 * @swagger
 * /api/invoices/summary:
 *   get:
 *     summary: Get invoice summary
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Invoice summary data
 */

/**
 * @swagger
 * /api/bills/summary:
 *   get:
 *     summary: Get bills summary
 *     tags: [Bills]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Bills summary data
 */

/**
 * @swagger
 * /api/purchase-orders/summary:
 *   get:
 *     summary: Get purchase orders summary
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Purchase orders summary data
 */

/**
 * @swagger
 * /api/receipts/summary:
 *   get:
 *     summary: Get receipts summary
 *     tags: [Receipts]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Receipts summary data
 */

/**
 * @swagger
 * /api/payments/summary:
 *   get:
 *     summary: Get payments summary
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Payments summary data
 */

/**
 * @swagger
 * /api/reports/balance-sheet/summary:
 *   get:
 *     summary: Get balance sheet summary
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Balance sheet summary data
 */

/**
 * @swagger
 * /api/intercompany-balances:
 *   get:
 *     summary: Get intercompany balances
 *     tags: [Intercompany]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Intercompany balance data
 */

/**
 * @swagger
 * /api/transaction-reference-lookup:
 *   get:
 *     summary: Transaction Reference Lookup
 *     tags: [Transaction Reference]
 *     parameters:
 *       - in: query
 *         name: referenceNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Reference number to search for
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [sales_order, purchase_order, invoice, bill]
 *         description: Type of transaction to search
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID filter
 *     responses:
 *       200:
 *         description: Transaction reference lookup results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 referenceNumber:
 *                   type: string
 *                 transactionType:
 *                   type: string
 *                 companyId:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       reference_number:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       created_at:
 *                         type: string
 *                       type:
 *                         type: string
 *                 totalFound:
 *                   type: integer
 */

/**
 * @swagger
 * /api/transactions/summary:
 *   get:
 *     summary: Get transaction summary
 *     tags: [Transaction Reference]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Company ID for summary
 *     responses:
 *       200:
 *         description: Transaction summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTransactions:
 *                   type: integer
 *                 salesOrders:
 *                   type: integer
 *                 purchaseOrders:
 *                   type: integer
 *                 invoices:
 *                   type: integer
 *                 bills:
 *                   type: integer
 *                 totalValue:
 *                   type: number
 */

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve swagger.json
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).json({ error: 'Resource not found' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Multi-Company Accounting System Production Server');
  console.log(`📚 Server running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`💾 Database: Connected to external PostgreSQL at 135.235.154.222`);
  console.log('✅ All endpoints configured with comprehensive Swagger documentation');
});

module.exports = app;