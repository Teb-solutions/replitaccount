const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || process.env.IISNODE_HTTP_PORT || 774;

// Enhanced CORS middleware for production
app.use((req, res, next) => {
  const origin = req.get('origin');
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

// Generate OpenAPI spec dynamically based on current request
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
        description: 'Current Server'
      }
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check endpoint',
          tags: ['System'],
          responses: {
            '200': {
              description: 'System health status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      database: { type: 'string' },
                      timestamp: { type: 'string' },
                      port: { type: 'number' },
                      baseUrl: { type: 'string' }
                    }
                  }
                }
              }
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
              description: 'Company details',
              content: {
                'application/json': {
                  schema: {
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
            },
            '404': {
              description: 'Company not found'
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
              description: 'System statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalCompanies: { type: 'integer' },
                      totalInvoices: { type: 'integer' },
                      totalInvoiceAmount: { type: 'number' },
                      totalOrders: { type: 'integer' },
                      totalOrderAmount: { type: 'number' },
                      serverPort: { type: 'integer' },
                      baseUrl: { type: 'string' },
                      databaseConnected: { type: 'boolean' }
                    }
                  }
                }
              }
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
              description: 'List of sales orders',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        orderNumber: { type: 'string' },
                        companyId: { type: 'integer' },
                        total: { type: 'number' },
                        createdAt: { type: 'string' }
                      }
                    }
                  }
                }
              }
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
              description: 'Invoice summary data',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalInvoices: { type: 'integer' },
                      totalAmount: { type: 'number' },
                      paidInvoices: { type: 'integer' },
                      pendingInvoices: { type: 'integer' }
                    }
                  }
                }
              }
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

// Swagger UI with proper CORS and dynamic URL
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
                <h3>Production Deployment</h3>
            </div>
            
            <div class="status success">
                <h3>System Status: Online</h3>
                <p><strong>Server URL:</strong> ${baseUrl}</p>
                <p><strong>Database:</strong> Connected to 135.235.154.222</p>
                <p><strong>Port:</strong> ${PORT}</p>
            </div>
            
            <div class="status info">
                <h3>API Access</h3>
                <div class="grid">
                    <div class="card">
                        <h4>API Endpoints</h4>
                        <ul>
                            <li><a href="${baseUrl}/api/companies">All Companies</a></li>
                            <li><a href="${baseUrl}/api/dashboard/stats">Dashboard Stats</a></li>
                            <li><a href="${baseUrl}/health">Health Check</a></li>
                        </ul>
                    </div>
                    <div class="card">
                        <h4>Documentation</h4>
                        <ul>
                            <li><a href="${baseUrl}/api-docs">Swagger API Docs</a></li>
                            <li><a href="${baseUrl}/api/swagger.json">API Specification</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <h3>Available Features</h3>
            <ul>
                <li><strong>23 Companies</strong> with authentic financial data</li>
                <li><strong>AR/AP Tracking</strong> across all entities</li>
                <li><strong>Intercompany Workflows</strong> for complex transactions</li>
                <li><strong>Comprehensive Reporting</strong> with real-time data</li>
                <li><strong>Transaction Reference Lookup</strong> system</li>
                <li><strong>Multi-currency Support</strong> and bank integration ready</li>
            </ul>
        </div>
    </body>
    </html>
  `);
});

// API Endpoints
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
      message: 'Multi-Company Accounting System running'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message,
      port: PORT
    });
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY id');
    console.log(`Found ${result.rows.length} companies in database`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error.message);
    res.status(500).json({ error: 'Failed to fetch companies' });
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
    console.error('Error fetching company:', error.message);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    const companiesResult = await pool.query('SELECT COUNT(*) as total FROM companies');
    const invoicesResult = await pool.query('SELECT COUNT(*) as total, SUM(total) as amount FROM invoices');
    const ordersResult = await pool.query('SELECT COUNT(*) as total, SUM(total) as amount FROM sales_orders');
    
    res.json({
      totalCompanies: parseInt(companiesResult.rows[0].total),
      totalInvoices: parseInt(invoicesResult.rows[0].total),
      totalInvoiceAmount: parseFloat(invoicesResult.rows[0].amount) || 0,
      totalOrders: parseInt(ordersResult.rows[0].total),
      totalOrderAmount: parseFloat(ordersResult.rows[0].amount) || 0,
      serverPort: PORT,
      baseUrl: baseUrl,
      databaseConnected: true
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

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
    console.error('Error fetching sales orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

app.get('/api/invoices/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT COUNT(*) as total, SUM(total) as amount, COUNT(CASE WHEN status = \'paid\' THEN 1 END) as paid, COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending FROM invoices';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    const row = result.rows[0];
    
    res.json({
      totalInvoices: parseInt(row.total),
      totalAmount: parseFloat(row.amount) || 0,
      paidInvoices: parseInt(row.paid),
      pendingInvoices: parseInt(row.pending)
    });
  } catch (error) {
    console.error('Error fetching invoice summary:', error.message);
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error.message);
  res.status(500).json({ 
    error: 'Internal server error',
    port: PORT,
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
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`Ready for external connections on port ${PORT}`);
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