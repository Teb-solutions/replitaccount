import { createServer } from "http";
import { pool as externalPool } from "./db-config.js";
import { WebSocketServer, WebSocket } from "ws";

// Import only essential functions
import { checkStagingServerConnection } from "./database-checker.js";
import { registerCompanyManagementAPI } from './company-management-api.js';

export async function registerRoutes(app) {
  // Skip Swagger setup for now to avoid import issues
  
  // Register company management API first
  registerCompanyManagementAPI(app);
  
  // Get external database connection
  const databaseChecker = await import('./database-checker.js');
  const { pool: externalPool } = databaseChecker;
  
  // Helper function to get next sequence
  const getNextSequence = async (tableName) => {
    const result = await externalPool.query(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${tableName}`);
    return result.rows[0].next_id;
  };
  
  // Add missing API endpoints for Sales Orders page
  
  // GET /api/customers - Returns all companies that can be customers
  app.get('/api/customers', async (req, res) => {
    try {
      const result = await externalPool.query(`
        SELECT id, name, code, company_type, address, phone, email
        FROM companies 
        WHERE is_active = true
        ORDER BY name
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  console.log('🔄 Registering 5 intercompany workflow endpoints...');
  
  // 1. POST /api/intercompany/sales-order
  app.post('/api/intercompany/sales-order', async (req, res) => {
    try {
      const { 
        sellerCompanyId, 
        buyerCompanyId, 
        productIds,
        quantities,
        unitPrices,
        orderDate,
        expectedDate 
      } = req.body;

      if (!sellerCompanyId || !buyerCompanyId || !productIds || !quantities || !unitPrices) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['sellerCompanyId', 'buyerCompanyId', 'productIds', 'quantities', 'unitPrices']
        });
      }

      // Get company details
      const sellerResult = await externalPool.query('SELECT name FROM companies WHERE id = $1', [sellerCompanyId]);
      const buyerResult = await externalPool.query('SELECT name FROM companies WHERE id = $1', [buyerCompanyId]);
      
      if (!sellerResult.rows.length || !buyerResult.rows.length) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const sellerName = sellerResult.rows[0].name;
      const buyerName = buyerResult.rows[0].name;

      // Generate order numbers
      const salesOrderNumber = `SO-${sellerCompanyId}-${Date.now()}`;
      const purchaseOrderNumber = `PO-${buyerCompanyId}-${Date.now()}`;

      // Calculate totals
      let salesTotal = 0;
      let purchaseTotal = 0;
      
      for (let i = 0; i < productIds.length; i++) {
        salesTotal += quantities[i] * unitPrices[i];
        purchaseTotal += quantities[i] * unitPrices[i];
      }

      // Create sales order for seller
      const salesOrderResult = await externalPool.query(`
        INSERT INTO sales_orders (company_id, customer_company_id, order_number, order_date, expected_date, total, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id
      `, [sellerCompanyId, buyerCompanyId, salesOrderNumber, orderDate, expectedDate, salesTotal]);

      const salesOrderId = salesOrderResult.rows[0].id;

      // Create purchase order for buyer
      const purchaseOrderResult = await externalPool.query(`
        INSERT INTO purchase_orders (company_id, vendor_id, order_number, order_date, expected_date, total, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id
      `, [buyerCompanyId, sellerCompanyId, purchaseOrderNumber, orderDate, expectedDate, purchaseTotal]);

      const purchaseOrderId = purchaseOrderResult.rows[0].id;

      // Create order items for sales order
      for (let i = 0; i < productIds.length; i++) {
        await externalPool.query(`
          INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [salesOrderId, productIds[i], quantities[i], unitPrices[i], quantities[i] * unitPrices[i]]);
      }

      // Create order items for purchase order
      for (let i = 0; i < productIds.length; i++) {
        await externalPool.query(`
          INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [purchaseOrderId, productIds[i], quantities[i], unitPrices[i], quantities[i] * unitPrices[i]]);
      }

      res.status(201).json({
        success: true,
        salesOrder: {
          id: salesOrderId,
          orderNumber: salesOrderNumber,
          total: salesTotal,
          sellerCompany: sellerName,
          buyerCompany: buyerName
        },
        purchaseOrder: {
          id: purchaseOrderId,
          orderNumber: purchaseOrderNumber,
          total: purchaseTotal,
          buyerCompany: buyerName,
          sellerCompany: sellerName
        },
        message: 'Intercompany orders created successfully'
      });

    } catch (error) {
      console.error('Error creating intercompany sales order:', error);
      res.status(500).json({ error: 'Failed to create intercompany orders' });
    }
  });

  // 2. POST /api/intercompany/invoice
  app.post('/api/intercompany/invoice', async (req, res) => {
    try {
      const { salesOrderId, invoiceDate, itemsToInvoice } = req.body;

      if (!salesOrderId || !invoiceDate || !itemsToInvoice || !Array.isArray(itemsToInvoice)) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['salesOrderId', 'invoiceDate', 'itemsToInvoice']
        });
      }

      // Get sales order details
      const salesOrderResult = await externalPool.query(`
        SELECT so.*, c.name as seller_name, cc.name as buyer_name
        FROM sales_orders so
        JOIN companies c ON so.company_id = c.id
        JOIN companies cc ON so.customer_company_id = cc.id
        WHERE so.id = $1
      `, [salesOrderId]);

      if (!salesOrderResult.rows.length) {
        return res.status(404).json({ error: 'Sales order not found' });
      }

      const salesOrder = salesOrderResult.rows[0];

      // Generate invoice number
      const invoiceNumber = `INV-${salesOrder.company_id}-${Date.now()}`;

      // Calculate invoice total
      let invoiceTotal = 0;
      for (const item of itemsToInvoice) {
        invoiceTotal += item.quantity * item.unitPrice;
      }

      // Create invoice
      const invoiceResult = await externalPool.query(`
        INSERT INTO invoices (company_id, customer_company_id, sales_order_id, invoice_number, invoice_date, total, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id
      `, [salesOrder.company_id, salesOrder.customer_company_id, salesOrderId, invoiceNumber, invoiceDate, invoiceTotal]);

      const invoiceId = invoiceResult.rows[0].id;

      // Create invoice items
      for (const item of itemsToInvoice) {
        await externalPool.query(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [invoiceId, item.productId, item.quantity, item.unitPrice, item.quantity * item.unitPrice]);
      }

      // Find corresponding purchase order
      const purchaseOrderResult = await externalPool.query(`
        SELECT * FROM purchase_orders 
        WHERE company_id = $1 AND vendor_id = $2 
        AND order_date = $3
        ORDER BY id DESC LIMIT 1
      `, [salesOrder.customer_company_id, salesOrder.company_id, salesOrder.order_date]);

      let billId = null;
      let billNumber = null;

      if (purchaseOrderResult.rows.length > 0) {
        const purchaseOrder = purchaseOrderResult.rows[0];
        
        // Generate bill number
        billNumber = `BILL-${purchaseOrder.company_id}-${Date.now()}`;

        // Create corresponding bill
        const billResult = await externalPool.query(`
          INSERT INTO bills (company_id, vendor_company_id, purchase_order_id, bill_number, bill_date, total, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'pending')
          RETURNING id
        `, [purchaseOrder.company_id, salesOrder.company_id, purchaseOrder.id, billNumber, invoiceDate, invoiceTotal]);

        billId = billResult.rows[0].id;

        // Create bill items
        for (const item of itemsToInvoice) {
          await externalPool.query(`
            INSERT INTO bill_items (bill_id, product_id, quantity, unit_price, amount)
            VALUES ($1, $2, $3, $4, $5)
          `, [billId, item.productId, item.quantity, item.unitPrice, item.quantity * item.unitPrice]);
        }
      }

      res.status(201).json({
        success: true,
        invoice: {
          id: invoiceId,
          invoiceNumber,
          total: invoiceTotal,
          sellerCompany: salesOrder.seller_name,
          buyerCompany: salesOrder.buyer_name
        },
        bill: billId ? {
          id: billId,
          billNumber,
          total: invoiceTotal,
          buyerCompany: salesOrder.buyer_name,
          sellerCompany: salesOrder.seller_name
        } : null,
        message: 'Intercompany invoice and bill created successfully'
      });

    } catch (error) {
      console.error('Error creating intercompany invoice:', error);
      res.status(500).json({ error: 'Failed to create intercompany invoice' });
    }
  });

  // 3. POST /api/intercompany/receipt
  app.post('/api/intercompany/receipt', async (req, res) => {
    try {
      const { invoiceId, receiptDate, amountReceived, paymentMethod } = req.body;

      if (!invoiceId || !receiptDate || !amountReceived) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['invoiceId', 'receiptDate', 'amountReceived']
        });
      }

      // Get invoice details
      const invoiceResult = await externalPool.query(`
        SELECT i.*, c.name as seller_name, cc.name as buyer_name, so.order_number
        FROM invoices i
        JOIN companies c ON i.company_id = c.id
        JOIN companies cc ON i.customer_company_id = cc.id
        LEFT JOIN sales_orders so ON i.sales_order_id = so.id
        WHERE i.id = $1
      `, [invoiceId]);

      if (!invoiceResult.rows.length) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = invoiceResult.rows[0];

      // Generate receipt number
      const receiptNumber = `REC-${invoice.company_id}-${Date.now()}`;

      // Get cash account for the company
      const cashAccountResult = await externalPool.query(`
        SELECT id FROM accounts 
        WHERE company_id = $1 AND account_name ILIKE '%cash%'
        LIMIT 1
      `, [invoice.company_id]);

      const debitAccountId = cashAccountResult.rows.length > 0 ? cashAccountResult.rows[0].id : 1;

      // Create receipt
      const receiptResult = await externalPool.query(`
        INSERT INTO receipts (company_id, customer_company_id, invoice_id, sales_order_id, receipt_number, receipt_date, amount, payment_method, debit_account_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
        RETURNING id
      `, [invoice.company_id, invoice.customer_company_id, invoiceId, invoice.sales_order_id, receiptNumber, receiptDate, amountReceived, paymentMethod || 'cash', debitAccountId]);

      const receiptId = receiptResult.rows[0].id;

      // Update invoice status if fully paid
      const totalPaid = await externalPool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_paid 
        FROM receipts 
        WHERE invoice_id = $1 AND status = 'completed'
      `, [invoiceId]);

      const totalPaidAmount = parseFloat(totalPaid.rows[0].total_paid);
      const invoiceTotal = parseFloat(invoice.total);

      if (totalPaidAmount >= invoiceTotal) {
        await externalPool.query(`
          UPDATE invoices SET status = 'paid' WHERE id = $1
        `, [invoiceId]);
      }

      // Find and create corresponding payment for the bill
      const billResult = await externalPool.query(`
        SELECT b.* FROM bills b
        JOIN purchase_orders po ON b.purchase_order_id = po.id
        WHERE po.company_id = $1 AND po.vendor_id = $2 
        AND b.total = $3 AND b.status = 'pending'
        ORDER BY b.id DESC LIMIT 1
      `, [invoice.customer_company_id, invoice.company_id, amountReceived]);

      let paymentId = null;
      let paymentNumber = null;

      if (billResult.rows.length > 0) {
        const bill = billResult.rows[0];
        
        // Generate payment number
        paymentNumber = `PAY-${bill.company_id}-${Date.now()}`;

        // Get cash account for the buyer company
        const buyerCashAccountResult = await externalPool.query(`
          SELECT id FROM accounts 
          WHERE company_id = $1 AND account_name ILIKE '%cash%'
          LIMIT 1
        `, [bill.company_id]);

        const creditAccountId = buyerCashAccountResult.rows.length > 0 ? buyerCashAccountResult.rows[0].id : 1;

        // Create payment
        const paymentResult = await externalPool.query(`
          INSERT INTO payments (company_id, vendor_company_id, bill_id, payment_number, payment_date, amount, payment_method, credit_account_id, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')
          RETURNING id
        `, [bill.company_id, invoice.company_id, bill.id, paymentNumber, receiptDate, amountReceived, paymentMethod || 'cash', creditAccountId]);

        paymentId = paymentResult.rows[0].id;

        // Update bill status
        await externalPool.query(`
          UPDATE bills SET status = 'paid' WHERE id = $1
        `, [bill.id]);
      }

      res.status(201).json({
        success: true,
        receipt: {
          id: receiptId,
          receiptNumber,
          amount: amountReceived,
          sellerCompany: invoice.seller_name,
          buyerCompany: invoice.buyer_name
        },
        payment: paymentId ? {
          id: paymentId,
          paymentNumber,
          amount: amountReceived,
          buyerCompany: invoice.buyer_name,
          sellerCompany: invoice.seller_name
        } : null,
        message: 'Receipt and payment processed successfully'
      });

    } catch (error) {
      console.error('Error processing receipt:', error);
      res.status(500).json({ error: 'Failed to process receipt' });
    }
  });

  // 4. GET /api/intercompany/balances
  app.get('/api/intercompany/balances', async (req, res) => {
    try {
      const { companyId } = req.query;

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      // Get accounts receivable (what others owe this company)
      const receivablesResult = await externalPool.query(`
        SELECT 
          cc.name as company_name,
          COALESCE(SUM(i.total), 0) - COALESCE(SUM(r.amount), 0) as balance
        FROM invoices i
        JOIN companies cc ON i.customer_company_id = cc.id
        LEFT JOIN receipts r ON i.id = r.invoice_id AND r.status = 'completed'
        WHERE i.company_id = $1 AND i.status != 'paid'
        GROUP BY cc.id, cc.name
        HAVING COALESCE(SUM(i.total), 0) - COALESCE(SUM(r.amount), 0) > 0
      `, [companyId]);

      // Get accounts payable (what this company owes others)
      const payablesResult = await externalPool.query(`
        SELECT 
          cc.name as company_name,
          COALESCE(SUM(b.total), 0) - COALESCE(SUM(p.amount), 0) as balance
        FROM bills b
        JOIN companies cc ON b.vendor_company_id = cc.id
        LEFT JOIN payments p ON b.id = p.bill_id AND p.status = 'completed'
        WHERE b.company_id = $1 AND b.status != 'paid'
        GROUP BY cc.id, cc.name
        HAVING COALESCE(SUM(b.total), 0) - COALESCE(SUM(p.amount), 0) > 0
      `, [companyId]);

      // Calculate totals
      const totalReceivables = receivablesResult.rows.reduce((sum, row) => sum + parseFloat(row.balance), 0);
      const totalPayables = payablesResult.rows.reduce((sum, row) => sum + parseFloat(row.balance), 0);

      res.json({
        companyId: parseInt(companyId),
        accountsReceivable: {
          total: totalReceivables,
          details: receivablesResult.rows
        },
        accountsPayable: {
          total: totalPayables,
          details: payablesResult.rows
        },
        netPosition: totalReceivables - totalPayables
      });

    } catch (error) {
      console.error('Error fetching intercompany balances:', error);
      res.status(500).json({ error: 'Failed to fetch intercompany balances' });
    }
  });

  // 5. GET /api/intercompany/transactions
  app.get('/api/intercompany/transactions', async (req, res) => {
    try {
      const { companyId, startDate, endDate, status } = req.query;

      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      let dateFilter = '';
      let statusFilter = '';
      const queryParams = [companyId, companyId];

      if (startDate && endDate) {
        dateFilter = `AND (so.order_date BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2} 
                       OR po.order_date BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2})`;
        queryParams.push(startDate, endDate);
      }

      if (status && status !== 'all') {
        statusFilter = `AND (so.status = $${queryParams.length + 1} OR po.status = $${queryParams.length + 1})`;
        queryParams.push(status);
      }

      const transactionsResult = await externalPool.query(`
        SELECT 
          'sales_order' as type,
          so.id,
          so.order_number as reference_number,
          so.order_date as transaction_date,
          so.total,
          so.status,
          c.name as counterparty_company,
          'receivable' as flow_direction
        FROM sales_orders so
        JOIN companies c ON so.customer_company_id = c.id
        WHERE so.company_id = $1 ${dateFilter} ${statusFilter}
        
        UNION ALL
        
        SELECT 
          'purchase_order' as type,
          po.id,
          po.order_number as reference_number,
          po.order_date as transaction_date,
          po.total,
          po.status,
          c.name as counterparty_company,
          'payable' as flow_direction
        FROM purchase_orders po
        JOIN companies c ON po.vendor_id = c.id
        WHERE po.company_id = $2 ${dateFilter} ${statusFilter}
        
        ORDER BY transaction_date DESC
      `, queryParams);

      // Get company name
      const companyResult = await externalPool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      const companyName = companyResult.rows.length > 0 ? companyResult.rows[0].name : 'Unknown Company';

      res.json({
        companyId: parseInt(companyId),
        companyName,
        transactions: transactionsResult.rows,
        summary: {
          totalTransactions: transactionsResult.rows.length,
          totalReceivables: transactionsResult.rows
            .filter(t => t.flow_direction === 'receivable')
            .reduce((sum, t) => sum + parseFloat(t.total), 0),
          totalPayables: transactionsResult.rows
            .filter(t => t.flow_direction === 'payable')
            .reduce((sum, t) => sum + parseFloat(t.total), 0)
        }
      });

    } catch (error) {
      console.error('Error fetching intercompany transactions:', error);
      res.status(500).json({ error: 'Failed to fetch intercompany transactions' });
    }
  });

  console.log('✅ All 5 intercompany workflow endpoints registered successfully');

  // GET /api/products - Returns all products
  app.get('/api/products', async (req, res) => {
    try {
      const { companyId } = req.query;
      
      let query = `
        SELECT id, name, code, description, category, unit_of_measure, is_active
        FROM products 
        WHERE is_active = true
      `;
      const queryParams = [];
      
      if (companyId) {
        query += ` AND company_id = $1`;
        queryParams.push(companyId);
      }
      
      query += ` ORDER BY name`;
      
      const result = await externalPool.query(query, queryParams);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // POST /api/sales-orders - Create a new sales order
  app.post('/api/sales-orders', async (req, res) => {
    try {
      const {
        companyId,
        customerCompanyId,
        orderDate,
        expectedDate,
        items, // Array of { productId, quantity, unitPrice }
        notes
      } = req.body;

      if (!companyId || !customerCompanyId || !orderDate || !items || !Array.isArray(items)) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['companyId', 'customerCompanyId', 'orderDate', 'items']
        });
      }

      // Calculate total
      const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      // Generate order number
      const orderNumber = `SO-${companyId}-${Date.now()}`;

      // Create sales order
      const salesOrderResult = await externalPool.query(`
        INSERT INTO sales_orders (company_id, customer_company_id, order_number, order_date, expected_date, total, notes, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING id
      `, [companyId, customerCompanyId, orderNumber, orderDate, expectedDate, total, notes]);

      const salesOrderId = salesOrderResult.rows[0].id;

      // Create order items
      for (const item of items) {
        await externalPool.query(`
          INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, amount)
          VALUES ($1, $2, $3, $4, $5)
        `, [salesOrderId, item.productId, item.quantity, item.unitPrice, item.quantity * item.unitPrice]);
      }

      // Get company names for response
      const companyResult = await externalPool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      const customerResult = await externalPool.query('SELECT name FROM companies WHERE id = $1', [customerCompanyId]);

      res.status(201).json({
        success: true,
        salesOrder: {
          id: salesOrderId,
          orderNumber,
          total,
          companyName: companyResult.rows[0]?.name,
          customerName: customerResult.rows[0]?.name,
          status: 'pending'
        },
        message: 'Sales order created successfully'
      });

    } catch (error) {
      console.error('Error creating sales order:', error);
      res.status(500).json({ error: 'Failed to create sales order' });
    }
  });

  // Database connection test endpoint
  app.get('/api/test-connection', async (req, res) => {
    try {
      const testResult = await checkStagingServerConnection();
      res.json(testResult);
    } catch (error) {
      console.error('Database connection test failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Database connection test failed',
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'broadcast',
              data: data
            }));
          }
        });

      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to Multi-Company Accounting System'
    }));
  });

  return httpServer;
}