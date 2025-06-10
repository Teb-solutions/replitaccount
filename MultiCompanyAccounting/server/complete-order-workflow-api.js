/**
 * Complete Order Workflow API
 * 
 * Connects authentic sales orders → invoices → receipts 
 * and purchase orders → bills → payments for proper AR/AP tracking
 */

const express = require('express');
const { Sequelize } = require('sequelize');

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
 * Create invoices from unlinked sales orders
 * This will connect your authentic $183,000 in sales orders to proper invoices
 */
router.post('/create-invoices-from-sales-orders/:companyId', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n🚀 Creating invoices from sales orders for company ${companyId}`);
    
    // Get all sales orders that don't have invoices yet
    const [unlinkedOrders] = await sequelize.query(`
      SELECT so.*, c.name as customer_name
      FROM sales_orders so
      LEFT JOIN companies c ON so.customer_id = c.id
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      WHERE so.company_id = $1 AND i.id IS NULL
      ORDER BY so.order_date ASC
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });
    
    console.log(`📋 Found ${unlinkedOrders.length} sales orders without invoices`);
    
    const createdInvoices = [];
    
    for (const order of unlinkedOrders) {
      // Generate invoice number
      const invoiceNumber = `INV-${companyId}-${Date.now()}-${order.id}`;
      
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
        bind: [order.id],
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
            invoiceResult[0].id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.amount
          ],
          type: Sequelize.QueryTypes.INSERT,
          transaction
        });
      }
      
      createdInvoices.push({
        invoiceId: invoiceResult[0].id,
        invoiceNumber,
        salesOrderId: order.id,
        salesOrderNumber: order.order_number,
        amount: parseFloat(order.total),
        customer: order.customer_name
      });
      
      console.log(`✅ Created invoice ${invoiceNumber} for sales order ${order.order_number} ($${order.total})`);
    }
    
    await transaction.commit();
    
    const totalAmount = createdInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    
    console.log(`\n🎉 Successfully created ${createdInvoices.length} invoices totaling $${totalAmount.toLocaleString()}`);
    
    res.json({
      success: true,
      message: `Created ${createdInvoices.length} invoices from sales orders`,
      totalAmount,
      invoices: createdInvoices
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating invoices from sales orders:', error);
    res.status(500).json({ error: 'Failed to create invoices from sales orders' });
  }
});

/**
 * Create bills from unlinked purchase orders
 * This will connect your authentic $160,000 in purchase orders to proper bills
 */
router.post('/create-bills-from-purchase-orders/:companyId', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n🚀 Creating bills from purchase orders for company ${companyId}`);
    
    // Get all purchase orders that don't have bills yet
    const [unlinkedOrders] = await sequelize.query(`
      SELECT po.*, c.name as vendor_name
      FROM purchase_orders po
      LEFT JOIN companies c ON po.vendor_id = c.id
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      WHERE po.company_id = $1 AND b.id IS NULL
      ORDER BY po.order_date ASC
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    });
    
    console.log(`📋 Found ${unlinkedOrders.length} purchase orders without bills`);
    
    const createdBills = [];
    
    for (const order of unlinkedOrders) {
      // Generate bill number
      const billNumber = `BILL-${companyId}-${Date.now()}-${order.id}`;
      
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
        bind: [order.id],
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
            billResult[0].id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.amount
          ],
          type: Sequelize.QueryTypes.INSERT,
          transaction
        });
      }
      
      createdBills.push({
        billId: billResult[0].id,
        billNumber,
        purchaseOrderId: order.id,
        purchaseOrderNumber: order.order_number,
        amount: parseFloat(order.total),
        vendor: order.vendor_name
      });
      
      console.log(`✅ Created bill ${billNumber} for purchase order ${order.order_number} ($${order.total})`);
    }
    
    await transaction.commit();
    
    const totalAmount = createdBills.reduce((sum, bill) => sum + bill.amount, 0);
    
    console.log(`\n🎉 Successfully created ${createdBills.length} bills totaling $${totalAmount.toLocaleString()}`);
    
    res.json({
      success: true,
      message: `Created ${createdBills.length} bills from purchase orders`,
      totalAmount,
      bills: createdBills
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating bills from purchase orders:', error);
    res.status(500).json({ error: 'Failed to create bills from purchase orders' });
  }
});

/**
 * Get complete AR/AP tracking showing what's invoiced vs what's still on orders
 */
router.get('/ar-ap-tracking/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n📊 Getting complete AR/AP tracking for company ${companyId}`);
    
    // Sales Orders and Invoices (AR side)
    const [salesData] = await sequelize.query(`
      SELECT 
        COUNT(so.id) as total_sales_orders,
        COALESCE(SUM(so.total), 0) as total_order_value,
        COUNT(i.id) as orders_with_invoices,
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN i.id IS NULL THEN so.total ELSE 0 END), 0) as uninvoiced_orders
      FROM sales_orders so
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      WHERE so.company_id = $1
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    // Purchase Orders and Bills (AP side)
    const [purchaseData] = await sequelize.query(`
      SELECT 
        COUNT(po.id) as total_purchase_orders,
        COALESCE(SUM(po.total), 0) as total_order_value,
        COUNT(b.id) as orders_with_bills,
        COALESCE(SUM(b.total), 0) as total_billed,
        COALESCE(SUM(CASE WHEN b.id IS NULL THEN po.total ELSE 0 END), 0) as unbilled_orders
      FROM purchase_orders po
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      WHERE po.company_id = $1
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    const arTracking = {
      totalSalesOrders: parseInt(salesData[0].total_sales_orders),
      totalOrderValue: parseFloat(salesData[0].total_order_value),
      ordersWithInvoices: parseInt(salesData[0].orders_with_invoices),
      totalInvoiced: parseFloat(salesData[0].total_invoiced),
      uninvoicedOrders: parseFloat(salesData[0].uninvoiced_orders),
      invoiceCompletionRate: salesData[0].total_sales_orders > 0 
        ? (parseInt(salesData[0].orders_with_invoices) / parseInt(salesData[0].total_sales_orders) * 100).toFixed(1)
        : 0
    };
    
    const apTracking = {
      totalPurchaseOrders: parseInt(purchaseData[0].total_purchase_orders),
      totalOrderValue: parseFloat(purchaseData[0].total_order_value),
      ordersWithBills: parseInt(purchaseData[0].orders_with_bills),
      totalBilled: parseFloat(purchaseData[0].total_billed),
      unbilledOrders: parseFloat(purchaseData[0].unbilled_orders),
      billCompletionRate: purchaseData[0].total_purchase_orders > 0 
        ? (parseInt(purchaseData[0].orders_with_bills) / parseInt(purchaseData[0].total_purchase_orders) * 100).toFixed(1)
        : 0
    };
    
    console.log('AR Tracking:', arTracking);
    console.log('AP Tracking:', apTracking);
    
    res.json({
      companyId,
      arTracking,
      apTracking,
      summary: {
        totalUninvoicedAR: arTracking.uninvoicedOrders,
        totalUnbilledAP: apTracking.unbilledOrders,
        workflowGaps: {
          salesOrdersNeedingInvoices: arTracking.totalSalesOrders - arTracking.ordersWithInvoices,
          purchaseOrdersNeedingBills: apTracking.totalPurchaseOrders - apTracking.ordersWithBills
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting AR/AP tracking:', error);
    res.status(500).json({ error: 'Failed to get AR/AP tracking' });
  }
});

module.exports = router;