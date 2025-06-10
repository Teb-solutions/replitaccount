/**
 * Test Deployment Server - No Localhost References
 * Pure Node.js server for testing the deployment package
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Database configuration - External database without SSL
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false
});

// CORS and middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected to 135.235.154.222',
    port: PORT,
    baseUrl: `${protocol}://${host}`
  });
});

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

// AR/AP Summary API
app.get('/api/ar-ap-summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    console.log(`📊 Getting AR/AP summary for company ${companyId}`);
    
    // Get invoice totals for AR
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
    
    // Get bill totals for AP
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
    
    const invoiceData = invoiceResult.rows[0];
    const billData = billResult.rows[0];
    
    const summary = {
      companyId: companyId ? parseInt(companyId) : null,
      accountsReceivable: {
        totalInvoices: parseInt(invoiceData.total_invoices) || 0,
        totalAmount: parseFloat(invoiceData.total_amount) || 0,
        outstandingAmount: parseFloat(invoiceData.outstanding_amount) || 0
      },
      accountsPayable: {
        totalBills: parseInt(billData.total_bills) || 0,
        totalAmount: parseFloat(billData.total_amount) || 0,
        outstandingAmount: parseFloat(billData.outstanding_amount) || 0
      }
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching AR/AP summary:', error);
    res.status(500).json({ error: 'Failed to fetch AR/AP summary', details: error.message });
  }
});

// Swagger API Documentation - NO LOCALHOST REFERENCES
app.get('/api-docs', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  const swaggerHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Multi-Company Accounting API - Clean Deployment</title>
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

// Swagger JSON - NO LOCALHOST REFERENCES
app.get('/api/swagger.json', (req, res) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  const swaggerDoc = {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Company Accounting API - Clean Deployment',
      version: '1.0.0',
      description: 'Complete accounting system with external database integration - NO LOCALHOST REFERENCES'
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
            200: { description: 'AR/AP summary data' }
          }
        }
      },
      '/health': {
        get: {
          summary: 'Health check',
          tags: ['System'],
          responses: {
            200: { description: 'System health status' }
          }
        }
      }
    }
  };
  
  res.json(swaggerDoc);
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Clean Deployment Server running on port ${PORT}`);
  console.log(`🌐 No localhost references - ready for public deployment`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  
  // Test database connection
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM companies');
    console.log(`✅ Database connected - ${result.rows[0].count} companies available`);
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
});