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
  password: 'StrongP@ss123',
  ssl: false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to external database for products API:', err);
  } else {
    console.log('Successfully connected to external database for products API');
  }
});

/**
 * @swagger
 * /api/products/tested:
 *   get:
 *     summary: Get all products with complete pricing information
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter products by company ID
 *     responses:
 *       200:
 *         description: List of products with pricing details
 */
router.get('/api/products/tested', async (req, res) => {
  try {
    const { companyId } = req.query;
    
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
        company_id as "companyId",
        created_at,
        updated_at
      FROM 
        products
      ${whereClause}
      ORDER BY 
        name
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch products',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/products/tested/by-company/{companyId}:
 *   get:
 *     summary: Get products for specific company with sales/purchase tracking
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Products with usage statistics
 */
router.get('/api/products/tested/by-company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.code,
        p.price,
        p.purchase_price,
        p.sales_price,
        p.company_id as "companyId",
        COALESCE(sales_usage.sales_count, 0) as sales_usage_count,
        COALESCE(sales_usage.sales_total, 0) as sales_total_amount,
        COALESCE(purchase_usage.purchase_count, 0) as purchase_usage_count,
        COALESCE(purchase_usage.purchase_total, 0) as purchase_total_amount
      FROM products p
      LEFT JOIN (
        SELECT 
          product_id,
          COUNT(*) as sales_count,
          SUM(quantity * unit_price) as sales_total
        FROM sales_order_items
        GROUP BY product_id
      ) sales_usage ON p.id = sales_usage.product_id
      LEFT JOIN (
        SELECT 
          product_id,
          COUNT(*) as purchase_count,
          SUM(quantity * unit_price) as purchase_total
        FROM purchase_order_items
        GROUP BY product_id
      ) purchase_usage ON p.id = purchase_usage.product_id
      WHERE p.company_id = $1
      ORDER BY p.name
    `;
    
    const result = await pool.query(query, [companyId]);
    
    res.json({
      success: true,
      companyId: parseInt(companyId),
      count: result.rows.length,
      products: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching company products:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch company products',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/products/tested/summary:
 *   get:
 *     summary: Get products summary across all companies
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Products summary with company breakdown
 */
router.get('/api/products/tested/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT company_id) as companies_with_products,
        AVG(price) as average_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        SUM(CASE WHEN price > 0 THEN 1 ELSE 0 END) as products_with_price
      FROM products
      WHERE price IS NOT NULL
    `;
    
    const companyBreakdownQuery = `
      SELECT 
        p.company_id,
        c.name as company_name,
        COUNT(p.id) as product_count,
        AVG(p.price) as avg_price
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      GROUP BY p.company_id, c.name
      ORDER BY product_count DESC
    `;
    
    const [summaryResult, breakdownResult] = await Promise.all([
      pool.query(query),
      pool.query(companyBreakdownQuery)
    ]);
    
    res.json({
      success: true,
      summary: summaryResult.rows[0],
      companyBreakdown: breakdownResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching products summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch products summary',
      details: error.message 
    });
  }
});

export default router;