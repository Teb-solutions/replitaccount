const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * Get all products for a tenant across all companies
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    
    if (isNaN(tenantId)) {
      return res.status(400).json({ message: 'Invalid tenant ID' });
    }
    
    console.log(`Fetching all products for tenant ${tenantId} across all companies`);
    
    // First get all companies for this tenant to have their names available
    const companiesResult = await pool.query(
      `SELECT id, name FROM companies WHERE tenant_id = $1`,
      [tenantId]
    );
    
    const companies = companiesResult.rows.reduce((acc, company) => {
      acc[company.id] = company.name;
      return acc;
    }, {});
    
    // Query all products for companies in this tenant
    const { rows } = await pool.query(
      `SELECT 
        products.id, 
        products.name, 
        products.code, 
        products.description, 
        products.sales_price,
        products.purchase_price,
        products.company_id,
        products.category,
        products.status
      FROM products 
      JOIN companies ON products.company_id = companies.id
      WHERE companies.tenant_id = $1 AND products.status = 'active'
      ORDER BY products.company_id, products.name ASC`,
      [tenantId]
    );
    
    // Format the response for compatibility with the form
    const formattedProducts = rows.map(product => ({
      id: product.id,
      name: product.name,
      code: product.code || '',
      description: product.description || '',
      sales_price: product.sales_price || 0,
      purchase_price: product.purchase_price || 0,
      price: product.sales_price || 0,
      cost: product.purchase_price || 0,
      companyId: product.company_id,
      companyName: companies[product.company_id] || 'Unknown Company',
      category: product.category || 'General',
      status: product.status || 'active'
    }));
    
    console.log(`Found ${formattedProducts.length} products across all companies for tenant ${tenantId}`);
    
    return res.json(formattedProducts);
  } catch (error) {
    console.error('Error fetching tenant products:', error);
    return res.status(500).json({ message: 'Error fetching tenant products', error: error.message });
  }
});

module.exports = router;