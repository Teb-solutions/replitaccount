/**
 * Working Intercompany API for Production
 * Uses authentic data from external database at 135.235.154.222
 */

const { Pool } = require('pg');

// Production database connection
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

function setupWorkingIntercompanyAPI(app) {
  console.log('🔧 Setting up working intercompany API with production database...');

  // Create intercompany sales order
  app.post('/api/intercompany/sales-order', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, products, total } = req.body;
      
      // Validate companies exist
      const sourceCheck = await pool.query('SELECT id, name FROM companies WHERE id = $1', [sourceCompanyId]);
      const targetCheck = await pool.query('SELECT id, name FROM companies WHERE id = $1', [targetCompanyId]);
      
      if (sourceCheck.rows.length === 0 || targetCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid company IDs provided'
        });
      }

      // Generate order number
      const orderNumber = `SO-${sourceCompanyId}-${Date.now()}`;
      
      // Insert sales order
      const salesOrderResult = await pool.query(`
        INSERT INTO sales_orders (company_id, customer_id, order_number, order_date, total, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), $4, 'pending', NOW(), NOW())
        RETURNING id, order_number, total, status
      `, [sourceCompanyId, targetCompanyId, orderNumber, total]);

      const salesOrder = salesOrderResult.rows[0];

      // Create corresponding purchase order for target company
      const poNumber = `PO-${targetCompanyId}-${Date.now()}`;
      
      const purchaseOrderResult = await pool.query(`
        INSERT INTO purchase_orders (company_id, vendor_id, order_number, order_date, total, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), $4, 'pending', NOW(), NOW())
        RETURNING id, order_number, total, status
      `, [targetCompanyId, sourceCompanyId, poNumber, total]);

      const purchaseOrder = purchaseOrderResult.rows[0];

      res.status(201).json({
        success: true,
        salesOrder: {
          id: salesOrder.id,
          orderNumber: salesOrder.order_number,
          total: parseFloat(salesOrder.total),
          status: salesOrder.status,
          sourceCompany: sourceCheck.rows[0].name,
          targetCompany: targetCheck.rows[0].name
        },
        purchaseOrder: {
          id: purchaseOrder.id,
          orderNumber: purchaseOrder.order_number,
          total: parseFloat(purchaseOrder.total),
          status: purchaseOrder.status
        },
        message: 'Intercompany sales order and purchase order created successfully'
      });

    } catch (error) {
      console.error('Error creating intercompany sales order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create intercompany sales order: ' + error.message
      });
    }
  });

  // Create intercompany invoice
  app.post('/api/intercompany/invoice', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, salesOrderId, total } = req.body;
      
      // Validate sales order exists
      const salesOrderCheck = await pool.query(
        'SELECT id, order_number, total FROM sales_orders WHERE id = $1 AND company_id = $2',
        [salesOrderId, sourceCompanyId]
      );
      
      if (salesOrderCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Sales order not found'
        });
      }

      const salesOrder = salesOrderCheck.rows[0];
      const invoiceNumber = `INV-${sourceCompanyId}-${Date.now()}`;
      
      // Create invoice
      const invoiceResult = await pool.query(`
        INSERT INTO invoices (company_id, customer_id, sales_order_id, invoice_number, invoice_date, total, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), $5, 'pending', NOW(), NOW())
        RETURNING id, invoice_number, total, status
      `, [sourceCompanyId, targetCompanyId, salesOrderId, invoiceNumber, total]);

      const invoice = invoiceResult.rows[0];

      res.status(201).json({
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          total: parseFloat(invoice.total),
          status: invoice.status,
          salesOrderId: salesOrderId,
          salesOrderNumber: salesOrder.order_number
        },
        message: 'Intercompany invoice created successfully'
      });

    } catch (error) {
      console.error('Error creating intercompany invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create intercompany invoice: ' + error.message
      });
    }
  });

  // Create intercompany purchase order
  app.post('/api/intercompany/purchase-order', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, products, total } = req.body;
      
      // Validate companies exist
      const sourceCheck = await pool.query('SELECT id, name FROM companies WHERE id = $1', [sourceCompanyId]);
      const targetCheck = await pool.query('SELECT id, name FROM companies WHERE id = $1', [targetCompanyId]);
      
      if (sourceCheck.rows.length === 0 || targetCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid company IDs provided'
        });
      }

      // Generate PO number
      const poNumber = `PO-${sourceCompanyId}-${Date.now()}`;
      
      // Insert purchase order
      const purchaseOrderResult = await pool.query(`
        INSERT INTO purchase_orders (company_id, vendor_id, order_number, order_date, total, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), $4, 'pending', NOW(), NOW())
        RETURNING id, order_number, total, status
      `, [sourceCompanyId, targetCompanyId, poNumber, total]);

      const purchaseOrder = purchaseOrderResult.rows[0];

      res.status(201).json({
        success: true,
        purchaseOrder: {
          id: purchaseOrder.id,
          orderNumber: purchaseOrder.order_number,
          total: parseFloat(purchaseOrder.total),
          status: purchaseOrder.status,
          sourceCompany: sourceCheck.rows[0].name,
          targetCompany: targetCheck.rows[0].name
        },
        message: 'Intercompany purchase order created successfully'
      });

    } catch (error) {
      console.error('Error creating intercompany purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create intercompany purchase order: ' + error.message
      });
    }
  });

  // Create intercompany bill
  app.post('/api/intercompany/bill', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, purchaseOrderId, total } = req.body;
      
      // Validate purchase order exists
      const purchaseOrderCheck = await pool.query(
        'SELECT id, order_number, total FROM purchase_orders WHERE id = $1',
        [purchaseOrderId]
      );
      
      if (purchaseOrderCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Purchase order not found'
        });
      }

      const purchaseOrder = purchaseOrderCheck.rows[0];
      const billNumber = `BILL-${sourceCompanyId}-${Date.now()}`;
      
      // Create bill
      const billResult = await pool.query(`
        INSERT INTO bills (company_id, vendor_id, purchase_order_id, bill_number, bill_date, total, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), $5, 'pending', NOW(), NOW())
        RETURNING id, bill_number, total, status
      `, [targetCompanyId, sourceCompanyId, purchaseOrderId, billNumber, total]);

      const bill = billResult.rows[0];

      res.status(201).json({
        success: true,
        bill: {
          id: bill.id,
          billNumber: bill.bill_number,
          total: parseFloat(bill.total),
          status: bill.status,
          purchaseOrderId: purchaseOrderId,
          purchaseOrderNumber: purchaseOrder.order_number
        },
        message: 'Intercompany bill created successfully'
      });

    } catch (error) {
      console.error('Error creating intercompany bill:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create intercompany bill: ' + error.message
      });
    }
  });

  // Create receipt payment
  app.post('/api/intercompany/receipt-payment', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, invoiceId, amount, paymentMethod } = req.body;
      
      // Validate invoice exists
      const invoiceCheck = await pool.query(
        'SELECT id, invoice_number, total FROM invoices WHERE id = $1',
        [invoiceId]
      );
      
      if (invoiceCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invoice not found'
        });
      }

      const invoice = invoiceCheck.rows[0];
      const receiptNumber = `REC-${targetCompanyId}-${Date.now()}`;
      
      // Create receipt
      const receiptResult = await pool.query(`
        INSERT INTO receipts (company_id, customer_id, invoice_id, receipt_number, receipt_date, amount, payment_method, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), $5, $6, NOW(), NOW())
        RETURNING id, receipt_number, amount, payment_method
      `, [sourceCompanyId, targetCompanyId, invoiceId, receiptNumber, amount, paymentMethod || 'Bank Transfer']);

      const receipt = receiptResult.rows[0];

      res.status(201).json({
        success: true,
        receipt: {
          id: receipt.id,
          receiptNumber: receipt.receipt_number,
          amount: parseFloat(receipt.amount),
          paymentMethod: receipt.payment_method,
          invoiceId: invoiceId,
          invoiceNumber: invoice.invoice_number
        },
        message: 'Intercompany receipt payment created successfully'
      });

    } catch (error) {
      console.error('Error creating intercompany receipt payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create intercompany receipt payment: ' + error.message
      });
    }
  });

  console.log('✅ Working intercompany API endpoints registered successfully');
}

module.exports = { setupWorkingIntercompanyAPI };