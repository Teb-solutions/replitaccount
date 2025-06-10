/**
 * Working Comprehensive Transaction Tracking API
 * Uses authentic database structure and appears in Swagger
 */

const pool = require('./database-config');

function setupWorkingComprehensiveTracking(app) {
  
  /**
   * @swagger
   * /api/working-ar-tracking:
   *   get:
   *     summary: Working AR tracking with complete order-invoice-receipt flow
   *     tags: [Working Tracking]
   *     parameters:
   *       - in: query
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID for AR tracking
   *     responses:
   *       200:
   *         description: Complete AR workflow with detailed tracking
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 companyId:
   *                   type: integer
   *                 companyName:
   *                   type: string
   *                 reportDate:
   *                   type: string
   *                 summary:
   *                   type: object
   *                   properties:
   *                     totalOrders:
   *                       type: integer
   *                     totalOrderValue:
   *                       type: number
   *                     ordersWithInvoices:
   *                       type: integer
   *                     totalInvoiced:
   *                       type: number
   *                     totalReceived:
   *                       type: number
   *                     pendingInvoiceValue:
   *                       type: number
   *                     pendingReceiptValue:
   *                       type: number
   *                 salesOrders:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       orderId:
   *                         type: integer
   *                       orderNumber:
   *                         type: string
   *                       orderDate:
   *                         type: string
   *                       customerName:
   *                         type: string
   *                       orderTotal:
   *                         type: number
   *                       status:
   *                         type: string
   *                       orderItems:
   *                         type: array
   *                       invoiceDetails:
   *                         type: object
   *                       receiptDetails:
   *                         type: array
   *                       workflowStatus:
   *                         type: string
   */
  app.get('/api/working-ar-tracking', async (req, res) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }
      
      console.log(`📈 Working AR tracking for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get sales orders (working query)
      const salesOrdersQuery = `
        SELECT 
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

      // Get invoices linked to sales orders
      const invoicesQuery = `
        SELECT 
          i.id as invoice_id,
          i.sales_order_id,
          i.invoice_number,
          i.invoice_date,
          i.total as invoice_total,
          i.status,
          COALESCE(i.amount_paid, 0) as amount_paid,
          COALESCE(i.balance_due, i.total) as balance_due
        FROM invoices i
        WHERE EXISTS (
          SELECT 1 FROM sales_orders so 
          WHERE so.id = i.sales_order_id 
          AND so.company_id = $1
        )
        ORDER BY i.invoice_date DESC
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
        WHERE EXISTS (
          SELECT 1 FROM invoices i
          JOIN sales_orders so ON i.sales_order_id = so.id
          WHERE i.id = r.invoice_id 
          AND so.company_id = $1
        )
        ORDER BY r.receipt_date DESC
      `;

      const [salesOrdersResult, invoicesResult, receiptsResult] = await Promise.all([
        pool.query(salesOrdersQuery, [companyId]),
        pool.query(invoicesQuery, [companyId]),
        pool.query(receiptsQuery, [companyId])
      ]);

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
            invoiceItems: []
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

      // Build comprehensive workflow
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
          orderItems: [],
          invoiceDetails,
          receiptDetails,
          workflowStatus
        };
      });

      // Calculate summary
      const totalOrders = salesOrders.length;
      const totalOrderValue = salesOrders.reduce((sum, order) => sum + order.orderTotal, 0);
      const ordersWithInvoices = salesOrders.filter(order => order.invoiceDetails).length;
      const totalInvoiced = salesOrders.reduce((sum, order) => 
        sum + (order.invoiceDetails ? order.invoiceDetails.invoiceTotal : 0), 0);
      const totalReceived = salesOrders.reduce((sum, order) => 
        sum + order.receiptDetails.reduce((receiptSum, receipt) => receiptSum + receipt.amount, 0), 0);
      const pendingInvoiceValue = salesOrders.reduce((sum, order) => 
        sum + (order.invoiceDetails ? order.invoiceDetails.balanceDue : 0), 0);

      res.json({
        success: true,
        companyId: parseInt(companyId),
        companyName: companyCheck.rows[0].name,
        reportDate: new Date().toISOString(),
        summary: {
          totalOrders,
          totalOrderValue,
          ordersWithInvoices,
          totalInvoiced,
          totalReceived,
          pendingInvoiceValue,
          pendingReceiptValue: pendingInvoiceValue
        },
        salesOrders
      });

    } catch (error) {
      console.error('Error in working AR tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get working AR tracking',
        details: error.message 
      });
    }
  });

  /**
   * @swagger
   * /api/working-ap-tracking:
   *   get:
   *     summary: Working AP tracking with complete purchase order-bill-payment flow
   *     tags: [Working Tracking]
   *     parameters:
   *       - in: query
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID for AP tracking
   *     responses:
   *       200:
   *         description: Complete AP workflow with detailed tracking
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 companyId:
   *                   type: integer
   *                 companyName:
   *                   type: string
   *                 summary:
   *                   type: object
   *                 purchaseOrders:
   *                   type: array
   */
  app.get('/api/working-ap-tracking', async (req, res) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }
      
      console.log(`📈 Working AP tracking for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get purchase orders
      const purchaseOrdersQuery = `
        SELECT 
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
          COALESCE(b.amount_paid, 0) as amount_paid,
          COALESCE(b.balance_due, b.total) as balance_due
        FROM bills b
        WHERE EXISTS (
          SELECT 1 FROM purchase_orders po 
          WHERE po.id = b.purchase_order_id 
          AND po.company_id = $1
        )
        ORDER BY b.bill_date DESC
      `;

      // Get bill payments (using correct table name)
      const paymentsQuery = `
        SELECT 
          bp.id as payment_id,
          bp.bill_id,
          bp.payment_number,
          bp.amount,
          bp.payment_date,
          bp.payment_method
        FROM bill_payments bp
        WHERE EXISTS (
          SELECT 1 FROM bills b
          JOIN purchase_orders po ON b.purchase_order_id = po.id
          WHERE b.id = bp.bill_id 
          AND po.company_id = $1
        )
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
            billItems: []
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

      // Build comprehensive workflow
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
          orderItems: [],
          billDetails,
          paymentDetails,
          workflowStatus
        };
      });

      // Calculate summary
      const totalOrders = purchaseOrders.length;
      const totalOrderValue = purchaseOrders.reduce((sum, order) => sum + order.orderTotal, 0);
      const ordersWithBills = purchaseOrders.filter(order => order.billDetails).length;
      const totalBilled = purchaseOrders.reduce((sum, order) => 
        sum + (order.billDetails ? order.billDetails.billTotal : 0), 0);
      const totalPaid = purchaseOrders.reduce((sum, order) => 
        sum + order.paymentDetails.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
      const pendingBillValue = purchaseOrders.reduce((sum, order) => 
        sum + (order.billDetails ? order.billDetails.balanceDue : 0), 0);

      res.json({
        success: true,
        companyId: parseInt(companyId),
        companyName: companyCheck.rows[0].name,
        reportDate: new Date().toISOString(),
        summary: {
          totalOrders,
          totalOrderValue,
          ordersWithBills,
          totalBilled,
          totalPaid,
          pendingBillValue,
          pendingPaymentValue: pendingBillValue
        },
        purchaseOrders
      });

    } catch (error) {
      console.error('Error in working AP tracking:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get working AP tracking',
        details: error.message 
      });
    }
  });

  console.log('✅ Working Comprehensive Transaction Tracking API endpoints registered');
}

module.exports = { setupWorkingComprehensiveTracking };