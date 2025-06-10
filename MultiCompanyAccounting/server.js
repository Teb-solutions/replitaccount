/**
 * Pure Node.js Entry Point for Multi-Company Accounting System
 * This file runs the backend server using only Node.js without TypeScript dependencies
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Serve static files from client/dist if it exists
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Database configuration
const { Pool } = require('pg');

const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Test database connection
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Connected to external database successfully');
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

// API Routes

// GET /api/companies - Get all companies
app.get('/api/companies', async (req, res) => {
  try {
    console.log('🔍 API: /api/companies requested');
    
    const result = await pool.query(`
      SELECT id, name, code, company_type, address, phone, email, 
             tax_id, industry, base_currency, tenant_id, created_at, updated_at
      FROM companies 
      ORDER BY name
    `);
    
    console.log(`✅ Found ${result.rows.length} companies in database`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/companies/:id/accounts - Get chart of accounts for a company
app.get('/api/companies/:id/accounts', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    
    // Verify company exists
    const companyCheck = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        error: `Company with ID ${companyId} not found`
      });
    }
    
    // Get chart of accounts
    const accountsResult = await pool.query(`
      SELECT id, code, name, type, category, balance, is_active, created_at, updated_at
      FROM accounts 
      WHERE company_id = $1 
      ORDER BY code
    `, [companyId]);
    
    console.log(`📊 Retrieved ${accountsResult.rows.length} accounts for company ${companyId}`);
    
    res.json({
      company_id: companyId,
      company_name: companyCheck.rows[0].name,
      accounts: accountsResult.rows,
      total_accounts: accountsResult.rows.length
    });
    
  } catch (error) {
    console.error('❌ Error retrieving company accounts:', error);
    res.status(500).json({
      error: 'Failed to retrieve company accounts',
      details: error.message
    });
  }
});

// GET /api/intercompany-sales-orders - Get intercompany sales orders
app.get('/api/intercompany-sales-orders', async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    
    if (!companyId) {
      return res.status(400).json({ error: 'Missing company ID' });
    }
    
    console.log(`Fetching intercompany sales orders for company ID: ${companyId}`);
    
    const result = await pool.query(`
      SELECT id, order_number as "orderNumber", customer_name as customer,
             order_date as "orderDate", delivery_date as "deliveryDate",
             total, status, true as "isIntercompany"
      FROM sales_orders 
      WHERE company_id = $1 
      ORDER BY order_date DESC
    `, [companyId]);
    
    console.log(`Found ${result.rows.length} actual sales orders in database`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching intercompany sales orders:', error);
    res.status(500).json({ error: 'Failed to fetch intercompany sales orders' });
  }
});

// GET /api/intercompany-purchase-orders - Get intercompany purchase orders
app.get('/api/intercompany-purchase-orders', async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    
    if (!companyId) {
      return res.status(400).json({ error: 'Missing company ID' });
    }
    
    console.log(`Fetching intercompany purchase orders for company ID: ${companyId}`);
    
    const result = await pool.query(`
      SELECT id, order_number as "orderNumber", vendor_name as vendor,
             order_date as "orderDate", delivery_date as "deliveryDate",
             total, status, true as "isIntercompany"
      FROM purchase_orders 
      WHERE company_id = $1 
      ORDER BY order_date DESC
    `, [companyId]);
    
    console.log(`Found ${result.rows.length} actual purchase orders in database`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching intercompany purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch intercompany purchase orders' });
  }
});

// GET /api/bill-payments - Get bill payments for a company
app.get('/api/bill-payments', async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    console.log(`💳 Getting bill payments for company ${companyId}`);
    
    const result = await pool.query(`
      SELECT bp.*, c.name as vendor_name
      FROM bill_payments bp
      LEFT JOIN companies c ON bp.vendor_id = c.id
      WHERE bp.company_id = $1
      ORDER BY bp.payment_date DESC
    `, [companyId]);
    
    const totalAmount = result.rows.reduce((sum, payment) => 
      sum + parseFloat(payment.amount || 0), 0);
    
    console.log(`✅ Found ${result.rows.length} bill payments totaling $${totalAmount.toFixed(2)}`);
    
    res.json({
      billPayments: result.rows,
      summary: {
        totalPayments: result.rows.length,
        totalAmount: totalAmount
      }
    });
    
  } catch (error) {
    console.error('Error fetching bill payments:', error);
    res.status(500).json({ error: 'Failed to fetch bill payments' });
  }
});

// GET /api/receipts-direct - Get receipts for a company
app.get('/api/receipts-direct', async (req, res) => {
  try {
    const companyId = parseInt(req.query.companyId);
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    console.log(`💰 Getting receipts directly from database for company ${companyId}`);
    
    const result = await pool.query(`
      SELECT * FROM receipts 
      WHERE company_id = $1 
      ORDER BY receipt_date DESC
    `, [companyId]);
    
    console.log(`✅ Found ${result.rows.length} receipts for company ${companyId}`);
    
    res.json({
      receipts: result.rows,
      summary: {
        totalReceipts: result.rows.length,
        totalAmount: result.rows.reduce((sum, receipt) => 
          sum + parseFloat(receipt.amount || 0), 0)
      }
    });
    
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// POST /api/intercompany/receipt-payment - Create intercompany receipt payment
app.post('/api/intercompany/receipt-payment', async (req, res) => {
  try {
    const { invoiceId, companyId, amount, paymentMethod = 'Bank Transfer', referenceNumber } = req.body;
    
    if (!invoiceId || !companyId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`💳 Creating intercompany receipt payment for invoice ${invoiceId} by company ${companyId}`);
    
    // Get invoice details
    const invoiceResult = await pool.query(`
      SELECT i.*, so.customer_id, so.id as sales_order_id, so.company_id as selling_company_id
      FROM invoices i
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      WHERE i.id = $1
    `, [invoiceId]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    const timestamp = Date.now();
    
    // Generate unique reference number if not provided
    const finalReferenceNumber = referenceNumber || `RCPT-REF-${companyId}-${invoice.company_id}-${timestamp}`;
    
    // Create receipt
    const receiptResult = await pool.query(`
      INSERT INTO receipts (
        company_id, sales_order_id, customer_id, receipt_number,
        receipt_date, amount, payment_method, reference, invoice_id,
        debit_account_id, credit_account_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      companyId, invoice.sales_order_id, invoice.customer_id,
      `REC-${companyId}-${timestamp}`, new Date(), amount, paymentMethod,
      finalReferenceNumber, invoiceId, 1000, 2000
    ]);
    
    const receipt = receiptResult.rows[0];
    
    // Find related bill
    const billResult = await pool.query(`
      SELECT * FROM bills 
      WHERE sales_order_id = $1 AND company_id = $2
      LIMIT 1
    `, [invoice.sales_order_id, companyId]);
    
    let billData = null;
    if (billResult.rows.length > 0) {
      billData = billResult.rows[0];
    }
    
    const response = {
      receiptId: receipt.id,
      receiptNumber: receipt.receipt_number,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      salesOrderId: invoice.sales_order_id,
      amount: parseFloat(amount),
      status: 'completed',
      referenceNumber: finalReferenceNumber,
      sourceCompany: {
        id: companyId,
        receiptId: receipt.id,
        receiptNumber: receipt.receipt_number,
        receiptReference: finalReferenceNumber
      },
      targetCompany: {
        id: companyId,
        name: 'Target Company',
        billPayment: billData ? {
          billId: billData.id,
          billNumber: billData.bill_number,
          billReference: billData.reference,
          amount: parseFloat(amount),
          status: 'paid'
        } : null
      },
      intercompanyTransaction: {
        salesOrderId: invoice.sales_order_id,
        payingCompany: companyId,
        receivingCompany: companyId,
        receiptDetails: {
          id: receipt.id,
          number: receipt.receipt_number,
          reference: finalReferenceNumber
        },
        invoiceDetails: {
          id: invoice.id,
          number: invoice.invoice_number,
          reference: invoice.reference
        },
        billDetails: billData ? {
          id: billData.id,
          number: billData.bill_number,
          reference: billData.reference
        } : null,
        amount: parseFloat(amount)
      },
      tracking: {
        receiptId: receipt.id,
        receiptNumber: receipt.receipt_number,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        salesOrderId: invoice.sales_order_id,
        billId: billData ? billData.id : null,
        billNumber: billData ? billData.bill_number : null,
        reference: finalReferenceNumber,
        companyId: companyId,
        targetCompanyId: companyId
      }
    };
    
    console.log(`✅ Created receipt payment successfully`);
    res.status(201).json(response);
    
  } catch (error) {
    console.error('Error creating intercompany receipt payment:', error);
    res.status(500).json({ error: 'Failed to create receipt payment' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Multi-Company Accounting API'
  });
});

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not built. Run npm run build first.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Company Accounting System running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
});

module.exports = app;