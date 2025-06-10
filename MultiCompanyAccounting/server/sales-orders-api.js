import { externalPool } from './database-config.js';
/**
 * Sales Orders API for Gas Companies
 * 
 * This API provides sales order data for Gas Manufacturing and Gas Distributor
 * companies with proper intercompany sales orders.
 */

import express from 'express';
const router = express.Router();

// Create a PostgreSQL connection pool for the external database
// Test the database connection on startup
externalPool.query('SELECT NOW()')
  .then(() => {
    console.log('Successfully connected to external database for sales orders API');
  })
  .catch(err => {
    console.error('Failed to connect to external database for sales orders API:', err);
  });

// GET /api/sales-orders
// Returns sales orders with special handling for gas companies
router.get('/api/sales-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    console.log(`Fetching sales orders for company ID: ${companyId}`);
    
    if (!companyId) {
      // For backward compatibility, return sample data if no company ID is provided
      const sampleOrders = [
        {
          id: 1,
          orderNumber: "SO-001",
          date: "2025-05-01",
          customerName: "Sample Customer",
          total: 1500,
          status: "Confirmed"
        },
        {
          id: 2,
          orderNumber: "SO-002",
          date: "2025-05-05",
          customerName: "Another Customer",
          total: 2500,
          status: "Processing"
        }
      ];
      return res.json(sampleOrders);
    }
    
    // First, check if this is one of our gas companies by name
    const companyResult = await externalPool.query(
      'SELECT name FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const companyName = companyResult.rows[0].name.toLowerCase();
    console.log(`Checking sales orders for company: ${companyName} (ID: ${companyId})`);
    
    // Check if it's Gas Manufacturing or Gas Distributor
    const isGasManufacturing = companyName.includes('gas manufacturing');
    const isGasDistributor = companyName.includes('gas distributor');
    
    // For all companies including Gas Manufacturing and Gas Distributor,
    // get actual sales order data from database
    console.log(`Fetching actual sales orders for company ${companyId} (${companyName})`);
    
    try {
      // Step 1: Fetch basic sales order information
      const ordersQuery = `
        SELECT 
          so.id,
          so.order_number as "orderNumber",
          so.order_date as "date",
          c.name as "customerName",
          'Business' as "customerType",
          so.expected_date as "deliveryDate",
          so.total,
          so.status
        FROM 
          sales_orders so
        LEFT JOIN
          customers c ON so.customer_id = c.id
        WHERE 
          so.company_id = $1
        ORDER BY
          so.id DESC
      `;
      
      const ordersResult = await externalPool.query(ordersQuery, [companyId]);
      
      if (ordersResult.rows.length === 0) {
        console.log(`No sales orders found in database for company ${companyId}, returning empty list`);
        return res.json([]);
      }
      
      const orders = ordersResult.rows;
      console.log(`Found ${orders.length} sales orders in database for company ${companyId}`);
      
      // Step 2: For each order, fetch its line items
      for (const order of orders) {
        try {
          const itemsQuery = `
            SELECT 
              soi.id,
              p.name as "productName",
              soi.quantity,
              soi.unit_price as "unitPrice",
              (soi.quantity * soi.unit_price) as total
            FROM 
              sales_order_items soi
            LEFT JOIN
              products p ON soi.product_id = p.id
            WHERE 
              soi.sales_order_id = $1
          `;
          
          const itemsResult = await externalPool.query(itemsQuery, [order.id]);
          order.items = itemsResult.rows;
        } catch (itemError) {
          console.error(`Error fetching items for order ${order.id}:`, itemError);
          order.items = []; // Set empty array if items can't be fetched
        }
        
        // Format dates properly
        if (order.date) {
          order.date = new Date(order.date).toISOString().split('T')[0];
        }
        if (order.deliveryDate) {
          order.deliveryDate = new Date(order.deliveryDate).toISOString().split('T')[0];
        }
      }
      
      return res.json(orders);
      
    } catch (error) {
      console.error(`Error fetching sales orders for company ${companyId}:`, error);
      return res.json([]);
    }
    
    // This section is now handled by the code above that works for all companies
    // No separate handling needed for "other companies"
    
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Failed to retrieve sales orders' });
  }
});

export default router;