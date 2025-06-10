/**
 * Fixed Intercompany Endpoints for Production Database
 * Uses the exact schema structure from https://multitenantapistaging.tebs.co.in/
 */

const { Pool } = require('pg');

// Production database connection matching the working system
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

function registerFixedIntercompanyEndpoints(app) {
  console.log('🔧 Registering fixed intercompany endpoints...');

  // Test database connection first
  pool.connect()
    .then(client => {
      client.release();
      console.log('✅ Intercompany database connection successful');
    })
    .catch(err => {
      console.error('❌ Intercompany database connection failed:', err.message);
    });

  /**
   * Create Intercompany Sales Order
   * Creates sales order for source company and purchase order for target company
   */
  app.post('/api/intercompany/sales-order', async (req, res) => {
    const client = await pool.connect();
    try {
      const { sourceCompanyId, targetCompanyId, products = [], total = 1000 } = req.body;
      
      console.log(`📝 Creating intercompany sales order: ${sourceCompanyId} → ${targetCompanyId}`);
      
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
      const referenceNumber = `IC-REF-${sourceCompanyId}-${targetCompanyId}-${timestamp}`;

      // Create sales order using exact schema structure from your data
      const salesOrderResult = await client.query(`
        INSERT INTO sales_orders (
          company_id, customer_id, order_number, order_date, expected_date, 
          status, total, reference_number, created_at
        ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
        RETURNING id, order_number, total, status, reference_number
      `, [sourceCompanyId, targetCompanyId, orderNumber, 'Pending', total, referenceNumber]);

      const salesOrder = salesOrderResult.rows[0];

      // Create corresponding purchase order for target company
      const poNumber = `PO-${targetCompanyId}-${timestamp}`;
      const poReferenceNumber = `PO-REF-${targetCompanyId}-${timestamp}`;

      const purchaseOrderResult = await client.query(`
        INSERT INTO purchase_orders (
          company_id, vendor_id, order_number, order_date, expected_date,
          status, total, reference_number, created_at
        ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
        RETURNING id, order_number, total, status, reference_number
      `, [targetCompanyId, sourceCompanyId, poNumber, 'Pending', total, poReferenceNumber]);

      const purchaseOrder = purchaseOrderResult.rows[0];

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

  /**
   * Create Intercompany Invoice from Sales Order
   */
  app.post('/api/intercompany/invoice', async (req, res) => {
    const client = await pool.connect();
    try {
      const { sourceCompanyId, targetCompanyId, salesOrderId, total } = req.body;
      
      console.log(`📄 Creating intercompany invoice for sales order ${salesOrderId}`);
      
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

  /**
   * Create Intercompany Purchase Order
   */
  app.post('/api/intercompany/purchase-order', async (req, res) => {
    const client = await pool.connect();
    try {
      const { sourceCompanyId, targetCompanyId, products = [], total = 1000 } = req.body;
      
      console.log(`🛒 Creating intercompany purchase order: ${sourceCompanyId} → ${targetCompanyId}`);
      
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

      // Generate purchase order number
      const timestamp = Date.now();
      const poNumber = `PO-${sourceCompanyId}-${timestamp}`;
      const referenceNumber = `PO-REF-${sourceCompanyId}-${targetCompanyId}-${timestamp}`;

      // Create purchase order
      const purchaseOrderResult = await client.query(`
        INSERT INTO purchase_orders (
          company_id, vendor_id, order_number, order_date, expected_date,
          status, total, reference_number, created_at
        ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
        RETURNING id, order_number, total, status, reference_number
      `, [sourceCompanyId, targetCompanyId, poNumber, 'Pending', total, referenceNumber]);

      const purchaseOrder = purchaseOrderResult.rows[0];

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Intercompany purchase order created successfully',
        purchaseOrder: {
          id: purchaseOrder.id,
          orderNumber: purchaseOrder.order_number,
          total: parseFloat(purchaseOrder.total),
          status: purchaseOrder.status,
          referenceNumber: purchaseOrder.reference_number,
          sourceCompany: sourceCompany.name,
          targetCompany: targetCompany.name
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating intercompany purchase order:', error);
      res.status(500).json({
        success: false,
        error: `Failed to create intercompany purchase order: ${error.message}`
      });
    } finally {
      client.release();
    }
  });

  /**
   * Create Receipt Payment for Intercompany Invoice
   */
  app.post('/api/intercompany/receipt-payment', async (req, res) => {
    const client = await pool.connect();
    try {
      const { sourceCompanyId, targetCompanyId, invoiceId, amount, paymentMethod = 'Bank Transfer' } = req.body;
      
      console.log(`💰 Creating intercompany receipt payment for invoice ${invoiceId}`);
      
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

  console.log('✅ Fixed intercompany endpoints registered successfully');
}

module.exports = { registerFixedIntercompanyEndpoints };