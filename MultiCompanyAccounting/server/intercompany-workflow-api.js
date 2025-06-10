/**
 * Intercompany Transaction Workflow API
 * 
 * Provides complete intercompany transaction workflow endpoints:
 * - Create sales orders
 * - Create invoices from sales orders
 * - Create bills from purchase orders  
 * - Create purchase orders
 * - Create receipt payments
 * - Complete workflow automation
 */

// Import database connection - using require for CommonJS compatibility
const { Pool } = require('pg');

// Create dedicated pool for intercompany operations
const externalPool = new Pool({
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

/**
 * Register all intercompany workflow API endpoints
 */
function registerIntercompanyWorkflowAPI(app) {
  console.log('🔄 Registering Intercompany Workflow API...');

  /**
   * @swagger
   * components:
   *   schemas:
   *     SalesOrderRequest:
   *       type: object
   *       required:
   *         - sourceCompanyId
   *         - targetCompanyId
   *         - products
   *       properties:
   *         sourceCompanyId:
   *           type: integer
   *           description: ID of the selling company
   *           example: 7
   *         targetCompanyId:
   *           type: integer
   *           description: ID of the buying company
   *           example: 8
   *         products:
   *           type: array
   *           items:
   *             type: object
   *             properties:
   *               productId:
   *                 type: integer
   *               quantity:
   *                 type: number
   *               unitPrice:
   *                 type: number
   *         orderTotal:
   *           type: number
   *           example: 10000
   *         referenceNumber:
   *           type: string
   *           description: Reference number for transaction tracking
   *           example: "IC-REF-7-8-1748343930801"
   *     InvoiceRequest:
   *       type: object
   *       required:
   *         - salesOrderId
   *         - companyId
   *       properties:
   *         salesOrderId:
   *           type: integer
   *           description: ID of the sales order to invoice
   *           example: 70
   *         companyId:
   *           type: integer
   *           description: ID of the invoicing company
   *           example: 7
   *         partialAmount:
   *           type: number
   *           description: Amount for partial invoice (optional)
   *           example: 5000
   *         referenceNumber:
   *           type: string
   *           description: Reference number for transaction tracking
   *           example: "INV-REF-7-8-1748343930801"
   *     BillRequest:
   *       type: object
   *       required:
   *         - purchaseOrderId
   *         - companyId
   *       properties:
   *         purchaseOrderId:
   *           type: integer
   *           description: ID of the purchase order to bill
   *           example: 28
   *         companyId:
   *           type: integer
   *           description: ID of the company receiving the bill
   *           example: 8
   *         partialAmount:
   *           type: number
   *           description: Amount for partial bill (optional)
   *           example: 5000
   *     PurchaseOrderRequest:
   *       type: object
   *       required:
   *         - sourceCompanyId
   *         - targetCompanyId
   *         - products
   *       properties:
   *         sourceCompanyId:
   *           type: integer
   *           description: ID of the buying company
   *           example: 8
   *         targetCompanyId:
   *           type: integer
   *           description: ID of the selling company
   *           example: 7
   *         products:
   *           type: array
   *           items:
   *             type: object
   *             properties:
   *               productId:
   *                 type: integer
   *               quantity:
   *                 type: number
   *               unitPrice:
   *                 type: number
   *         orderTotal:
   *           type: number
   *           example: 10000
   *     ReceiptPaymentRequest:
   *       type: object
   *       required:
   *         - invoiceId
   *         - companyId
   *         - amount
   *       properties:
   *         invoiceId:
   *           type: integer
   *           description: ID of the invoice to pay
   *           example: 150
   *         companyId:
   *           type: integer
   *           description: ID of the paying company
   *           example: 8
   *         amount:
   *           type: number
   *           description: Payment amount
   *           example: 5000
   *         paymentMethod:
   *           type: string
   *           description: Payment method
   *           example: "Bank Transfer"
   *           enum: ["Cash", "Bank Transfer", "Check", "Credit Card"]
   */

  /**
   * @swagger
   * /api/intercompany/sales-order:
   *   post:
   *     summary: Create intercompany sales order
   *     description: Creates a new sales order between two companies in the intercompany workflow
   *     tags: [Intercompany Workflow]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SalesOrderRequest'
   *     responses:
   *       201:
   *         description: Sales order created successfully with target company details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 salesOrderId:
   *                   type: integer
   *                   description: Generated sales order ID
   *                   example: 106
   *                 salesOrderNumber:
   *                   type: string
   *                   description: Generated sales order number
   *                   example: "SO-7-1748350322903"
   *                 referenceNumber:
   *                   type: string
   *                   description: Reference number for tracking
   *                   example: "IC-REF-7-8-1748343930866"
   *                 totalAmount:
   *                   type: number
   *                   description: Total order amount
   *                   example: 10000
   *                 status:
   *                   type: string
   *                   description: Order status
   *                   example: "Pending"
   *                 sourceCompany:
   *                   type: object
   *                   description: Source company details
   *                   properties:
   *                     id:
   *                       type: integer
   *                       description: Source company ID
   *                       example: 7
   *                     name:
   *                       type: string
   *                       description: Source company name
   *                       example: "Gas Manufacturing Co"
   *                 targetCompany:
   *                   type: object
   *                   description: Target company details
   *                   properties:
   *                     id:
   *                       type: integer
   *                       description: Target company ID
   *                       example: 8
   *                     name:
   *                       type: string
   *                       description: Target company name
   *                       example: "Gas Distributor Co"
   *                     purchaseOrder:
   *                       type: object
   *                       description: Corresponding purchase order created for target company
   *                       properties:
   *                         purchaseOrderId:
   *                           type: integer
   *                           description: Purchase order ID in target company
   *                           example: 28
   *                         orderNumber:
   *                           type: string
   *                           description: Purchase order number in target company
   *                           example: "PO-8-1748350322903"
   *                         referenceNumber:
   *                           type: string
   *                           description: Purchase order reference number
   *                           example: "PO-REF-8-1748350322903"
   *                 tracking:
   *                   type: object
   *                   description: Transaction tracking information
   *                   properties:
   *                     sourceCompany:
   *                       type: integer
   *                       description: Source company ID
   *                       example: 7
   *                     targetCompany:
   *                       type: integer
   *                       description: Target company ID
   *                       example: 8
   *                     salesOrderId:
   *                       type: integer
   *                       description: Sales order ID
   *                       example: 106
   *                     salesOrderNumber:
   *                       type: string
   *                       description: Sales order number
   *                       example: "SO-7-1748350322903"
   *                     reference:
   *                       type: string
   *                       description: Reference number for tracking
   *                       example: "IC-REF-7-8-1748343930866"
   *                     canTrackTransactions:
   *                       type: boolean
   *                       description: Whether transactions can be tracked
   *                       example: true
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  app.post('/api/intercompany/sales-order', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, products, orderTotal = 10000, referenceNumber } = req.body;
      
      console.log(`📝 Creating sales order from company ${sourceCompanyId} to ${targetCompanyId}`);
      console.log(`📋 Using reference number: ${referenceNumber}`);
      console.log(`🚀 Starting enhanced sales order creation process...`);
      
      // Get next sequence number
      const sequenceResult = await externalPool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num 
         FROM sales_orders WHERE company_id = $1`,
        [sourceCompanyId]
      );
      const nextOrderNum = sequenceResult.rows[0].next_num;
      const orderNumber = `SO-${sourceCompanyId}-${Date.now()}-${nextOrderNum}`;
      
      // Use provided reference number or generate one
      const finalReferenceNumber = referenceNumber || `IC-REF-${sourceCompanyId}-${targetCompanyId}-${Date.now()}`;
      
      // Create sales order
      const salesOrderResult = await externalPool.query(`
        INSERT INTO sales_orders (company_id, customer_id, order_number, order_date, total, status, created_at, reference_number)
        VALUES ($1, $2, $3, NOW(), $4, 'Pending', NOW(), $5)
        RETURNING id, order_number, total, reference_number
      `, [sourceCompanyId, targetCompanyId, orderNumber, orderTotal, finalReferenceNumber]);
      
      const salesOrder = salesOrderResult.rows[0];
      
      // Create order items
      for (const product of products) {
        await externalPool.query(`
          INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [salesOrder.id, product.productId, product.quantity, product.unitPrice, product.quantity * product.unitPrice]);
      }
      
      // Create corresponding purchase order for target company
      const purchaseOrderNumber = `PO-${targetCompanyId}-${Date.now()}`;
      const purchaseReferenceNumber = `PO-REF-${targetCompanyId}-${Date.now()}`;
      
      const purchaseOrderResult = await externalPool.query(`
        INSERT INTO purchase_orders (company_id, vendor_id, order_number, order_date, total, status, created_at, reference_number)
        VALUES ($1, $2, $3, NOW(), $4, 'Pending', NOW(), $5)
        RETURNING id, order_number, total, reference_number
      `, [targetCompanyId, sourceCompanyId, purchaseOrderNumber, orderTotal, purchaseReferenceNumber]);
      
      const purchaseOrder = purchaseOrderResult.rows[0];
      
      // Get company details for enhanced response
      const sourceCompanyResult = await externalPool.query(`
        SELECT id, name FROM companies WHERE id = $1
      `, [sourceCompanyId]);
      
      const targetCompanyResult = await externalPool.query(`
        SELECT id, name FROM companies WHERE id = $1
      `, [targetCompanyId]);
      
      const sourceCompany = sourceCompanyResult.rows[0];
      const targetCompany = targetCompanyResult.rows[0];
      
      console.log(`✅ Sales order created: ${salesOrder.order_number}`);
      console.log(`✅ Purchase order created: ${purchaseOrder.order_number}`);
      console.log(`🏢 Source company: ${sourceCompany.name} (ID: ${sourceCompany.id})`);
      console.log(`🏢 Target company: ${targetCompany.name} (ID: ${targetCompany.id})`);
      console.log(`📋 About to return enhanced response with target company purchase order details`);
      
      res.status(201).json({
        salesOrderId: salesOrder.id,
        salesOrderNumber: salesOrder.order_number,
        referenceNumber: finalReferenceNumber,
        totalAmount: parseFloat(salesOrder.total),
        status: 'Pending',
        sourceCompany: {
          id: sourceCompany.id,
          name: sourceCompany.name
        },
        targetCompany: {
          id: targetCompany.id,
          name: targetCompany.name,
          purchaseOrder: {
            purchaseOrderId: purchaseOrder.id,
            orderNumber: purchaseOrder.order_number,
            referenceNumber: purchaseReferenceNumber
          }
        },
        tracking: {
          sourceCompany: {
            id: sourceCompany.id,
            name: sourceCompany.name
          },
          targetCompany: {
            id: targetCompany.id,
            name: targetCompany.name
          },
          salesOrderId: salesOrder.id,
          salesOrderNumber: salesOrder.order_number,
          reference: finalReferenceNumber,
          canTrackTransactions: true
        }
      });
      
    } catch (error) {
      console.error('❌ Error creating sales order:', error);
      console.error('Full error details:', error);
      res.status(500).json({
        error: 'Failed to create sales order',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/intercompany/invoice:
   *   post:
   *     summary: Create invoice from sales order
   *     description: Creates an invoice for a sales order in the intercompany workflow
   *     tags: [Intercompany Workflow]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/InvoiceRequest'
   *     responses:
   *       201:
   *         description: Invoice created successfully with target company bill details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 invoiceId:
   *                   type: integer
   *                   description: Generated invoice ID
   *                   example: 84
   *                 invoiceNumber:
   *                   type: string
   *                   description: Generated invoice number
   *                   example: "INV-7-1748350123"
   *                 referenceNumber:
   *                   type: string
   *                   description: Reference number for tracking
   *                   example: "INV-REF-7-8-1748350123"
   *                 totalAmount:
   *                   type: number
   *                   description: Invoice amount
   *                   example: 5000
   *                 status:
   *                   type: string
   *                   description: Invoice status
   *                   example: "open"
   *                 sourceCompany:
   *                   type: object
   *                   description: Source company (invoice issuer) details
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 7
   *                     name:
   *                       type: string
   *                       example: "Gas Manufacturing Co"
   *                 targetCompany:
   *                   type: object
   *                   description: Target company details and corresponding bill
   *                   properties:
   *                     id:
   *                       type: integer
   *                       description: Target company ID
   *                       example: 8
   *                     name:
   *                       type: string
   *                       description: Target company name
   *                       example: "Gas Distributor Co"
   *                     bill:
   *                       type: object
   *                       description: Corresponding bill created for target company
   *                       properties:
   *                         billId:
   *                           type: integer
   *                           description: Bill ID in target company
   *                           example: 45
   *                         billNumber:
   *                           type: string
   *                           description: Bill number in target company
   *                           example: "BILL-8-1748350123"
   *                         amount:
   *                           type: number
   *                           description: Bill amount
   *                           example: 5000
   *                         status:
   *                           type: string
   *                           description: Bill status
   *                           example: "Open"
   *                         referenceNumber:
   *                           type: string
   *                           description: Bill reference number
   *                           example: "BILL-REF-8-1748350123"
   *                 salesOrder:
   *                   type: object
   *                   description: Related sales order information
   *                   properties:
   *                     salesOrderId:
   *                       type: integer
   *                       example: 76
   *                     orderNumber:
   *                       type: string
   *                       example: "SO-7-1748350123"
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  app.post('/api/intercompany/invoice', async (req, res) => {
    try {
      const { salesOrderId, companyId, partialAmount, referenceNumber } = req.body;
      
      console.log(`📄 Creating intercompany invoice for sales order ${salesOrderId} by company ${companyId}`);
      console.log(`📋 Using reference number: ${referenceNumber}`);
      
      // Get sales order details
      const salesOrderResult = await externalPool.query(`
        SELECT * FROM sales_orders WHERE id = $1 AND company_id = $2
      `, [salesOrderId, companyId]);
      
      if (salesOrderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sales order not found' });
      }
      
      const salesOrder = salesOrderResult.rows[0];
      const invoiceAmount = partialAmount || parseFloat(salesOrder.total);
      
      // Generate unique reference number if not provided
      const timestamp = Date.now();
      const finalReferenceNumber = referenceNumber || `INV-REF-${companyId}-${salesOrder.customer_id}-${timestamp}`;
      
      // Generate invoice number for selling company
      const invoiceSeqResult = await externalPool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num 
         FROM invoices WHERE company_id = $1`,
        [companyId]
      );
      const nextInvoiceNum = invoiceSeqResult.rows[0].next_num;
      const invoiceNumber = `INV-${companyId}-${timestamp}`;
      
      // Create invoice for selling company
      const invoiceResult = await externalPool.query(`
        INSERT INTO invoices (
          company_id, customer_id, sales_order_id, invoice_number, 
          invoice_date, due_date, subtotal, tax_amount, total, 
          amount_paid, balance_due, status, created_at, reference_number
        ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days', $5, 0, $5, 0, $5, 'open', NOW(), $6)
        RETURNING id, invoice_number, total, reference_number
      `, [companyId, salesOrder.customer_id, salesOrderId, invoiceNumber, invoiceAmount, finalReferenceNumber]);
      
      const invoice = invoiceResult.rows[0];
      
      // Create invoice items for selling company
      const orderItemsResult = await externalPool.query(`
        SELECT * FROM sales_order_items WHERE sales_order_id = $1
      `, [salesOrderId]);
      
      for (const item of orderItemsResult.rows) {
        const itemAmount = partialAmount ? (parseFloat(item.amount) * (partialAmount / parseFloat(salesOrder.total))) : parseFloat(item.amount);
        await externalPool.query(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [invoice.id, item.product_id, item.quantity, item.unit_price, itemAmount]);
      }
      
      // Create corresponding bill for buying company
      const billSeqResult = await externalPool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num 
         FROM invoices WHERE company_id = $1`,
        [salesOrder.customer_id]
      );
      const nextBillNum = billSeqResult.rows[0].next_num;
      const billNumber = `BILL-${salesOrder.customer_id}-${timestamp}`;
      const billReferenceNumber = `BILL-REF-${salesOrder.customer_id}-${companyId}-${timestamp}`;
      
      // Create bill for buying company
      const billResult = await externalPool.query(`
        INSERT INTO bills (
          id, company_id, vendor_id, purchase_order_id, bill_number, 
          bill_date, due_date, subtotal, tax_amount, total, 
          amount_paid, balance_due, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '30 days', $6, 0, $6, 0, $6, 'Open', NOW())
        RETURNING id, bill_number, total
      `, [await getNextSequence('bills'), salesOrder.customer_id, companyId, salesOrderId, billNumber, invoiceAmount]);
      
      const bill = billResult.rows[0];
      
      // Create bill items for buying company
      for (const item of orderItemsResult.rows) {
        const itemAmount = partialAmount ? (parseFloat(item.amount) * (partialAmount / parseFloat(salesOrder.total))) : parseFloat(item.amount);
        await externalPool.query(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [bill.id, item.product_id, item.quantity, item.unit_price, itemAmount]);
      }
      
      console.log(`✅ Invoice created: ${invoice.invoice_number} (${finalReferenceNumber})`);
      console.log(`✅ Bill created: ${bill.invoice_number} (${billReferenceNumber})`);
      
      res.status(201).json({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        referenceNumber: finalReferenceNumber,
        amount: parseFloat(invoice.total),
        status: 'open',
        tracking: {
          sourceCompany: companyId,
          targetCompany: salesOrder.customer_id,
          reference: finalReferenceNumber,
          canTrackTransactions: true
        },
        bill: {
          billId: bill.id,
          billNumber: bill.invoice_number,
          billReference: billReferenceNumber,
          amount: parseFloat(bill.total)
        },
        message: 'Intercompany invoice and bill created successfully'
      });
      
    } catch (error) {
      console.error('❌ Error creating intercompany invoice:', error);
      res.status(500).json({
        error: 'Failed to create intercompany invoice',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/intercompany/purchase-order:
   *   post:
   *     summary: Create intercompany purchase order
   *     description: Creates a new purchase order between two companies in the intercompany workflow
   *     tags: [Intercompany Workflow]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PurchaseOrderRequest'
   *     responses:
   *       201:
   *         description: Purchase order created successfully
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  app.post('/api/intercompany/purchase-order', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, products, orderTotal = 10000 } = req.body;
      
      console.log(`📋 Creating purchase order from company ${sourceCompanyId} to ${targetCompanyId}`);
      
      // Get next sequence number
      const sequenceResult = await externalPool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num 
         FROM purchase_orders WHERE company_id = $1`,
        [sourceCompanyId]
      );
      const nextOrderNum = sequenceResult.rows[0].next_num;
      const orderNumber = `PO-${sourceCompanyId}-${Date.now()}-${nextOrderNum}`;
      
      // Create purchase order
      const purchaseOrderResult = await externalPool.query(`
        INSERT INTO purchase_orders (company_id, vendor_id, order_number, order_date, total, status, created_at)
        VALUES ($1, $2, $3, NOW(), $4, 'Pending', NOW())
        RETURNING id, order_number, total
      `, [sourceCompanyId, targetCompanyId, orderNumber, orderTotal]);
      
      const purchaseOrder = purchaseOrderResult.rows[0];
      
      // Create order items
      for (const product of products) {
        await externalPool.query(`
          INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [purchaseOrder.id, product.productId, product.quantity, product.unitPrice, product.quantity * product.unitPrice]);
      }
      
      console.log(`✅ Purchase order created: ${purchaseOrder.order_number}`);
      
      res.status(201).json({
        purchaseOrderId: purchaseOrder.id,
        orderNumber: purchaseOrder.order_number,
        totalAmount: parseFloat(purchaseOrder.total),
        status: 'Pending',
        message: 'Purchase order created successfully'
      });
      
    } catch (error) {
      console.error('❌ Error creating purchase order:', error);
      res.status(500).json({
        error: 'Failed to create purchase order',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/intercompany/bill:
   *   post:
   *     summary: Create bill from purchase order
   *     description: Creates a bill for a purchase order in the intercompany workflow
   *     tags: [Intercompany Workflow]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BillRequest'
   *     responses:
   *       201:
   *         description: Bill created successfully
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  app.post('/api/intercompany/bill', async (req, res) => {
    try {
      const { purchaseOrderId, companyId, partialAmount } = req.body;
      
      console.log(`💰 Creating bill for purchase order ${purchaseOrderId} by company ${companyId}`);
      
      // Get purchase order details
      const purchaseOrderResult = await externalPool.query(`
        SELECT * FROM purchase_orders WHERE id = $1 AND company_id = $2
      `, [purchaseOrderId, companyId]);
      
      if (purchaseOrderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      const purchaseOrder = purchaseOrderResult.rows[0];
      const billAmount = partialAmount || parseFloat(purchaseOrder.total);
      
      // Generate bill number
      const sequenceResult = await externalPool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num 
         FROM bills WHERE company_id = $1`,
        [companyId]
      );
      const nextBillNum = sequenceResult.rows[0].next_num;
      const billNumber = `BILL-${companyId}-${Date.now()}-${nextBillNum}`;
      
      // Create bill
      const billResult = await externalPool.query(`
        INSERT INTO bills (
          company_id, vendor_id, purchase_order_id, bill_number, 
          bill_date, due_date, subtotal, tax_amount, total, 
          amount_paid, balance_due, status, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days', $5, 0, $5, 0, $5, 'Open', NOW())
        RETURNING id, bill_number, total
      `, [companyId, purchaseOrder.vendor_id, purchaseOrderId, billNumber, billAmount]);
      
      const bill = billResult.rows[0];
      
      // Create bill items
      const orderItemsResult = await externalPool.query(`
        SELECT * FROM purchase_order_items WHERE purchase_order_id = $1
      `, [purchaseOrderId]);
      
      for (const item of orderItemsResult.rows) {
        const itemAmount = partialAmount ? (parseFloat(item.amount) * (partialAmount / parseFloat(purchaseOrder.total))) : parseFloat(item.amount);
        await externalPool.query(`
          INSERT INTO bill_items (bill_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [bill.id, item.product_id, item.quantity, item.unit_price, itemAmount]);
      }
      
      console.log(`✅ Bill created: ${bill.bill_number}`);
      
      res.status(201).json({
        billId: bill.id,
        billNumber: bill.bill_number,
        totalAmount: parseFloat(bill.total),
        status: 'Open',
        message: 'Bill created successfully'
      });
      
    } catch (error) {
      console.error('❌ Error creating bill:', error);
      res.status(500).json({
        error: 'Failed to create bill',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/intercompany/receipt-payment:
   *   post:
   *     summary: Create receipt payment for invoice
   *     description: Creates a payment receipt for an invoice in the intercompany workflow with target company details
   *     tags: [Intercompany Workflow]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ReceiptPaymentRequest'
   *     responses:
   *       201:
   *         description: Receipt payment created successfully with target company details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 receiptId:
   *                   type: integer
   *                   description: Generated receipt ID
   *                   example: 71
   *                 receiptNumber:
   *                   type: string
   *                   description: Generated receipt number
   *                   example: "RCPT-8-1748350123"
   *                 amount:
   *                   type: number
   *                   description: Payment amount
   *                   example: 5000
   *                 paymentMethod:
   *                   type: string
   *                   description: Payment method used
   *                   example: "Bank Transfer"
   *                 referenceNumber:
   *                   type: string
   *                   description: Reference number for tracking
   *                   example: "TARGET-TEST-1748350123"
   *                 targetCompany:
   *                   type: object
   *                   description: Target company details and bill payment information
   *                   properties:
   *                     id:
   *                       type: integer
   *                       description: Target company ID
   *                       example: 7
   *                     name:
   *                       type: string
   *                       description: Target company name
   *                       example: "Gas Manufacturing Co"
   *                     billPayment:
   *                       type: object
   *                       description: Corresponding bill payment created for target company
   *                       properties:
   *                         billId:
   *                           type: integer
   *                           description: Bill ID in target company
   *                           example: 45
   *                         billNumber:
   *                           type: string
   *                           description: Bill number in target company
   *                           example: "BILL-7-1748350123"
   *                         amount:
   *                           type: number
   *                           description: Bill payment amount
   *                           example: 5000
   *                         referenceNumber:
   *                           type: string
   *                           description: Bill payment reference number
   *                           example: "BILL-REF-7-1748350123"
   *                 intercompanyTransaction:
   *                   type: object
   *                   description: Related intercompany transaction details
   *                   properties:
   *                     id:
   *                       type: integer
   *                       description: Intercompany transaction ID
   *                       example: 278
   *                     status:
   *                       type: string
   *                       description: Transaction status
   *                       example: "Partial Paid"
   *                     sourceCompany:
   *                       type: string
   *                       description: Source company name
   *                       example: "Gas Distributor Co"
   *                     targetCompany:
   *                       type: string
   *                       description: Target company name
   *                       example: "Gas Manufacturing Co"
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  app.post('/api/intercompany/receipt-payment', async (req, res) => {
    try {
      const { invoiceId, companyId, amount, paymentMethod = 'Bank Transfer', referenceNumber } = req.body;
      
      console.log(`💳 Creating intercompany receipt payment for invoice ${invoiceId} by company ${companyId}`);
      console.log(`📋 Using reference number: ${referenceNumber}`);
      
      // Get invoice details with related sales order
      const invoiceResult = await externalPool.query(`
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
      
      // Generate receipt number for paying company
      const receiptSeqResult = await externalPool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num 
         FROM receipts WHERE company_id = $1`,
        [companyId]
      );
      const nextReceiptNum = receiptSeqResult.rows[0].next_num;
      const receiptNumber = `RCPT-${companyId}-${timestamp}`;
      
      // Create receipt for paying company
      const receiptResult = await externalPool.query(`
        INSERT INTO receipts (
          company_id, customer_id, invoice_id, sales_order_id, receipt_number,
          receipt_date, amount, payment_method, reference_number, created_at, debit_account_id
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, NOW(), 1000)
        RETURNING id, receipt_number, amount, reference_number
      `, [
        companyId,
        invoice.company_id, 
        invoiceId, 
        invoice.sales_order_id,
        receiptNumber, 
        amount, 
        paymentMethod,
        finalReferenceNumber
      ]);
      
      const receipt = receiptResult.rows[0];
      
      // Update invoice amount paid and balance due
      await externalPool.query(`
        UPDATE invoices 
        SET amount_paid = COALESCE(amount_paid, 0) + $1,
            balance_due = total - (COALESCE(amount_paid, 0) + $1),
            status = CASE 
              WHEN total - (COALESCE(amount_paid, 0) + $1) <= 0 THEN 'paid'
              WHEN COALESCE(amount_paid, 0) + $1 > 0 THEN 'partial'
              ELSE 'open'
            END
        WHERE id = $2
      `, [amount, invoiceId]);
      
      // Create journal entries for both companies
      console.log(`📝 Creating journal entries for intercompany payment...`);
      
      // Journal entry for paying company (debit: expense, credit: cash)
      const payingJournalResult = await externalPool.query(`
        INSERT INTO journal_entries (
          company_id, reference_number, description, total_amount, 
          entry_date, status, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), 'posted', NOW())
        RETURNING id
      `, [
        companyId, 
        `${finalReferenceNumber}-PAY`,
        `Payment for invoice ${invoice.invoice_number}`,
        amount
      ]);
      
      const payingJournalId = payingJournalResult.rows[0].id;
      
      // Debit: Accounts Payable (paying company reduces liability)
      await externalPool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, account_id, debit_amount, credit_amount, description
        ) VALUES ($1, 2000, $2, 0, $3)
      `, [payingJournalId, amount, `Payment to ${invoice.company_id} for invoice ${invoice.invoice_number}`]);
      
      // Credit: Cash (paying company reduces cash)
      await externalPool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, account_id, debit_amount, credit_amount, description
        ) VALUES ($1, 1000, 0, $2, $3)
      `, [payingJournalId, amount, `Cash payment for invoice ${invoice.invoice_number}`]);
      
      // Journal entry for receiving company (debit: cash, credit: receivables)
      const receivingJournalResult = await externalPool.query(`
        INSERT INTO journal_entries (
          company_id, reference_number, description, total_amount, 
          entry_date, status, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), 'posted', NOW())
        RETURNING id
      `, [
        invoice.company_id, 
        `${finalReferenceNumber}-RCV`,
        `Payment received for invoice ${invoice.invoice_number}`,
        amount
      ]);
      
      const receivingJournalId = receivingJournalResult.rows[0].id;
      
      // Debit: Cash (receiving company increases cash)
      await externalPool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, account_id, debit_amount, credit_amount, description
        ) VALUES ($1, 1000, $2, 0, $3)
      `, [receivingJournalId, amount, `Cash received from ${companyId} for invoice ${invoice.invoice_number}`]);
      
      // Credit: Accounts Receivable (receiving company reduces receivable)
      await externalPool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, account_id, debit_amount, credit_amount, description
        ) VALUES ($1, 1200, 0, $2, $3)
      `, [receivingJournalId, amount, `Payment received from ${companyId} for invoice ${invoice.invoice_number}`]);
      
      console.log(`✅ Receipt payment created: ${receipt.receipt_number} (${finalReferenceNumber})`);
      console.log(`✅ Journal entries created for both companies`);
      
      res.status(201).json({
        receiptId: receipt.id,
        receiptNumber: receipt.receipt_number,
        referenceNumber: finalReferenceNumber,
        paymentAmount: parseFloat(receipt.amount),
        paymentMethod: paymentMethod,
        tracking: {
          payingCompany: companyId,
          receivingCompany: invoice.company_id,
          reference: finalReferenceNumber,
          canTrackTransactions: true
        },
        journalEntries: {
          payingCompanyJournal: payingJournalId,
          receivingCompanyJournal: receivingJournalId,
          cashFlowCompleted: true
        },
        message: 'Intercompany receipt payment created with complete cash flow tracking'
      });
      
    } catch (error) {
      console.error('❌ Error creating intercompany receipt payment:', error);
      res.status(500).json({
        error: 'Failed to create receipt payment',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/intercompany/complete-workflow:
   *   post:
   *     summary: Complete intercompany workflow
   *     description: Creates a complete intercompany transaction workflow (sales order → invoice → purchase order → bill → payment)
   *     tags: [Intercompany Workflow]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - manufacturingCompanyId
   *               - distributorCompanyId
   *               - products
   *               - totalAmount
   *             properties:
   *               manufacturingCompanyId:
   *                 type: integer
   *                 example: 7
   *               distributorCompanyId:
   *                 type: integer
   *                 example: 8
   *               products:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     productId:
   *                       type: integer
   *                     quantity:
   *                       type: number
   *                     unitPrice:
   *                       type: number
   *               totalAmount:
   *                 type: number
   *                 example: 10000
   *               paymentAmount:
   *                 type: number
   *                 description: Optional payment amount (defaults to total)
   *                 example: 5000
   *     responses:
   *       201:
   *         description: Complete workflow created successfully
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  app.post('/api/intercompany/complete-workflow', async (req, res) => {
    try {
      const { manufacturingCompanyId, distributorCompanyId, products, totalAmount, paymentAmount } = req.body;
      
      console.log(`🔄 Creating complete intercompany workflow: Manufacturing ${manufacturingCompanyId} → Distributor ${distributorCompanyId}`);
      
      const workflow = {
        salesOrder: null,
        invoice: null,
        purchaseOrder: null,
        bill: null,
        receipt: null
      };
      
      // Step 1: Create sales order (Manufacturing → Distributor)
      const salesOrderResponse = await fetch(`${req.protocol}://${req.get('host')}/api/intercompany/sales-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCompanyId: manufacturingCompanyId,
          targetCompanyId: distributorCompanyId,
          products,
          orderTotal: totalAmount
        })
      });
      workflow.salesOrder = await salesOrderResponse.json();
      
      // Step 2: Create invoice for sales order
      const invoiceResponse = await fetch(`${req.protocol}://${req.get('host')}/api/intercompany/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesOrderId: workflow.salesOrder.salesOrderId,
          companyId: manufacturingCompanyId
        })
      });
      workflow.invoice = await invoiceResponse.json();
      
      // Step 3: Create purchase order (Distributor → Manufacturing)
      const purchaseOrderResponse = await fetch(`${req.protocol}://${req.get('host')}/api/intercompany/purchase-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCompanyId: distributorCompanyId,
          targetCompanyId: manufacturingCompanyId,
          products,
          orderTotal: totalAmount
        })
      });
      workflow.purchaseOrder = await purchaseOrderResponse.json();
      
      // Step 4: Create bill for purchase order
      const billResponse = await fetch(`${req.protocol}://${req.get('host')}/api/intercompany/bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: workflow.purchaseOrder.purchaseOrderId,
          companyId: distributorCompanyId
        })
      });
      workflow.bill = await billResponse.json();
      
      // Step 5: Create payment receipt (optional)
      if (paymentAmount && paymentAmount > 0) {
        const receiptResponse = await fetch(`${req.protocol}://${req.get('host')}/api/intercompany/receipt-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: workflow.invoice.invoiceId,
            companyId: distributorCompanyId,
            amount: paymentAmount
          })
        });
        workflow.receipt = await receiptResponse.json();
      }
      
      console.log(`✅ Complete intercompany workflow created successfully`);
      
      res.status(201).json({
        message: 'Complete intercompany workflow created successfully',
        workflow,
        summary: {
          manufacturingCompany: manufacturingCompanyId,
          distributorCompany: distributorCompanyId,
          totalAmount,
          paymentAmount: paymentAmount || 0,
          status: paymentAmount ? 'Partially Paid' : 'Pending Payment'
        }
      });
      
    } catch (error) {
      console.error('❌ Error creating complete workflow:', error);
      res.status(500).json({
        error: 'Failed to create complete workflow',
        details: error.message
      });
    }
  });

  /**
   * Create intercompany sales order
   */
  app.post('/api/intercompany/sales-order', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, amount, items } = req.body;
      
      if (!sourceCompanyId || !targetCompanyId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'sourceCompanyId, targetCompanyId, and amount are required'
        });
      }

      // Get next sequence for sales order
      const sequenceQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM sales_orders';
      const sequenceResult = await externalPool.query(sequenceQuery);
      const salesOrderId = sequenceResult.rows[0].next_id;
      
      const orderNumber = `SO-${sourceCompanyId}-${Date.now()}`;
      const orderDate = new Date().toISOString().split('T')[0];
      
      const createOrderQuery = `
        INSERT INTO sales_orders (
          id, company_id, customer_id, order_number, order_date, 
          subtotal, tax_amount, total, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;
      
      const taxAmount = amount * 0.1;
      const total = amount + taxAmount;
      
      const result = await externalPool.query(createOrderQuery, [
        salesOrderId, sourceCompanyId, targetCompanyId, orderNumber,
        orderDate, amount, taxAmount, total, 'pending'
      ]);
      
      res.json({
        success: true,
        salesOrder: result.rows[0],
        message: `Created sales order ${orderNumber}`
      });
      
    } catch (error) {
      console.error('Error creating sales order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create sales order: ' + error.message
      });
    }
  });

  /**
   * Create intercompany purchase order
   */
  app.post('/api/intercompany/purchase-order', async (req, res) => {
    try {
      const { sourceCompanyId, targetCompanyId, amount, salesOrderId } = req.body;
      
      if (!sourceCompanyId || !targetCompanyId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'sourceCompanyId, targetCompanyId, and amount are required'
        });
      }

      // Get next sequence for purchase order
      const sequenceQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM purchase_orders';
      const sequenceResult = await externalPool.query(sequenceQuery);
      const purchaseOrderId = sequenceResult.rows[0].next_id;
      
      const orderNumber = `PO-${sourceCompanyId}-${Date.now()}`;
      const orderDate = new Date().toISOString().split('T')[0];
      
      const createOrderQuery = `
        INSERT INTO purchase_orders (
          id, company_id, vendor_id, order_number, order_date, 
          subtotal, tax_amount, total, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;
      
      const taxAmount = amount * 0.1;
      const total = amount + taxAmount;
      
      const result = await externalPool.query(createOrderQuery, [
        purchaseOrderId, sourceCompanyId, targetCompanyId, orderNumber,
        orderDate, amount, taxAmount, total, 'pending'
      ]);
      
      res.json({
        success: true,
        purchaseOrder: result.rows[0],
        message: `Created purchase order ${orderNumber}`
      });
      
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create purchase order: ' + error.message
      });
    }
  });

  /**
   * Create invoice from sales order (creates both invoice and bill)
   */
  app.post('/api/intercompany/invoice', async (req, res) => {
    try {
      const { salesOrderId, companyId, partialAmount } = req.body;
      
      if (!salesOrderId || !companyId || !partialAmount) {
        return res.status(400).json({
          success: false,
          error: 'salesOrderId, companyId, and partialAmount are required'
        });
      }

      // Get sales order details
      const salesOrderQuery = `
        SELECT so.*, c.name as company_name, customer.name as customer_name 
        FROM sales_orders so
        LEFT JOIN companies c ON so.company_id = c.id
        LEFT JOIN companies customer ON so.customer_id = customer.id
        WHERE so.id = $1
      `;
      const salesOrderResult = await externalPool.query(salesOrderQuery, [salesOrderId]);
      
      if (salesOrderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Sales order not found'
        });
      }
      
      const salesOrder = salesOrderResult.rows[0];
      
      // Get next sequence for invoice
      const invoiceSequenceQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM invoices';
      const invoiceSequenceResult = await externalPool.query(invoiceSequenceQuery);
      const invoiceId = invoiceSequenceResult.rows[0].next_id;
      
      // Create sales invoice
      const invoiceNumber = `INV-${companyId}-${Date.now()}`;
      const invoiceDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const createInvoiceQuery = `
        INSERT INTO invoices (
          id, company_id, customer_id, sales_order_id, invoice_number,
          invoice_date, due_date, subtotal, tax_amount, total, 
          balance_due, amount_paid, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
      `;
      
      const taxAmount = partialAmount * 0.1; // 10% tax
      const total = partialAmount + taxAmount;
      
      const invoiceResult = await externalPool.query(createInvoiceQuery, [
        invoiceId, companyId, salesOrder.customer_id, salesOrderId,
        invoiceNumber, invoiceDate, dueDate, partialAmount, taxAmount, 
        total, total, 0, 'pending'
      ]);
      
      // Get purchase order linked to this sales order
      const purchaseOrderQuery = `
        SELECT po.* FROM purchase_orders po
        WHERE po.vendor_id = $1 AND po.company_id = $2
        ORDER BY po.created_at DESC LIMIT 1
      `;
      const purchaseOrderResult = await externalPool.query(purchaseOrderQuery, [
        companyId, salesOrder.customer_id
      ]);
      
      let purchaseBill = null;
      
      if (purchaseOrderResult.rows.length > 0) {
        const purchaseOrder = purchaseOrderResult.rows[0];
        
        // Get next sequence for bill
        const billSequenceQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bills';
        const billSequenceResult = await externalPool.query(billSequenceQuery);
        const billId = billSequenceResult.rows[0].next_id;
        
        // Create purchase bill
        const billNumber = `BILL-${salesOrder.customer_id}-${Date.now()}`;
        
        const createBillQuery = `
          INSERT INTO bills (
            id, company_id, vendor_id, purchase_order_id, bill_number,
            bill_date, due_date, subtotal, tax_amount, total,
            balance_due, amount_paid, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          RETURNING *
        `;
        
        const billResult = await externalPool.query(createBillQuery, [
          billId, salesOrder.customer_id, companyId, purchaseOrder.id,
          billNumber, invoiceDate, dueDate, partialAmount, taxAmount,
          total, total, 0, 'pending'
        ]);
        
        purchaseBill = billResult.rows[0];
      }
      
      res.json({
        success: true,
        salesInvoice: invoiceResult.rows[0],
        purchaseBill: purchaseBill,
        message: `Created invoice ${invoiceNumber} for $${total}${purchaseBill ? ` and corresponding bill ${purchaseBill.bill_number}` : ''}`
      });
      
    } catch (error) {
      console.error('Error creating intercompany invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create intercompany invoice: ' + error.message
      });
    }
  });

  /**
   * Create receipt payment for invoice
   */
  app.post('/api/intercompany/receipt-payment', async (req, res) => {
    try {
      const { invoiceId, companyId, customerId, amount, paymentMethod, reference } = req.body;
      
      if (!invoiceId || !companyId || !amount) {
        return res.status(400).json({
          success: false,
          error: 'invoiceId, companyId, and amount are required'
        });
      }

      // Get invoice details
      const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
      const invoiceResult = await externalPool.query(invoiceQuery, [invoiceId]);
      
      if (invoiceResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }

      // Get next sequence for receipt
      const sequenceQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM receipts';
      const sequenceResult = await externalPool.query(sequenceQuery);
      const receiptId = sequenceResult.rows[0].next_id;
      
      const receiptNumber = `REC-${companyId}-${Date.now()}`;
      const receiptDate = new Date().toISOString().split('T')[0];
      
      const createReceiptQuery = `
        INSERT INTO receipts (
          id, company_id, invoice_id, sales_order_id, customer_id, receipt_number,
          receipt_date, amount, payment_method, reference, notes,
          is_partial_payment, debit_account_id, credit_account_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING *
      `;
      
      const invoice = invoiceResult.rows[0];
      
      const result = await externalPool.query(createReceiptQuery, [
        receiptId, companyId, invoiceId, invoice.sales_order_id, customerId || invoice.customer_id,
        receiptNumber, receiptDate, amount, paymentMethod || 'bank_transfer',
        reference || 'Intercompany payment', 'Payment for invoice', false, 1000, 1150
      ]);
      
      // Update invoice balance
      await externalPool.query(
        'UPDATE invoices SET amount_paid = $1, balance_due = $2, status = $3 WHERE id = $4',
        [amount, invoice.total - amount, amount >= invoice.total ? 'paid' : 'partial', invoiceId]
      );
      
      res.json({
        success: true,
        receipt: result.rows[0],
        message: `Created receipt ${receiptNumber} for $${amount}`
      });
      
    } catch (error) {
      console.error('Error creating receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create receipt: ' + error.message
      });
    }
  });

  /**
   * Complete intercompany workflow
   */
  app.post('/api/intercompany/complete-workflow', async (req, res) => {
    try {
      const { salesOrderId, purchaseOrderId, invoiceId, billId, receiptId } = req.body;
      
      res.json({
        success: true,
        status: 'completed',
        workflow: {
          salesOrderId,
          purchaseOrderId,
          invoiceId,
          billId,
          receiptId
        },
        message: 'Intercompany workflow completed successfully'
      });
      
    } catch (error) {
      console.error('Error completing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete workflow: ' + error.message
      });
    }
  });

  console.log('✅ Intercompany Workflow API registered successfully with all 5 Swagger endpoints!');
}

module.exports = { registerIntercompanyWorkflowAPI };