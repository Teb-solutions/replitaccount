/**
 * Enhanced Comprehensive Transaction Tracking API
 * Aligned with actual database schema and user specifications
 */

const pool = require('./database-config');

function setupEnhancedComprehensiveTrackingAPI(app) {
  
  /**
   * @swagger
   * /api/enhanced-ar-tracking/{companyId}:
   *   get:
   *     summary: Get enhanced AR tracking with complete workflow structure
   *     tags: [Enhanced Tracking]
   *     parameters:
   *       - in: path
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID for AR tracking
   *     responses:
   *       200:
   *         description: Enhanced AR tracking with detailed workflow
   */
  app.get('/api/enhanced-ar-tracking/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      console.log(`📈 Getting enhanced AR tracking for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get comprehensive AR summary
      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT so.id) as total_orders,
          COALESCE(SUM(DISTINCT so.total), 0) as total_order_value,
          COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN so.id END) as orders_with_invoices,
          COALESCE(SUM(DISTINCT i.total), 0) as total_invoiced,
          COALESCE(SUM(DISTINCT r.amount), 0) as total_received,
          COALESCE(SUM(DISTINCT CASE WHEN i.balance_due > 0 THEN i.balance_due ELSE 0 END), 0) as pending_invoice_value,
          COALESCE(SUM(DISTINCT CASE WHEN i.balance_due > 0 THEN i.balance_due ELSE 0 END), 0) as pending_receipt_value
        FROM sales_orders so
        LEFT JOIN invoices i ON so.id = i.sales_order_id
        LEFT JOIN receipts r ON i.id = r.invoice_id
        WHERE so.company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get sales orders with complete workflow tracking
      const salesOrdersQuery = `
        SELECT DISTINCT
          so.id as order_id,
          so.order_number,
          so.order_date,
          so.total as order_total,
          so.status,
          so.reference_number,
          c.name as customer_name
        FROM sales_orders so
        LEFT JOIN companies c ON so.customer_id = c.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
        LIMIT 50
      `;

      // Get order items for sales orders
      const orderItemsQuery = `
        SELECT 
          soi.sales_order_id,
          soi.product_id,
          p.product_code,
          p.product_name,
          soi.quantity,
          soi.unit_price,
          soi.amount
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
        WHERE so.company_id = $1
        ORDER BY soi.sales_order_id, soi.id
      `;

      // Get invoices linked to sales orders
      const invoicesQuery = `
        SELECT 
          i.id as invoice_id,
          i.sales_order_id,
          i.invoice_number,
          i.invoice_date,
          i.total as invoice_total,
          i.status,
          i.amount_paid,
          i.balance_due
        FROM invoices i
        LEFT JOIN sales_orders so ON i.sales_order_id = so.id
        WHERE so.company_id = $1
        ORDER BY i.invoice_date DESC
      `;

      // Get invoice items
      const invoiceItemsQuery = `
        SELECT 
          ii.invoice_id,
          ii.product_id,
          p.product_code,
          p.product_name,
          ii.quantity,
          ii.unit_price,
          ii.amount
        FROM invoice_items ii
        LEFT JOIN products p ON ii.product_id = p.id
        LEFT JOIN invoices i ON ii.invoice_id = i.id
        LEFT JOIN sales_orders so ON i.sales_order_id = so.id
        WHERE so.company_id = $1
        ORDER BY ii.invoice_id, ii.id
      `;

      // Get receipts linked to invoices
      const receiptsQuery = `
        SELECT 
          r.id as receipt_id,
          r.invoice_id,
          r.receipt_number,
          r.amount,
          r.receipt_date,
          r.payment_method,
          r.reference_number
        FROM receipts r
        LEFT JOIN invoices i ON r.invoice_id = i.id
        LEFT JOIN sales_orders so ON i.sales_order_id = so.id
        WHERE so.company_id = $1
        ORDER BY r.receipt_date DESC
      `;

      const [salesOrdersResult, orderItemsResult, invoicesResult, invoiceItemsResult, receiptsResult] = await Promise.all([
        pool.query(salesOrdersQuery, [companyId]),
        pool.query(orderItemsQuery, [companyId]),
        pool.query(invoicesQuery, [companyId]),
        pool.query(invoiceItemsQuery, [companyId]),
        pool.query(receiptsQuery, [companyId])
      ]);

      // Group items by their parent IDs
      const orderItemsMap = {};
      orderItemsResult.rows.forEach(item => {
        if (!orderItemsMap[item.sales_order_id]) {
          orderItemsMap[item.sales_order_id] = [];
        }
        orderItemsMap[item.sales_order_id].push({
          productId: item.product_id,
          productCode: item.product_code,
          productName: item.product_name,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        });
      });

      const invoiceItemsMap = {};
      invoiceItemsResult.rows.forEach(item => {
        if (!invoiceItemsMap[item.invoice_id]) {
          invoiceItemsMap[item.invoice_id] = [];
        }
        invoiceItemsMap[item.invoice_id].push({
          productId: item.product_id,
          productCode: item.product_code,
          productName: item.product_name,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unit_price) || 0,
          amount: parseFloat(item.amount) || 0
        });
      });

      // Group invoices by sales order
      const invoicesMap = {};
      invoicesResult.rows.forEach(invoice => {
        if (invoice.sales_order_id) {
          invoicesMap[invoice.sales_order_id] = {
            invoiceId: invoice.invoice_id,
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            invoiceTotal: parseFloat(invoice.invoice_total) || 0,
            status: invoice.status,
            amountPaid: parseFloat(invoice.amount_paid) || 0,
            balanceDue: parseFloat(invoice.balance_due) || 0,
            invoiceItems: invoiceItemsMap[invoice.invoice_id] || []
          };
        }
      });

      // Group receipts by invoice
      const receiptsMap = {};
      receiptsResult.rows.forEach(receipt => {
        if (!receiptsMap[receipt.invoice_id]) {
          receiptsMap[receipt.invoice_id] = [];
        }
        receiptsMap[receipt.invoice_id].push({
          receiptId: receipt.receipt_id,
          receiptNumber: receipt.receipt_number,
          amount: parseFloat(receipt.amount) || 0,
          receiptDate: receipt.receipt_date,
          paymentMethod: receipt.payment_method,
          reference: receipt.reference_number
        });
      });

      // Build complete sales orders with workflow tracking
      const salesOrders = salesOrdersResult.rows.map(order => {
        const invoiceDetails = invoicesMap[order.order_id] || null;
        const receiptDetails = invoiceDetails ? (receiptsMap[invoiceDetails.invoiceId] || []) : [];
        
        let workflowStatus = 'Ordered (Pending Invoice)';
        if (invoiceDetails) {
          if (receiptDetails.length > 0) {
            const totalReceived = receiptDetails.reduce((sum, r) => sum + r.amount, 0);
            if (totalReceived >= invoiceDetails.invoiceTotal) {
              workflowStatus = 'Completed (Fully Paid)';
            } else {
              workflowStatus = 'Partially Paid';
            }
          } else {
            workflowStatus = 'Invoiced (Pending Payment)';
          }
        }

        return {
          orderId: order.order_id,
          orderNumber: order.order_number,
          orderDate: order.order_date,
          customerName: order.customer_name,
          orderTotal: parseFloat(order.order_total) || 0,
          status: order.status,
          orderItems: orderItemsMap[order.order_id] || [],
          invoiceDetails,
          receiptDetails,
          workflowStatus
        };
      });

      res.json({
        success: true,
        companyId: parseInt(companyId),
        companyName: companyCheck.rows[0].name,
        reportDate: new Date().toISOString(),
        summary: {
          totalOrders: parseInt(summary.total_orders) || 0,
          totalOrderValue: parseFloat(summary.total_order_value) || 0,
          ordersWithInvoices: parseInt(summary.orders_with_invoices) || 0,
          totalInvoiced: parseFloat(summary.total_invoiced) || 0,
          totalReceived: parseFloat(summary.total_received) || 0,
          pendingInvoiceValue: parseFloat(summary.pending_invoice_value) || 0,
          pendingReceiptValue: parseFloat(summary.pending_receipt_value) || 0
        },
        salesOrders
      });

    } catch (error) {
      console.error('Error in enhanced AR tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get enhanced AR tracking',
        details: error.message 
      });
    }
  });

  /**
   * @swagger
   * /api/enhanced-ap-tracking/{companyId}:
   *   get:
   *     summary: Get enhanced AP tracking with complete workflow structure
   *     tags: [Enhanced Tracking]
   *     parameters:
   *       - in: path
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID for AP tracking
   *     responses:
   *       200:
   *         description: Enhanced AP tracking with detailed workflow
   */
  app.get('/api/enhanced-ap-tracking/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      console.log(`📈 Getting enhanced AP tracking for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get comprehensive AP summary
      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT po.id) as total_orders,
          COALESCE(SUM(DISTINCT po.total), 0) as total_order_value,
          COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN po.id END) as orders_with_bills,
          COALESCE(SUM(DISTINCT b.total), 0) as total_billed,
          COALESCE(SUM(DISTINCT bp.amount), 0) as total_paid,
          COALESCE(SUM(DISTINCT CASE WHEN b.balance_due > 0 THEN b.balance_due ELSE 0 END), 0) as pending_bill_value
        FROM purchase_orders po
        LEFT JOIN bills b ON po.id = b.purchase_order_id
        LEFT JOIN bill_payments bp ON b.id = bp.bill_id
        WHERE po.company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get purchase orders with complete workflow tracking
      const purchaseOrdersQuery = `
        SELECT DISTINCT
          po.id as order_id,
          po.order_number,
          po.order_date,
          po.total as order_total,
          po.status,
          po.reference_number,
          c.name as vendor_name
        FROM purchase_orders po
        LEFT JOIN companies c ON po.vendor_id = c.id
        WHERE po.company_id = $1
        ORDER BY po.order_date DESC
        LIMIT 50
      `;

      // Get bills linked to purchase orders
      const billsQuery = `
        SELECT 
          b.id as bill_id,
          b.purchase_order_id,
          b.bill_number,
          b.bill_date,
          b.total as bill_total,
          b.status,
          b.amount_paid,
          b.balance_due
        FROM bills b
        LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
        WHERE po.company_id = $1
        ORDER BY b.bill_date DESC
      `;

      // Get bill payments
      const paymentsQuery = `
        SELECT 
          bp.id as payment_id,
          bp.bill_id,
          bp.payment_number,
          bp.amount,
          bp.payment_date,
          bp.payment_method
        FROM bill_payments bp
        LEFT JOIN bills b ON bp.bill_id = b.id
        LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
        WHERE po.company_id = $1
        ORDER BY bp.payment_date DESC
      `;

      const [purchaseOrdersResult, billsResult, paymentsResult] = await Promise.all([
        pool.query(purchaseOrdersQuery, [companyId]),
        pool.query(billsQuery, [companyId]),
        pool.query(paymentsQuery, [companyId])
      ]);

      // Group bills by purchase order
      const billsMap = {};
      billsResult.rows.forEach(bill => {
        if (bill.purchase_order_id) {
          billsMap[bill.purchase_order_id] = {
            billId: bill.bill_id,
            billNumber: bill.bill_number,
            billDate: bill.bill_date,
            billTotal: parseFloat(bill.bill_total) || 0,
            status: bill.status,
            amountPaid: parseFloat(bill.amount_paid) || 0,
            balanceDue: parseFloat(bill.balance_due) || 0,
            billItems: [] // Would need bill_items table query if exists
          };
        }
      });

      // Group payments by bill
      const paymentsMap = {};
      paymentsResult.rows.forEach(payment => {
        if (!paymentsMap[payment.bill_id]) {
          paymentsMap[payment.bill_id] = [];
        }
        paymentsMap[payment.bill_id].push({
          paymentId: payment.payment_id,
          paymentNumber: payment.payment_number,
          amount: parseFloat(payment.amount) || 0,
          paymentDate: payment.payment_date,
          paymentMethod: payment.payment_method
        });
      });

      // Build complete purchase orders with workflow tracking
      const purchaseOrders = purchaseOrdersResult.rows.map(order => {
        const billDetails = billsMap[order.order_id] || null;
        const paymentDetails = billDetails ? (paymentsMap[billDetails.billId] || []) : [];
        
        let workflowStatus = 'Ordered (Pending Bill)';
        if (billDetails) {
          if (paymentDetails.length > 0) {
            const totalPaid = paymentDetails.reduce((sum, p) => sum + p.amount, 0);
            if (totalPaid >= billDetails.billTotal) {
              workflowStatus = 'Completed (Fully Paid)';
            } else {
              workflowStatus = 'Partially Paid';
            }
          } else {
            workflowStatus = 'Billed (Pending Payment)';
          }
        }

        return {
          orderId: order.order_id,
          orderNumber: order.order_number,
          orderDate: order.order_date,
          vendorName: order.vendor_name,
          orderTotal: parseFloat(order.order_total) || 0,
          status: order.status,
          orderItems: [], // Would need purchase_order_items table query if exists
          billDetails,
          paymentDetails,
          workflowStatus
        };
      });

      res.json({
        success: true,
        companyId: parseInt(companyId),
        companyName: companyCheck.rows[0].name,
        reportDate: new Date().toISOString(),
        summary: {
          totalOrders: parseInt(summary.total_orders) || 0,
          totalOrderValue: parseFloat(summary.total_order_value) || 0,
          ordersWithBills: parseInt(summary.orders_with_bills) || 0,
          totalBilled: parseFloat(summary.total_billed) || 0,
          totalPaid: parseFloat(summary.total_paid) || 0,
          pendingBillValue: parseFloat(summary.pending_bill_value) || 0,
          pendingPaymentValue: parseFloat(summary.pending_bill_value) || 0
        },
        purchaseOrders
      });

    } catch (error) {
      console.error('Error in enhanced AP tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get enhanced AP tracking',
        details: error.message 
      });
    }
  });

  console.log('✅ Enhanced Comprehensive Transaction Tracking API endpoints registered');
}

module.exports = { setupEnhancedComprehensiveTrackingAPI };