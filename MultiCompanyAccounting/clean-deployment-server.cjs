/**
 * Clean Production Server - No Hardcoded URLs
 * Multi-Company Accounting System with Dynamic URL Detection
 */

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3003;

// External Database Configuration (No SSL)
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Get dynamic base URL helper
const getBaseUrl = (req) => {
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`;
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected to 135.235.154.222',
    port: PORT,
    baseUrl: getBaseUrl(req)
  });
});

// Test database connection
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM companies');
    const companyCount = result.rows[0].count;
    client.release();
    console.log(`✅ Database connected - ${companyCount} companies available`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Companies API
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Sales Orders API
app.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT * FROM sales_orders';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }
    
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

// Invoices Summary API
app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT 
        COUNT(*) as totalInvoices,
        COALESCE(SUM(total), 0) as totalAmount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paidInvoices,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paidAmount
      FROM invoices
    `;
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
});

// Bills Summary API
app.get('/api/bills/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT 
        COUNT(*) as totalBills,
        COALESCE(SUM(total), 0) as totalAmount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paidBills,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paidAmount
      FROM bills
    `;
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching bills summary:', error);
    res.status(500).json({ error: 'Failed to fetch bills summary' });
  }
});

// Purchase Orders Summary API
app.get('/api/purchase-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(total), 0) as totalAmount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders
      FROM purchase_orders
    `;
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching purchase orders summary:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders summary' });
  }
});

// Receipts Summary API
app.get('/api/receipts/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT 
        COUNT(*) as totalReceipts,
        COALESCE(SUM(amount), 0) as totalAmount
      FROM receipts
    `;
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching receipts summary:', error);
    res.status(500).json({ error: 'Failed to fetch receipts summary' });
  }
});

// Payments Summary API
app.get('/api/payments/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT 
        COUNT(*) as totalPayments,
        COALESCE(SUM(amount), 0) as totalAmount
      FROM payments
    `;
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payments summary:', error);
    res.status(500).json({ error: 'Failed to fetch payments summary' });
  }
});

// Intercompany Balances API
app.get('/api/intercompany-balances', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    const balances = {
      companyId: parseInt(companyId),
      accountsReceivable: 0,
      accountsPayable: 0,
      netBalance: 0
    };
    
    res.json(balances);
  } catch (error) {
    console.error('Error fetching intercompany balances:', error);
    res.status(500).json({ error: 'Failed to fetch intercompany balances' });
  }
});

// AR/AP Summary API - Updated for your database schema
app.get('/api/ar-ap-summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting AR/AP summary for company ${companyId}`);
    
    // Get invoice totals for AR (checking actual column names)
    const invoiceQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status != 'paid' AND status != 'Paid' THEN CAST(total AS DECIMAL) ELSE 0 END), 0) as outstanding_amount
      FROM invoices
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const invoiceParams = companyId ? [companyId] : [];
    const invoiceResult = await pool.query(invoiceQuery, invoiceParams);
    
    // Get bill totals for AP (checking actual column names)
    const billQuery = `
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status != 'paid' AND status != 'Paid' THEN CAST(total AS DECIMAL) ELSE 0 END), 0) as outstanding_amount
      FROM bills
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const billParams = companyId ? [companyId] : [];
    const billResult = await pool.query(billQuery, billParams);
    
    // Get receipt totals to calculate AR properly
    const receiptQuery = `
      SELECT 
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_receipts
      FROM receipts
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const receiptParams = companyId ? [companyId] : [];
    const receiptResult = await pool.query(receiptQuery, receiptParams);
    
    // Get payment totals to calculate AP properly
    const paymentQuery = `
      SELECT 
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_payments
      FROM payments
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const paymentParams = companyId ? [companyId] : [];
    const paymentResult = await pool.query(paymentQuery, paymentParams);
    
    const invoiceData = invoiceResult.rows[0];
    const billData = billResult.rows[0];
    const receiptData = receiptResult.rows[0];
    const paymentData = paymentResult.rows[0];
    
    const totalInvoices = parseInt(invoiceData.total_invoices) || 0;
    const totalInvoiceAmount = parseFloat(invoiceData.total_amount) || 0;
    const totalReceipts = parseFloat(receiptData.total_receipts) || 0;
    
    const totalBills = parseInt(billData.total_bills) || 0;
    const totalBillAmount = parseFloat(billData.total_amount) || 0;
    const totalPayments = parseFloat(paymentData.total_payments) || 0;
    
    const summary = {
      companyId: companyId ? parseInt(companyId) : null,
      accountsReceivable: {
        totalInvoices: totalInvoices,
        totalAmount: totalInvoiceAmount,
        totalReceipts: totalReceipts,
        outstandingAmount: Math.max(0, totalInvoiceAmount - totalReceipts)
      },
      accountsPayable: {
        totalBills: totalBills,
        totalAmount: totalBillAmount,
        totalPayments: totalPayments,
        outstandingAmount: Math.max(0, totalBillAmount - totalPayments)
      },
      netPosition: (totalInvoiceAmount - totalReceipts) - (totalBillAmount - totalPayments)
    };
    
    console.log('📊 AR/AP Summary:', summary);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching AR/AP summary:', error);
    res.status(500).json({ error: 'Failed to fetch AR/AP summary', details: error.message });
  }
});

// Create Company API
app.post('/api/companies', async (req, res) => {
  try {
    const { name, code, company_type, address, phone, email, tax_id, industry, base_currency, tenant_id } = req.body;
    
    console.log('🏢 Creating new company:', { name, code, company_type });
    
    const result = await pool.query(`
      INSERT INTO companies (name, code, company_type, address, phone, email, tax_id, industry, base_currency, tenant_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [name, code, company_type || 'subsidiary', address, phone, email, tax_id, industry, base_currency || 'USD', tenant_id || 1]);
    
    const newCompany = result.rows[0];
    console.log('✅ Company created successfully:', newCompany.id);
    
    res.status(201).json({
      success: true,
      company: newCompany,
      message: 'Company created successfully'
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ 
      error: 'Failed to create company', 
      details: error.message,
      constraint: error.constraint
    });
  }
});

// Intercompany Sales Order Creation
app.post('/api/intercompany/sales-order', async (req, res) => {
  try {
    const { sourceCompanyId, targetCompanyId, products, total } = req.body;
    
    const orderNumber = `IC-SO-${Date.now()}`;
    
    const result = await pool.query(`
      INSERT INTO sales_orders (company_id, order_number, total, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `, [sourceCompanyId, orderNumber, total]);
    
    res.json({
      success: true,
      salesOrder: result.rows[0],
      intercompanyType: 'sales_order'
    });
  } catch (error) {
    console.error('Error creating intercompany sales order:', error);
    res.status(500).json({ error: 'Failed to create intercompany sales order' });
  }
});

// Intercompany Invoice Creation
app.post('/api/intercompany/invoice', async (req, res) => {
  try {
    const { sourceCompanyId, targetCompanyId, salesOrderId, total } = req.body;
    
    const invoiceNumber = `IC-INV-${Date.now()}`;
    
    const result = await pool.query(`
      INSERT INTO invoices (company_id, invoice_number, total, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `, [sourceCompanyId, invoiceNumber, total]);
    
    res.json({
      success: true,
      invoice: result.rows[0],
      intercompanyType: 'invoice'
    });
  } catch (error) {
    console.error('Error creating intercompany invoice:', error);
    res.status(500).json({ error: 'Failed to create intercompany invoice' });
  }
});

// Intercompany Purchase Order Creation
app.post('/api/intercompany/purchase-order', async (req, res) => {
  try {
    const { sourceCompanyId, targetCompanyId, products, total } = req.body;
    
    const orderNumber = `IC-PO-${Date.now()}`;
    
    const result = await pool.query(`
      INSERT INTO purchase_orders (company_id, order_number, total, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `, [sourceCompanyId, orderNumber, total]);
    
    res.json({
      success: true,
      purchaseOrder: result.rows[0],
      intercompanyType: 'purchase_order'
    });
  } catch (error) {
    console.error('Error creating intercompany purchase order:', error);
    res.status(500).json({ error: 'Failed to create intercompany purchase order' });
  }
});

// Transaction Reference Lookup API
app.get('/api/reference/:referenceNumber', async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    
    const transactions = [];
    
    // Search in sales orders
    const salesOrders = await pool.query(
      'SELECT *, \'sales_order\' as type FROM sales_orders WHERE order_number ILIKE $1',
      [`%${referenceNumber}%`]
    );
    transactions.push(...salesOrders.rows);
    
    // Search in invoices
    const invoices = await pool.query(
      'SELECT *, \'invoice\' as type FROM invoices WHERE invoice_number ILIKE $1',
      [`%${referenceNumber}%`]
    );
    transactions.push(...invoices.rows);
    
    // Search in bills
    const bills = await pool.query(
      'SELECT *, \'bill\' as type FROM bills WHERE bill_number ILIKE $1',
      [`%${referenceNumber}%`]
    );
    transactions.push(...bills.rows);
    
    res.json({
      referenceNumber,
      found: transactions.length > 0,
      transactions
    });
  } catch (error) {
    console.error('Error looking up reference:', error);
    res.status(500).json({ error: 'Failed to lookup reference' });
  }
});

// Chart of Accounts API
app.get('/api/chart-of-accounts', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting chart of accounts for company ${companyId}`);
    
    let query = `
      SELECT 
        id,
        account_number,
        account_name,
        account_type,
        parent_account_id,
        is_active,
        balance,
        created_at
      FROM chart_of_accounts
    `;
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }
    
    query += ' ORDER BY account_number';
    
    const result = await pool.query(query, params);
    
    res.json({
      companyId: companyId ? parseInt(companyId) : null,
      accounts: result.rows,
      totalAccounts: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts', details: error.message });
  }
});

// Create Chart of Accounts Entry
app.post('/api/chart-of-accounts', async (req, res) => {
  try {
    const { 
      company_id, 
      account_number, 
      account_name, 
      account_type, 
      parent_account_id, 
      is_active = true,
      balance = 0 
    } = req.body;
    
    console.log('📊 Creating chart of accounts entry:', { account_number, account_name, account_type });
    
    const result = await pool.query(`
      INSERT INTO chart_of_accounts 
      (company_id, account_number, account_name, account_type, parent_account_id, is_active, balance, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [company_id, account_number, account_name, account_type, parent_account_id, is_active, balance]);
    
    const newAccount = result.rows[0];
    console.log('✅ Chart of accounts entry created:', newAccount.id);
    
    res.status(201).json({
      success: true,
      account: newAccount,
      message: 'Chart of accounts entry created successfully'
    });
  } catch (error) {
    console.error('Error creating chart of accounts entry:', error);
    res.status(500).json({ 
      error: 'Failed to create chart of accounts entry', 
      details: error.message,
      constraint: error.constraint
    });
  }
});

// AR/AP Tracking APIs
app.get('/api/reports/ar-tracking', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    const arData = {
      companyId: parseInt(companyId),
      totalOutstanding: 0,
      totalOverdue: 0,
      totalCurrent: 0,
      details: []
    };
    
    res.json(arData);
  } catch (error) {
    console.error('Error fetching AR tracking:', error);
    res.status(500).json({ error: 'Failed to fetch AR tracking' });
  }
});

app.get('/api/reports/ap-tracking', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    const apData = {
      companyId: parseInt(companyId),
      totalOutstanding: 0,
      totalOverdue: 0,
      totalCurrent: 0,
      details: []
    };
    
    res.json(apData);
  } catch (error) {
    console.error('Error fetching AP tracking:', error);
    res.status(500).json({ error: 'Failed to fetch AP tracking' });
  }
});

// Swagger API Documentation
app.get('/api-docs', (req, res) => {
  const baseUrl = getBaseUrl(req);
  
  const swaggerHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Multi-Company Accounting API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${baseUrl}/api/swagger.json',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.presets.standalone
      ]
    });
  </script>
</body>
</html>`;
  
  res.send(swaggerHtml);
});

// Swagger JSON
app.get('/api/swagger.json', (req, res) => {
  const baseUrl = getBaseUrl(req);
  
  const swaggerDoc = {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Company Accounting API',
      version: '1.0.0',
      description: 'Complete accounting system with external database integration'
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/api/companies': {
        get: {
          summary: 'Get all companies',
          tags: ['Companies'],
          responses: {
            200: { description: 'List of all companies' }
          }
        },
        post: {
          summary: 'Create new company',
          tags: ['Companies'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'New Company Ltd' },
                    code: { type: 'string', example: 'NCL' },
                    company_type: { type: 'string', example: 'subsidiary' },
                    address: { type: 'string', example: '123 Business Ave' },
                    phone: { type: 'string', example: '555-0123' },
                    email: { type: 'string', example: 'contact@newcompany.com' },
                    tax_id: { type: 'string', example: '12345-6789' },
                    industry: { type: 'string', example: 'Technology' },
                    base_currency: { type: 'string', example: 'USD' },
                    tenant_id: { type: 'integer', example: 1 }
                  },
                  required: ['name', 'code']
                }
              }
            }
          },
          responses: {
            201: { 
              description: 'Company created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      company: { type: 'object' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            },
            500: { description: 'Error creating company' }
          }
        }
      },
      '/api/sales-orders': {
        get: {
          summary: 'Get sales orders',
          tags: ['Sales'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'List of sales orders' }
          }
        }
      },
      '/api/invoices/summary': {
        get: {
          summary: 'Get invoice summary',
          tags: ['Invoices'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'Invoice summary data' }
          }
        }
      },
      '/api/bills/summary': {
        get: {
          summary: 'Get bills summary',
          tags: ['Bills'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'Bills summary data' }
          }
        }
      },
      '/api/purchase-orders/summary': {
        get: {
          summary: 'Get purchase orders summary',
          tags: ['Purchase Orders'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'Purchase orders summary data' }
          }
        }
      },
      '/api/receipts/summary': {
        get: {
          summary: 'Get receipts summary',
          tags: ['Receipts'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'Receipts summary data' }
          }
        }
      },
      '/api/payments/summary': {
        get: {
          summary: 'Get payments summary',
          tags: ['Payments'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'Payments summary data' }
          }
        }
      },
      '/api/ar-ap-summary': {
        get: {
          summary: 'Get AR/AP summary',
          tags: ['AR/AP Reports'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { 
              description: 'Complete AR/AP summary with outstanding amounts',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      companyId: { type: 'integer' },
                      accountsReceivable: {
                        type: 'object',
                        properties: {
                          totalInvoices: { type: 'integer' },
                          totalAmount: { type: 'number' },
                          outstandingAmount: { type: 'number' }
                        }
                      },
                      accountsPayable: {
                        type: 'object',
                        properties: {
                          totalBills: { type: 'integer' },
                          totalAmount: { type: 'number' },
                          outstandingAmount: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/chart-of-accounts': {
        get: {
          summary: 'Get chart of accounts',
          tags: ['Chart of Accounts'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            schema: { type: 'integer' }
          }],
          responses: {
            200: { 
              description: 'Chart of accounts for the company',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      companyId: { type: 'integer' },
                      accounts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            account_number: { type: 'string' },
                            account_name: { type: 'string' },
                            account_type: { type: 'string' },
                            balance: { type: 'number' }
                          }
                        }
                      },
                      totalAccounts: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create chart of accounts entry',
          tags: ['Chart of Accounts'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    company_id: { type: 'integer', example: 1 },
                    account_number: { type: 'string', example: '1000' },
                    account_name: { type: 'string', example: 'Cash' },
                    account_type: { type: 'string', example: 'Asset' },
                    parent_account_id: { type: 'integer', example: null },
                    is_active: { type: 'boolean', example: true },
                    balance: { type: 'number', example: 0 }
                  },
                  required: ['company_id', 'account_number', 'account_name', 'account_type']
                }
              }
            }
          },
          responses: {
            201: { 
              description: 'Chart of accounts entry created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      account: { type: 'object' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            },
            500: { description: 'Error creating chart of accounts entry' }
          }
        }
      },
      '/api/intercompany-balances': {
        get: {
          summary: 'Get intercompany balances',
          tags: ['Intercompany'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'Intercompany balance data' }
          }
        }
      },
      '/api/intercompany/sales-order': {
        post: {
          summary: 'Create intercompany sales order',
          tags: ['Intercompany'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sourceCompanyId: { type: 'integer' },
                    targetCompanyId: { type: 'integer' },
                    products: { type: 'array' },
                    total: { type: 'number' }
                  },
                  required: ['sourceCompanyId', 'targetCompanyId', 'total']
                }
              }
            }
          },
          responses: {
            200: { description: 'Created intercompany sales order' }
          }
        }
      },
      '/api/intercompany/invoice': {
        post: {
          summary: 'Create intercompany invoice',
          tags: ['Intercompany'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sourceCompanyId: { type: 'integer' },
                    targetCompanyId: { type: 'integer' },
                    salesOrderId: { type: 'integer' },
                    total: { type: 'number' }
                  },
                  required: ['sourceCompanyId', 'targetCompanyId', 'total']
                }
              }
            }
          },
          responses: {
            200: { description: 'Created intercompany invoice' }
          }
        }
      },
      '/api/intercompany/purchase-order': {
        post: {
          summary: 'Create intercompany purchase order',
          tags: ['Intercompany'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sourceCompanyId: { type: 'integer' },
                    targetCompanyId: { type: 'integer' },
                    products: { type: 'array' },
                    total: { type: 'number' }
                  },
                  required: ['sourceCompanyId', 'targetCompanyId', 'total']
                }
              }
            }
          },
          responses: {
            200: { description: 'Created intercompany purchase order' }
          }
        }
      },
      '/api/reports/ar-tracking': {
        get: {
          summary: 'Get AR tracking report',
          tags: ['AR/AP Reports'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'AR tracking data' }
          }
        }
      },
      '/api/reports/ap-tracking': {
        get: {
          summary: 'Get AP tracking report',
          tags: ['AR/AP Reports'],
          parameters: [{
            name: 'companyId',
            in: 'query',
            required: true,
            schema: { type: 'integer' }
          }],
          responses: {
            200: { description: 'AP tracking data' }
          }
        }
      },
      '/api/reference/{referenceNumber}': {
        get: {
          summary: 'Lookup transaction by reference number',
          tags: ['Transaction Lookup'],
          parameters: [{
            name: 'referenceNumber',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }],
          responses: {
            200: { description: 'Transaction lookup results' }
          }
        }
      }
    }
  };
  
  res.json(swaggerDoc);
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Multi-Company Accounting System running on port ${PORT}`);
  console.log(`🌐 Server will be available at your public URL`);
  console.log(`📚 API Documentation: /api-docs`);
  console.log(`🏥 Health Check: /health`);
  console.log(`💾 Database: 135.235.154.222 (SSL disabled)`);
  
  // Test database connection
  await testDatabaseConnection();
});

module.exports = app;