/**
 * Comprehensive Transaction Tracking API
 * Provides complete order-to-payment workflow tracking with detailed line items
 */

const pool = require('./database-config');

function setupComprehensiveTransactionTrackingAPI(app) {
  
  /**
   * @swagger
   * /api/comprehensive-ar-tracking/{companyId}:
   *   get:
   *     summary: Get comprehensive AR tracking with complete workflow
   *     tags: [Comprehensive Tracking]
   *     parameters:
   *       - in: path
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID to get comprehensive AR tracking for
   *     responses:
   *       200:
   *         description: Comprehensive AR tracking with workflow details
   */
  app.get('/api/comprehensive-ar-tracking/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      console.log(`📈 Getting comprehensive AR tracking for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get comprehensive summary
      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT so.id) as total_orders,
          COALESCE(SUM(DISTINCT so.total), 0) as total_order_value,
          COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN so.id END) as orders_with_invoices,
          COALESCE(SUM(DISTINCT i.total), 0) as total_invoiced,
          COALESCE(SUM(DISTINCT r.amount), 0) as total_received,
          COALESCE(SUM(DISTINCT CASE WHEN i.status = 'pending' THEN i.balance_due ELSE 0 END), 0) as pending_invoice_value,
          COALESCE(SUM(DISTINCT CASE WHEN i.status = 'pending' THEN i.balance_due ELSE 0 END), 0) as pending_receipt_value
        FROM sales_orders so
        LEFT JOIN invoices i ON so.id = i.sales_order_id
        LEFT JOIN receipts r ON i.id = r.invoice_id
        WHERE so.company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get detailed sales orders with complete workflow
      const salesOrdersQuery = `
        SELECT 
          so.id as order_id,
          so.order_number,
          so.order_date,
          so.total as order_total,
          so.status,
          so.reference_number as order_reference,
          c.name as customer_name,
          
          -- Invoice details
          i.id as invoice_id,
          i.invoice_number,
          i.invoice_date,
          i.total as invoice_total,
          i.status as invoice_status,
          i.amount_paid as invoice_amount_paid,
          i.balance_due as invoice_balance_due,
          
          -- Receipt details
          r.id as receipt_id,
          r.receipt_number,
          r.amount as receipt_amount,
          r.receipt_date,
          r.payment_method,
          r.reference_number as receipt_reference
          
        FROM sales_orders so
        LEFT JOIN companies c ON so.customer_id = c.id
        LEFT JOIN invoices i ON so.id = i.sales_order_id
        LEFT JOIN receipts r ON i.id = r.invoice_id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
        LIMIT 50
      `;

      // Get order items for each sales order
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
        WHERE soi.sales_order_id IN (
          SELECT so.id FROM sales_orders so WHERE so.company_id = $1
        )
        ORDER BY soi.sales_order_id, soi.id
      `;

      // Get invoice items for each invoice
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

      const [salesOrdersResult, orderItemsResult, invoiceItemsResult] = await Promise.all([
        pool.query(salesOrdersQuery, [companyId]),
        pool.query(orderItemsQuery, [companyId]),
        pool.query(invoiceItemsQuery, [companyId])
      ]);

      // Group items by order/invoice
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

      // Group sales orders with their related transactions
      const salesOrdersMap = {};
      const receiptsMap = {};

      salesOrdersResult.rows.forEach(row => {
        const orderId = row.order_id;
        
        if (!salesOrdersMap[orderId]) {
          salesOrdersMap[orderId] = {
            orderId: orderId,
            orderNumber: row.order_number,
            orderDate: row.order_date,
            customerName: row.customer_name,
            orderTotal: parseFloat(row.order_total) || 0,
            status: row.status,
            orderReference: row.order_reference,
            orderItems: orderItemsMap[orderId] || [],
            invoiceDetails: null,
            receiptDetails: [],
            workflowStatus: 'Ordered (Pending Invoice)'
          };
        }

        // Add invoice details if exists
        if (row.invoice_id && !salesOrdersMap[orderId].invoiceDetails) {
          salesOrdersMap[orderId].invoiceDetails = {
            invoiceId: row.invoice_id,
            invoiceNumber: row.invoice_number,
            invoiceDate: row.invoice_date,
            invoiceTotal: parseFloat(row.invoice_total) || 0,
            status: row.invoice_status,
            amountPaid: parseFloat(row.invoice_amount_paid) || 0,
            balanceDue: parseFloat(row.invoice_balance_due) || 0,
            invoiceItems: invoiceItemsMap[row.invoice_id] || []
          };
          salesOrdersMap[orderId].workflowStatus = 'Invoiced (Pending Payment)';
        }

        // Add receipt details if exists
        if (row.receipt_id) {
          const receiptExists = salesOrdersMap[orderId].receiptDetails.find(r => r.receiptId === row.receipt_id);
          if (!receiptExists) {
            salesOrdersMap[orderId].receiptDetails.push({
              receiptId: row.receipt_id,
              receiptNumber: row.receipt_number,
              amount: parseFloat(row.receipt_amount) || 0,
              receiptDate: row.receipt_date,
              paymentMethod: row.payment_method,
              reference: row.receipt_reference
            });
            
            // Update workflow status based on payment
            const totalReceived = salesOrdersMap[orderId].receiptDetails.reduce((sum, r) => sum + r.amount, 0);
            const invoiceTotal = salesOrdersMap[orderId].invoiceDetails?.invoiceTotal || 0;
            
            if (totalReceived >= invoiceTotal) {
              salesOrdersMap[orderId].workflowStatus = 'Completed (Fully Paid)';
            } else {
              salesOrdersMap[orderId].workflowStatus = 'Partially Paid';
            }
          }
        }
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
        salesOrders: Object.values(salesOrdersMap)
      });

    } catch (error) {
      console.error('Error in comprehensive AR tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get comprehensive AR tracking',
        details: error.message 
      });
    }
  });

  /**
   * @swagger
   * /api/comprehensive-ap-tracking/{companyId}:
   *   get:
   *     summary: Get comprehensive AP tracking with complete workflow
   *     tags: [Comprehensive Tracking]
   *     parameters:
   *       - in: path
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID to get comprehensive AP tracking for
   *     responses:
   *       200:
   *         description: Comprehensive AP tracking with workflow details
   */
  app.get('/api/comprehensive-ap-tracking/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      console.log(`📈 Getting comprehensive AP tracking for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get comprehensive AP summary
      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT po.id) as total_purchase_orders,
          COALESCE(SUM(DISTINCT po.total), 0) as total_order_value,
          COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN po.id END) as orders_with_bills,
          COALESCE(SUM(DISTINCT b.total), 0) as total_billed,
          COALESCE(SUM(DISTINCT bp.amount), 0) as total_paid,
          COALESCE(SUM(DISTINCT CASE WHEN b.status = 'pending' THEN b.balance_due ELSE 0 END), 0) as pending_bill_value
        FROM purchase_orders po
        LEFT JOIN bills b ON po.id = b.purchase_order_id
        LEFT JOIN bill_payments bp ON b.id = bp.bill_id
        WHERE po.company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get detailed purchase orders with complete workflow
      const purchaseOrdersQuery = `
        SELECT 
          po.id as order_id,
          po.order_number,
          po.order_date,
          po.total as order_total,
          po.status,
          po.reference_number as order_reference,
          c.name as vendor_name,
          
          -- Bill details
          b.id as bill_id,
          b.bill_number,
          b.bill_date,
          b.total as bill_total,
          b.status as bill_status,
          b.amount_paid as bill_amount_paid,
          b.balance_due as bill_balance_due,
          
          -- Payment details
          bp.id as payment_id,
          bp.payment_number,
          bp.amount as payment_amount,
          bp.payment_date,
          bp.payment_method,
          bp.reference_number as payment_reference
          
        FROM purchase_orders po
        LEFT JOIN companies c ON po.vendor_id = c.id
        LEFT JOIN bills b ON po.id = b.purchase_order_id
        LEFT JOIN bill_payments bp ON b.id = bp.bill_id
        WHERE po.company_id = $1
        ORDER BY po.order_date DESC
        LIMIT 50
      `;

      const purchaseOrdersResult = await pool.query(purchaseOrdersQuery, [companyId]);

      // Group purchase orders with their related transactions
      const purchaseOrdersMap = {};

      purchaseOrdersResult.rows.forEach(row => {
        const orderId = row.order_id;
        
        if (!purchaseOrdersMap[orderId]) {
          purchaseOrdersMap[orderId] = {
            orderId: orderId,
            orderNumber: row.order_number,
            orderDate: row.order_date,
            vendorName: row.vendor_name,
            orderTotal: parseFloat(row.order_total) || 0,
            status: row.status,
            orderReference: row.order_reference,
            billDetails: null,
            paymentDetails: [],
            workflowStatus: 'Ordered (Pending Bill)'
          };
        }

        // Add bill details if exists
        if (row.bill_id && !purchaseOrdersMap[orderId].billDetails) {
          purchaseOrdersMap[orderId].billDetails = {
            billId: row.bill_id,
            billNumber: row.bill_number,
            billDate: row.bill_date,
            billTotal: parseFloat(row.bill_total) || 0,
            status: row.bill_status,
            amountPaid: parseFloat(row.bill_amount_paid) || 0,
            balanceDue: parseFloat(row.bill_balance_due) || 0
          };
          purchaseOrdersMap[orderId].workflowStatus = 'Billed (Pending Payment)';
        }

        // Add payment details if exists
        if (row.payment_id) {
          const paymentExists = purchaseOrdersMap[orderId].paymentDetails.find(p => p.paymentId === row.payment_id);
          if (!paymentExists) {
            purchaseOrdersMap[orderId].paymentDetails.push({
              paymentId: row.payment_id,
              paymentNumber: row.payment_number,
              amount: parseFloat(row.payment_amount) || 0,
              paymentDate: row.payment_date,
              paymentMethod: row.payment_method,
              reference: row.payment_reference
            });
            
            // Update workflow status based on payment
            const totalPaid = purchaseOrdersMap[orderId].paymentDetails.reduce((sum, p) => sum + p.amount, 0);
            const billTotal = purchaseOrdersMap[orderId].billDetails?.billTotal || 0;
            
            if (totalPaid >= billTotal) {
              purchaseOrdersMap[orderId].workflowStatus = 'Completed (Fully Paid)';
            } else {
              purchaseOrdersMap[orderId].workflowStatus = 'Partially Paid';
            }
          }
        }
      });

      res.json({
        success: true,
        companyId: parseInt(companyId),
        companyName: companyCheck.rows[0].name,
        reportDate: new Date().toISOString(),
        summary: {
          totalPurchaseOrders: parseInt(summary.total_purchase_orders) || 0,
          totalOrderValue: parseFloat(summary.total_order_value) || 0,
          ordersWithBills: parseInt(summary.orders_with_bills) || 0,
          totalBilled: parseFloat(summary.total_billed) || 0,
          totalPaid: parseFloat(summary.total_paid) || 0,
          pendingBillValue: parseFloat(summary.pending_bill_value) || 0
        },
        purchaseOrders: Object.values(purchaseOrdersMap)
      });

    } catch (error) {
      console.error('Error in comprehensive AP tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get comprehensive AP tracking',
        details: error.message 
      });
    }
  });

  console.log('✅ Comprehensive Transaction Tracking API endpoints registered');
}

module.exports = { setupComprehensiveTransactionTrackingAPI };