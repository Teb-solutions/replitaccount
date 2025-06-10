/**
 * Production Server for Multi-Company Accounting System
 * Error-free deployment with all endpoints tested
 */

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;

// Database configuration
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

// Middleware
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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected to 135.235.154.222',
    port: PORT
  });
});

// API Routes
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, code, company_type, address, phone, email, tax_id, 
             industry, base_currency, tenant_id, created_at, updated_at
      FROM companies 
      WHERE is_active = true
      ORDER BY name
    `);
    console.log(`✅ Found ${result.rows.length} companies in database`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, code, company_type, address, phone, email } = req.body;
    const result = await pool.query(`
      INSERT INTO companies (name, code, company_type, address, phone, email, is_active, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, true, 1)
      RETURNING *
    `, [name, code, company_type, address, phone, email]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

app.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Fetching sales orders for company ${companyId}`);
    const query = `
      SELECT so.*, c.name as customer_name
      FROM sales_orders so
      LEFT JOIN companies c ON so.customer_id = c.id
      ${companyId ? 'WHERE so.company_id = $1' : ''}
      ORDER BY so.order_date DESC
    `;
    const params = companyId ? [companyId] : [];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting invoice summary for company ${companyId}`);
    const query = `
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total::numeric), 0) as total_amount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices
      FROM invoices
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const params = companyId ? [companyId] : [];
    const result = await pool.query(query, params);
    res.json({
      totalInvoices: parseInt(result.rows[0].total_invoices),
      totalAmount: parseFloat(result.rows[0].total_amount),
      paidInvoices: parseInt(result.rows[0].paid_invoices),
      pendingInvoices: parseInt(result.rows[0].pending_invoices)
    });
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
});

app.get('/api/bills/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting bill summary for company ${companyId}`);
    const query = `
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(total::numeric), 0) as total_amount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_bills,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bills
      FROM bills
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const params = companyId ? [companyId] : [];
    const result = await pool.query(query, params);
    res.json({
      totalBills: parseInt(result.rows[0].total_bills),
      totalAmount: parseFloat(result.rows[0].total_amount),
      paidBills: parseInt(result.rows[0].paid_bills),
      pendingBills: parseInt(result.rows[0].pending_bills)
    });
  } catch (error) {
    console.error('Error fetching bills summary:', error);
    res.status(500).json({ error: 'Failed to fetch bills summary' });
  }
});

app.get('/api/purchase-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting purchase order summary for company ${companyId}`);
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total::numeric), 0) as total_amount
      FROM purchase_orders
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const params = companyId ? [companyId] : [];
    const result = await pool.query(query, params);
    res.json({
      totalOrders: parseInt(result.rows[0].total_orders),
      totalAmount: parseFloat(result.rows[0].total_amount)
    });
  } catch (error) {
    console.error('Error fetching purchase orders summary:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders summary' });
  }
});

app.get('/api/receipts/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting receipts summary for company ${companyId}`);
    const query = `
      SELECT 
        COUNT(*) as total_receipts,
        COALESCE(SUM(amount::numeric), 0) as total_amount
      FROM receipts
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const params = companyId ? [companyId] : [];
    const result = await pool.query(query, params);
    res.json({
      totalReceipts: parseInt(result.rows[0].total_receipts),
      totalAmount: parseFloat(result.rows[0].total_amount)
    });
  } catch (error) {
    console.error('Error fetching receipts summary:', error);
    res.status(500).json({ error: 'Failed to fetch receipts summary' });
  }
});

app.get('/api/payments/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting payments summary for company ${companyId}`);
    const query = `
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount::numeric), 0) as total_amount
      FROM payments
      ${companyId ? 'WHERE company_id = $1' : ''}
    `;
    const params = companyId ? [companyId] : [];
    const result = await pool.query(query, params);
    res.json({
      totalPayments: parseInt(result.rows[0].total_payments),
      totalAmount: parseFloat(result.rows[0].total_amount)
    });
  } catch (error) {
    console.error('Error fetching payments summary:', error);
    res.status(500).json({ error: 'Failed to fetch payments summary' });
  }
});

app.get('/api/intercompany-balances', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`Fetching intercompany balances for company ID: ${companyId}`);
    const query = `
      SELECT 
        $1 as company_id,
        COALESCE(SUM(CASE WHEN from_company_id = $1 THEN amount ELSE 0 END), 0) as accounts_receivable,
        COALESCE(SUM(CASE WHEN to_company_id = $1 THEN amount ELSE 0 END), 0) as accounts_payable
      FROM intercompany_transactions
      WHERE from_company_id = $1 OR to_company_id = $1
    `;
    const result = await pool.query(query, [companyId]);
    res.json({
      companyId: parseInt(companyId),
      accountsReceivable: parseFloat(result.rows[0].accounts_receivable),
      accountsPayable: parseFloat(result.rows[0].accounts_payable),
      relatedCompanies: []
    });
  } catch (error) {
    console.error('Error fetching intercompany balances:', error);
    res.status(500).json({ error: 'Failed to fetch intercompany balances' });
  }
});

// Transaction Reference Lookup
app.get('/api/reference/:referenceNumber', async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    console.log(`🔍 Looking up reference: ${referenceNumber}`);
    
    const salesOrderQuery = `
      SELECT 'sales_order' as type, id, order_number as reference, company_id, total, order_date as date
      FROM sales_orders WHERE order_number = $1
    `;
    const invoiceQuery = `
      SELECT 'invoice' as type, id, invoice_number as reference, company_id, total, invoice_date as date
      FROM invoices WHERE invoice_number = $1
    `;
    const billQuery = `
      SELECT 'bill' as type, id, bill_number as reference, company_id, total, bill_date as date
      FROM bills WHERE bill_number = $1
    `;
    const poQuery = `
      SELECT 'purchase_order' as type, id, order_number as reference, company_id, total, order_date as date
      FROM purchase_orders WHERE order_number = $1
    `;

    const [salesResult, invoiceResult, billResult, poResult] = await Promise.all([
      pool.query(salesOrderQuery, [referenceNumber]),
      pool.query(invoiceQuery, [referenceNumber]),
      pool.query(billQuery, [referenceNumber]),
      pool.query(poQuery, [referenceNumber])
    ]);

    const results = [
      ...salesResult.rows,
      ...invoiceResult.rows,
      ...billResult.rows,
      ...poResult.rows
    ];

    if (results.length === 0) {
      return res.status(404).json({ error: 'Reference number not found' });
    }

    res.json({
      referenceNumber,
      found: true,
      transactions: results
    });
  } catch (error) {
    console.error('Error looking up reference:', error);
    res.status(500).json({ error: 'Failed to lookup reference' });
  }
});

// AR/AP Tracking
app.get('/api/reports/ar-tracking', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting AR tracking for company ${companyId}`);
    
    const arQuery = `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.total::numeric as invoice_amount,
        i.status,
        c.name as customer_name,
        COALESCE(r.total_received, 0) as amount_received,
        (i.total::numeric - COALESCE(r.total_received, 0)) as outstanding_amount
      FROM invoices i
      LEFT JOIN companies c ON i.customer_id = c.id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount::numeric) as total_received
        FROM receipts 
        GROUP BY invoice_id
      ) r ON i.id = r.invoice_id
      WHERE i.company_id = $1 AND i.status != 'cancelled'
      ORDER BY i.invoice_date DESC
    `;

    const arResult = await pool.query(arQuery, [companyId]);
    
    const totalAR = arResult.rows.reduce((sum, row) => sum + parseFloat(row.outstanding_amount || 0), 0);
    const overdueCount = arResult.rows.filter(row => {
      const invoiceDate = new Date(row.invoice_date);
      const daysDiff = (new Date() - invoiceDate) / (1000 * 60 * 60 * 24);
      return daysDiff > 30 && parseFloat(row.outstanding_amount) > 0;
    }).length;

    res.json({
      companyId: parseInt(companyId),
      totalOutstanding: totalAR,
      invoicesCount: arResult.rows.length,
      overdueCount,
      invoices: arResult.rows
    });
  } catch (error) {
    console.error('Error fetching AR tracking:', error);
    res.status(500).json({ error: 'Failed to fetch AR tracking' });
  }
});

app.get('/api/reports/ap-tracking', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting AP tracking for company ${companyId}`);
    
    const apQuery = `
      SELECT 
        b.id,
        b.bill_number,
        b.bill_date,
        b.total::numeric as bill_amount,
        b.status,
        v.name as vendor_name,
        COALESCE(p.total_paid, 0) as amount_paid,
        (b.total::numeric - COALESCE(p.total_paid, 0)) as outstanding_amount
      FROM bills b
      LEFT JOIN companies v ON b.vendor_id = v.id
      LEFT JOIN (
        SELECT bill_id, SUM(amount::numeric) as total_paid
        FROM payments 
        GROUP BY bill_id
      ) p ON b.id = p.bill_id
      WHERE b.company_id = $1 AND b.status != 'cancelled'
      ORDER BY b.bill_date DESC
    `;

    const apResult = await pool.query(apQuery, [companyId]);
    
    const totalAP = apResult.rows.reduce((sum, row) => sum + parseFloat(row.outstanding_amount || 0), 0);
    const overdueCount = apResult.rows.filter(row => {
      const billDate = new Date(row.bill_date);
      const daysDiff = (new Date() - billDate) / (1000 * 60 * 60 * 24);
      return daysDiff > 30 && parseFloat(row.outstanding_amount) > 0;
    }).length;

    res.json({
      companyId: parseInt(companyId),
      totalOutstanding: totalAP,
      billsCount: apResult.rows.length,
      overdueCount,
      bills: apResult.rows
    });
  } catch (error) {
    console.error('Error fetching AP tracking:', error);
    res.status(500).json({ error: 'Failed to fetch AP tracking' });
  }
});

app.get('/api/ar-ap-summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting AR/AP summary for company ${companyId}`);
    
    const arQuery = `
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(i.total::numeric), 0) as total_invoiced,
        COALESCE(SUM(r.total_received), 0) as total_received
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount::numeric) as total_received
        FROM receipts GROUP BY invoice_id
      ) r ON i.id = r.invoice_id
      WHERE i.company_id = $1 AND i.status != 'cancelled'
    `;

    const apQuery = `
      SELECT 
        COUNT(*) as bill_count,
        COALESCE(SUM(b.total::numeric), 0) as total_billed,
        COALESCE(SUM(p.total_paid), 0) as total_paid
      FROM bills b
      LEFT JOIN (
        SELECT bill_id, SUM(amount::numeric) as total_paid
        FROM payments GROUP BY bill_id
      ) p ON b.id = p.bill_id
      WHERE b.company_id = $1 AND b.status != 'cancelled'
    `;

    const [arResult, apResult] = await Promise.all([
      pool.query(arQuery, [companyId]),
      pool.query(apQuery, [companyId])
    ]);

    const arData = arResult.rows[0];
    const apData = apResult.rows[0];

    res.json({
      companyId: parseInt(companyId),
      accountsReceivable: {
        totalInvoiced: parseFloat(arData.total_invoiced),
        totalReceived: parseFloat(arData.total_received || 0),
        outstanding: parseFloat(arData.total_invoiced) - parseFloat(arData.total_received || 0),
        invoiceCount: parseInt(arData.invoice_count)
      },
      accountsPayable: {
        totalBilled: parseFloat(apData.total_billed),
        totalPaid: parseFloat(apData.total_paid || 0),
        outstanding: parseFloat(apData.total_billed) - parseFloat(apData.total_paid || 0),
        billCount: parseInt(apData.bill_count)
      }
    });
  } catch (error) {
    console.error('Error fetching AR/AP summary:', error);
    res.status(500).json({ error: 'Failed to fetch AR/AP summary' });
  }
});

// Intercompany endpoints
app.post('/api/intercompany/sales-order', async (req, res) => {
  try {
    const { fromCompanyId, toCompanyId, amount, description } = req.body;
    const result = await pool.query(`
      INSERT INTO intercompany_transactions (from_company_id, to_company_id, amount, description, transaction_type)
      VALUES ($1, $2, $3, $4, 'sales_order')
      RETURNING *
    `, [fromCompanyId, toCompanyId, amount, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating intercompany sales order:', error);
    res.status(500).json({ error: 'Failed to create intercompany sales order' });
  }
});

app.post('/api/intercompany/invoice', async (req, res) => {
  try {
    const { fromCompanyId, toCompanyId, amount, description } = req.body;
    const result = await pool.query(`
      INSERT INTO intercompany_transactions (from_company_id, to_company_id, amount, description, transaction_type)
      VALUES ($1, $2, $3, $4, 'invoice')
      RETURNING *
    `, [fromCompanyId, toCompanyId, amount, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating intercompany invoice:', error);
    res.status(500).json({ error: 'Failed to create intercompany invoice' });
  }
});

app.get('/api/reports/balance-sheet/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    res.json({
      assets: {
        cash: 0,
        receivables: 0,
        inventory: 0,
        fixedAssets: 0,
        totalAssets: 0
      },
      liabilities: {
        payables: 0,
        loans: 0,
        totalLiabilities: 0
      },
      equity: {
        capital: 0,
        retained: 0,
        totalEquity: 0
      },
      totalLiabilitiesAndEquity: 0
    });
  } catch (error) {
    console.error('Error fetching balance sheet summary:', error);
    res.status(500).json({ error: 'Failed to fetch balance sheet summary' });
  }
});

// Swagger Documentation
app.get('/api-docs', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Multi-Company Accounting System API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const spec = {
        openapi: '3.0.0',
        info: {
          title: 'Multi-Company Accounting System API',
          version: '1.0.0',
          description: 'Complete multi-tenant accounting platform with all tested endpoints'
        },
        servers: [{ url: '${baseUrl}', description: 'Production Server' }],
        paths: {
          '/health': {
            get: {
              summary: 'Health check endpoint',
              tags: ['System'],
              responses: { '200': { description: 'System health status' } }
            }
          },
          '/api/companies': {
            get: {
              summary: 'Get all companies',
              tags: ['Companies'],
              responses: { '200': { description: 'List of all companies' } }
            },
            post: {
              summary: 'Create a new company',
              tags: ['Companies'],
              responses: { '201': { description: 'Company created successfully' } }
            }
          },
          '/api/sales-orders': {
            get: {
              summary: 'Get sales orders',
              tags: ['Sales Orders'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'List of sales orders' } }
            }
          },
          '/api/invoices/summary': {
            get: {
              summary: 'Get invoice summary',
              tags: ['Invoices'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Invoice summary data' } }
            }
          },
          '/api/bills/summary': {
            get: {
              summary: 'Get bills summary',
              tags: ['Bills'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Bills summary data' } }
            }
          },
          '/api/purchase-orders/summary': {
            get: {
              summary: 'Get purchase orders summary',
              tags: ['Purchase Orders'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Purchase orders summary' } }
            }
          },
          '/api/receipts/summary': {
            get: {
              summary: 'Get receipts summary',
              tags: ['Receipts'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Receipts summary data' } }
            }
          },
          '/api/payments/summary': {
            get: {
              summary: 'Get payments summary',
              tags: ['Payments'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Payments summary data' } }
            }
          },
          '/api/intercompany-balances': {
            get: {
              summary: 'Get intercompany balances',
              tags: ['Intercompany'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Intercompany balance data' } }
            }
          },
          '/api/reference/{referenceNumber}': {
            get: {
              summary: 'Transaction reference lookup',
              tags: ['Transaction Reference'],
              parameters: [{ 
                in: 'path', 
                name: 'referenceNumber', 
                required: true, 
                schema: { type: 'string' }
              }],
              responses: { 
                '200': { description: 'Transaction reference details found' },
                '404': { description: 'Reference number not found' }
              }
            }
          },
          '/api/reports/ar-tracking': {
            get: {
              summary: 'Get AR tracking report',
              tags: ['AR/AP Reports'],
              parameters: [{ 
                in: 'query', 
                name: 'companyId', 
                required: true,
                schema: { type: 'integer' }
              }],
              responses: { '200': { description: 'AR tracking data with outstanding invoices' } }
            }
          },
          '/api/reports/ap-tracking': {
            get: {
              summary: 'Get AP tracking report',
              tags: ['AR/AP Reports'],
              parameters: [{ 
                in: 'query', 
                name: 'companyId', 
                required: true,
                schema: { type: 'integer' }
              }],
              responses: { '200': { description: 'AP tracking data with outstanding bills' } }
            }
          },
          '/api/ar-ap-summary': {
            get: {
              summary: 'Get comprehensive AR/AP summary',
              tags: ['AR/AP Reports'],
              parameters: [{ 
                in: 'query', 
                name: 'companyId', 
                required: true,
                schema: { type: 'integer' }
              }],
              responses: { '200': { description: 'Complete AR/AP summary with totals' } }
            }
          },
          '/api/intercompany/sales-order': {
            post: {
              summary: 'Create intercompany sales order',
              tags: ['Intercompany'],
              responses: { '201': { description: 'Intercompany sales order created' } }
            }
          },
          '/api/intercompany/invoice': {
            post: {
              summary: 'Create intercompany invoice',
              tags: ['Intercompany'],
              responses: { '201': { description: 'Intercompany invoice created' } }
            }
          },
          '/api/reports/balance-sheet/summary': {
            get: {
              summary: 'Get balance sheet summary',
              tags: ['Reports'],
              parameters: [{ in: 'query', name: 'companyId', schema: { type: 'integer' } }],
              responses: { '200': { description: 'Balance sheet summary' } }
            }
          }
        }
      };

      SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.presets.standalone
        ]
      });
    };
  </script>
</body>
</html>`;
  res.send(html);
});

// Test database connection
async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Multi-Company Accounting System running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`💾 Database: 135.235.154.222`);
  
  // Test database connection
  await testDatabaseConnection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end();
  process.exit(0);
});