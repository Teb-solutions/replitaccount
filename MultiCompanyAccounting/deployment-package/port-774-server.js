const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = 774; // Fixed port for your deployment

// Enhanced CORS middleware for public access
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

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Database connection with optimized settings for public deployment
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

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to external database at 135.235.154.222');
    release();
  }
});

// Dynamic Swagger configuration that adapts to the actual domain
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Company Accounting System API',
      version: '1.0.0',
      description: 'Complete multi-tenant accounting platform with transaction reference lookup and comprehensive financial management',
    },
    servers: [], // Will be populated dynamically
  },
  apis: ['./port-774-server.js'], // Path to the API docs
};

// Middleware to dynamically set server URL based on request
app.use((req, res, next) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  const serverUrl = `${protocol}://${host}`;
  
  // Update swagger spec with current server URL
  swaggerOptions.definition.servers = [
    {
      url: serverUrl,
      description: `Current Server (${host})`
    }
  ];
  
  req.swaggerSpec = swaggerJsdoc(swaggerOptions);
  next();
});

// Swagger UI setup with dynamic server detection
app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  const swaggerUiAssetHandler = swaggerUi.setup(req.swaggerSpec, {
    swaggerOptions: {
      url: '/api/swagger.json'
    }
  });
  swaggerUiAssetHandler(req, res, next);
});

app.get('/api/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(req.swaggerSpec);
});

// Landing page with port 774 information
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Multi-Company Accounting System - Port 774</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .info { background: #d1ecf1; border: 1px solid #b8daff; color: #0c5460; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
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
                <h3>Running on Port 774</h3>
            </div>
            
            <div class="status success">
                <h3>🚀 System Status: Online</h3>
                <p><strong>Server Port:</strong> ${PORT}</p>
                <p><strong>Database:</strong> Connected to 135.235.154.222</p>
                <p><strong>Public Access:</strong> Available on port 774</p>
            </div>
            
            <div class="status info">
                <h3>🔗 Quick Access Links</h3>
                <div class="grid">
                    <div class="card">
                        <h4>API Endpoints</h4>
                        <ul>
                            <li><a href="/api/companies">All Companies</a></li>
                            <li><a href="/api/dashboard/stats">Dashboard Stats</a></li>
                            <li><a href="/health">Health Check</a></li>
                        </ul>
                    </div>
                    <div class="card">
                        <h4>Documentation</h4>
                        <ul>
                            <li><a href="/api-docs">Swagger API Docs</a></li>
                            <li><a href="/api/swagger.json">API Specification</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="status warning">
                <h3>🌐 Public Access Configuration</h3>
                <p><strong>External URL:</strong> http://your-domain:774</p>
                <p><strong>Firewall:</strong> Ensure port 774 is open for inbound connections</p>
                <p><strong>Router:</strong> Configure port forwarding if behind NAT</p>
            </div>
            
            <h3>📊 Available Features</h3>
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

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status
 */
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: result.rows[0].now,
      port: PORT,
      message: 'Multi-Company Accounting System running on port 774'
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

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     responses:
 *       200:
 *         description: List of all companies
 */
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY id');
    console.log(`✅ Found ${result.rows.length} companies in database`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching companies:', error.message);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company details
 */
app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching company:', error.message);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: System statistics
 */
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
      totalOrderAmount: parseFloat(ordersResult.rows[0].amount) || 0,
      serverPort: PORT,
      databaseConnected: true
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * @swagger
 * /api/sales-orders:
 *   get:
 *     summary: Get sales orders
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID
 *     responses:
 *       200:
 *         description: List of sales orders
 */
app.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = 'SELECT * FROM sales_orders';
    let params = [];
    
    if (companyId) {
      query += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching sales orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch sales orders' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error.message);
  res.status(500).json({ 
    error: 'Internal server error',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Start server on port 774
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Company Accounting System running on port ${PORT}`);
  console.log(`📊 Public URL: http://your-domain:${PORT}`);
  console.log(`🔗 Local access: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`💡 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌐 Ready for external connections on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
});

module.exports = app;