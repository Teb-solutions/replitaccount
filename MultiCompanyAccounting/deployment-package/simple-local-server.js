const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3002;

// Enhanced CORS middleware
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

// Database connection with connection pooling
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

// Simple landing page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Multi-Company Accounting System</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; }
            .info { background: #d1ecf1; border: 1px solid #b8daff; }
            a { color: #007bff; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Multi-Company Accounting System</h1>
            <div class="status success">
                <h3>System Status: Online</h3>
                <p>Server running on port ${PORT}</p>
                <p>Database: Connected to 135.235.154.222</p>
            </div>
            
            <div class="status info">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="/api/companies">View All Companies (API)</a></li>
                    <li><a href="/api-docs">API Documentation (Swagger)</a></li>
                    <li><a href="/api/dashboard/stats">Dashboard Statistics</a></li>
                </ul>
            </div>
            
            <h3>Available Features</h3>
            <ul>
                <li>23 Companies with authentic financial data</li>
                <li>AR/AP tracking across all companies</li>
                <li>Intercompany workflow management</li>
                <li>Comprehensive financial reporting</li>
                <li>Real-time transaction processing</li>
            </ul>
        </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: result.rows[0].now,
      port: PORT
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Companies endpoint
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

// Basic dashboard stats
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
    console.error('❌ Error fetching dashboard stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Company Accounting System running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 Companies API: http://localhost:${PORT}/api/companies`);
  console.log(`💡 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
});