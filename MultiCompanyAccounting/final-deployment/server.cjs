/**
 * Multi-Company Accounting System - Complete Production Server
 * All required endpoints with authentic data from external database
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection to external server (135.235.154.222)
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

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected to 135.235.154.222',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// 1. COMPANY MANAGEMENT
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code, company_type, address, phone, email, 
             is_active, created_at, updated_at
      FROM companies 
      WHERE is_active = true
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.post('/api/companies', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, code, company_type, address, phone, email } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Generate code if not provided
    const companyCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);

    await client.query('BEGIN');
    
    // Create company
    const companyResult = await client.query(`
      INSERT INTO companies (tenant_id, name, code, company_type, address, phone, email, 
                           fiscal_year, base_currency, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
      RETURNING *
    `, [1, name, companyCode, company_type || 'General', address, phone, email, 'calendar', 'USD']);

    const newCompany = companyResult.rows[0];

    // Create default chart of accounts for the new company
    const defaultAccounts = [
      { code: '1000', name: 'Cash and Cash Equivalents', type: 'Asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
      { code: '1200', name: 'Inventory', type: 'Asset' },
      { code: '1500', name: 'Equipment', type: 'Asset' },
      { code: '2000', name: 'Accounts Payable', type: 'Liability' },
      { code: '2100', name: 'Accrued Expenses', type: 'Liability' },
      { code: '2500', name: 'Long-term Debt', type: 'Liability' },
      { code: '3000', name: 'Owner Equity', type: 'Equity' },
      { code: '3100', name: 'Retained Earnings', type: 'Equity' },
      { code: '4000', name: 'Sales Revenue', type: 'Revenue' },
      { code: '4100', name: 'Service Revenue', type: 'Revenue' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
      { code: '6000', name: 'Operating Expenses', type: 'Expense' },
      { code: '6100', name: 'Administrative Expenses', type: 'Expense' },
      { code: '7000', name: 'Interest Expense', type: 'Expense' }
    ];

    const createdAccounts = [];
    for (const account of defaultAccounts) {
      try {
        const accountResult = await client.query(`
          INSERT INTO accounts (company_id, name, code, account_type_id, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, 1, true, NOW(), NOW())
          RETURNING id, name, code, account_type_id
        `, [newCompany.id, account.name, account.code]);
        
        createdAccounts.push(accountResult.rows[0]);
      } catch (accountError) {
        // Continue if account creation fails (might be duplicate codes)
        console.warn(`Failed to create account ${account.code} for company ${newCompany.id}:`, accountError.message);
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      company: newCompany,
      chartOfAccounts: createdAccounts,
      message: `Company created successfully with ${createdAccounts.length} default accounts`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating company:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Company code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create company' });
    }
  } finally {
    client.release();
  }
});

// 2. INTERCOMPANY SALES ORDER
app.post('/api/intercompany/sales-order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, products = [], orderTotal } = req.body;
    
    if (!sourceCompanyId || !targetCompanyId || !orderTotal) {
      return res.status(400).json({ error: 'sourceCompanyId, targetCompanyId, and orderTotal are required' });
    }

    // Validate companies exist
    const companiesResult = await client.query(
      'SELECT id, name FROM companies WHERE id IN ($1, $2)',
      [sourceCompanyId, targetCompanyId]
    );
    
    if (companiesResult.rows.length !== 2) {
      return res.status(400).json({ error: 'One or both companies not found' });
    }

    const sourceCompany = companiesResult.rows.find(c => c.id == sourceCompanyId);
    const targetCompany = companiesResult.rows.find(c => c.id == targetCompanyId);

    await client.query('BEGIN');

    // Create comprehensive transaction group reference for tracking all related transactions
    const timestamp = Date.now();
    const transactionGroupRef = `TXN-GROUP-${sourceCompanyId}-${targetCompanyId}-${timestamp}`;
    const orderNumber = `SO-${sourceCompanyId}-${timestamp}`;
    const referenceNumber = `IC-REF-${sourceCompanyId}-${targetCompanyId}-${timestamp}`;

    const salesOrderResult = await client.query(`
      INSERT INTO sales_orders (
        company_id, customer_id, order_number, order_date, expected_date, 
        status, total, reference_number, created_at
      ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
      RETURNING id, order_number, total, status, reference_number
    `, [sourceCompanyId, targetCompanyId, orderNumber, 'Pending', orderTotal, transactionGroupRef]);

    // Create corresponding purchase order with same transaction group reference
    const poNumber = `PO-${targetCompanyId}-${timestamp}`;
    const poReferenceNumber = `PO-REF-${targetCompanyId}-${timestamp}`;

    const purchaseOrderResult = await client.query(`
      INSERT INTO purchase_orders (
        company_id, vendor_id, order_number, order_date, expected_date,
        status, total, reference_number, created_at
      ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
      RETURNING id, order_number, total, status, reference_number
    `, [targetCompanyId, sourceCompanyId, poNumber, 'Pending', orderTotal, transactionGroupRef]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany sales order created successfully',
      reference: transactionGroupRef,
      transactionGroupRef: transactionGroupRef,
      salesOrder: {
        id: salesOrderResult.rows[0].id,
        orderNumber: salesOrderResult.rows[0].order_number,
        total: parseFloat(salesOrderResult.rows[0].total),
        status: salesOrderResult.rows[0].status,
        referenceNumber: salesOrderResult.rows[0].reference_number,
        sourceCompany: sourceCompany.name,
        targetCompany: targetCompany.name
      },
      purchaseOrder: {
        id: purchaseOrderResult.rows[0].id,
        orderNumber: purchaseOrderResult.rows[0].order_number,
        total: parseFloat(purchaseOrderResult.rows[0].total),
        status: purchaseOrderResult.rows[0].status,
        referenceNumber: purchaseOrderResult.rows[0].reference_number
      },
      trackingInstructions: {
        getAllRelatedTransactions: `GET /api/transaction-group/${transactionGroupRef}`,
        createRelatedInvoice: `POST /api/intercompany/invoice with salesOrderId: ${salesOrderResult.rows[0].id}`,
        trackFullWorkflow: "Use the reference field to track from sales order through invoice to receipt"
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany sales order:', error);
    res.status(500).json({ error: 'Failed to create intercompany sales order' });
  } finally {
    client.release();
  }
});

// 3. INTERCOMPANY INVOICE (Creates sales invoice + purchase bill)
app.post('/api/intercompany/invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, salesOrderId, total } = req.body;
    
    if (!sourceCompanyId || !targetCompanyId || !salesOrderId || !total) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate sales order exists
    const salesOrderResult = await client.query(
      'SELECT id, order_number, total FROM sales_orders WHERE id = $1 AND company_id = $2',
      [salesOrderId, sourceCompanyId]
    );
    
    if (salesOrderResult.rows.length === 0) {
      return res.status(400).json({ error: 'Sales order not found' });
    }

    // Find corresponding purchase order in target company
    const purchaseOrderResult = await client.query(
      'SELECT id, order_number FROM purchase_orders WHERE company_id = $1 AND vendor_id = $2',
      [targetCompanyId, sourceCompanyId]
    );

    await client.query('BEGIN');

    const timestamp = Date.now();
    
    // 1. Create sales invoice in source company
    const invoiceNumber = `INV-${sourceCompanyId}-${timestamp}`;
    const salesInvoiceResult = await client.query(`
      INSERT INTO invoices (
        company_id, customer_id, sales_order_id, invoice_number, 
        invoice_date, due_date, total, status, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days', $5, $6, NOW())
      RETURNING id, invoice_number, total, status
    `, [sourceCompanyId, targetCompanyId, salesOrderId, invoiceNumber, total, 'pending']);

    // 2. Create corresponding purchase bill in target company
    const billNumber = `BILL-${targetCompanyId}-${timestamp}`;
    const purchaseOrderId = purchaseOrderResult.rows[0]?.id || null;
    
    const purchaseBillResult = await client.query(`
      INSERT INTO bills (
        company_id, vendor_id, purchase_order_id, bill_number, 
        bill_date, due_date, total, status, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days', $5, $6, NOW())
      RETURNING id, bill_number, total, status
    `, [targetCompanyId, sourceCompanyId, purchaseOrderId, billNumber, total, 'pending']);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany invoice and bill created successfully',
      salesInvoice: {
        id: salesInvoiceResult.rows[0].id,
        invoiceNumber: salesInvoiceResult.rows[0].invoice_number,
        total: parseFloat(salesInvoiceResult.rows[0].total),
        status: salesInvoiceResult.rows[0].status,
        companyId: sourceCompanyId,
        salesOrderId: salesOrderId
      },
      purchaseBill: {
        id: purchaseBillResult.rows[0].id,
        billNumber: purchaseBillResult.rows[0].bill_number,
        total: parseFloat(purchaseBillResult.rows[0].total),
        status: purchaseBillResult.rows[0].status,
        companyId: targetCompanyId,
        purchaseOrderId: purchaseOrderId
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany invoice:', error);
    res.status(500).json({ error: 'Failed to create intercompany invoice' });
  } finally {
    client.release();
  }
});

// 4. INTERCOMPANY PAYMENT (Creates bill_payment + receipt)
app.post('/api/intercompany/payment', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sourceCompanyId, targetCompanyId, invoiceId, billId, amount } = req.body;
    
    if (!sourceCompanyId || !targetCompanyId || !amount) {
      return res.status(400).json({ error: 'sourceCompanyId, targetCompanyId, and amount are required' });
    }

    await client.query('BEGIN');

    const timestamp = Date.now();
    
    // 1. Create bill payment in source company (paying the bill)
    const paymentNumber = `PAY-${sourceCompanyId}-${timestamp}`;
    const paymentResult = await client.query(`
      INSERT INTO bill_payments (
        company_id, vendor_id, bill_id, payment_number, 
        payment_date, amount, status, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, NOW())
      RETURNING id, payment_number, amount, status
    `, [sourceCompanyId, targetCompanyId, billId, paymentNumber, amount, 'completed']);

    // 2. Create corresponding receipt in target company (receiving the payment)
    const receiptNumber = `REC-${targetCompanyId}-${timestamp}`;
    const receiptResult = await client.query(`
      INSERT INTO receipts (
        company_id, customer_id, invoice_id, receipt_number, 
        receipt_date, amount, status, created_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, NOW())
      RETURNING id, receipt_number, amount, status
    `, [targetCompanyId, sourceCompanyId, invoiceId, receiptNumber, amount, 'completed']);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany payment and receipt created successfully',
      billPayment: {
        id: paymentResult.rows[0].id,
        paymentNumber: paymentResult.rows[0].payment_number,
        amount: parseFloat(paymentResult.rows[0].amount),
        status: paymentResult.rows[0].status,
        companyId: sourceCompanyId,
        billId: billId
      },
      receipt: {
        id: receiptResult.rows[0].id,
        receiptNumber: receiptResult.rows[0].receipt_number,
        amount: parseFloat(receiptResult.rows[0].amount),
        status: receiptResult.rows[0].status,
        companyId: targetCompanyId,
        invoiceId: invoiceId
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating intercompany payment:', error);
    res.status(500).json({ error: 'Failed to create intercompany payment' });
  } finally {
    client.release();
  }
});

// 5. TRANSACTION REFERENCE LOOKUP
app.get('/api/reference/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    // Search sales orders
    const salesOrderResult = await pool.query(`
      SELECT 'sales_order' as type, id, order_number as reference, 
             company_id, customer_id, total, status, created_at, reference_number
      FROM sales_orders 
      WHERE order_number = $1 OR reference_number = $1
      LIMIT 1
    `, [reference]);

    if (salesOrderResult.rows.length > 0) {
      const transaction = salesOrderResult.rows[0];
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.company_id]);
      const customerResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.customer_id]);
      
      return res.json({
        success: true,
        transaction: {
          ...transaction,
          companyName: companyResult.rows[0]?.name,
          customerName: customerResult.rows[0]?.name
        }
      });
    }

    // Search invoices
    const invoiceResult = await pool.query(`
      SELECT 'invoice' as type, id, invoice_number as reference,
             company_id, customer_id, total, status, created_at, sales_order_id
      FROM invoices 
      WHERE invoice_number = $1
      LIMIT 1
    `, [reference]);

    if (invoiceResult.rows.length > 0) {
      const transaction = invoiceResult.rows[0];
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.company_id]);
      const customerResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.customer_id]);
      
      return res.json({
        success: true,
        transaction: {
          ...transaction,
          companyName: companyResult.rows[0]?.name,
          customerName: customerResult.rows[0]?.name
        }
      });
    }

    res.status(404).json({
      success: false,
      error: 'Transaction reference not found'
    });

  } catch (error) {
    console.error('Error looking up transaction reference:', error);
    res.status(500).json({ error: 'Failed to lookup transaction reference' });
  }
});

// 6. CHART OF ACCOUNTS
app.get('/api/accounts', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT a.id, a.name as account_name, a.code as account_code, a.account_type_id as account_type, 
             a.parent_id as parent_account_id, a.is_active, a.created_at, a.updated_at, a.description
      FROM accounts a
      WHERE a.company_id = $1 AND a.is_active = true
      ORDER BY a.code
    `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

app.post('/api/accounts', async (req, res) => {
  const client = await pool.connect();
  try {
    const { companyId, accountName, accountCode, accountType, parentAccountId } = req.body;
    
    if (!companyId || !accountName || !accountCode || !accountType) {
      return res.status(400).json({ error: 'companyId, accountName, accountCode, and accountType are required' });
    }

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO accounts (company_id, name, code, account_type_id, parent_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING *
    `, [companyId, accountName, accountCode, accountType, parentAccountId]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      account: result.rows[0],
      message: 'Account created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  } finally {
    client.release();
  }
});

// Additional working endpoints
app.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT * FROM sales_orders 
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // AR Summary with complete sales order → invoice → receipt tracking and customer details
    const arSummary = await pool.query(`
      SELECT 
        -- Sales Orders
        COUNT(DISTINCT so.id) as total_sales_orders,
        COALESCE(SUM(DISTINCT so.total), 0) as sales_orders_total,
        
        -- Invoices (linked and unlinked)
        COUNT(DISTINCT i.id) as total_invoices,
        COALESCE(SUM(DISTINCT i.total), 0) as invoices_total,
        COUNT(DISTINCT CASE WHEN i.sales_order_id IS NOT NULL THEN i.id END) as invoices_from_sales_orders,
        
        -- Receipts
        COUNT(DISTINCT r.id) as total_receipts,
        COALESCE(SUM(DISTINCT r.amount), 0) as receipts_total,
        COUNT(DISTINCT CASE WHEN r.invoice_id IS NOT NULL THEN r.id END) as receipts_linked_to_invoices,
        
        -- Intercompany vs External
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN so.id END) as intercompany_sales_orders,
        COUNT(DISTINCT CASE WHEN c.id IS NULL THEN so.id END) as external_sales_orders
        
      FROM sales_orders so
      FULL OUTER JOIN invoices i ON so.id = i.sales_order_id AND i.company_id = $1
      FULL OUTER JOIN receipts r ON i.id = r.invoice_id AND r.company_id = $1
      LEFT JOIN companies c ON so.customer_id = c.id
      WHERE so.company_id = $1 OR i.company_id = $1 OR r.company_id = $1
    `, [companyId]);

    // Get detailed AR breakdown with customer information
    const arDetails = await pool.query(`
      SELECT 
        c.name as customer_name,
        c.id as customer_id,
        CASE WHEN c.id IS NOT NULL THEN 'Intercompany' ELSE 'External' END as relationship_type,
        COUNT(DISTINCT so.id) as sales_orders_count,
        COALESCE(SUM(DISTINCT so.total), 0) as sales_orders_total,
        COUNT(DISTINCT i.id) as invoices_count,
        COALESCE(SUM(DISTINCT i.total), 0) as invoices_total,
        COUNT(DISTINCT r.id) as receipts_count,
        COALESCE(SUM(DISTINCT r.amount), 0) as receipts_total,
        COALESCE(SUM(DISTINCT i.total), 0) - COALESCE(SUM(DISTINCT r.amount), 0) as outstanding_amount
      FROM sales_orders so
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      LEFT JOIN receipts r ON i.id = r.invoice_id
      LEFT JOIN companies c ON so.customer_id = c.id
      WHERE so.company_id = $1
      GROUP BY c.id, c.name
      HAVING COUNT(DISTINCT so.id) > 0
      ORDER BY outstanding_amount DESC
      LIMIT 10
    `, [companyId]);

    const result = arSummary.rows[0];
    const outstandingAR = parseFloat(result.invoices_total) - parseFloat(result.receipts_total);

    // Get detailed sales order breakdown with invoice and receipt counts
    const salesOrderDetails = await pool.query(`
      SELECT 
        so.id as sales_order_id,
        so.order_number,
        so.total as sales_order_total,
        so.reference_number,
        so.order_date,
        so.status,
        c.name as customer_name,
        c.id as customer_id,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(DISTINCT i.total), 0) as invoices_total,
        COUNT(DISTINCT r.id) as receipt_count,
        COALESCE(SUM(DISTINCT r.amount), 0) as receipts_total,
        (COALESCE(SUM(DISTINCT i.total), 0) - COALESCE(SUM(DISTINCT r.amount), 0)) as outstanding_amount
      FROM sales_orders so
      LEFT JOIN companies c ON so.customer_id = c.id
      LEFT JOIN invoices i ON so.id = i.sales_order_id
      LEFT JOIN receipts r ON i.id = r.invoice_id
      WHERE so.company_id = $1
      GROUP BY so.id, so.order_number, so.total, so.reference_number, so.order_date, so.status, c.name, c.id
      ORDER BY so.order_date DESC
      LIMIT 20
    `, [companyId]);

    res.json({
      // Enhanced Sales Order → Sales Invoice → Sales Receipt Workflow
      salesOrderWorkflow: {
        totalSalesOrders: result.total_sales_orders.toString(),
        totalSalesOrderAmount: parseFloat(result.sales_orders_total).toFixed(2),
        totalSalesInvoices: result.total_invoices.toString(),
        totalSalesInvoiceAmount: parseFloat(result.invoices_total).toFixed(2),
        totalSalesReceipts: result.total_receipts.toString(),
        totalSalesReceiptAmount: parseFloat(result.receipts_total).toFixed(2),
        outstandingReceivables: outstandingAR.toFixed(2)
      },

      // Detailed sales order breakdown showing invoices and receipts for each order
      salesOrderDetails: salesOrderDetails.rows.map(row => ({
        salesOrderId: row.sales_order_id,
        orderNumber: row.order_number,
        referenceNumber: row.reference_number,
        orderDate: row.order_date,
        status: row.status,
        salesOrderTotal: parseFloat(row.sales_order_total).toFixed(2),
        customer: {
          id: row.customer_id,
          name: row.customer_name || 'External Customer',
          type: row.customer_id ? 'Intercompany' : 'External'
        },
        invoices: {
          count: parseInt(row.invoice_count),
          totalAmount: parseFloat(row.invoices_total).toFixed(2)
        },
        receipts: {
          count: parseInt(row.receipt_count),
          totalAmount: parseFloat(row.receipts_total).toFixed(2)
        },
        outstandingAmount: parseFloat(row.outstanding_amount).toFixed(2),
        workflowStatus: `${row.invoice_count} invoices, ${row.receipt_count} receipts`
      })),
      
      // Summary statistics
      workflowStatistics: {
        salesOrdersWithInvoices: result.invoices_from_sales_orders.toString(),
        salesOrdersWithoutInvoices: (parseInt(result.total_sales_orders) - parseInt(result.invoices_from_sales_orders)).toString(),
        invoicesWithReceipts: result.receipts_linked_to_invoices.toString(),
        invoicesWithoutReceipts: (parseInt(result.total_invoices) - parseInt(result.receipts_linked_to_invoices)).toString(),
        intercompanySalesOrders: result.intercompany_sales_orders.toString(),
        externalSalesOrders: result.external_sales_orders.toString()
      },
      
      // Legacy format for backward compatibility
      totalSalesOrders: result.total_sales_orders.toString(),
      salesOrdersTotal: parseFloat(result.sales_orders_total).toFixed(2),
      intercompanySalesOrders: result.intercompany_sales_orders.toString(),
      externalSalesOrders: result.external_sales_orders.toString(),
      totalInvoices: result.total_invoices.toString(),
      invoicesTotal: parseFloat(result.invoices_total).toFixed(2),
      invoicesFromSalesOrders: result.invoices_from_sales_orders.toString(),
      totalReceipts: result.total_receipts.toString(),
      receiptsTotal: parseFloat(result.receipts_total).toFixed(2),
      receiptsLinkedToInvoices: result.receipts_linked_to_invoices.toString(),
      outstandingReceivables: outstandingAR.toFixed(2),
      
      // Customer/Intercompany Details
      customerBreakdown: arDetails.rows.map(row => ({
        customerName: row.customer_name || 'External Customer',
        customerId: row.customer_id,
        relationshipType: row.relationship_type,
        salesOrders: {
          count: row.sales_orders_count.toString(),
          total: parseFloat(row.sales_orders_total).toFixed(2)
        },
        invoices: {
          count: row.invoices_count.toString(),
          total: parseFloat(row.invoices_total).toFixed(2)
        },
        receipts: {
          count: row.receipts_count.toString(),
          total: parseFloat(row.receipts_total).toFixed(2)
        },
        outstandingAmount: parseFloat(row.outstanding_amount).toFixed(2)
      })),
      
      // Legacy format for compatibility
      totalinvoices: result.total_invoices.toString(),
      totalamount: parseFloat(result.invoices_total).toFixed(2),
      paidinvoices: result.total_receipts.toString(),
      paidamount: parseFloat(result.receipts_total).toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching AR summary:', error);
    res.status(500).json({ error: 'Failed to fetch AR summary' });
  }
});

app.get('/api/bills/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    // AP Summary with complete purchase order → bill → payment tracking and vendor details
    const apSummary = await pool.query(`
      SELECT 
        -- Purchase Orders
        COUNT(DISTINCT po.id) as total_purchase_orders,
        COALESCE(SUM(DISTINCT po.total), 0) as purchase_orders_total,
        
        -- Bills (linked and unlinked)
        COUNT(DISTINCT b.id) as total_bills,
        COALESCE(SUM(DISTINCT b.total), 0) as bills_total,
        COUNT(DISTINCT CASE WHEN b.purchase_order_id IS NOT NULL THEN b.id END) as bills_from_purchase_orders,
        
        -- Bill Payments
        COUNT(DISTINCT bp.id) as total_bill_payments,
        COALESCE(SUM(DISTINCT bp.amount), 0) as payments_total,
        COUNT(DISTINCT CASE WHEN bp.bill_id IS NOT NULL THEN bp.id END) as payments_linked_to_bills,
        
        -- Intercompany vs External
        COUNT(DISTINCT CASE WHEN v.id IS NOT NULL THEN po.id END) as intercompany_purchase_orders,
        COUNT(DISTINCT CASE WHEN v.id IS NULL THEN po.id END) as external_purchase_orders
        
      FROM purchase_orders po
      FULL OUTER JOIN bills b ON po.id = b.purchase_order_id AND b.company_id = $1
      FULL OUTER JOIN bill_payments bp ON b.id = bp.bill_id AND bp.company_id = $1
      LEFT JOIN companies v ON po.vendor_id = v.id
      WHERE po.company_id = $1 OR b.company_id = $1 OR bp.company_id = $1
    `, [companyId]);

    // Get detailed AP breakdown with vendor information
    const apDetails = await pool.query(`
      SELECT 
        v.name as vendor_name,
        v.id as vendor_id,
        CASE WHEN v.id IS NOT NULL THEN 'Intercompany' ELSE 'External' END as relationship_type,
        COUNT(DISTINCT po.id) as purchase_orders_count,
        COALESCE(SUM(DISTINCT po.total), 0) as purchase_orders_total,
        COUNT(DISTINCT b.id) as bills_count,
        COALESCE(SUM(DISTINCT b.total), 0) as bills_total,
        COUNT(DISTINCT bp.id) as payments_count,
        COALESCE(SUM(DISTINCT bp.amount), 0) as payments_total,
        COALESCE(SUM(DISTINCT b.total), 0) - COALESCE(SUM(DISTINCT bp.amount), 0) as outstanding_amount
      FROM purchase_orders po
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      LEFT JOIN bill_payments bp ON b.id = bp.bill_id
      LEFT JOIN companies v ON po.vendor_id = v.id
      WHERE po.company_id = $1
      GROUP BY v.id, v.name
      HAVING COUNT(DISTINCT po.id) > 0
      ORDER BY outstanding_amount DESC
      LIMIT 10
    `, [companyId]);

    const result = apSummary.rows[0];
    const outstandingAP = parseFloat(result.bills_total) - parseFloat(result.payments_total);

    // Get detailed purchase order breakdown with bill and payment counts
    const purchaseOrderDetails = await pool.query(`
      SELECT 
        po.id as purchase_order_id,
        po.order_number,
        po.total as purchase_order_total,
        po.reference_number,
        po.order_date,
        po.status,
        v.name as vendor_name,
        v.id as vendor_id,
        COUNT(DISTINCT b.id) as bill_count,
        COALESCE(SUM(DISTINCT b.total), 0) as bills_total,
        COUNT(DISTINCT bp.id) as payment_count,
        COALESCE(SUM(DISTINCT bp.amount), 0) as payments_total,
        (COALESCE(SUM(DISTINCT b.total), 0) - COALESCE(SUM(DISTINCT bp.amount), 0)) as outstanding_amount
      FROM purchase_orders po
      LEFT JOIN companies v ON po.vendor_id = v.id
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      LEFT JOIN bill_payments bp ON b.id = bp.bill_id
      WHERE po.company_id = $1
      GROUP BY po.id, po.order_number, po.total, po.reference_number, po.order_date, po.status, v.name, v.id
      ORDER BY po.order_date DESC
      LIMIT 20
    `, [companyId]);

    res.json({
      // Enhanced Purchase Order → Purchase Bill → Purchase Payment Workflow
      purchaseOrderWorkflow: {
        totalPurchaseOrders: result.total_purchase_orders.toString(),
        totalPurchaseOrderAmount: parseFloat(result.purchase_orders_total).toFixed(2),
        totalPurchaseBills: result.total_bills.toString(),
        totalPurchaseBillAmount: parseFloat(result.bills_total).toFixed(2),
        totalPurchasePayments: result.total_bill_payments.toString(),
        totalPurchasePaymentAmount: parseFloat(result.payments_total).toFixed(2),
        outstandingPayables: outstandingAP.toFixed(2)
      },

      // Detailed purchase order breakdown showing bills and payments for each order
      purchaseOrderDetails: purchaseOrderDetails.rows.map(row => ({
        purchaseOrderId: row.purchase_order_id,
        orderNumber: row.order_number,
        referenceNumber: row.reference_number,
        orderDate: row.order_date,
        status: row.status,
        purchaseOrderTotal: parseFloat(row.purchase_order_total).toFixed(2),
        vendor: {
          id: row.vendor_id,
          name: row.vendor_name || 'External Vendor',
          type: row.vendor_id ? 'Intercompany' : 'External'
        },
        bills: {
          count: parseInt(row.bill_count),
          totalAmount: parseFloat(row.bills_total).toFixed(2)
        },
        payments: {
          count: parseInt(row.payment_count),
          totalAmount: parseFloat(row.payments_total).toFixed(2)
        },
        outstandingAmount: parseFloat(row.outstanding_amount).toFixed(2),
        workflowStatus: `${row.bill_count} bills, ${row.payment_count} payments`
      })),
      
      // Summary statistics
      workflowStatistics: {
        purchaseOrdersWithBills: result.bills_from_purchase_orders.toString(),
        purchaseOrdersWithoutBills: (parseInt(result.total_purchase_orders) - parseInt(result.bills_from_purchase_orders)).toString(),
        billsWithPayments: result.payments_linked_to_bills.toString(),
        billsWithoutPayments: (parseInt(result.total_bills) - parseInt(result.payments_linked_to_bills)).toString(),
        intercompanyPurchaseOrders: result.intercompany_purchase_orders.toString(),
        externalPurchaseOrders: result.external_purchase_orders.toString()
      },
      
      // Legacy format for backward compatibility
      totalPurchaseOrders: result.total_purchase_orders.toString(),
      purchaseOrdersTotal: parseFloat(result.purchase_orders_total).toFixed(2),
      intercompanyPurchaseOrders: result.intercompany_purchase_orders.toString(),
      externalPurchaseOrders: result.external_purchase_orders.toString(),
      totalBills: result.total_bills.toString(),
      billsTotal: parseFloat(result.bills_total).toFixed(2),
      billsFromPurchaseOrders: result.bills_from_purchase_orders.toString(),
      totalBillPayments: result.total_bill_payments.toString(),
      paymentsTotal: parseFloat(result.payments_total).toFixed(2),
      paymentsLinkedToBills: result.payments_linked_to_bills.toString(),
      outstandingPayables: outstandingAP.toFixed(2),
      
      // Vendor/Intercompany Details
      vendorBreakdown: apDetails.rows.map(row => ({
        vendorName: row.vendor_name || 'External Vendor',
        vendorId: row.vendor_id,
        relationshipType: row.relationship_type,
        purchaseOrders: {
          count: row.purchase_orders_count.toString(),
          total: parseFloat(row.purchase_orders_total).toFixed(2)
        },
        bills: {
          count: row.bills_count.toString(),
          total: parseFloat(row.bills_total).toFixed(2)
        },
        payments: {
          count: row.payments_count.toString(),
          total: parseFloat(row.payments_total).toFixed(2)
        },
        outstandingAmount: parseFloat(row.outstanding_amount).toFixed(2)
      })),
      
      // Legacy format for compatibility
      totalbills: result.total_bills.toString(),
      totalamount: parseFloat(result.bills_total).toFixed(2),
      paidbills: result.total_bill_payments.toString(),
      paidamount: parseFloat(result.payments_total).toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching AP summary:', error);
    res.status(500).json({ error: 'Failed to fetch AP summary' });
  }
});

// New endpoint to track all related transactions by transaction group reference
app.get('/api/transaction-group/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({ error: 'Transaction group reference is required' });
    }

    // Get all sales orders with this reference
    const salesOrders = await pool.query(`
      SELECT so.*, c1.name as company_name, c2.name as customer_name
      FROM sales_orders so
      LEFT JOIN companies c1 ON so.company_id = c1.id
      LEFT JOIN companies c2 ON so.customer_id = c2.id
      WHERE so.reference_number = $1
      ORDER BY so.created_at DESC
    `, [reference]);

    // Get all purchase orders with this reference
    const purchaseOrders = await pool.query(`
      SELECT po.*, c1.name as company_name, c2.name as vendor_name
      FROM purchase_orders po
      LEFT JOIN companies c1 ON po.company_id = c1.id
      LEFT JOIN companies c2 ON po.vendor_id = c2.id
      WHERE po.reference_number = $1
      ORDER BY po.created_at DESC
    `, [reference]);

    // Get all invoices related to these sales orders
    const invoices = await pool.query(`
      SELECT i.*, so.order_number as sales_order_number, c.name as company_name
      FROM invoices i
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      LEFT JOIN companies c ON i.company_id = c.id
      WHERE so.reference_number = $1
      ORDER BY i.created_at DESC
    `, [reference]);

    // Get all bills related to these purchase orders
    const bills = await pool.query(`
      SELECT b.*, po.order_number as purchase_order_number, c.name as company_name
      FROM bills b
      LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
      LEFT JOIN companies c ON b.company_id = c.id
      WHERE po.reference_number = $1
      ORDER BY b.created_at DESC
    `, [reference]);

    // Get all receipts related to these invoices
    const receipts = await pool.query(`
      SELECT r.*, i.invoice_number, c.name as company_name
      FROM receipts r
      LEFT JOIN invoices i ON r.invoice_id = i.id
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      LEFT JOIN companies c ON r.company_id = c.id
      WHERE so.reference_number = $1
      ORDER BY r.created_at DESC
    `, [reference]);

    // Get all bill payments related to these bills
    const billPayments = await pool.query(`
      SELECT bp.*, b.bill_number, c.name as company_name
      FROM bill_payments bp
      LEFT JOIN bills b ON bp.bill_id = b.id
      LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
      LEFT JOIN companies c ON bp.company_id = c.id
      WHERE po.reference_number = $1
      ORDER BY bp.created_at DESC
    `, [reference]);

    res.json({
      success: true,
      transactionGroupReference: reference,
      summary: {
        salesOrders: salesOrders.rows.length,
        purchaseOrders: purchaseOrders.rows.length,
        invoices: invoices.rows.length,
        bills: bills.rows.length,
        receipts: receipts.rows.length,
        billPayments: billPayments.rows.length
      },
      transactions: {
        salesOrders: salesOrders.rows,
        purchaseOrders: purchaseOrders.rows,
        invoices: invoices.rows,
        bills: bills.rows,
        receipts: receipts.rows,
        billPayments: billPayments.rows
      },
      workflow: {
        completed: invoices.rows.length > 0 && receipts.rows.length > 0,
        status: `${salesOrders.rows.length} sales orders → ${invoices.rows.length} invoices → ${receipts.rows.length} receipts`
      }
    });

  } catch (error) {
    console.error('Error fetching transaction group:', error);
    res.status(500).json({ error: 'Failed to fetch transaction group details' });
  }
});

app.get('/api/intercompany-balances', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const arResult = await pool.query(`
      SELECT COALESCE(SUM(i.total), 0) - COALESCE(SUM(r.amount), 0) as balance
      FROM invoices i
      LEFT JOIN receipts r ON i.id = r.invoice_id
      WHERE i.company_id = $1
    `, [companyId]);

    const apResult = await pool.query(`
      SELECT COALESCE(SUM(b.total), 0) - COALESCE(SUM(bp.amount), 0) as balance
      FROM bills b
      LEFT JOIN bill_payments bp ON b.id = bp.bill_id
      WHERE b.company_id = $1
    `, [companyId]);

    res.json({
      companyId: parseInt(companyId),
      accountsReceivable: parseFloat(arResult.rows[0].balance) || 0,
      accountsPayable: parseFloat(apResult.rows[0].balance) || 0,
      relatedCompanies: []
    });
  } catch (error) {
    console.error('Error fetching intercompany balances:', error);
    res.status(500).json({ error: 'Failed to fetch intercompany balances' });
  }
});

// AR/AP Summary for All Companies (Individual Company Breakdown)
app.get('/api/companies/ar-ap-summary', async (req, res) => {
  try {
    // Get all companies
    const companies = await pool.query('SELECT id, name FROM companies ORDER BY name');
    
    const companySummaries = [];
    
    for (const company of companies.rows) {
      const companyId = company.id;
      
      // Get AR data for this company
      const arResult = await pool.query(`
        WITH sales_order_summary AS (
          SELECT 
            COUNT(*) as total_sales_orders,
            COALESCE(SUM(total), 0) as sales_orders_total,
            COUNT(CASE WHEN customer_id IN (SELECT id FROM companies) THEN 1 END) as intercompany_sales_orders
          FROM sales_orders 
          WHERE company_id = $1
        ),
        invoice_summary AS (
          SELECT 
            COUNT(*) as total_invoices,
            COALESCE(SUM(total), 0) as invoices_total,
            COUNT(CASE WHEN sales_order_id IS NOT NULL THEN 1 END) as invoices_from_sales_orders
          FROM invoices 
          WHERE company_id = $1
        ),
        receipt_summary AS (
          SELECT 
            COUNT(*) as total_receipts,
            COALESCE(SUM(amount), 0) as receipts_total,
            COUNT(CASE WHEN invoice_id IS NOT NULL THEN 1 END) as receipts_linked_to_invoices
          FROM receipts 
          WHERE company_id = $1
        )
        SELECT 
          sos.*, ins.*, rs.*
        FROM sales_order_summary sos, invoice_summary ins, receipt_summary rs
      `, [companyId]);

      // Get AP data for this company
      const apResult = await pool.query(`
        WITH purchase_order_summary AS (
          SELECT 
            COUNT(*) as total_purchase_orders,
            COALESCE(SUM(total), 0) as purchase_orders_total,
            COUNT(CASE WHEN vendor_id IN (SELECT id FROM companies) THEN 1 END) as intercompany_purchase_orders
          FROM purchase_orders 
          WHERE company_id = $1
        ),
        bill_summary AS (
          SELECT 
            COUNT(*) as total_bills,
            COALESCE(SUM(total), 0) as bills_total,
            COUNT(CASE WHEN purchase_order_id IS NOT NULL THEN 1 END) as bills_from_purchase_orders
          FROM bills 
          WHERE company_id = $1
        ),
        payment_summary AS (
          SELECT 
            COUNT(*) as total_bill_payments,
            COALESCE(SUM(amount), 0) as payments_total,
            COUNT(CASE WHEN bill_id IS NOT NULL THEN 1 END) as payments_linked_to_bills
          FROM bill_payments 
          WHERE company_id = $1
        )
        SELECT 
          pos.*, bs.*, ps.*
        FROM purchase_order_summary pos, bill_summary bs, payment_summary ps
      `, [companyId]);

      const arData = arResult.rows[0];
      const apData = apResult.rows[0];
      
      const outstandingAR = parseFloat(arData.invoices_total) - parseFloat(arData.receipts_total);
      const outstandingAP = parseFloat(apData.bills_total) - parseFloat(apData.payments_total);

      companySummaries.push({
        companyId: company.id,
        companyName: company.name,
        accountsReceivable: {
          salesOrders: {
            total: arData.total_sales_orders.toString(),
            amount: parseFloat(arData.sales_orders_total).toFixed(2),
            intercompany: arData.intercompany_sales_orders.toString()
          },
          invoices: {
            total: arData.total_invoices.toString(),
            amount: parseFloat(arData.invoices_total).toFixed(2),
            fromSalesOrders: arData.invoices_from_sales_orders.toString()
          },
          receipts: {
            total: arData.total_receipts.toString(),
            amount: parseFloat(arData.receipts_total).toFixed(2),
            linkedToInvoices: arData.receipts_linked_to_invoices.toString()
          },
          outstanding: outstandingAR.toFixed(2)
        },
        accountsPayable: {
          purchaseOrders: {
            total: apData.total_purchase_orders.toString(),
            amount: parseFloat(apData.purchase_orders_total).toFixed(2),
            intercompany: apData.intercompany_purchase_orders.toString()
          },
          bills: {
            total: apData.total_bills.toString(),
            amount: parseFloat(apData.bills_total).toFixed(2),
            fromPurchaseOrders: apData.bills_from_purchase_orders.toString()
          },
          payments: {
            total: apData.total_bill_payments.toString(),
            amount: parseFloat(apData.payments_total).toFixed(2),
            linkedToBills: apData.payments_linked_to_bills.toString()
          },
          outstanding: outstandingAP.toFixed(2)
        }
      });
    }

    res.json({
      success: true,
      totalCompanies: companies.rows.length,
      companies: companySummaries
    });

  } catch (error) {
    console.error('Error fetching company AR/AP summaries:', error);
    res.status(500).json({ error: 'Failed to fetch company AR/AP summaries' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Company Accounting System running on port ${PORT}`);
  console.log(`📊 All required endpoints functional with authentic data`);
  console.log(`🔗 Connected to external database: 135.235.154.222`);
});