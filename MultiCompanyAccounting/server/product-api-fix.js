import express from 'express';
import pg from 'pg';
const { Pool } = pg;
const router = express.Router();

// Connect to the external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123'
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to external database for product API fix:', err);
  } else {
    console.log('Successfully connected to external database for product API fix');
  }
});

// Get all products with correct price fields
router.get('/api/products', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    // Filter by company ID if provided
    const whereClause = companyId ? 'WHERE company_id = $1' : '';
    const queryParams = companyId ? [companyId] : [];
    
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        code, 
        price,
        purchase_price,
        sales_price,
        company_id as "companyId"
      FROM 
        products
      ${whereClause}
      ORDER BY 
        name
    `;
    
    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} products${companyId ? ` for company ${companyId}` : ''}`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get a specific product by ID
router.get('/api/products/:productId', async (req, res) => {
  const { productId } = req.params;
  
  try {
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        code, 
        price,
        purchase_price,
        sales_price,
        company_id as "companyId"
      FROM 
        products
      WHERE 
        id = $1
    `;
    
    const result = await pool.query(query, [productId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

export default router;