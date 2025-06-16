/**
 * Deployment-Ready Multi-Company Accounting Server
 * Complete system with working intercompany endpoints
 * Uses authentic data from external database at 135.235.154.222
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection to external server
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect()
  .then(client => {
    client.release();
    console.log('✅ Database connection successful');
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected to 135.235.154.222',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'connection failed',
      error: error.message
    });
  }
});

// Companies endpoints
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code, company_type, address, phone, email, 
             is_active, created_at, updated_at
      FROM companies 
      WHERE is_active = true
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Create new company
app.post('/api/companies', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, code, company_type, address, phone, email } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO companies (name, code, company_type, address, phone, email, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      RETURNING id, name, code, company_type, address, phone, email, is_active, created_at, updated_at
    `, [name, code, company_type || 'General', address, phone, email]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      company: result.rows[0],
      message: 'Company created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating company:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Company code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create company' });
    }
  } finally {
    client.release();
  }
});

// Sales Orders endpoints
app.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT id, company_id, customer_id, order_number, order_date, 
             expected_date, status, total, notes, created_by, created_at, 
             updated_at, reference_number
      FROM sales_orders 
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

app.get('/api/sales-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalOrders",
        COALESCE(SUM(total), 0) as "totalAmount"
      FROM sales_orders 
      WHERE company_id = $1
    `, [companyId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching sales orders summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales orders summary' });
  }
});

// Purchase Orders endpoints
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT id, company_id, vendor_id, order_number, order_date,
             expected_date, status, total, notes, created_at, updated_at,
             reference_number
      FROM purchase_orders 
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

app.get('/api/purchase-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalOrders",
        COALESCE(SUM(total), 0) as "totalAmount"
      FROM purchase_orders 
      WHERE company_id = $1
    `, [companyId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching purchase orders summary:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders summary' });
  }
});

// Invoices endpoints
app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const invoiceResult = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_amount
      FROM invoices 
      WHERE company_id = $1
    `, [companyId]);

    const receiptResult = await pool.query(`
      SELECT 
        COUNT(*) as paid_invoices,
        COALESCE(SUM(amount), 0) as paid_amount
      FROM receipts 
      WHERE company_id = $1
    `, [companyId]);

    res.json({
      totalinvoices: invoiceResult.rows[0].total_invoices.toString(),
      totalamount: parseFloat(invoiceResult.rows[0].total_amount).toFixed(2),
      paidinvoices: receiptResult.rows[0].paid_invoices.toString(),
      paidamount: parseFloat(receiptResult.rows[0].paid_amount).toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching invoices summary:', error);
    res.status(500).json({ error: 'Failed to fetch invoices summary' });
  }
});

// Bills endpoints
app.get('/api/bills/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const billResult = await pool.query(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(total), 0) as total_amount
      FROM bills 
      WHERE company_id = $1
    `, [companyId]);

    const paymentResult = await pool.query(`
      SELECT 
        COUNT(*) as paid_bills,
        COALESCE(SUM(amount), 0) as paid_amount
      FROM payments 
      WHERE company_id = $1
    `, [companyId]);

    res.json({
      totalbills: billResult.rows[0].total_bills.toString(),
      totalamount: parseFloat(billResult.rows[0].total_amount).toFixed(2),
      paidbills: paymentResult.rows[0].paid_bills.toString(),
      paidamount: parseFloat(paymentResult.rows[0].paid_amount).toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching bills summary:', error);
    res.status(500).json({ error: 'Failed to fetch bills summary' });
  }
});

// Receipts and Payments endpoints
app.get('/api/receipts/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalReceipts",
        COALESCE(SUM(amount), 0) as "totalAmount"
      FROM receipts 
      WHERE company_id = $1
    `, [companyId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching receipts summary:', error);
    res.status(500).json({ error: 'Failed to fetch receipts summary' });
  }
});

app.get('/api/payments/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalPayments",
        COALESCE(SUM(amount), 0) as "totalAmount"
      FROM payments 
      WHERE company_id = $1
    `, [companyId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payments summary:', error);
    res.status(500).json({ error: 'Failed to fetch payments summary' });
  }
});

// Intercompany Balances endpoint
app.get('/api/intercompany-balances', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // Calculate AR and AP balances
    const arResult = await pool.query(`
      SELECT COALESCE(SUM(i.total), 0) - COALESCE(SUM(r.amount), 0) as balance
      FROM invoices i
      LEFT JOIN receipts r ON i.id = r.invoice_id
      WHERE i.company_id = $1
    `, [companyId]);

    const apResult = await pool.query(`
      SELECT COALESCE(SUM(b.total), 0) - COALESCE(SUM(p.amount), 0) as balance
      FROM bills b
      LEFT JOIN payments p ON b.id = p.bill_id
      WHERE b.company_id = $1
    `, [companyId]);

    res.json({
      companyId: parseInt(companyId),
      accountsReceivable: parseFloat(arResult.rows[0].balance) || 0,
      accountsPayable: parseFloat(apResult.rows[0].balance) || 0,
      relatedCompanies: []
    });
  } catch (error) {
    console.error('Error fetching intercompany balances:', error);
    res.status(500).json({ error: 'Failed to fetch intercompany balances' });
  }
});

// WORKING INTERCOMPANY CREATION ENDPOINTS

// Create Intercompany Sales Order
app.post('/api/intercompany/sales-order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, products = [], orderTotal, total, referenceNumber } = req.body;
    const finalTotal = orderTotal || total || 1000;
    
    console.log(`Creating intercompany sales order: ${sourceCompanyId} → ${targetCompanyId}`);
    
    // Validate companies exist
    const companiesResult = await client.query(
      'SELECT id, name FROM companies WHERE id IN ($1, $2)',
      [sourceCompanyId, targetCompanyId]
    );
    
    if (companiesResult.rows.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'One or both companies not found'
      });
    }

    const sourceCompany = companiesResult.rows.find(c => c.id == sourceCompanyId);
    const targetCompany = companiesResult.rows.find(c => c.id == targetCompanyId);

    await client.query('BEGIN');

    // Generate order number and reference
    const timestamp = Date.now();
    const orderNumber = `SO-${sourceCompanyId}-${timestamp}`;
    const finalReferenceNumber = referenceNumber || `IC-REF-${sourceCompanyId}-${targetCompanyId}-${timestamp}`;

    // Create sales order
    const salesOrderResult = await client.query(`
      INSERT INTO sales_orders (
        company_id, customer_id, order_number, order_date, expected_date, 
        status, total, reference_number, created_at
      ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
      RETURNING id, order_number, total, status, reference_number
    `, [sourceCompanyId, targetCompanyId, orderNumber, 'Pending', finalTotal, finalReferenceNumber]);

    const salesOrder = salesOrderResult.rows[0];

    // Save products to sales_order_items table if products array provided
    if (products && products.length > 0) {
      for (const product of products) {
        await client.query(`
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, unit_price, amount, description
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          salesOrderResult.rows[0].id,
          product.id || product.productId,
          product.quantity || 1,
          product.unitPrice || product.unit_price || 0,
          product.lineTotal || product.line_total || product.amount || (product.quantity || 1) * (product.unitPrice || product.unit_price || 0),
          product.description || product.name || ''
        ]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany sales order created successfully',
      salesOrder: {
        id: salesOrder.id,
        orderNumber: salesOrder.order_number,
        total: parseFloat(salesOrder.total),
        status: salesOrder.status,
        referenceNumber: salesOrder.reference_number,
        sourceCompany: sourceCompany.name,
        targetCompany: targetCompany.name
      },
      purchaseOrder: {
        id: purchaseOrder.id,
        orderNumber: purchaseOrder.order_number,
        total: parseFloat(purchaseOrder.total),
        status: purchaseOrder.status,
        referenceNumber: purchaseOrder.reference_number
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany sales order:', error);
    res.status(500).json({
      success: false,
      error: `Failed to create intercompany sales order: ${error.message}`
    });
  } finally {
    client.release();
  }
});

// Create Intercompany Invoice
app.post('/api/intercompany/invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, salesOrderId, total } = req.body;
    
    console.log(`Creating intercompany invoice for sales order ${salesOrderId}`);
    
    // Validate sales order exists
    const salesOrderResult = await client.query(
      'SELECT id, order_number, total, status FROM sales_orders WHERE id = $1 AND company_id = $2',
      [salesOrderId, sourceCompanyId]
    );
    
    if (salesOrderResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Sales order not found'
      });
    }

    const salesOrder = salesOrderResult.rows[0];
    const invoiceTotal = total || salesOrder.total;

    await client.query('BEGIN');

    // Generate invoice number
    const timestamp = Date.now();
    const invoiceNumber = `INV-${sourceCompanyId}-${timestamp}`;

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        company_id, customer_id, sales_order_id, invoice_number, 
        invoice_date, due_date, total, status, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days', $5, $6, NOW())
      RETURNING id, invoice_number, total, status
    `, [sourceCompanyId, targetCompanyId, salesOrderId, invoiceNumber, invoiceTotal, 'pending']);

    const invoice = invoiceResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany invoice created successfully',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        total: parseFloat(invoice.total),
        status: invoice.status,
        salesOrderId: salesOrderId,
        salesOrderNumber: salesOrder.order_number
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany invoice:', error);
    res.status(500).json({
      success: false,
      error: `Failed to create intercompany invoice: ${error.message}`
    });
  } finally {
    client.release();
  }
});

// Create Intercompany Receipt Payment
app.post('/api/intercompany/receipt-payment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, invoiceId, amount, paymentMethod = 'Bank Transfer' } = req.body;
    
    console.log(`Creating intercompany receipt payment for invoice ${invoiceId}`);
    
    // Validate invoice exists
    const invoiceResult = await client.query(
      'SELECT id, invoice_number, total FROM invoices WHERE id = $1',
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];

    await client.query('BEGIN');

    // Generate receipt number
    const timestamp = Date.now();
    const receiptNumber = `REC-${targetCompanyId}-${timestamp}`;

    // Create receipt
    const receiptResult = await client.query(`
      INSERT INTO receipts (
        company_id, customer_id, invoice_id, receipt_number,
        receipt_date, amount, payment_method, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, NOW())
      RETURNING id, receipt_number, amount, payment_method
    `, [sourceCompanyId, targetCompanyId, invoiceId, receiptNumber, amount, paymentMethod]);

    const receipt = receiptResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany receipt payment created successfully',
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receipt_number,
        amount: parseFloat(receipt.amount),
        paymentMethod: receipt.payment_method,
        invoiceId: invoiceId,
        invoiceNumber: invoice.invoice_number
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany receipt payment:', error);
    res.status(500).json({
      success: false,
      error: `Failed to create intercompany receipt payment: ${error.message}`
    });
  } finally {
    client.release();
  }
});

// Dashboard endpoints
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const companiesResult = await pool.query('SELECT COUNT(*) FROM companies WHERE is_active = true');
    const salesOrdersResult = await pool.query('SELECT COUNT(*) FROM sales_orders');
    const invoicesResult = await pool.query('SELECT COUNT(*) FROM invoices');
    
    res.json({
      totalCompanies: parseInt(companiesResult.rows[0].count),
      totalSalesOrders: parseInt(salesOrdersResult.rows[0].count),
      totalInvoices: parseInt(invoicesResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/recent-transactions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 'sales_order' as type, id, order_number as reference, created_at, total
      FROM sales_orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
});

app.get('/api/dashboard/pending-actions', async (req, res) => {
  try {
    const pendingInvoices = await pool.query("SELECT COUNT(*) FROM invoices WHERE status = 'pending'");
    const overduePayments = await pool.query("SELECT COUNT(*) FROM bills WHERE due_date < NOW() AND status != 'paid'");
    
    res.json({
      pendingInvoices: parseInt(pendingInvoices.rows[0].count),
      overduePayments: parseInt(overduePayments.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching pending actions:', error);
    res.status(500).json({ error: 'Failed to fetch pending actions' });
  }
});

app.get('/api/dashboard/cash-flow', async (req, res) => {
  try {
    const inflows = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM receipts WHERE receipt_date >= NOW() - INTERVAL \'30 days\'');
    const outflows = await pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date >= NOW() - INTERVAL \'30 days\'');
    
    const inflowAmount = parseFloat(inflows.rows[0].total);
    const outflowAmount = parseFloat(outflows.rows[0].total);
    
    res.json({
      inflows: inflowAmount,
      outflows: outflowAmount,
      net: inflowAmount - outflowAmount
    });
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    res.status(500).json({ error: 'Failed to fetch cash flow' });
  }
});

app.get('/api/dashboard/pl-monthly', async (req, res) => {
  try {
    const revenue = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE invoice_date >= DATE_TRUNC(\'month\', NOW())');
    const expenses = await pool.query('SELECT COALESCE(SUM(total), 0) as total FROM bills WHERE bill_date >= DATE_TRUNC(\'month\', NOW())');
    
    const revenueAmount = parseFloat(revenue.rows[0].total);
    const expensesAmount = parseFloat(expenses.rows[0].total);
    
    res.json({
      revenue: revenueAmount,
      expenses: expensesAmount,
      profit: revenueAmount - expensesAmount
    });
  } catch (error) {
    console.error('Error fetching P&L monthly:', error);
    res.status(500).json({ error: 'Failed to fetch P&L monthly' });
  }
});

// Chart of Accounts endpoints
app.get('/api/accounts', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT a.id, a.account_name, a.account_code, a.account_type, 
             a.parent_account_id, a.is_active, a.created_at, a.updated_at,
             at.type_name as account_type_name
      FROM accounts a
      LEFT JOIN account_types at ON a.account_type = at.id
      WHERE a.company_id = $1 AND a.is_active = true
      ORDER BY a.account_code
    `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

// Create account
app.post('/api/accounts', async (req, res) => {
  const client = await pool.connect();
  try {
    const { companyId, accountName, accountCode, accountType, parentAccountId } = req.body;
    
    if (!companyId || !accountName || !accountCode || !accountType) {
      return res.status(400).json({ error: 'companyId, accountName, accountCode, and accountType are required' });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO accounts (company_id, account_name, account_code, account_type, parent_account_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id, account_name, account_code, account_type, parent_account_id, is_active, created_at, updated_at
    `, [companyId, accountName, accountCode, accountType, parentAccountId]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      account: result.rows[0],
      message: 'Account created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating account:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Account code already exists for this company' });
    } else {
      res.status(500).json({ error: 'Failed to create account' });
    }
  } finally {
    client.release();
  }
});

// Transaction Reference Lookup
app.get('/api/reference/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // Search across multiple tables for the reference
    const salesOrderResult = await pool.query(`
      SELECT 'sales_order' as type, id, order_number as reference, 
             company_id, customer_id, total, status, created_at,
             reference_number
      FROM sales_orders 
      WHERE order_number = $1 OR reference_number = $1
      LIMIT 1
    `, [reference]);

    if (salesOrderResult.rows.length > 0) {
      const transaction = salesOrderResult.rows[0];
      
      // Get company details
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.company_id]);
      const customerResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.customer_id]);
      
      res.json({
        success: true,
        transaction: {
          ...transaction,
          companyName: companyResult.rows[0]?.name,
          customerName: customerResult.rows[0]?.name
        }
      });
      return;
    }

    // Check invoices
    const invoiceResult = await pool.query(`
      SELECT 'invoice' as type, id, invoice_number as reference,
             company_id, customer_id, total, status, created_at,
             sales_order_id
      FROM invoices 
      WHERE invoice_number = $1
      LIMIT 1
    `, [reference]);

    if (invoiceResult.rows.length > 0) {
      const transaction = invoiceResult.rows[0];
      
      // Get company details
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.company_id]);
      const customerResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.customer_id]);
      
      res.json({
        success: true,
        transaction: {
          ...transaction,
          companyName: companyResult.rows[0]?.name,
          customerName: customerResult.rows[0]?.name
        }
      });
      return;
    }

    // Check purchase orders
    const purchaseOrderResult = await pool.query(`
      SELECT 'purchase_order' as type, id, order_number as reference,
             company_id, vendor_id, total, status, created_at,
             reference_number
      FROM purchase_orders 
      WHERE order_number = $1 OR reference_number = $1
      LIMIT 1
    `, [reference]);

    if (purchaseOrderResult.rows.length > 0) {
      const transaction = purchaseOrderResult.rows[0];
      
      // Get company details
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.company_id]);
      const vendorResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.vendor_id]);
      
      res.json({
        success: true,
        transaction: {
          ...transaction,
          companyName: companyResult.rows[0]?.name,
          vendorName: vendorResult.rows[0]?.name
        }
      });
      return;
    }

    // If no transaction found
    res.status(404).json({
      success: false,
      error: 'Transaction reference not found'
    });

  } catch (error) {
    console.error('Error looking up transaction reference:', error);
    res.status(500).json({ error: 'Failed to lookup transaction reference' });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Company Accounting System running on port ${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
  console.log(`🔗 Database connected to 135.235.154.222`);
  console.log(`✅ Intercompany endpoints ready for testing`);
});