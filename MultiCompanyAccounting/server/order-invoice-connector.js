/**
 * Order Invoice Connector
 * 
 * Creates invoices from authentic sales orders and bills from purchase orders
 * Provides detailed reporting for each order with invoice/bill numbers and amounts
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
 * Create invoices from all unlinked sales orders
 */
router.post('/create-invoices-from-orders/:companyId', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n🚀 Creating invoices from sales orders for company ${companyId}`);
    
    // Get sales orders without invoices
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
    let totalAmount = 0;
    
    for (const order of unlinkedOrders) {
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
          order.id,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          order.total,
          0,
          order.total,
          'Open'
        ],
        type: Sequelize.QueryTypes.INSERT,
        transaction
      });
      
      // Get order items and create invoice items
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
      
      const orderAmount = parseFloat(order.total);
      totalAmount += orderAmount;
      
      createdInvoices.push({
        orderId: order.id,
        orderNumber: order.order_number,
        invoiceId: invoiceResult[0].id,
        invoiceNumber,
        amount: orderAmount,
        customer: order.customer_name
      });
      
      console.log(`✅ Created invoice ${invoiceNumber} for order ${order.order_number} ($${orderAmount.toLocaleString()})`);
    }
    
    await transaction.commit();
    
    console.log(`\n🎉 Successfully created ${createdInvoices.length} invoices totaling $${totalAmount.toLocaleString()}`);
    
    res.json({
      success: true,
      message: `Created ${createdInvoices.length} invoices from sales orders`,
      totalInvoices: createdInvoices.length,
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
 * Create bills from all unlinked purchase orders
 */
router.post('/create-bills-from-orders/:companyId', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n🚀 Creating bills from purchase orders for company ${companyId}`);
    
    // Get purchase orders without bills
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
    let totalAmount = 0;
    
    for (const order of unlinkedOrders) {
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
          order.id,
          new Date().toISOString().split('T')[0],
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          order.total,
          0,
          order.total,
          'Open'
        ],
        type: Sequelize.QueryTypes.INSERT,
        transaction
      });
      
      // Get order items and create bill items
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
      
      const orderAmount = parseFloat(order.total);
      totalAmount += orderAmount;
      
      createdBills.push({
        orderId: order.id,
        orderNumber: order.order_number,
        billId: billResult[0].id,
        billNumber,
        amount: orderAmount,
        vendor: order.vendor_name
      });
      
      console.log(`✅ Created bill ${billNumber} for order ${order.order_number} ($${orderAmount.toLocaleString()})`);
    }
    
    await transaction.commit();
    
    console.log(`\n🎉 Successfully created ${createdBills.length} bills totaling $${totalAmount.toLocaleString()}`);
    
    res.json({
      success: true,
      message: `Created ${createdBills.length} bills from purchase orders`,
      totalBills: createdBills.length,
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
 * Get detailed sales order to invoice tracking report
 */
router.get('/sales-order-invoice-report/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n📊 Getting sales order to invoice report for company ${companyId}`);
    
    const [orderInvoiceData] = await sequelize.query(`
      SELECT 
        so.id as order_id,
        so.order_number,
        so.total as order_amount,
        so.status as order_status,
        so.order_date,
        c.name as customer_name,
        i.id as invoice_id,
        i.invoice_number,
        i.total_amount as invoice_amount,
        i.status as invoice_status,
        i.invoice_date,
        r.id as receipt_id,
        r.receipt_number,
        r.amount as receipt_amount,
        r.receipt_date
      FROM sales_orders so
      LEFT JOIN companies c ON so.customer_id = c.id
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      LEFT JOIN receipts r ON i.id = r.invoice_id
      WHERE so.company_id = $1
      ORDER BY so.order_date DESC, so.id DESC
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    // Calculate summary
    const summary = {
      totalOrders: 0,
      totalOrderValue: 0,
      ordersWithInvoices: 0,
      ordersWithReceipts: 0,
      totalInvoiced: 0,
      totalReceived: 0,
      uninvoicedOrderValue: 0
    };
    
    const processedOrders = new Set();
    const orderDetails = [];
    
    for (const row of orderInvoiceData) {
      if (!processedOrders.has(row.order_id)) {
        processedOrders.add(row.order_id);
        summary.totalOrders++;
        summary.totalOrderValue += parseFloat(row.order_amount || 0);
        
        if (row.invoice_id) {
          summary.ordersWithInvoices++;
          summary.totalInvoiced += parseFloat(row.invoice_amount || 0);
        } else {
          summary.uninvoicedOrderValue += parseFloat(row.order_amount || 0);
        }
        
        if (row.receipt_id) {
          summary.ordersWithReceipts++;
          summary.totalReceived += parseFloat(row.receipt_amount || 0);
        }
      }
      
      orderDetails.push({
        orderId: row.order_id,
        orderNumber: row.order_number,
        orderAmount: parseFloat(row.order_amount || 0),
        orderStatus: row.order_status,
        orderDate: row.order_date,
        customer: row.customer_name,
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        invoiceAmount: parseFloat(row.invoice_amount || 0),
        invoiceStatus: row.invoice_status,
        invoiceDate: row.invoice_date,
        receiptId: row.receipt_id,
        receiptNumber: row.receipt_number,
        receiptAmount: parseFloat(row.receipt_amount || 0),
        receiptDate: row.receipt_date,
        workflowStatus: getWorkflowStatus(row, 'sales')
      });
    }
    
    console.log(`📈 Sales Order Report: ${summary.totalOrders} orders, ${summary.ordersWithInvoices} invoiced, $${summary.totalOrderValue.toLocaleString()} total value`);
    
    res.json({
      companyId,
      summary,
      orderDetails
    });
    
  } catch (error) {
    console.error('Error getting sales order invoice report:', error);
    res.status(500).json({ error: 'Failed to get sales order invoice report' });
  }
});

/**
 * Get detailed purchase order to bill tracking report
 */
router.get('/purchase-order-bill-report/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n📊 Getting purchase order to bill report for company ${companyId}`);
    
    const [orderBillData] = await sequelize.query(`
      SELECT 
        po.id as order_id,
        po.order_number,
        po.total as order_amount,
        po.status as order_status,
        po.order_date,
        c.name as vendor_name,
        b.id as bill_id,
        b.bill_number,
        b.total as bill_amount,
        b.status as bill_status,
        b.bill_date,
        p.id as payment_id,
        p.payment_number,
        p.amount as payment_amount,
        p.payment_date
      FROM purchase_orders po
      LEFT JOIN companies c ON po.vendor_id = c.id
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      LEFT JOIN payments p ON b.id = p.bill_id
      WHERE po.company_id = $1
      ORDER BY po.order_date DESC, po.id DESC
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    // Calculate summary
    const summary = {
      totalOrders: 0,
      totalOrderValue: 0,
      ordersWithBills: 0,
      ordersWithPayments: 0,
      totalBilled: 0,
      totalPaid: 0,
      unbilledOrderValue: 0
    };
    
    const processedOrders = new Set();
    const orderDetails = [];
    
    for (const row of orderBillData) {
      if (!processedOrders.has(row.order_id)) {
        processedOrders.add(row.order_id);
        summary.totalOrders++;
        summary.totalOrderValue += parseFloat(row.order_amount || 0);
        
        if (row.bill_id) {
          summary.ordersWithBills++;
          summary.totalBilled += parseFloat(row.bill_amount || 0);
        } else {
          summary.unbilledOrderValue += parseFloat(row.order_amount || 0);
        }
        
        if (row.payment_id) {
          summary.ordersWithPayments++;
          summary.totalPaid += parseFloat(row.payment_amount || 0);
        }
      }
      
      orderDetails.push({
        orderId: row.order_id,
        orderNumber: row.order_number,
        orderAmount: parseFloat(row.order_amount || 0),
        orderStatus: row.order_status,
        orderDate: row.order_date,
        vendor: row.vendor_name,
        billId: row.bill_id,
        billNumber: row.bill_number,
        billAmount: parseFloat(row.bill_amount || 0),
        billStatus: row.bill_status,
        billDate: row.bill_date,
        paymentId: row.payment_id,
        paymentNumber: row.payment_number,
        paymentAmount: parseFloat(row.payment_amount || 0),
        paymentDate: row.payment_date,
        workflowStatus: getWorkflowStatus(row, 'purchase')
      });
    }
    
    console.log(`📈 Purchase Order Report: ${summary.totalOrders} orders, ${summary.ordersWithBills} billed, $${summary.totalOrderValue.toLocaleString()} total value`);
    
    res.json({
      companyId,
      summary,
      orderDetails
    });
    
  } catch (error) {
    console.error('Error getting purchase order bill report:', error);
    res.status(500).json({ error: 'Failed to get purchase order bill report' });
  }
});

/**
 * Get enhanced financial summary with order tracking
 */
router.get('/financial-summary-with-orders/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`\n💰 Getting enhanced financial summary for company ${companyId}`);
    
    // Get sales order summary
    const [salesSummary] = await sequelize.query(`
      SELECT 
        COUNT(so.id) as total_orders,
        COALESCE(SUM(so.total), 0) as total_order_value,
        COUNT(i.id) as orders_with_invoices,
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN i.id IS NULL THEN so.total ELSE 0 END), 0) as uninvoiced_value
      FROM sales_orders so
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      WHERE so.company_id = $1
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    // Get purchase order summary
    const [purchaseSummary] = await sequelize.query(`
      SELECT 
        COUNT(po.id) as total_orders,
        COALESCE(SUM(po.total), 0) as total_order_value,
        COUNT(b.id) as orders_with_bills,
        COALESCE(SUM(b.total), 0) as total_billed,
        COALESCE(SUM(CASE WHEN b.id IS NULL THEN po.total ELSE 0 END), 0) as unbilled_value
      FROM purchase_orders po
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      WHERE po.company_id = $1
    `, {
      bind: [companyId],
      type: Sequelize.QueryTypes.SELECT
    });
    
    const salesData = salesSummary[0];
    const purchaseData = purchaseSummary[0];
    
    const financialSummary = {
      companyId,
      salesOrders: {
        totalOrders: parseInt(salesData.total_orders),
        totalValue: parseFloat(salesData.total_order_value),
        ordersInvoiced: parseInt(salesData.orders_with_invoices),
        totalInvoiced: parseFloat(salesData.total_invoiced),
        uninvoicedValue: parseFloat(salesData.uninvoiced_value),
        invoiceRate: salesData.total_orders > 0 
          ? ((parseInt(salesData.orders_with_invoices) / parseInt(salesData.total_orders)) * 100).toFixed(1) + '%'
          : '0%'
      },
      purchaseOrders: {
        totalOrders: parseInt(purchaseData.total_orders),
        totalValue: parseFloat(purchaseData.total_order_value),
        ordersBilled: parseInt(purchaseData.orders_with_bills),
        totalBilled: parseFloat(purchaseData.total_billed),
        unbilledValue: parseFloat(purchaseData.unbilled_value),
        billRate: purchaseData.total_orders > 0 
          ? ((parseInt(purchaseData.orders_with_bills) / parseInt(purchaseData.total_orders)) * 100).toFixed(1) + '%'
          : '0%'
      },
      workflowGaps: {
        salesOrdersNeedingInvoices: parseInt(salesData.total_orders) - parseInt(salesData.orders_with_invoices),
        purchaseOrdersNeedingBills: parseInt(purchaseData.total_orders) - parseInt(purchaseData.orders_with_bills),
        potentialARFromOrders: parseFloat(salesData.uninvoiced_value),
        potentialAPFromOrders: parseFloat(purchaseData.unbilled_value)
      }
    };
    
    console.log(`💼 Financial Summary: ${financialSummary.salesOrders.totalOrders} sales orders (${financialSummary.salesOrders.invoiceRate} invoiced), ${financialSummary.purchaseOrders.totalOrders} purchase orders (${financialSummary.purchaseOrders.billRate} billed)`);
    
    res.json(financialSummary);
    
  } catch (error) {
    console.error('Error getting enhanced financial summary:', error);
    res.status(500).json({ error: 'Failed to get enhanced financial summary' });
  }
});

/**
 * Determine workflow status
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