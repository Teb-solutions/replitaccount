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
    console.error('Error connecting to external database for gas products API:', err);
  } else {
    console.log('Successfully connected to external database for gas products API');
  }
});

// Get products for Gas Manufacturing Co (by name, not ID)
router.get('/api/gas-products', async (req, res) => {
  try {
    // First, get Gas Manufacturing company ID by name
    const companyQuery = `
      SELECT id
      FROM companies
      WHERE LOWER(name) LIKE '%gas manufacturing%'
      LIMIT 1
    `;
    
    const companyResult = await pool.query(companyQuery);
    
    if (companyResult.rows.length === 0) {
      console.error('Gas Manufacturing company not found');
      return res.status(404).json({ error: 'Gas Manufacturing company not found' });
    }
    
    const gasManufacturingId = companyResult.rows[0].id;
    console.log(`Found Gas Manufacturing company with ID: ${gasManufacturingId}`);
    
    const query = `
      SELECT 
        id, 
        name, 
        description, 
        code as "code", 
        sales_price as "salesPrice", 
        purchase_price as "purchasePrice",
        company_id as "companyId"
      FROM 
        products
      WHERE 
        company_id = $1
      ORDER BY 
        name
    `;
    
    const result = await pool.query(query, [gasManufacturingId]);
    console.log(`Found ${result.rows.length} gas products for company ID ${gasManufacturingId}`);
    
    // If no products found, add default cylinder products
    if (result.rows.length === 0) {
      console.log(`No products found for Gas Manufacturing Co (ID: ${gasManufacturingId}), adding default cylinder products`);
      
      // Add default cylinder products
      const defaultProducts = [
        {
          name: 'Filled Gas Cylinder 12kg',
          description: 'Standard 12kg filled gas cylinder for household use',
          code: 'FILL-CYL12',
          salesPrice: '180.00',
          purchasePrice: '120.00',
          companyId: gasManufacturingId
        },
        {
          name: 'Cylinder Filling Service',
          description: 'Service to refill empty cylinders with gas',
          code: 'SVC-FILL',
          salesPrice: '60.00',
          purchasePrice: '30.00',
          companyId: gasManufacturingId
        },
        {
          name: 'Empty Gas Cylinder 12kg',
          description: 'Standard 12kg empty gas cylinder',
          code: 'EMPTY-CYL12',
          salesPrice: '120.00',
          purchasePrice: '80.00',
          companyId: gasManufacturingId
        }
      ];
      
      // Insert default products
      for (const product of defaultProducts) {
        try {
          await pool.query(`
            INSERT INTO products (
              name, description, code, sales_price, purchase_price, company_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6
            )
          `, [
            product.name, 
            product.description, 
            product.code, 
            product.salesPrice, 
            product.purchasePrice, 
            product.companyId
          ]);
          console.log(`Added default product: ${product.name}`);
        } catch (err) {
          console.error(`Error adding default product ${product.name}:`, err);
        }
      }
      
      // Fetch the newly added products
      const refreshResult = await pool.query(query, [gasManufacturingId]);
      console.log(`Now have ${refreshResult.rows.length} gas products after adding defaults`);
      
      return res.json(refreshResult.rows);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching gas products:', error);
    res.status(500).json({ error: 'Failed to fetch gas products' });
  }
});

// Get products for a specific company
router.get('/api/company-products/:companyId', async (req, res) => {
  const { companyId } = req.params;
  
  try {
    console.log(`Fetching products for company ID: ${companyId}`);
    
    // First check if the company exists and if it's a Gas company
    const companyQuery = `
      SELECT name
      FROM companies
      WHERE id = $1
    `;
    
    const companyResult = await pool.query(companyQuery, [companyId]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const companyName = companyResult.rows[0].name.toLowerCase();
    const isGasCompany = companyName.includes('gas manufacturing') || companyName.includes('gas distributor');
    
    // Check if this is a Gas company
    if (isGasCompany) {
      console.log(`Company ${companyId} is a Gas company (${companyName}), using custom query`);
      
      // For Gas companies, check if products exist, if not add default ones
      try {
        // Try to check for existing products with a simpler query (avoiding SKU)
        const checkQuery = `
          SELECT COUNT(*) as count
          FROM products
          WHERE company_id = $1
        `;
        
        const checkResult = await pool.query(checkQuery, [companyId]);
        const productCount = parseInt(checkResult.rows[0].count);
        
        if (productCount === 0 && companyName.includes('gas manufacturing')) {
          console.log(`No products found for Gas Manufacturing Co (ID: ${companyId}), adding default cylinder products`);
          
          // Add default cylinder products
          const defaultProducts = [
            {
              name: 'Filled Gas Cylinder 12kg',
              description: 'Standard 12kg filled gas cylinder for household use',
              salesPrice: '180.00',
              purchasePrice: '120.00',
              companyId
            },
            {
              name: 'Cylinder Filling Service',
              description: 'Service to refill empty cylinders with gas',
              salesPrice: '60.00',
              purchasePrice: '30.00',
              companyId
            },
            {
              name: 'Empty Gas Cylinder 12kg',
              description: 'Standard 12kg empty gas cylinder',
              salesPrice: '120.00',
              purchasePrice: '80.00',
              companyId
            }
          ];
          
          // Insert default products - handle case where sku column might not exist
          for (const product of defaultProducts) {
            try {
              await pool.query(`
                INSERT INTO products (
                  name, description, code, sales_price, purchase_price, company_id
                ) VALUES (
                  $1, $2, $3, $4, $5, $6
                )
              `, [
                product.name, 
                product.description, 
                product.name.substring(0, 8).toUpperCase().replace(/\s+/g, '-'), 
                product.salesPrice, 
                product.purchasePrice, 
                product.companyId
              ]);
              console.log(`Added default product: ${product.name}`);
            } catch (err) {
              console.error(`Error adding default product ${product.name}:`, err);
            }
          }
        }
        
        // Get simplified product list (adapt query based on existing columns)
        const productsQuery = `
          SELECT 
            id, 
            name, 
            description, 
            sales_price as "salesPrice", 
            purchase_price as "purchasePrice",
            company_id as "companyId"
          FROM 
            products
          WHERE 
            company_id = $1
          ORDER BY 
            name
        `;
        
        const productsResult = await pool.query(productsQuery, [companyId]);
        console.log(`Found ${productsResult.rows.length} products for company ${companyId}`);
        
        return res.json(productsResult.rows);
      } catch (err) {
        console.error(`Error handling Gas company products for ${companyId}:`, err);
        throw err; // Re-throw to be caught by outer try/catch
      }
    } else {
      // For non-Gas companies, use a more flexible query without SKU field
      const query = `
        SELECT 
          id, 
          name, 
          description, 
          sales_price as "salesPrice", 
          purchase_price as "purchasePrice",
          company_id as "companyId"
        FROM 
          products
        WHERE 
          company_id = $1
        ORDER BY 
          name
      `;
      
      const result = await pool.query(query, [companyId]);
      console.log(`Found ${result.rows.length} products for company ${companyId}`);
      
      res.json(result.rows);
    }
  } catch (error) {
    console.error(`Error fetching products for company ${companyId}:`, error);
    res.status(500).json({ error: 'Failed to fetch company products' });
  }
});

export default router;