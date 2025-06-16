/**
 * Multi-Company Accounting System - Complete Production Server
 * All required endpoints with authentic data from external database
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const appInsights = require('applicationinsights');

// Initialize Application Insights
const APPINSIGHTS_INSTRUMENTATIONKEY = 'e04a0cf1-8129-4bc2-8707-016ae726c876';

if (process.env.NODE_ENV === 'production') {
  appInsights.setup(APPINSIGHTS_INSTRUMENTATIONKEY)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .start();
}

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

// Application Insights Logger with Microsoft Azure Integration
function logWithApplicationInsights(level, message, requestId = null) {
  const timestamp = new Date();
  const formattedTime = timestamp.toTimeString().split(' ')[0]; // HH:mm:ss format
  const levelFormatted = level.toUpperCase().padEnd(3);
  const reqId = requestId || `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  const formattedMessage = `[${formattedTime} ${levelFormatted}] [${reqId}] ${message}`;
  
  // Always log to console for debugging
  console.log(formattedMessage);
  
  // Send to Microsoft Application Insights in production
  if (process.env.NODE_ENV === 'production' && appInsights.defaultClient) {
    const properties = {
      requestId: reqId,
      timestamp: timestamp.toISOString(),
      level: level.toUpperCase(),
      originalMessage: message,
      service: 'multi-company-accounting',
      version: '1.0.0'
    };
    
    const customDimensions = {
      ...properties,
      environment: process.env.NODE_ENV || 'production',
      server: 'external-db-135.235.154.222'
    };
    
    try {
      switch (level.toUpperCase()) {
        case 'ERR':
          appInsights.defaultClient.trackException({ 
            exception: new Error(message), 
            properties: customDimensions,
            measurements: { timestamp: Date.now() }
          });
          break;
        case 'WRN':
          appInsights.defaultClient.trackTrace(
            formattedMessage, 
            appInsights.Contracts.SeverityLevel.Warning, 
            customDimensions
          );
          break;
        case 'INF':
        default:
          appInsights.defaultClient.trackTrace(
            formattedMessage, 
            appInsights.Contracts.SeverityLevel.Information, 
            customDimensions
          );
          break;
      }
      
      // Force flush in production for immediate delivery
      if (process.env.NODE_ENV === 'production') {
        appInsights.defaultClient.flush();
      }
    } catch (appInsightsError) {
      console.error('Application Insights logging error:', appInsightsError.message);
    }
  }
}

// Health check
app.get('/health', async (req, res) => {
  const requestId = `health-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  logWithApplicationInsights('INF', 'Health check requested', requestId);
  
  try {
    const result = await pool.query('SELECT NOW()');
    logWithApplicationInsights('INF', 'Health check successful - database connected', requestId);
    res.json({
      status: 'healthy',
      database: 'connected to 135.235.154.222',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    logWithApplicationInsights('ERR', `Health check failed: ${error.message}`, requestId);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// 1. COMPANY MANAGEMENT
app.get('/api/companies', async (req, res) => {
  const requestId = `companies-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  logWithApplicationInsights('INF', 'Fetching companies list', requestId);
  
  try {
    const result = await pool.query(`
      SELECT id, name, code, company_type, address, phone, email, 
             is_active, created_at, updated_at
      FROM companies 
      WHERE is_active = true
      ORDER BY name
    `);
    
    logWithApplicationInsights('INF', `Found ${result.rows.length} active companies`, requestId);
    res.json(result.rows);
  } catch (error) {
    logWithApplicationInsights('ERR', `Error fetching companies: ${error.message}`, requestId);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});



app.post('/api/companies', async (req, res) => {
  const requestId = `company-create-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { name, code, company_type, address, phone, email } = req.body;
  
  logWithApplicationInsights('INF', `Creating new company: ${name}`, requestId);
  
  const client = await pool.connect();
  try {
    if (!name) {
      logWithApplicationInsights('ERR', 'Company creation failed - name is required', requestId);
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
    logWithApplicationInsights('INF', `Company created successfully: ${newCompany.name} (ID: ${newCompany.id})`, requestId);

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
        logWithApplicationInsights('WRN', `Failed to create account ${account.code} for company ${newCompany.id}:`, requestId);
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
    logWithApplicationInsights('ERR', `Error creating company: ${error.message}`, requestId);
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
  const requestId = `intercompany-so-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { sourceCompanyId, targetCompanyId, products = [], orderTotal, total, referenceNumber } = req.body;
  const finalTotal = orderTotal || total;
  
  logWithApplicationInsights('INF', `Creating intercompany sales order: ${sourceCompanyId} -> ${targetCompanyId}, Amount: ${finalTotal}`, requestId);
  
  const client = await pool.connect();
  try {
    if (!sourceCompanyId || !targetCompanyId || !finalTotal) {
      logWithApplicationInsights('ERR', 'Intercompany sales order creation failed - missing required fields', requestId);
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
    const transactionGroupRef = referenceNumber || `TXN-GROUP-${sourceCompanyId}-${targetCompanyId}-${timestamp}`;
    const orderNumber = `SO-${sourceCompanyId}-${timestamp}`;


    const salesOrderResult = await client.query(`
      INSERT INTO sales_orders (
        company_id, customer_id, order_number, order_date, expected_date, 
        status, total, reference_number, created_at
      ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
      RETURNING id, order_number, total, status, reference_number
    `, [sourceCompanyId, targetCompanyId, orderNumber, 'Pending', finalTotal, transactionGroupRef]);

    // Save products to sales_order_items table if products array provided
    if (products && products.length > 0) {
      for (const product of products) {
        await client.query(`
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, unit_price, amount, description
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [
          salesOrderResult.rows[0].id,
          product.id || product.productId,
          product.quantity || 1,
          product.unitPrice || product.unit_price || 0,
          product.lineTotal || product.line_total || product.amount || (product.quantity || 1) * (product.unitPrice || product.unit_price || 0),
          product.description || product.name || ''
        ]);
      }
    }

    // Create corresponding purchase order with same transaction group reference
    const poNumber = `PO-${targetCompanyId}-${timestamp}`;

    const purchaseOrderResult = await client.query(`
      INSERT INTO purchase_orders (
        company_id, vendor_id, order_number, order_date, expected_date,
        status, total, reference_number, created_at
      ) VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days', $4, $5, $6, NOW())
      RETURNING id, order_number, total, status, reference_number
    `, [targetCompanyId, sourceCompanyId, poNumber, 'Pending', finalTotal, transactionGroupRef]);

    // Save products to purchase_order_items table if products array provided
    if (products && products.length > 0) {
      for (const product of products) {
        await client.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id, quantity, unit_price, amount, description
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        `, [
          purchaseOrderResult.rows[0].id,
          product.id || product.productId,
          product.quantity || 1,
          product.unitPrice || product.unit_price || 0,
          product.lineTotal || product.line_total || product.amount || (product.quantity || 1) * (product.unitPrice || product.unit_price || 0),
          product.description || product.name || ''
        ]);
      }
    }

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
    logWithApplicationInsights('ERR', 'Error creating intercompany sales order: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to create intercompany sales order' });
  } finally {
    client.release();
  }
});

// API endpoint to get products for a sales order
app.get('/api/sales-orders/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Sales order ID is required' });
    }

    // Get sales order details with products
    const salesOrderProducts = await pool.query(`
      SELECT 
        so.id as sales_order_id,
        so.order_number,
        so.total as order_total,
        so.status,
        so.reference_number,
        c.name as company_name,
        cust.name as customer_name,
        soi.id as item_id,
        soi.quantity,
        soi.unit_price,
        soi.amount,
        soi.description as item_description,
        p.id as product_id,
        p.code as product_code,
        p.name as product_name,
        p.description as product_description,
        p.sales_price as product_sales_price
      FROM sales_orders so
      LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
      LEFT JOIN products p ON soi.product_id = p.id
      LEFT JOIN companies c ON so.company_id = c.id
      LEFT JOIN companies cust ON so.customer_id = cust.id
      WHERE so.id = $1
      ORDER BY soi.id
    `, [id]);

    if (salesOrderProducts.rows.length === 0) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const salesOrder = salesOrderProducts.rows[0];
    const products = salesOrderProducts.rows
      .filter(row => row.product_id) // Only include rows with products
      .map(row => ({
        itemId: row.item_id,
        productId: row.product_id,
        productCode: row.product_code,
        productName: row.product_name,
        productDescription: row.product_description,
        quantity: parseFloat(row.quantity),
        unitPrice: parseFloat(row.unit_price),
        lineTotal: parseFloat(row.amount),
        itemDescription: row.item_description,
        salesPrice: parseFloat(row.product_sales_price) || 0
      }));

    res.json({
      success: true,
      salesOrder: {
        id: salesOrder.sales_order_id,
        orderNumber: salesOrder.order_number,
        total: parseFloat(salesOrder.order_total),
        status: salesOrder.status,
        referenceNumber: salesOrder.reference_number,
        companyName: salesOrder.company_name,
        customerName: salesOrder.customer_name
      },
      products: products,
      productCount: products.length,
      totalProductValue: products.reduce((sum, p) => sum + p.lineTotal, 0)
    });

  } catch (error) {
    logWithApplicationInsights('ERR', 'Error fetching sales order products: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to fetch sales order products' });
  }
});

// API endpoint to get products for a purchase order
app.get('/api/purchase-orders/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Purchase order ID is required' });
    }

    // Get purchase order details with products
    const purchaseOrderProducts = await pool.query(`
      SELECT 
        po.id as purchase_order_id,
        po.order_number,
        po.total as order_total,
        po.status,
        po.reference_number,
        c.name as company_name,
        v.name as vendor_name,
        poi.id as item_id,
        poi.quantity,
        poi.unit_price,
        poi.amount,
        poi.description as item_description,
        p.id as product_id,
        p.code as product_code,
        p.name as product_name,
        p.description as product_description,
        p.purchase_price as product_purchase_price
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      LEFT JOIN products p ON poi.product_id = p.id
      LEFT JOIN companies c ON po.company_id = c.id
      LEFT JOIN companies v ON po.vendor_id = v.id
      WHERE po.id = $1
      ORDER BY poi.id
    `, [id]);

    if (purchaseOrderProducts.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const purchaseOrder = purchaseOrderProducts.rows[0];
    const products = purchaseOrderProducts.rows
      .filter(row => row.product_id) // Only include rows with products
      .map(row => ({
        itemId: row.item_id,
        productId: row.product_id,
        productCode: row.product_code,
        productName: row.product_name,
        productDescription: row.product_description,
        quantity: parseFloat(row.quantity),
        unitPrice: parseFloat(row.unit_price),
        lineTotal: parseFloat(row.amount),
        itemDescription: row.item_description,
        purchasePrice: parseFloat(row.product_purchase_price) || 0
      }));

    res.json({
      success: true,
      purchaseOrder: {
        id: purchaseOrder.purchase_order_id,
        orderNumber: purchaseOrder.order_number,
        total: parseFloat(purchaseOrder.order_total),
        status: purchaseOrder.status,
        referenceNumber: purchaseOrder.reference_number,
        companyName: purchaseOrder.company_name,
        vendorName: purchaseOrder.vendor_name
      },
      products: products,
      productCount: products.length,
      totalProductValue: products.reduce((sum, p) => sum + p.lineTotal, 0)
    });

  } catch (error) {
    logWithApplicationInsights('ERR', 'Error fetching purchase order products: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to fetch purchase order products' });
  }
});

// API endpoint to get all products
app.get('/api/products', async (req, res) => {
  const requestId = `products-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { companyId, isActive } = req.query;
  
  logWithApplicationInsights('INF', `Fetching products for company ${companyId || 'all'}, isActive: ${isActive}`, requestId);
  
  try {
    
    let query = `
      SELECT 
        p.id,
        p.company_id,
        p.code,
        p.name,
        p.description,
        p.sales_price,
        p.purchase_price,
        p.sales_account_id,
        p.purchase_account_id,
        p.inventory_account_id,
        p.is_active,
        p.created_at,
        c.name as company_name
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Filter by company if provided
    if (companyId) {
      query += ` AND p.company_id = $${paramIndex}`;
      params.push(companyId);
      paramIndex++;
    }
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      query += ` AND p.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }
    
    query += ` ORDER BY p.company_id, p.code, p.name`;
    
    const result = await pool.query(query, params);
    
    const products = result.rows.map(row => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name,
      code: row.code,
      name: row.name,
      description: row.description,
      salesPrice: parseFloat(row.sales_price) || 0,
      purchasePrice: parseFloat(row.purchase_price) || 0,
      salesAccountId: row.sales_account_id,
      purchaseAccountId: row.purchase_account_id,
      inventoryAccountId: row.inventory_account_id,
      isActive: row.is_active,
      createdAt: row.created_at
    }));
    
    // Group products by company for easier consumption
    const productsByCompany = {};
    products.forEach(product => {
      const companyKey = product.companyName || `Company ${product.companyId}`;
      if (!productsByCompany[companyKey]) {
        productsByCompany[companyKey] = [];
      }
      productsByCompany[companyKey].push(product);
    });
    
    logWithApplicationInsights('INF', `Found ${products.length} products across ${Object.keys(productsByCompany).length} companies`, requestId);
    
    res.json({
      success: true,
      totalProducts: products.length,
      products: products,
      productsByCompany: productsByCompany,
      filters: {
        companyId: companyId ? parseInt(companyId) : null,
        isActive: isActive !== undefined ? isActive === 'true' : null
      }
    });
    
  } catch (error) {
    logWithApplicationInsights('ERR', `Error fetching products: ${error.message}`, requestId);
    res.status(500).json({ error: 'Failed to fetch products' });
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

    // Validate sales order exists and get customer info
    const salesOrderResult = await client.query(
      'SELECT id, order_number, total, customer_id FROM sales_orders WHERE id = $1 AND company_id = $2',
      [salesOrderId, sourceCompanyId]
    );
    
    if (salesOrderResult.rows.length === 0) {
      return res.status(400).json({ error: 'Sales order not found' });
    }

    const salesOrder = salesOrderResult.rows[0];
    
    // Validate that targetCompanyId matches the customer_id from sales order
    if (salesOrder.customer_id != targetCompanyId) {
      return res.status(400).json({ 
        error: `Target company ID (${targetCompanyId}) does not match sales order customer ID (${salesOrder.customer_id})`,
        salesOrderId: salesOrderId,
        expectedCustomerId: salesOrder.customer_id
      });
    }

    await client.query('BEGIN');

    const timestamp = Date.now();
    
    // Get the sales order reference number to reuse for invoice and bill tracking
    const salesOrderRef = await client.query(
      'SELECT reference_number FROM sales_orders WHERE id = $1',
      [salesOrderId]
    );
    
    // Use the existing sales order reference number instead of creating a new one
    const transactionGroupRef = salesOrderRef.rows[0]?.reference_number;
    
    // Find corresponding purchase order in target company with matching reference number
    const purchaseOrderResult = await client.query(
      'SELECT id, order_number FROM purchase_orders WHERE company_id = $1 AND vendor_id = $2 AND reference_number = $3',
      [targetCompanyId, sourceCompanyId, salesOrderRef.rows[0]?.reference_number]
    );
    
    // 1. Get next available invoice ID to avoid primary key conflicts
    const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM invoices');
    const nextInvoiceId = maxIdResult.rows[0].next_id;
    
    // Create sales invoice in source company with transaction reference
    const invoiceNumber = `INV-${sourceCompanyId}-${timestamp}`;
    const salesInvoiceResult = await client.query(`
      INSERT INTO invoices (
        id, company_id, customer_id, sales_order_id, invoice_number, 
        invoice_date, due_date, total, status, reference_number
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '30 days', $6, $7, $8)
      RETURNING id, invoice_number, total, status
    `, [nextInvoiceId, sourceCompanyId, targetCompanyId, salesOrderId, invoiceNumber, total, 'pending', transactionGroupRef]);

    // 2. Get next available bill ID and create corresponding purchase bill
    const maxBillIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bills');
    const nextBillId = maxBillIdResult.rows[0].next_id;
    
    const billNumber = `BILL-${targetCompanyId}-${timestamp}`;
    const purchaseOrderId = purchaseOrderResult.rows.length > 0 ? purchaseOrderResult.rows[0].id : null;
    
    const purchaseBillResult = await client.query(`
      INSERT INTO bills (
        id, company_id, vendor_id, purchase_order_id, bill_number, 
        bill_date, due_date, total, status, reference_number
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '30 days', $6, $7, $8)
      RETURNING id, bill_number, total, status
    `, [nextBillId, targetCompanyId, sourceCompanyId, purchaseOrderId, billNumber, total, 'pending', transactionGroupRef]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Intercompany invoice and bill created successfully',
      transactionGroupReference: transactionGroupRef,
      salesInvoice: {
        id: salesInvoiceResult.rows[0].id,
        invoiceNumber: salesInvoiceResult.rows[0].invoice_number,
        total: parseFloat(salesInvoiceResult.rows[0].total),
        status: salesInvoiceResult.rows[0].status,
        companyId: sourceCompanyId,
        salesOrderId: salesOrderId,
        referenceNumber: transactionGroupRef
      },
      purchaseBill: {
        id: purchaseBillResult.rows[0].id,
        billNumber: purchaseBillResult.rows[0].bill_number,
        total: parseFloat(purchaseBillResult.rows[0].total),
        status: purchaseBillResult.rows[0].status,
        companyId: targetCompanyId,
        purchaseOrderId: purchaseOrderId,
        referenceNumber: transactionGroupRef
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logWithApplicationInsights('ERR', 'Error creating intercompany invoice: ' + error.message, requestId);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    res.status(500).json({ 
      error: 'Failed to create intercompany invoice',
      details: error.message,
      code: error.code
    });
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
    
    // 1. Get next available payment ID and create bill payment in source company
    const maxPaymentIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bill_payments');
    const nextPaymentId = maxPaymentIdResult.rows[0].next_id;
    
    const paymentNumber = `PAY-${sourceCompanyId}-${timestamp}`;
    const paymentResult = await client.query(`
      INSERT INTO bill_payments (
        id, company_id, vendor_id, bill_id, payment_number, 
        payment_date, amount, payment_method
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      RETURNING id, payment_number, amount
    `, [nextPaymentId, sourceCompanyId, targetCompanyId, billId, paymentNumber, amount, 'intercompany_transfer']);

    // 2. Get next available receipt ID and create corresponding receipt in target company
    const maxReceiptIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM receipts');
    const nextReceiptId = maxReceiptIdResult.rows[0].next_id;
    
    const receiptNumber = `REC-${targetCompanyId}-${timestamp}`;
    // Get sales_order_id from the invoice for receipt creation
    const invoiceQuery = await client.query('SELECT sales_order_id FROM invoices WHERE id = $1', [invoiceId]);
    const salesOrderId = invoiceQuery.rows[0]?.sales_order_id || null;
    
    const receiptResult = await client.query(`
      INSERT INTO receipts (
        id, company_id, customer_id, invoice_id, receipt_number, 
        receipt_date, amount, payment_method, sales_order_id, debit_account_id, credit_account_id
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10)
      RETURNING id, receipt_number, amount
    `, [nextReceiptId, targetCompanyId, sourceCompanyId, invoiceId, receiptNumber, amount, 'intercompany_transfer', salesOrderId, 1, 2]);

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
    logWithApplicationInsights('ERR', 'Error creating intercompany payment: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to create intercompany payment' });
  } finally {
    client.release();
  }
});

// 5. TRANSACTION REFERENCE LOOKUP
app.get('/api/reference/:reference', async (req, res) => {
  const requestId = `ref-lookup-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { reference } = req.params;
  logWithApplicationInsights('INF', `Looking up transaction reference: ${reference}`, requestId);
  
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

    // Search bills
    const billResult = await pool.query(`
      SELECT 'bill' as type, id, bill_number as reference,
             company_id, vendor_id, total, status, created_at, reference_number
      FROM bills 
      WHERE bill_number = $1 OR reference_number = $1
      LIMIT 1
    `, [reference]);

    if (billResult.rows.length > 0) {
      const transaction = billResult.rows[0];
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.company_id]);
      const vendorResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.vendor_id]);
      
      return res.json({
        success: true,
        transaction: {
          ...transaction,
          companyName: companyResult.rows[0]?.name,
          vendorName: vendorResult.rows[0]?.name
        }
      });
    }

    // Search purchase orders
    const purchaseOrderResult = await pool.query(`
      SELECT 'purchase_order' as type, id, order_number as reference,
             company_id, vendor_id, total, status, created_at,
             reference_number
      FROM purchase_orders 
      WHERE order_number = $1 OR reference_number = $1
      LIMIT 1
    `, [reference]);

    if (purchaseOrderResult.rows.length > 0) {
      const transaction = purchaseOrderResult.rows[0];
      
      // Get company details
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.company_id]);
      const vendorResult = await pool.query('SELECT name FROM companies WHERE id = $1', [transaction.vendor_id]);
      
      return res.json({
        success: true,
        transaction: {
          ...transaction,
          companyName: companyResult.rows[0]?.name,
          vendorName: vendorResult.rows[0]?.name
        }
      });
    }

    res.status(404).json({
      success: false,
      error: 'Transaction reference not found'
    });

  } catch (error) {
    logWithApplicationInsights('ERR', 'Error looking up transaction reference: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to lookup transaction reference' });
  }
});

// 6. CHART OF ACCOUNTS
app.get('/api/accounts', async (req, res) => {
  const requestId = `accounts-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  logWithApplicationInsights('INF', 'Fetching chart of accounts', requestId);
  
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
    logWithApplicationInsights('ERR', 'Error fetching chart of accounts: ' + error.message, requestId);
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
    logWithApplicationInsights('ERR', 'Error creating account: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to create account' });
  } finally {
    client.release();
  }
});

// Additional working endpoints
app.get('/api/sales-orders', async (req, res) => {
  const requestId = `sales-orders-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { companyId } = req.query;
  
  logWithApplicationInsights('INF', `Fetching sales orders for company ${companyId}`, requestId);
  
  try {
    if (!companyId) {
      logWithApplicationInsights('ERR', 'Sales orders fetch failed - companyId is required', requestId);
      return res.status(400).json({ error: 'companyId is required' });
    }

    const result = await pool.query(`
      SELECT * FROM sales_orders 
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);

    logWithApplicationInsights('INF', `Found ${result.rows.length} sales orders for company ${companyId}`, requestId);
    logWithApplicationInsights('INF', `Successfully returned ${result.rows.length} sales orders for company ${companyId}`, requestId);
    res.json(result.rows);
  } catch (error) {
    logWithApplicationInsights('ERR', `Error fetching sales orders: ${error.message}`, requestId);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

app.get('/api/invoices/summary', async (req, res) => {
  const requestId = `invoices-summary-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { companyId } = req.query;
  
  logWithApplicationInsights('INF', `Fetching invoices summary for company ${companyId}`, requestId);
  
  try {
    if (!companyId) {
      logWithApplicationInsights('ERR', 'Invoices summary fetch failed - companyId is required', requestId);
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
    
    logWithApplicationInsights('INF', `Invoices summary generated for company ${companyId}: ${result.total_invoices} invoices totaling ${result.invoices_total}`, requestId);
  } catch (error) {
    logWithApplicationInsights('ERR', `Error fetching AR summary: ${error.message}`, requestId);
    res.status(500).json({ error: 'Failed to fetch AR summary' });
  }
});

app.get('/api/bills/summary', async (req, res) => {
  const requestId = `bills-summary-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { companyId } = req.query;
  
  logWithApplicationInsights('INF', `Fetching bills summary for company ${companyId}`, requestId);
  
  try {
    if (!companyId) {
      logWithApplicationInsights('ERR', 'Bills summary fetch failed - companyId is required', requestId);
      return res.status(400).json({ error: 'companyId is required' });
    }

    // Get company information
    const companyResult = await pool.query(`
      SELECT name FROM companies WHERE id = $1
    `, [companyId]);

    // Get purchase order summary data
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT po.id) as total_orders,
        COALESCE(SUM(po.total), 0) as total_order_value,
        COUNT(DISTINCT CASE WHEN b.id IS NOT NULL THEN po.id END) as orders_with_bills,
        COALESCE(SUM(DISTINCT b.total), 0) as total_billed,
        COALESCE(SUM(DISTINCT bp.amount), 0) as total_paid
      FROM purchase_orders po
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      LEFT JOIN bill_payments bp ON b.id = bp.bill_id
      WHERE po.company_id = $1
    `, [companyId]);

    // Get detailed purchase orders with bills and payments
    const purchaseOrdersResult = await pool.query(`
      SELECT 
        po.id as order_id,
        po.order_number,
        po.order_date,
        po.total as order_total,
        po.status,
        c.name as vendor_name,
        b.id as bill_id,
        b.bill_number,
        b.bill_date,
        b.total as bill_total,
        b.status as bill_status
      FROM purchase_orders po
      LEFT JOIN companies c ON po.vendor_id = c.id
      LEFT JOIN bills b ON po.id = b.purchase_order_id
      WHERE po.company_id = $1
      ORDER BY po.order_date DESC
      LIMIT 50
    `, [companyId]);

    // Get purchase order items
    const orderItemsResult = await pool.query(`
      SELECT 
        poi.purchase_order_id,
        poi.product_id,
        p.code as product_code,
        p.name as product_name,
        poi.quantity,
        poi.unit_price,
        poi.amount
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id IN (
        SELECT id FROM purchase_orders WHERE company_id = $1
      )
    `, [companyId]);

    // Get bill items
    const billItemsResult = await pool.query(`
      SELECT 
        bi.bill_id,
        bi.product_id,
        p.code as product_code,
        p.name as product_name,
        bi.quantity,
        bi.unit_price,
        bi.amount
      FROM bill_items bi
      LEFT JOIN products p ON bi.product_id = p.id
      WHERE bi.bill_id IN (
        SELECT b.id FROM bills b 
        INNER JOIN purchase_orders po ON b.purchase_order_id = po.id
        WHERE po.company_id = $1
      )
    `, [companyId]);

    // Get payment details
    const paymentsResult = await pool.query(`
      SELECT 
        bp.id as payment_id,
        bp.payment_number,
        bp.amount,
        bp.payment_date,
        bp.payment_method,
        bp.bill_id
      FROM bill_payments bp
      INNER JOIN bills b ON bp.bill_id = b.id
      INNER JOIN purchase_orders po ON b.purchase_order_id = po.id
      WHERE po.company_id = $1
    `, [companyId]);



    // Process the data into the required structure
    const summary = summaryResult.rows[0];
    const pendingBillValue = parseFloat(summary.total_order_value) - parseFloat(summary.total_billed);
    const pendingPaymentValue = parseFloat(summary.total_billed) - parseFloat(summary.total_paid);

    // Group items by order and bill
    const orderItemsMap = {};
    orderItemsResult.rows.forEach(item => {
      if (!orderItemsMap[item.purchase_order_id]) {
        orderItemsMap[item.purchase_order_id] = [];
      }
      orderItemsMap[item.purchase_order_id].push({
        ProductId: item.product_id,
        ProductCode: item.product_code || '',
        ProductName: item.product_name || '',
        Quantity: parseInt(item.quantity),
        UnitPrice: parseFloat(item.unit_price),
        Amount: parseFloat(item.amount)
      });
    });

    const billItemsMap = {};
    billItemsResult.rows.forEach(item => {
      if (!billItemsMap[item.bill_id]) {
        billItemsMap[item.bill_id] = [];
      }
      billItemsMap[item.bill_id].push({
        ProductId: item.product_id,
        ProductCode: item.product_code || '',
        ProductName: item.product_name || '',
        Quantity: parseInt(item.quantity),
        UnitPrice: parseFloat(item.unit_price),
        Amount: parseFloat(item.amount)
      });
    });

    const paymentsMap = {};
    paymentsResult.rows.forEach(payment => {
      const billId = String(payment.bill_id); // Ensure string key for consistent mapping
      if (!paymentsMap[billId]) {
        paymentsMap[billId] = [];
      }
      paymentsMap[billId].push({
        PaymentId: payment.payment_id,
        PaymentNumber: payment.payment_number || '',
        Amount: parseFloat(payment.amount),
        PaymentDate: payment.payment_date,
        PaymentMethod: payment.payment_method || ''
      });
    });



    // Build purchase orders array
    const purchaseOrdersMap = {};
    const billIdsInPurchaseOrders = [];
    purchaseOrdersResult.rows.forEach(row => {
      if (row.bill_id) {
        billIdsInPurchaseOrders.push(row.bill_id);
      }
      
      if (!purchaseOrdersMap[row.order_id]) {
        purchaseOrdersMap[row.order_id] = {
          OrderId: row.order_id,
          OrderNumber: row.order_number || '',
          OrderDate: row.order_date,
          VendorName: row.vendor_name || 'External Vendor',
          OrderTotal: parseFloat(row.order_total),
          Status: row.status || '',
          OrderItems: orderItemsMap[row.order_id] || [],
          BillDetails: null,
          PaymentDetails: [],
          WorkflowStatus: ''
        };
      }

      if (row.bill_id) {
        purchaseOrdersMap[row.order_id].BillDetails = {
          BillId: row.bill_id,
          BillNumber: row.bill_number || '',
          BillDate: row.bill_date,
          BillTotal: parseFloat(row.bill_total || 0),
          Status: row.bill_status || '',
          BillItems: billItemsMap[row.bill_id] || []
        };
        
        const billIdKey = String(row.bill_id); // Ensure consistent string key lookup
        const payments = paymentsMap[billIdKey] || [];
        purchaseOrdersMap[row.order_id].PaymentDetails = payments;
      }

      // Set workflow status
      const billCount = row.bill_id ? 1 : 0;
      const billIdKey = String(row.bill_id); // Use same string key as payment mapping
      const paymentCount = paymentsMap[billIdKey] ? paymentsMap[billIdKey].length : 0;
      purchaseOrdersMap[row.order_id].WorkflowStatus = `${billCount} bills, ${paymentCount} payments`;
    });



    const response = {
      CompanyId: parseInt(companyId),
      CompanyName: companyResult.rows[0]?.name || 'Unknown Company',
      ReportDate: new Date().toISOString().split('T')[0],
      Summary: {
        TotalOrders: parseInt(summary.total_orders),
        TotalOrderValue: parseFloat(summary.total_order_value),
        OrdersWithBills: parseInt(summary.orders_with_bills),
        TotalBilled: parseFloat(summary.total_billed),
        TotalPaid: parseFloat(summary.total_paid),
        PendingBillValue: pendingBillValue,
        PendingPaymentValue: pendingPaymentValue
      },
      PurchaseOrders: Object.values(purchaseOrdersMap)
    };

    res.json(response);
  } catch (error) {
    logWithApplicationInsights('ERR', 'Error fetching bills summary: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to fetch bills summary' });
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

    // Get all bills related to these purchase orders or by direct reference/bill number
    const bills = await pool.query(`
      SELECT b.*, po.order_number as purchase_order_number, c.name as company_name
      FROM bills b
      LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
      LEFT JOIN companies c ON b.company_id = c.id
      WHERE b.reference_number = $1 OR b.bill_number = $1 OR po.reference_number = $1
      ORDER BY b.created_at DESC
    `, [reference]);

    // Get all receipts related to these invoices
    const receipts = await pool.query(`
      SELECT r.*, i.invoice_number, c.name as company_name
      FROM receipts r
      LEFT JOIN invoices i ON r.invoice_id = i.id
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      LEFT JOIN companies c ON r.company_id = c.id
      WHERE r.reference_number = $1
      ORDER BY r.created_at DESC
    `, [reference]);

    // Get all bill payments related to these bills
    const billPayments = await pool.query(`
      SELECT bp.*, b.bill_number, c.name as company_name
      FROM bill_payments bp
      LEFT JOIN bills b ON bp.bill_id = b.id
      LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
      LEFT JOIN companies c ON bp.company_id = c.id
      WHERE bp.reference_number = $1
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
    logWithApplicationInsights('ERR', 'Error fetching transaction group: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to fetch transaction group details' });
  }
});

app.get('/api/intercompany-balances', async (req, res) => {
  const requestId = `intercompany-bal-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { companyId } = req.query;
  logWithApplicationInsights('INF', `Fetching intercompany balances for company ${companyId}`, requestId);
  
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
    logWithApplicationInsights('ERR', 'Error fetching intercompany balances: ' + error.message, requestId);
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
    logWithApplicationInsights('ERR', 'Error fetching company AR/AP summaries: ' + error.message, requestId);
    res.status(500).json({ error: 'Failed to fetch company AR/AP summaries' });
  }
});

// ====================================================================
// CREDIT/DEBIT NOTES FUNCTIONALITY - INTEGRATED WITH EXISTING SYSTEM
// ====================================================================

// Application Insights Logger with specified format
function logWithApplicationInsights(level, message, requestId = null) {
  const timestamp = new Date();
  const formattedTime = timestamp.toTimeString().split(' ')[0]; // HH:mm:ss format
  const levelFormatted = level.toUpperCase().padEnd(3);
  const reqId = requestId || `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  console.log(`[${formattedTime} ${levelFormatted}] [${reqId}] ${message}`);
  
  // Application Insights ID: e04a0cf1-8129-4bc2-8707-016ae726c876
  // In production, this would send to Application Insights service
}

// Database Setup API for Credit/Debit Notes
app.post('/api/setup-database', async (req, res) => {
  const requestId = `setup-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  logWithApplicationInsights('INF', 'Setting up database tables for credit/debit notes', requestId);
  
  try {
    const tables = [];
    
    // Create credit notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_notes (
        id SERIAL PRIMARY KEY,
        credit_note_number VARCHAR(50) UNIQUE NOT NULL,
        company_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        reason TEXT,
        credit_note_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tables.push('credit_notes');
    
    // Create debit notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debit_notes (
        id SERIAL PRIMARY KEY,
        debit_note_number VARCHAR(50) UNIQUE NOT NULL,
        company_id INTEGER NOT NULL,
        vendor_id INTEGER NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        reason TEXT,
        debit_note_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tables.push('debit_notes');
    
    // Create credit note line items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_note_line_items (
        id SERIAL PRIMARY KEY,
        credit_note_id INTEGER NOT NULL REFERENCES credit_notes(id),
        product_id INTEGER,
        quantity DECIMAL(10,2),
        unit_price DECIMAL(15,2),
        total_amount DECIMAL(15,2),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tables.push('credit_note_line_items');
    
    // Create debit note line items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debit_note_line_items (
        id SERIAL PRIMARY KEY,
        debit_note_id INTEGER NOT NULL REFERENCES debit_notes(id),
        product_id INTEGER,
        quantity DECIMAL(10,2),
        unit_price DECIMAL(15,2),
        total_amount DECIMAL(15,2),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tables.push('debit_note_line_items');
    
    // Create intercompany adjustments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intercompany_adjustments (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        source_company_id INTEGER NOT NULL,
        target_company_id INTEGER NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        reason TEXT,
        adjustment_date DATE NOT NULL,
        credit_note_id INTEGER REFERENCES credit_notes(id),
        debit_note_id INTEGER REFERENCES debit_notes(id),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tables.push('intercompany_adjustments');
    
    logWithApplicationInsights('INF', `Database setup completed - ${tables.length} tables ready`, requestId);
    
    res.json({
      success: true,
      message: 'Database tables created successfully',
      tablesCreated: tables,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logWithApplicationInsights('ERR', `Database setup failed: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Database setup failed',
      details: error.message
    });
  }
});

// Credit Notes API
app.get('/api/credit-notes', async (req, res) => {
  const requestId = `credit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const companyId = req.query.companyId;
  
  logWithApplicationInsights('INF', `Fetching credit notes for company ${companyId}`, requestId);
  
  try {
    let query = `
      SELECT cn.*, 
             c1.name as company_name,
             c2.name as customer_name,
             COUNT(cnli.id) as line_items_count
      FROM credit_notes cn
      LEFT JOIN companies c1 ON cn.company_id = c1.id
      LEFT JOIN companies c2 ON cn.customer_id = c2.id
      LEFT JOIN credit_note_line_items cnli ON cn.id = cnli.credit_note_id
      WHERE 1=1
    `;
    const params = [];
    
    if (companyId) {
      query += ' AND cn.company_id = $1';
      params.push(companyId);
    }
    
    query += ' GROUP BY cn.id, c1.name, c2.name ORDER BY cn.created_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    
    logWithApplicationInsights('INF', `Found ${result.rows.length} credit notes`, requestId);
    
    res.json({
      success: true,
      creditNotes: result.rows
    });
  } catch (error) {
    logWithApplicationInsights('ERR', `Credit notes fetch error: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit notes',
      details: error.message
    });
  }
});

app.post('/api/credit-notes', async (req, res) => {
  const requestId = `credit-create-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { company_id, customer_id, amount, reason, credit_note_date, products } = req.body;
  
  logWithApplicationInsights('INF', `Creating credit note for company ${company_id}`, requestId);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate credit note number
    const creditNoteNumber = `CN-${company_id}-${Date.now()}`;
    
    // Insert credit note
    const creditNoteResult = await client.query(`
      INSERT INTO credit_notes (credit_note_number, company_id, customer_id, amount, reason, credit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [creditNoteNumber, company_id, customer_id, amount, reason, credit_note_date]);
    
    const creditNote = creditNoteResult.rows[0];
    
    // Insert line items
    if (products && products.length > 0) {
      for (const product of products) {
        await client.query(`
          INSERT INTO credit_note_line_items (credit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [creditNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
      }
    }
    
    await client.query('COMMIT');
    
    logWithApplicationInsights('INF', `Credit note created: ${creditNoteNumber}`, requestId);
    
    res.status(201).json({
      success: true,
      creditNote: creditNote,
      message: 'Credit note created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logWithApplicationInsights('ERR', `Credit note creation failed: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to create credit note',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Debit Notes API
app.get('/api/debit-notes', async (req, res) => {
  const requestId = `debit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const companyId = req.query.companyId;
  
  logWithApplicationInsights('INF', `Fetching debit notes for company ${companyId}`, requestId);
  
  try {
    let query = `
      SELECT dn.*, 
             c1.name as company_name,
             c2.name as vendor_name,
             COUNT(dnli.id) as line_items_count
      FROM debit_notes dn
      LEFT JOIN companies c1 ON dn.company_id = c1.id
      LEFT JOIN companies c2 ON dn.vendor_id = c2.id
      LEFT JOIN debit_note_line_items dnli ON dn.id = dnli.debit_note_id
      WHERE 1=1
    `;
    const params = [];
    
    if (companyId) {
      query += ' AND dn.company_id = $1';
      params.push(companyId);
    }
    
    query += ' GROUP BY dn.id, c1.name, c2.name ORDER BY dn.created_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    
    logWithApplicationInsights('INF', `Found ${result.rows.length} debit notes`, requestId);
    
    res.json({
      success: true,
      debitNotes: result.rows
    });
  } catch (error) {
    logWithApplicationInsights('ERR', `Debit notes fetch error: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debit notes',
      details: error.message
    });
  }
});

app.post('/api/debit-notes', async (req, res) => {
  const requestId = `debit-create-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { company_id, vendor_id, amount, reason, debit_note_date, products } = req.body;
  
  logWithApplicationInsights('INF', `Creating debit note for company ${company_id}`, requestId);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate debit note number
    const debitNoteNumber = `DN-${company_id}-${Date.now()}`;
    
    // Insert debit note
    const debitNoteResult = await client.query(`
      INSERT INTO debit_notes (debit_note_number, company_id, vendor_id, amount, reason, debit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [debitNoteNumber, company_id, vendor_id, amount, reason, debit_note_date]);
    
    const debitNote = debitNoteResult.rows[0];
    
    // Insert line items
    if (products && products.length > 0) {
      for (const product of products) {
        await client.query(`
          INSERT INTO debit_note_line_items (debit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [debitNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
      }
    }
    
    await client.query('COMMIT');
    
    logWithApplicationInsights('INF', `Debit note created: ${debitNoteNumber}`, requestId);
    
    res.status(201).json({
      success: true,
      debitNote: debitNote,
      message: 'Debit note created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logWithApplicationInsights('ERR', `Debit note creation failed: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to create debit note',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Intercompany Adjustments API
app.get('/api/intercompany-adjustments', async (req, res) => {
  const requestId = `ic-adj-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  logWithApplicationInsights('INF', 'Fetching intercompany adjustments', requestId);
  
  try {
    const result = await pool.query(`
      SELECT ia.*, 
             c1.name as source_company_name,
             c2.name as target_company_name,
             cn.credit_note_number,
             dn.debit_note_number
      FROM intercompany_adjustments ia
      LEFT JOIN companies c1 ON ia.source_company_id = c1.id
      LEFT JOIN companies c2 ON ia.target_company_id = c2.id
      LEFT JOIN credit_notes cn ON ia.credit_note_id = cn.id
      LEFT JOIN debit_notes dn ON ia.debit_note_id = dn.id
      ORDER BY ia.created_at DESC LIMIT 100
    `);
    
    logWithApplicationInsights('INF', `Found ${result.rows.length} intercompany adjustments`, requestId);
    
    res.json({
      success: true,
      adjustments: result.rows
    });
  } catch (error) {
    logWithApplicationInsights('ERR', `Intercompany adjustments fetch error: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch intercompany adjustments',
      details: error.message
    });
  }
});

app.post('/api/intercompany-adjustment', async (req, res) => {
  const requestId = `ic-create-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { source_company_id, target_company_id, amount, reason, adjustment_date, products } = req.body;
  
  logWithApplicationInsights('INF', `Creating intercompany adjustment between ${source_company_id} and ${target_company_id}`, requestId);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const referenceNumber = `ADJ-${source_company_id}-${target_company_id}-${Date.now()}`;
    
    // Create credit note for source company
    const creditNoteNumber = `CN-IC-${source_company_id}-${Date.now()}`;
    const creditNoteResult = await client.query(`
      INSERT INTO credit_notes (credit_note_number, company_id, customer_id, amount, reason, credit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [creditNoteNumber, source_company_id, target_company_id, amount, `Intercompany adjustment: ${reason}`, adjustment_date]);
    
    const creditNote = creditNoteResult.rows[0];
    
    // Create debit note for target company
    const debitNoteNumber = `DN-IC-${target_company_id}-${Date.now()}`;
    const debitNoteResult = await client.query(`
      INSERT INTO debit_notes (debit_note_number, company_id, vendor_id, amount, reason, debit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [debitNoteNumber, target_company_id, source_company_id, amount, `Intercompany adjustment: ${reason}`, adjustment_date]);
    
    const debitNote = debitNoteResult.rows[0];
    
    // Create adjustment record
    const adjustmentResult = await client.query(`
      INSERT INTO intercompany_adjustments (reference_number, source_company_id, target_company_id, amount, reason, adjustment_date, credit_note_id, debit_note_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [referenceNumber, source_company_id, target_company_id, amount, reason, adjustment_date, creditNote.id, debitNote.id]);
    
    // Insert line items for both notes
    if (products && products.length > 0) {
      for (const product of products) {
        await client.query(`
          INSERT INTO credit_note_line_items (credit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [creditNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
        
        await client.query(`
          INSERT INTO debit_note_line_items (debit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [debitNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
      }
    }
    
    await client.query('COMMIT');
    
    logWithApplicationInsights('INF', `Intercompany adjustment created: ${referenceNumber}`, requestId);
    
    res.status(201).json({
      success: true,
      adjustment: adjustmentResult.rows[0],
      creditNote: creditNote,
      debitNote: debitNote,
      message: 'Intercompany adjustment created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logWithApplicationInsights('ERR', `Intercompany adjustment creation failed: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to create intercompany adjustment',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Account Management APIs
app.get('/api/credit-accounts', async (req, res) => {
  const requestId = `credit-acc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT code as account_code, name as account_name, account_type_id as account_type
      FROM accounts 
      WHERE account_type_id IN (SELECT id FROM account_types WHERE name LIKE '%Credit%' OR name LIKE '%Revenue%')
      ORDER BY code
      LIMIT 50
    `);
    
    res.json({
      success: true,
      accounts: result.rows
    });
  } catch (error) {
    logWithApplicationInsights('ERR', `Credit accounts fetch error: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit accounts',
      details: error.message
    });
  }
});

app.get('/api/debit-accounts', async (req, res) => {
  const requestId = `debit-acc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT code as account_code, name as account_name, account_type_id as account_type
      FROM accounts 
      WHERE account_type_id IN (SELECT id FROM account_types WHERE name LIKE '%Debit%' OR name LIKE '%Expense%' OR name LIKE '%Asset%')
      ORDER BY code
      LIMIT 50
    `);
    
    res.json({
      success: true,
      accounts: result.rows
    });
  } catch (error) {
    logWithApplicationInsights('ERR', `Debit accounts fetch error: ${error.message}`, requestId);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debit accounts',
      details: error.message
    });
  }
});

// Enhanced Health Check with Credit/Debit Features
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Multi-Company Accounting with Credit/Debit Notes',
    timestamp: new Date().toISOString(),
    database: 'External PostgreSQL at 135.235.154.222',
    features: [
      'Sales Orders Management',
      'Purchase Orders Management',
      'Credit Notes Management',
      'Debit Notes Management', 
      'Intercompany Adjustments',
      'Application Insights Logging',
      'Product Integration',
      'Multi-Company Support (42+ companies)'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Company Accounting System running on port ${PORT}`);
  console.log(`📊 All required endpoints functional with authentic data`);
  console.log(`🔗 Connected to external database: 135.235.154.222`);
  console.log(`💳 Credit/Debit Notes: GET/POST /api/credit-notes, /api/debit-notes`);
  console.log(`🔄 Intercompany Adjustments: GET/POST /api/intercompany-adjustments`);
  console.log(`🔧 Database Setup: POST /api/setup-database`);
  console.log(`📈 Enhanced Health Check: GET /api/health`);
});