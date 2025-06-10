/**
 * Order Tracking API
 * 
 * Provides comprehensive tracking of sales orders → invoices → receipts
 * and purchase orders → bills → payments using authentic database data
 */

const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

// Use external database connection
const sequelize = new Sequelize(
  'account_replit_staging',
  'pguser',
  'StrongP@ss123',
  {
    host: '135.235.154.222',
    port: 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const router = express.Router();

/**
 * Get comprehensive sales order tracking for a company
 * Shows: Order → Invoice → Receipt progression
 */
router.get('/sales-order-tracking/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    console.log(`\n=== SALES ORDER TRACKING for Company ${companyId} ===`);
    
    // Get all sales orders with linked invoices and receipts
    const salesOrdersQuery = `
      SELECT 
        so.id as order_id,
        so.order_number,
        so.total as order_amount,
        so.status as order_status,
        so.order_date,
        i.id as invoice_id,
        i.invoice_number,
        i.total_amount as invoice_amount,
        i.status as invoice_status,
        i.invoice_date,
        r.id as receipt_id,
        r.receipt_number,
        r.amount as receipt_amount,
        r.receipt_date,
        r.status as receipt_status
      FROM sales_orders so
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      LEFT JOIN receipts r ON i.id = r.invoice_id
      WHERE so.company_id = $1
      ORDER BY so.order_date DESC, so.id DESC
    `;
    
    const [salesTracking] = await sequelize.query(salesOrdersQuery, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    // Calculate tracking summary
    const summary = {
      totalOrders: 0,
      totalOrderValue: 0,
      ordersWithInvoices: 0,
      ordersWithReceipts: 0,
      totalInvoiced: 0,
      totalReceived: 0,
      outstandingAR: 0
    };
    
    const trackingDetails = [];
    const processedOrders = new Set();
    
    for (const row of salesTracking) {
      if (!processedOrders.has(row.order_id)) {
        processedOrders.add(row.order_id);
        summary.totalOrders++;
        summary.totalOrderValue += parseFloat(row.order_amount || 0);
        
        if (row.invoice_id) {
          summary.ordersWithInvoices++;
          summary.totalInvoiced += parseFloat(row.invoice_amount || 0);
        }
        
        if (row.receipt_id) {
          summary.ordersWithReceipts++;
          summary.totalReceived += parseFloat(row.receipt_amount || 0);
        }
      }
      
      trackingDetails.push({
        orderId: row.order_id,
        orderNumber: row.order_number,
        orderAmount: parseFloat(row.order_amount || 0),
        orderStatus: row.order_status,
        orderDate: row.order_date,
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        invoiceAmount: parseFloat(row.invoice_amount || 0),
        invoiceStatus: row.invoice_status,
        invoiceDate: row.invoice_date,
        receiptId: row.receipt_id,
        receiptNumber: row.receipt_number,
        receiptAmount: parseFloat(row.receipt_amount || 0),
        receiptDate: row.receipt_date,
        receiptStatus: row.receipt_status,
        workflowStatus: getWorkflowStatus(row)
      });
    }
    
    summary.outstandingAR = summary.totalInvoiced - summary.totalReceived;
    
    console.log('Sales Order Tracking Summary:', summary);
    
    res.json({
      summary,
      trackingDetails
    });
    
  } catch (error) {
    console.error('Error in sales order tracking:', error);
    res.status(500).json({ error: 'Failed to get sales order tracking' });
  }
});

/**
 * Get comprehensive purchase order tracking for a company
 * Shows: Order → Bill → Payment progression
 */
router.get('/purchase-order-tracking/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    console.log(`\n=== PURCHASE ORDER TRACKING for Company ${companyId} ===`);
    
    // Get all purchase orders with linked bills and payments
    const purchaseOrdersQuery = `
      SELECT 
        po.id as order_id,
        po.order_number,
        po.total as order_amount,
        po.status as order_status,
        po.order_date,
        b.id as bill_id,
        b.bill_number,
        b.total as bill_amount,
        b.status as bill_status,
        b.bill_date,
        p.id as payment_id,
        p.payment_number,
        p.amount as payment_amount,
        p.payment_date,
        p.status as payment_status
      FROM purchase_orders po
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      LEFT JOIN payments p ON b.id = p.bill_id
      WHERE po.company_id = $1
      ORDER BY po.order_date DESC, po.id DESC
    `;
    
    const [purchaseTracking] = await sequelize.query(purchaseOrdersQuery, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    // Calculate tracking summary
    const summary = {
      totalOrders: 0,
      totalOrderValue: 0,
      ordersWithBills: 0,
      ordersWithPayments: 0,
      totalBilled: 0,
      totalPaid: 0,
      outstandingAP: 0
    };
    
    const trackingDetails = [];
    const processedOrders = new Set();
    
    for (const row of purchaseTracking) {
      if (!processedOrders.has(row.order_id)) {
        processedOrders.add(row.order_id);
        summary.totalOrders++;
        summary.totalOrderValue += parseFloat(row.order_amount || 0);
        
        if (row.bill_id) {
          summary.ordersWithBills++;
          summary.totalBilled += parseFloat(row.bill_amount || 0);
        }
        
        if (row.payment_id) {
          summary.ordersWithPayments++;
          summary.totalPaid += parseFloat(row.payment_amount || 0);
        }
      }
      
      trackingDetails.push({
        orderId: row.order_id,
        orderNumber: row.order_number,
        orderAmount: parseFloat(row.order_amount || 0),
        orderStatus: row.order_status,
        orderDate: row.order_date,
        billId: row.bill_id,
        billNumber: row.bill_number,
        billAmount: parseFloat(row.bill_amount || 0),
        billStatus: row.bill_status,
        billDate: row.bill_date,
        paymentId: row.payment_id,
        paymentNumber: row.payment_number,
        paymentAmount: parseFloat(row.payment_amount || 0),
        paymentDate: row.payment_date,
        paymentStatus: row.payment_status,
        workflowStatus: getWorkflowStatus(row, 'purchase')
      });
    }
    
    summary.outstandingAP = summary.totalBilled - summary.totalPaid;
    
    console.log('Purchase Order Tracking Summary:', summary);
    
    res.json({
      summary,
      trackingDetails
    });
    
  } catch (error) {
    console.error('Error in purchase order tracking:', error);
    res.status(500).json({ error: 'Failed to get purchase order tracking' });
  }
});

/**
 * Create invoice from sales order with proper linkage
 */
router.post('/sales-orders/:orderId/create-invoice', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const orderId = parseInt(req.params.orderId);
    
    // Get sales order details
    const [salesOrder] = await sequelize.query(`
      SELECT * FROM sales_orders WHERE id = $1
    `, {
      bind: [orderId],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });
    
    if (!salesOrder.length) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Sales order not found' });
    }
    
    const order = salesOrder[0];
    
    // Get next invoice sequence
    const [sequenceResult] = await sequelize.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-${order.company_id}-(\\d+)') AS INTEGER)), 0) + 1 as next_seq
      FROM invoices 
      WHERE company_id = $1
    `, {
      bind: [order.company_id],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });
    
    const nextSequence = sequenceResult[0].next_seq || 1;
    const invoiceNumber = `INV-${order.company_id}-${Date.now()}`;
    
    // Create invoice linked to sales order
    const [invoiceResult] = await sequelize.query(`
      INSERT INTO invoices (
        invoice_number, company_id, customer_id, sales_order_id,
        invoice_date, due_date, subtotal, tax_amount, total_amount,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *
    `, {
      bind: [
        invoiceNumber,
        order.company_id,
        order.customer_id,
        order.id, // Link to sales order
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        order.total,
        0,
        order.total,
        'Open'
      ],
      type: Sequelize.QueryTypes.INSERT,
      transaction
    });
    
    // Get sales order items and create invoice items
    const [orderItems] = await sequelize.query(`
      SELECT * FROM sales_order_items WHERE sales_order_id = $1
    `, {
      bind: [orderId],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });
    
    for (const item of orderItems) {
      await sequelize.query(`
        INSERT INTO invoice_items (
          invoice_id, product_id, quantity, unit_price, amount,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, {
        bind: [
          invoiceResult[0][0].id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.amount
        ],
        type: Sequelize.QueryTypes.INSERT,
        transaction
      });
    }
    
    await transaction.commit();
    
    console.log(`✅ Created invoice ${invoiceNumber} for sales order ${order.order_number}`);
    
    res.json({
      message: 'Invoice created successfully',
      invoiceId: invoiceResult[0][0].id,
      invoiceNumber,
      amount: order.total
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating invoice from sales order:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

/**
 * Create bill from purchase order with proper linkage
 */
router.post('/purchase-orders/:orderId/create-bill', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const orderId = parseInt(req.params.orderId);
    
    // Get purchase order details
    const [purchaseOrder] = await sequelize.query(`
      SELECT * FROM purchase_orders WHERE id = $1
    `, {
      bind: [orderId],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });
    
    if (!purchaseOrder.length) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    const order = purchaseOrder[0];
    
    // Get next bill sequence
    const billNumber = `BILL-${order.company_id}-${Date.now()}`;
    
    // Create bill linked to purchase order
    const [billResult] = await sequelize.query(`
      INSERT INTO bills (
        bill_number, company_id, vendor_id, purchase_order_id,
        bill_date, due_date, subtotal, tax_amount, total,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *
    `, {
      bind: [
        billNumber,
        order.company_id,
        order.vendor_id,
        order.id, // Link to purchase order
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        order.total,
        0,
        order.total,
        'Open'
      ],
      type: Sequelize.QueryTypes.INSERT,
      transaction
    });
    
    // Get purchase order items and create bill items
    const [orderItems] = await sequelize.query(`
      SELECT * FROM purchase_order_items WHERE purchase_order_id = $1
    `, {
      bind: [orderId],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });
    
    for (const item of orderItems) {
      await sequelize.query(`
        INSERT INTO bill_items (
          bill_id, product_id, quantity, unit_price, amount,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, {
        bind: [
          billResult[0][0].id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.amount
        ],
        type: Sequelize.QueryTypes.INSERT,
        transaction
      });
    }
    
    await transaction.commit();
    
    console.log(`✅ Created bill ${billNumber} for purchase order ${order.order_number}`);
    
    res.json({
      message: 'Bill created successfully',
      billId: billResult[0][0].id,
      billNumber,
      amount: order.total
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating bill from purchase order:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

/**
 * Determine workflow status based on tracking data
 */
function getWorkflowStatus(row, type = 'sales') {
  if (type === 'sales') {
    if (row.receipt_id) return 'Completed (Received)';
    if (row.invoice_id) return 'Invoiced (Pending Receipt)';
    return 'Ordered (Pending Invoice)';
  } else {
    if (row.payment_id) return 'Completed (Paid)';
    if (row.bill_id) return 'Billed (Pending Payment)';
    return 'Ordered (Pending Bill)';
  }
}

module.exports = router;