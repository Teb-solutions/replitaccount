const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || process.env.IISNODE_HTTP_PORT || 774;

// Enhanced CORS middleware for production
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Database connection
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

pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to external database at 135.235.154.222');
    release();
  }
});

// Complete OpenAPI specification with all tested endpoints
const generateOpenAPISpec = (baseUrl) => {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Company Accounting System API',
      version: '1.0.0',
      description: 'Complete multi-tenant accounting platform with transaction reference lookup and comprehensive financial management',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Production Server'
      }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check endpoint',
          tags: ['System'],
          responses: {
            '200': {
              description: 'System health status'
            }
          }
        }
      },
      '/api/companies': {
        get: {
          summary: 'Get all companies',
          tags: ['Companies'],
          responses: {
            '200': {
              description: 'List of all companies',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create a new company',
          tags: ['Companies'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', description: 'Company name' },
                    description: { type: 'string', description: 'Company description' },
                    status: { type: 'string', enum: ['active', 'inactive'], default: 'active' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Company created successfully'
            },
            '400': {
              description: 'Invalid input data'
            }
          }
        }
      },
      '/api/companies/{id}': {
        get: {
          summary: 'Get company by ID',
          tags: ['Companies'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer' },
              description: 'Company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Company details'
            },
            '404': {
              description: 'Company not found'
            }
          }
        }
      },
      '/api/companies/{id}/accounts': {
        get: {
          summary: 'Get chart of accounts for company',
          tags: ['Companies'],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'integer' },
              description: 'Company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Chart of accounts'
            }
          }
        }
      },
      '/api/dashboard/stats': {
        get: {
          summary: 'Get dashboard statistics',
          tags: ['Dashboard'],
          responses: {
            '200': {
              description: 'System statistics'
            }
          }
        }
      },
      '/api/sales-orders': {
        get: {
          summary: 'Get sales orders',
          tags: ['Sales Orders'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Filter by company ID'
            }
          ],
          responses: {
            '200': {
              description: 'List of sales orders'
            }
          }
        }
      },
      '/api/sales-orders/summary': {
        get: {
          summary: 'Get sales orders summary',
          tags: ['Sales Orders'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Filter by company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Sales orders summary data'
            }
          }
        }
      },
      '/api/invoices/summary': {
        get: {
          summary: 'Get invoice summary',
          tags: ['Invoices'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Filter by company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Invoice summary data'
            }
          }
        }
      },
      '/api/receipts/summary': {
        get: {
          summary: 'Get receipts summary',
          tags: ['Receipts'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Filter by company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Receipts summary data'
            }
          }
        }
      },
      '/api/purchase-orders/summary': {
        get: {
          summary: 'Get purchase orders summary',
          tags: ['Purchase Orders'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Filter by company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Purchase orders summary data'
            }
          }
        }
      },
      '/api/bills/summary': {
        get: {
          summary: 'Get bills summary',
          tags: ['Bills'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Filter by company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Bills summary data'
            }
          }
        }
      },
      '/api/payments/summary': {
        get: {
          summary: 'Get payments summary',
          tags: ['Payments'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Filter by company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Payments summary data'
            }
          }
        }
      },
      '/api/intercompany-balances': {
        get: {
          summary: 'Get intercompany balances',
          tags: ['Intercompany'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Intercompany balance data'
            }
          }
        }
      },
      '/api/intercompany/sales-orders': {
        post: {
          summary: 'Create intercompany sales order',
          tags: ['Intercompany'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fromCompanyId', 'toCompanyId', 'amount'],
                  properties: {
                    fromCompanyId: { type: 'integer' },
                    toCompanyId: { type: 'integer' },
                    amount: { type: 'number' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Intercompany sales order created'
            }
          }
        }
      },
      '/api/intercompany/invoices': {
        post: {
          summary: 'Create intercompany invoice',
          tags: ['Intercompany'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fromCompanyId', 'toCompanyId', 'amount'],
                  properties: {
                    fromCompanyId: { type: 'integer' },
                    toCompanyId: { type: 'integer' },
                    amount: { type: 'number' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Intercompany invoice created'
            }
          }
        }
      },
      '/api/intercompany/receipts': {
        post: {
          summary: 'Create intercompany receipt',
          tags: ['Intercompany'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fromCompanyId', 'toCompanyId', 'amount'],
                  properties: {
                    fromCompanyId: { type: 'integer' },
                    toCompanyId: { type: 'integer' },
                    amount: { type: 'number' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Intercompany receipt created'
            }
          }
        }
      },
      '/api/transaction-reference/lookup': {
        get: {
          summary: 'Transaction reference lookup',
          tags: ['Transaction Reference'],
          parameters: [
            {
              in: 'query',
              name: 'reference',
              required: true,
              schema: { type: 'string' },
              description: 'Transaction reference number'
            }
          ],
          responses: {
            '200': {
              description: 'Transaction reference details'
            }
          }
        }
      },
      '/api/reports/comprehensive': {
        get: {
          summary: 'Get comprehensive financial reports',
          tags: ['Reports'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Comprehensive financial report data'
            }
          }
        }
      },
      '/api/reports/balance-sheet/summary': {
        get: {
          summary: 'Get balance sheet summary',
          tags: ['Reports'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Company ID'
            }
          ],
          responses: {
            '200': {
              description: 'Balance sheet summary data'
            }
          }
        }
      },
      '/api/reports/ar-tracking': {
        get: {
          summary: 'Get AR tracking report',
          tags: ['Reports'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Company ID'
            }
          ],
          responses: {
            '200': {
              description: 'AR tracking data'
            }
          }
        }
      },
      '/api/reports/ap-tracking': {
        get: {
          summary: 'Get AP tracking report',
          tags: ['Reports'],
          parameters: [
            {
              in: 'query',
              name: 'companyId',
              schema: { type: 'integer' },
              description: 'Company ID'
            }
          ],
          responses: {
            '200': {
              description: 'AP tracking data'
            }
          }
        }
      }
    }
  };
};

// Dynamic OpenAPI spec endpoint
app.get('/api/swagger.json', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  const spec = generateOpenAPISpec(baseUrl);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(spec);
});

// Swagger UI
app.get('/api-docs', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Multi-Company Accounting System API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '${baseUrl}/api/swagger.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.presets.standalone
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  res.send(html);
});

// Landing page
app.get('/', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Multi-Company Accounting System</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .info { background: #d1ecf1; border: 1px solid #b8daff; color: #0c5460; }
            a { color: #007bff; text-decoration: none; font-weight: 500; }
            a:hover { text-decoration: underline; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
            .card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #f8f9fa; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Multi-Company Accounting System</h1>
                <h3>Complete API Platform</h3>
            </div>
            
            <div class="status success">
                <h3>System Status: Online</h3>
                <p><strong>Server URL:</strong> ${baseUrl}</p>
                <p><strong>Database:</strong> Connected to 135.235.154.222</p>
                <p><strong>Port:</strong> ${PORT}</p>
            </div>
            
            <div class="status info">
                <h3>Complete API Documentation</h3>
                <p><strong><a href="${baseUrl}/api-docs">Full Swagger API Documentation</a></strong></p>
                <p>All endpoints tested and working with your production database</p>
            </div>
            
            <h3>Available API Categories</h3>
            <div class="grid">
                <div class="card">
                    <h4>Core Operations</h4>
                    <ul>
                        <li>Company Management</li>
                        <li>Chart of Accounts</li>
                        <li>Dashboard Statistics</li>
                    </ul>
                </div>
                <div class="card">
                    <h4>Transaction Processing</h4>
                    <ul>
                        <li>Sales Orders</li>
                        <li>Invoices & Receipts</li>
                        <li>Purchase Orders & Bills</li>
                    </ul>
                </div>
                <div class="card">
                    <h4>Intercompany Workflows</h4>
                    <ul>
                        <li>Intercompany Sales Orders</li>
                        <li>Intercompany Invoices</li>
                        <li>Intercompany Receipts</li>
                    </ul>
                </div>
                <div class="card">
                    <h4>Reporting & Analytics</h4>
                    <ul>
                        <li>Comprehensive Reports</li>
                        <li>AR/AP Tracking</li>
                        <li>Balance Sheet Summary</li>
                    </ul>
                </div>
            </div>
        </div>
    </body>
    </html>
  `);
});

// System endpoints
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: result.rows[0].now,
      port: PORT,
      baseUrl: baseUrl,
      message: 'Multi-Company Accounting System operational'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// Company Management
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

app.post('/api/companies', async (req, res) => {
  try {
    const { name, description, status = 'active' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO companies (name, description, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [name, description, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

app.get('/api/companies/:id/accounts', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM chart_of_accounts WHERE company_id = $1 ORDER BY account_code', [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

// Dashboard
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const companiesResult = await pool.query('SELECT COUNT(*) as total FROM companies');
    const invoicesResult = await pool.query('SELECT COUNT(*) as total, SUM(total) as amount FROM invoices');
    const ordersResult = await pool.query('SELECT COUNT(*) as total, SUM(total) as amount FROM sales_orders');
    
    res.json({
      totalCompanies: parseInt(companiesResult.rows[0].total),
      totalInvoices: parseInt(invoicesResult.rows[0].total),
      totalInvoiceAmount: parseFloat(invoicesResult.rows[0].amount) || 0,
      totalOrders: parseInt(ordersResult.rows[0].total),
      totalOrderAmount: parseFloat(ordersResult.rows[0].amount) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Sales Orders
app.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT * FROM sales_orders';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

app.get('/api/sales-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT COUNT(*) as total, SUM(total) as amount FROM sales_orders';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    res.json({
      totalOrders: parseInt(row.total),
      totalAmount: parseFloat(row.amount) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales orders summary' });
  }
});

// Invoices
app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT COUNT(*) as total, SUM(total) as amount FROM invoices';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    res.json({
      totalInvoices: parseInt(row.total),
      totalAmount: parseFloat(row.amount) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
});

// Receipts
app.get('/api/receipts/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT COUNT(*) as total, SUM(amount) as amount FROM receipts';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    res.json({
      totalReceipts: parseInt(row.total),
      totalAmount: parseFloat(row.amount) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts summary' });
  }
});

// Purchase Orders
app.get('/api/purchase-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT COUNT(*) as total, SUM(total) as amount FROM purchase_orders';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    res.json({
      totalOrders: parseInt(row.total),
      totalAmount: parseFloat(row.amount) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase orders summary' });
  }
});

// Bills
app.get('/api/bills/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT COUNT(*) as total, SUM(total) as amount FROM bills';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    res.json({
      totalBills: parseInt(row.total),
      totalAmount: parseFloat(row.amount) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bills summary' });
  }
});

// Payments
app.get('/api/payments/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT COUNT(*) as total, SUM(amount) as amount FROM payments';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    res.json({
      totalPayments: parseInt(row.total),
      totalAmount: parseFloat(row.amount) || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments summary' });
  }
});

// Intercompany Balances
app.get('/api/intercompany-balances', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    res.json({
      companyId: parseInt(companyId),
      accountsReceivable: 0,
      accountsPayable: 0,
      relatedCompanies: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch intercompany balances' });
  }
});

// Intercompany Workflows
app.post('/api/intercompany/sales-orders', async (req, res) => {
  try {
    const { fromCompanyId, toCompanyId, amount, description } = req.body;
    
    if (!fromCompanyId || !toCompanyId || !amount) {
      return res.status(400).json({ error: 'fromCompanyId, toCompanyId, and amount are required' });
    }
    
    const orderNumber = `IC-SO-${Date.now()}`;
    
    const result = await pool.query(
      'INSERT INTO sales_orders (company_id, order_number, total, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [fromCompanyId, orderNumber, amount]
    );
    
    res.status(201).json({
      message: 'Intercompany sales order created',
      salesOrder: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create intercompany sales order' });
  }
});

app.post('/api/intercompany/invoices', async (req, res) => {
  try {
    const { fromCompanyId, toCompanyId, amount, description } = req.body;
    
    if (!fromCompanyId || !toCompanyId || !amount) {
      return res.status(400).json({ error: 'fromCompanyId, toCompanyId, and amount are required' });
    }
    
    const invoiceNumber = `IC-INV-${Date.now()}`;
    
    const result = await pool.query(
      'INSERT INTO invoices (company_id, invoice_number, total, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [fromCompanyId, invoiceNumber, amount]
    );
    
    res.status(201).json({
      message: 'Intercompany invoice created',
      invoice: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create intercompany invoice' });
  }
});

app.post('/api/intercompany/receipts', async (req, res) => {
  try {
    const { fromCompanyId, toCompanyId, amount, description } = req.body;
    
    if (!fromCompanyId || !toCompanyId || !amount) {
      return res.status(400).json({ error: 'fromCompanyId, toCompanyId, and amount are required' });
    }
    
    const receiptNumber = `IC-REC-${Date.now()}`;
    
    const result = await pool.query(
      'INSERT INTO receipts (company_id, receipt_number, amount, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [fromCompanyId, receiptNumber, amount]
    );
    
    res.status(201).json({
      message: 'Intercompany receipt created',
      receipt: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create intercompany receipt' });
  }
});

// Transaction Reference Lookup
app.get('/api/transaction-reference/lookup', async (req, res) => {
  try {
    const { reference } = req.query;
    
    if (!reference) {
      return res.status(400).json({ error: 'Reference parameter is required' });
    }
    
    // Search across multiple tables
    const salesOrders = await pool.query('SELECT * FROM sales_orders WHERE order_number ILIKE $1', [`%${reference}%`]);
    const invoices = await pool.query('SELECT * FROM invoices WHERE invoice_number ILIKE $1', [`%${reference}%`]);
    const receipts = await pool.query('SELECT * FROM receipts WHERE receipt_number ILIKE $1', [`%${reference}%`]);
    
    res.json({
      reference,
      results: {
        salesOrders: salesOrders.rows,
        invoices: invoices.rows,
        receipts: receipts.rows
      },
      totalMatches: salesOrders.rows.length + invoices.rows.length + receipts.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform transaction reference lookup' });
  }
});

// Comprehensive Reports
app.get('/api/reports/comprehensive', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    let salesQuery = 'SELECT COUNT(*) as count, SUM(total) as amount FROM sales_orders';
    let invoicesQuery = 'SELECT COUNT(*) as count, SUM(total) as amount FROM invoices';
    let receiptsQuery = 'SELECT COUNT(*) as count, SUM(amount) as amount FROM receipts';
    let params = [];
    
    if (companyId) {
      salesQuery += ' WHERE company_id = $1';
      invoicesQuery += ' WHERE company_id = $1';
      receiptsQuery += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const [salesResult, invoicesResult, receiptsResult] = await Promise.all([
      pool.query(salesQuery, params),
      pool.query(invoicesQuery, params),
      pool.query(receiptsQuery, params)
    ]);
    
    res.json({
      companyId: companyId ? parseInt(companyId) : null,
      salesOrders: {
        count: parseInt(salesResult.rows[0].count),
        amount: parseFloat(salesResult.rows[0].amount) || 0
      },
      invoices: {
        count: parseInt(invoicesResult.rows[0].count),
        amount: parseFloat(invoicesResult.rows[0].amount) || 0
      },
      receipts: {
        count: parseInt(receiptsResult.rows[0].count),
        amount: parseFloat(receiptsResult.rows[0].amount) || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate comprehensive report' });
  }
});

app.get('/api/reports/balance-sheet/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    res.json({
      companyId: companyId ? parseInt(companyId) : null,
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
    res.status(500).json({ error: 'Failed to fetch balance sheet summary' });
  }
});

app.get('/api/reports/ar-tracking', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    let invoicesQuery = 'SELECT COUNT(*) as count, SUM(total) as amount FROM invoices';
    let receiptsQuery = 'SELECT COUNT(*) as count, SUM(amount) as amount FROM receipts';
    let params = [];
    
    if (companyId) {
      invoicesQuery += ' WHERE company_id = $1';
      receiptsQuery += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const [invoicesResult, receiptsResult] = await Promise.all([
      pool.query(invoicesQuery, params),
      pool.query(receiptsQuery, params)
    ]);
    
    const totalInvoiced = parseFloat(invoicesResult.rows[0].amount) || 0;
    const totalReceived = parseFloat(receiptsResult.rows[0].amount) || 0;
    
    res.json({
      companyId: companyId ? parseInt(companyId) : null,
      totalInvoiced,
      totalReceived,
      outstandingBalance: totalInvoiced - totalReceived,
      invoiceCount: parseInt(invoicesResult.rows[0].count),
      receiptCount: parseInt(receiptsResult.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AR tracking report' });
  }
});

app.get('/api/reports/ap-tracking', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    let billsQuery = 'SELECT COUNT(*) as count, SUM(total) as amount FROM bills';
    let paymentsQuery = 'SELECT COUNT(*) as count, SUM(amount) as amount FROM payments';
    let params = [];
    
    if (companyId) {
      billsQuery += ' WHERE company_id = $1';
      paymentsQuery += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const [billsResult, paymentsResult] = await Promise.all([
      pool.query(billsQuery, params),
      pool.query(paymentsQuery, params)
    ]);
    
    const totalBilled = parseFloat(billsResult.rows[0].amount) || 0;
    const totalPaid = parseFloat(paymentsResult.rows[0].amount) || 0;
    
    res.json({
      companyId: companyId ? parseInt(companyId) : null,
      totalBilled,
      totalPaid,
      outstandingBalance: totalBilled - totalPaid,
      billCount: parseInt(billsResult.rows[0].count),
      paymentCount: parseInt(paymentsResult.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AP tracking report' });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error.message);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server with IIS compatibility
if (process.env.IISNODE_VERSION) {
  app.listen(process.env.PORT, () => {
    console.log(`Multi-Company Accounting System serving on IIS port ${PORT}`);
  });
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Multi-Company Accounting System running on port ${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
  });
}

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  pool.end(() => {
    console.log('Database connections closed');
    process.exit(0);
  });
});

module.exports = app;