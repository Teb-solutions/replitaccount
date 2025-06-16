/**
 * Multi-Company Accounting System - Complete Production Server
 * All required endpoints with authentic data from external database
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection to external server (135.235.154.222)
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

// Health check
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
      error: error.message
    });
  }
});

// Test endpoint for deployment verification
app.get('/api/test', (req, res) => {
  res.json({
    status: 'API endpoints active',
    endpoints: {
      invoice: '/api/intercompany/invoice',
      payment: '/api/intercompany/payment'
    },
    message: 'Multi-Company Accounting System - Invoice and Receipt fixes applied'
  });
});

// 3. INTERCOMPANY INVOICE (Creates sales invoice + purchase bill) - FIXED
app.post('/api/intercompany/invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, salesOrderId, total } = req.body;
    
    if (!sourceCompanyId || !targetCompanyId || !salesOrderId || !total) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate sales order exists and get customer info
    const salesOrderResult = await client.query(
      'SELECT id, order_number, total, customer_id FROM sales_orders WHERE id = $1 AND company_id = $2',
      [salesOrderId, sourceCompanyId]
    );
    
    if (salesOrderResult.rows.length === 0) {
      return res.status(400).json({ error: 'Sales order not found' });
    }

    const salesOrder = salesOrderResult.rows[0];
    
    // Validate that targetCompanyId matches the customer_id from sales order
    if (salesOrder.customer_id != targetCompanyId) {
      return res.status(400).json({ 
        error: `Target company ID (${targetCompanyId}) does not match sales order customer ID (${salesOrder.customer_id})`,
        salesOrderId: salesOrderId,
        expectedCustomerId: salesOrder.customer_id
      });
    }

    // Find corresponding purchase order in target company
    const purchaseOrderResult = await client.query(
      'SELECT id, order_number FROM purchase_orders WHERE company_id = $1 AND vendor_id = $2',
      [targetCompanyId, sourceCompanyId]
    );

    await client.query('BEGIN');

    const timestamp = Date.now();
    
    // Get next available invoice ID to avoid primary key conflicts
    const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM invoices');
    const nextInvoiceId = maxIdResult.rows[0].next_id;
    
    // Create sales invoice in source company with explicit ID
    const invoiceNumber = `INV-${sourceCompanyId}-${timestamp}`;
    const salesInvoiceResult = await client.query(`
      INSERT INTO invoices (
        id, company_id, customer_id, sales_order_id, invoice_number, 
        invoice_date, due_date, total, status
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '30 days', $6, $7)
      RETURNING id, invoice_number, total, status
    `, [nextInvoiceId, sourceCompanyId, targetCompanyId, salesOrderId, invoiceNumber, total, 'pending']);

    // Get next available bill ID and create corresponding purchase bill
    const maxBillIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bills');
    const nextBillId = maxBillIdResult.rows[0].next_id;
    
    const billNumber = `BILL-${targetCompanyId}-${timestamp}`;
    const purchaseOrderId = purchaseOrderResult.rows[0]?.id || null;
    
    const purchaseBillResult = await client.query(`
      INSERT INTO bills (
        id, company_id, vendor_id, purchase_order_id, bill_number, 
        bill_date, due_date, total, status
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '30 days', $6, $7)
      RETURNING id, bill_number, total, status
    `, [nextBillId, targetCompanyId, sourceCompanyId, purchaseOrderId, billNumber, total, 'pending']);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany invoice and bill created successfully',
      salesInvoice: {
        id: salesInvoiceResult.rows[0].id,
        invoiceNumber: salesInvoiceResult.rows[0].invoice_number,
        total: parseFloat(salesInvoiceResult.rows[0].total),
        status: salesInvoiceResult.rows[0].status,
        companyId: sourceCompanyId,
        salesOrderId: salesOrderId
      },
      purchaseBill: {
        id: purchaseBillResult.rows[0].id,
        billNumber: purchaseBillResult.rows[0].bill_number,
        total: parseFloat(purchaseBillResult.rows[0].total),
        status: purchaseBillResult.rows[0].status,
        companyId: targetCompanyId,
        purchaseOrderId: purchaseOrderId
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create intercompany invoice',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

// 4. INTERCOMPANY PAYMENT (Creates bill_payment + receipt) - FIXED
app.post('/api/intercompany/payment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, invoiceId, billId, amount } = req.body;
    
    if (!sourceCompanyId || !targetCompanyId || !amount) {
      return res.status(400).json({ error: 'sourceCompanyId, targetCompanyId, and amount are required' });
    }

    await client.query('BEGIN');

    const timestamp = Date.now();
    
    // Get next available payment ID and create bill payment in source company
    const maxPaymentIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bill_payments');
    const nextPaymentId = maxPaymentIdResult.rows[0].next_id;
    
    const paymentNumber = `PAY-${sourceCompanyId}-${timestamp}`;
    const paymentResult = await client.query(`
      INSERT INTO bill_payments (
        id, company_id, vendor_id, bill_id, payment_number, 
        payment_date, amount, payment_method
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      RETURNING id, payment_number, amount
    `, [nextPaymentId, sourceCompanyId, targetCompanyId, billId, paymentNumber, amount, 'intercompany_transfer']);

    // Get next available receipt ID and create corresponding receipt in target company
    const maxReceiptIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM receipts');
    const nextReceiptId = maxReceiptIdResult.rows[0].next_id;
    
    const receiptNumber = `REC-${targetCompanyId}-${timestamp}`;
    const receiptResult = await client.query(`
      INSERT INTO receipts (
        id, company_id, customer_id, invoice_id, receipt_number, 
        receipt_date, amount, payment_method
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      RETURNING id, receipt_number, amount
    `, [nextReceiptId, targetCompanyId, sourceCompanyId, invoiceId, receiptNumber, amount, 'intercompany_transfer']);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany payment and receipt created successfully',
      payment: {
        id: paymentResult.rows[0].id,
        paymentNumber: paymentResult.rows[0].payment_number,
        amount: parseFloat(paymentResult.rows[0].amount),
        companyId: sourceCompanyId
      },
      receipt: {
        id: receiptResult.rows[0].id,
        receiptNumber: receiptResult.rows[0].receipt_number,
        amount: parseFloat(receiptResult.rows[0].amount),
        companyId: targetCompanyId
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany payment:', error);
    res.status(500).json({ 
      error: 'Failed to create intercompany payment',
      details: error.message,
      code: error.code
    });
  } finally {
    client.release();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Multi-Company Accounting System serving on port ${PORT}`);
  console.log(`📊 Invoice and Receipt endpoints fixed for primary key constraints`);
  console.log(`🔗 Connected to external database: 135.235.154.222`);
});