import { pool } from './database-config.js';
import express from 'express';
/**
 * Purchase Orders API for Gas Companies
 * 
 * This API provides purchase order data for Gas Manufacturing and Gas Distributor
 * companies with proper intercompany purchase orders.
 */
const router = express.Router();

// Create a PostgreSQL connection pool for the external database
// Test the database connection on startup
externalPool.query('SELECT NOW()')
  .then(() => {
    console.log('Successfully connected to external database for purchase orders API');
  })
  .catch(err => {
    console.error('Failed to connect to external database for purchase orders API:', err);
  });

// GET /api/purchase-orders
// Returns purchase orders with special handling for gas companies
router.get('/api/purchase-orders', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    console.log(`Fetching purchase orders for company ID: ${companyId}`);
    
    if (!companyId) {
      // For backward compatibility, return empty array if no company ID
      return res.json([]);
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
    console.log(`Checking purchase orders for company: ${companyName} (ID: ${companyId})`);
    
    // Check if it's Gas Manufacturing or Gas Distributor
    const isGasManufacturing = companyName.includes('gas manufacturing');
    const isGasDistributor = companyName.includes('gas distributor');
    
        // For any company, including Gas Manufacturing and Gas Distributor, fetch actual orders from the database
    console.log(`Fetching actual purchase orders from database for company ${companyId}`);
    
    // First, try to get actual purchase orders for any company
    try {
      const ordersQuery = `
        SELECT 
          po.id,
          po.order_number as "orderNumber",
          TO_CHAR(po.order_date, 'YYYY-MM-DD') as date,
          c.name as "vendorName",
          'Business' as "vendorType",
          TO_CHAR(po.expected_date, 'YYYY-MM-DD') as "deliveryDate",
          po.total,
          po.status
        FROM 
          purchase_orders po
        LEFT JOIN
          companies c ON po.vendor_id = c.id
        WHERE 
          po.company_id = $1
        ORDER BY
          po.order_date DESC
      `;
      
      const ordersResult = await externalPool.query(ordersQuery, [companyId]);
      
      // Log what we found
      console.log(`Found ${ordersResult.rows.length} purchase orders in database for company ${companyId}`);
      
      // If we have orders, get the line items for each order
      if (ordersResult.rows.length > 0) {
        // Get all order IDs
        const orderIds = ordersResult.rows.map(order => order.id);
        
        // Fetch all order items in a single query
        const itemsQuery = `
          SELECT 
            poi.purchase_order_id as "orderId",
            poi.id,
            poi.product_id as "productId",
            poi.quantity,
            poi.unit_price as "unitPrice",
            poi.amount,
            p.name as "productName",
            p.description as "productDescription"
          FROM purchase_order_items poi
          JOIN products p ON poi.product_id = p.id
          WHERE poi.purchase_order_id = ANY($1)
        `;
        
        try {
          const itemsResult = await externalPool.query(itemsQuery, [orderIds]);
          
          // Group items by order ID
          const itemsByOrder = {};
          itemsResult.rows.forEach(item => {
            if (!itemsByOrder[item.orderId]) {
              itemsByOrder[item.orderId] = [];
            }
            itemsByOrder[item.orderId].push(item);
          });
          
          // Add items to each order
          ordersResult.rows.forEach(order => {
            order.items = itemsByOrder[order.id] || [];
          });
        } catch (error) {
          console.error('Error fetching purchase order items:', error);
          // Continue without items if there's an error
        }
      }
      
      // Return the actual data including items
      return res.json(ordersResult.rows);
    } catch (error) {
      console.error('Error fetching purchase orders from database:', error);
      // Continue to fallback response below
    }
    
    // For other companies, get actual purchase order data from database
    console.log(`Fetching actual purchase orders for company ${companyId}`);
    
    // Try to fetch from real database
    try {
      const ordersQuery = `
        SELECT 
          po.id,
          po.order_number as "orderNumber",
          TO_CHAR(po.date, 'YYYY-MM-DD') as date,
          v.name as "vendorName",
          v.type as "vendorType",
          TO_CHAR(po.expected_date, 'YYYY-MM-DD') as "deliveryDate",
          po.total,
          po.status
        FROM 
          purchase_orders po
        LEFT JOIN
          vendors v ON po.vendor_id = v.id
        WHERE 
          po.company_id = $1
        ORDER BY
          po.date DESC
      `;
      
      const ordersResult = await externalPool.query(ordersQuery, [companyId]);
      
      // If we got results, return them
      if (ordersResult.rows.length > 0) {
        console.log(`Found ${ordersResult.rows.length} purchase orders in database for company ${companyId}`);
        return res.json(ordersResult.rows);
      }
    } catch (error) {
      console.error('Error fetching purchase orders from database:', error);
      // Continue to fallback response below
    }
    
    // Fallback empty list for no database results
    console.log(`No purchase orders found in database for company ${companyId}, returning empty list`);
    return res.json([]);
    
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to retrieve purchase orders' });
  }
});

// GET /api/purchase-orders/by-reference/:reference
// Returns a purchase order by its reference number (order_number)
// Handles both regular purchase order references and sales order references (SO-XX)
router.get('/api/purchase-orders/by-reference/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const { companyId } = req.query;
    
    console.log(`Looking up purchase order by reference: ${reference}, for company ID: ${companyId}`);
    
    if (!reference) {
      return res.status(400).json({ error: 'Reference number is required' });
    }
    
    // Check if this is a sales order reference (SO-XXX format)
    const isSalesOrderReference = reference.toUpperCase().startsWith('SO-');
    
    // If this is a sales order reference, we need to look up the corresponding purchase order
    if (isSalesOrderReference) {
      console.log(`Looking up purchase order for sales order reference: ${reference}`);
      
      // First, get the sales order ID by order number
      try {
        const salesOrderQuery = `
          SELECT id, company_id, order_number
          FROM sales_orders 
          WHERE order_number = $1
        `;
        
        const salesOrderResult = await externalPool.query(salesOrderQuery, [reference]);
        
        if (salesOrderResult.rows.length === 0) {
          console.log(`No sales order found with reference number: ${reference}`);
          return res.status(404).json({ 
            error: 'Sales order not found', 
            message: `No sales order found with reference number: ${reference}` 
          });
        }
        
        const salesOrder = salesOrderResult.rows[0];
        console.log(`Found sales order with ID: ${salesOrder.id}`);
        
        // Now find the corresponding purchase order by intercompany mapping
        const purchaseOrderQuery = `
          SELECT 
            po.id,
            po.order_number as "orderNumber",
            TO_CHAR(po.order_date, 'YYYY-MM-DD') as date,
            v.name as "vendorName",
            v.type as "vendorType",
            TO_CHAR(po.expected_date, 'YYYY-MM-DD') as "deliveryDate",
            po.total,
            po.status,
            po.company_id as "companyId", 
            po.vendor_id as "vendorId"
          FROM 
            purchase_orders po
          LEFT JOIN
            vendors v ON po.vendor_id = v.id
          LEFT JOIN
            intercompany_transactions ict ON 
            (ict.source_order_id = $1 AND po.company_id != $2) OR
            (ict.target_order_id = $1 AND po.company_id != $2)
          WHERE 
            po.related_sales_order_id = $1 OR
            ict.source_order_id = $1 OR
            ict.target_order_id = $1
          LIMIT 1
        `;
        
        const poResult = await externalPool.query(purchaseOrderQuery, [salesOrder.id, salesOrder.company_id]);
        
        if (poResult.rows.length === 0) {
          // Try another approach - many purchase orders don't have the relationship explicitly set
          // Look for purchase order with similar description or metadata
          console.log(`No explicit purchase order relationship found. Trying alternate methods to find match.`);
          
          // We need to create a purchase order for the sales order
          console.log(`No purchase order found for sales order ${reference}, creating one automatically`);
          
          // First, get full sales order details including items
          const fullSalesOrderQuery = `
            SELECT 
              so.id, so.order_number, so.order_date, so.company_id, so.customer_id,
              soi.id as item_id, soi.product_id, soi.quantity, soi.unit_price, soi.total,
              p.name as product_name, p.description as product_description,
              c.name as customer_name
            FROM sales_orders so
            LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
            LEFT JOIN products p ON soi.product_id = p.id
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE so.id = $1
          `;
          
          const fullSalesOrderResult = await externalPool.query(fullSalesOrderQuery, [salesOrder.id]);
          
          if (fullSalesOrderResult.rows.length === 0) {
            return res.status(200).json({
              error: 'Sales order details not found',
              message: `Found basic sales order ${reference} but could not retrieve detailed information.`,
              salesOrderId: salesOrder.id,
              id: null,
              orderNumber: `PO-FOR-${reference}`,
              date: new Date().toISOString().split('T')[0],
              status: "Related",
              items: []
            });
          }
          
          // Group the results by sales order
          const salesOrderItems = fullSalesOrderResult.rows;
          const firstRow = salesOrderItems[0];
          
          // Create a purchase order in the customer's company
          try {
            // Find the vendor relationship 
            const vendorQuery = `
              SELECT id FROM vendors 
              WHERE company_id = $1 AND name LIKE $2
            `;
            
            // Use LIKE to handle slight variations in company naming
            const vendorNamePattern = `%${firstRow.customer_name.substring(0, 10)}%`;
            const vendorResult = await externalPool.query(vendorQuery, [salesOrder.company_id, vendorNamePattern]);
            
            let vendorId;
            
            if (vendorResult.rows.length === 0) {
              // Create a vendor if one doesn't exist
              const insertVendorQuery = `
                INSERT INTO vendors (company_id, name, type)
                VALUES ($1, $2, 'Business')
                RETURNING id
              `;
              
              const insertVendorResult = await externalPool.query(insertVendorQuery, 
                [salesOrder.company_id, firstRow.customer_name]
              );
              
              vendorId = insertVendorResult.rows[0].id;
              console.log(`Created vendor with ID ${vendorId} for company ${salesOrder.company_id}`);
            } else {
              vendorId = vendorResult.rows[0].id;
              console.log(`Found existing vendor with ID ${vendorId} for company ${salesOrder.company_id}`);
            }
            
            // Generate a purchase order number
            const poNumber = `PO-FOR-${reference}`;
            
            // Insert the purchase order
            const insertPOQuery = `
              INSERT INTO purchase_orders (
                company_id, vendor_id, order_number, order_date, expected_date,
                total, status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id
            `;
            
            // Get the sales order date or use current date
            const orderDate = firstRow.order_date || new Date().toISOString().split('T')[0];
            // Calculate the expected delivery date (14 days after order date)
            const deliveryDate = new Date(orderDate);
            deliveryDate.setDate(deliveryDate.getDate() + 14);
            
            // Calculate total from the items
            const total = salesOrderItems.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
            
            const poValues = [
              firstRow.customer_id, // The company ID of the customer (buy from source company)
              vendorId,             // Vendor ID
              poNumber,             // Generate a PO number based on SO
              orderDate,            // Same as sales order date
              deliveryDate.toISOString().split('T')[0], // 14 days later
              total,                // Same total
              'draft'               // Initial status
            ];
            
            const poResult = await externalPool.query(insertPOQuery, poValues);
            const poId = poResult.rows[0].id;
            
            console.log(`Created purchase order with ID ${poId} for sales order ${salesOrder.id}`);
            
            // Create purchase order items
            for (const item of salesOrderItems) {
              if (item.product_id) {
                const insertPOItemQuery = `
                  INSERT INTO purchase_order_items (
                    purchase_order_id, product_id, quantity, unit_price, total
                  )
                  VALUES ($1, $2, $3, $4, $5)
                `;
                
                await externalPool.query(insertPOItemQuery, [
                  poId,
                  item.product_id,
                  item.quantity,
                  item.unit_price,
                  item.total
                ]);
              }
            }
            
            // Return the newly created purchase order
            const purchaseOrderQuery = `
              SELECT 
                po.id,
                po.order_number as "orderNumber",
                TO_CHAR(po.order_date, 'YYYY-MM-DD') as date,
                v.name as "vendorName",
                v.type as "vendorType",
                TO_CHAR(po.expected_date, 'YYYY-MM-DD') as "deliveryDate",
                po.total,
                po.status,
                po.company_id as "companyId"
              FROM 
                purchase_orders po
              LEFT JOIN
                vendors v ON po.vendor_id = v.id
              WHERE 
                po.id = $1
            `;
            
            const newPOResult = await externalPool.query(purchaseOrderQuery, [poId]);
            
            if (newPOResult.rows.length > 0) {
              // Also fetch the items
              const poItemsQuery = `
                SELECT 
                  id, product_id as "productId", quantity, unit_price as "unitPrice", 
                  total, purchase_order_id as "purchaseOrderId"
                FROM 
                  purchase_order_items
                WHERE 
                  purchase_order_id = $1
              `;
              
              const poItemsResult = await externalPool.query(poItemsQuery, [poId]);
              
              // Return the complete purchase order with items
              const completeOrder = {
                ...newPOResult.rows[0],
                items: poItemsResult.rows,
                autoCreated: true,
                message: `Automatically created purchase order for sales order ${reference}`
              };
              
              return res.json(completeOrder);
            }
            
          } catch (error) {
            console.error('Error creating purchase order for sales order:', error);
            
            // Return a partial response with error information
            return res.status(200).json({
              error: 'Purchase order creation failed',
              message: `Found sales order ${reference} but failed to create purchase order: ${error.message}`,
              salesOrderId: salesOrder.id,
              id: null,
              orderNumber: `PO-FOR-${reference}`,
              date: new Date().toISOString().split('T')[0],
              status: "Error",
              items: [],
              errorDetails: error.message
            });
          }
        }
        
        const purchaseOrder = poResult.rows[0];
        console.log(`Found matching purchase order: ${purchaseOrder.orderNumber} (ID: ${purchaseOrder.id})`);
        return res.json(purchaseOrder);
      } catch (error) {
        console.error('Error finding purchase order for sales order reference:', error);
        return res.status(500).json({ 
          error: 'Error finding purchase order',
          message: error.message 
        });
      }
    }
    
    // For regular purchase order lookups
    const companyFilter = companyId ? 'AND po.company_id = $2' : '';
    const params = companyId ? [reference, companyId] : [reference];
    
    // Query to get purchase order by reference number
    const orderQuery = `
      SELECT 
        po.id,
        po.order_number as "orderNumber",
        TO_CHAR(po.order_date, 'YYYY-MM-DD') as date,
        v.name as "vendorName",
        v.type as "vendorType",
        TO_CHAR(po.expected_date, 'YYYY-MM-DD') as "deliveryDate",
        po.total,
        po.status,
        po.company_id as "companyId",
        po.supplier_id as "supplierId"
      FROM 
        purchase_orders po
      LEFT JOIN
        vendors v ON po.supplier_id = v.id
      WHERE 
        po.order_number = $1
        ${companyFilter}
    `;
    
    const orderResult = await externalPool.query(orderQuery, params);
    
    if (orderResult.rows.length === 0) {
      console.log(`No purchase order found with reference number: ${reference}`);
      return res.status(404).json({ 
        error: 'Purchase order not found', 
        message: `No purchase order found with reference number: ${reference}` 
      });
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsQuery = `
      SELECT 
        poi.id,
        p.name as "productName",
        poi.quantity,
        poi.unit_price as "unitPrice",
        poi.subtotal as total,
        p.id as "productId",
        poi.description
      FROM 
        purchase_order_items poi
      LEFT JOIN
        products p ON poi.product_id = p.id
      WHERE 
        poi.purchase_order_id = $1
    `;
    
    const itemsResult = await externalPool.query(itemsQuery, [order.id]);
    
    // Add items to order
    order.items = itemsResult.rows;
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching purchase order by reference:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve purchase order',
      message: error.message
    });
  }
});

// GET /api/purchase-orders/summary
// Returns a summary of purchase orders for a company
router.get('/api/purchase-orders/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log(`Fetching purchase order summary for company ID: ${companyId}`);

    // Convert companyId to integer
    let companyIdInt;
    try {
      companyIdInt = parseInt(companyId, 10);
      
      if (isNaN(companyIdInt)) {
        return res.status(400).json({ error: 'Invalid company ID format' });
      }
    } catch (error) {
      console.error('Error converting companyId to integer:', error);
      return res.status(400).json({ error: 'Invalid company ID format' });
    }

    // Get summary of all purchase orders for the company
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'invoiced' THEN 1 ELSE 0 END) as invoiced,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
        SUM(total) as total_amount
      FROM purchase_orders 
      WHERE company_id = $1
    `;

    const result = await pool.query(query, [companyIdInt]);
    
    // Get most recent orders
    const recentOrdersQuery = `
      SELECT 
        po.id, 
        po.order_number as order_number, 
        po.total, 
        po.status,
        c.name as vendor_name,
        TO_CHAR(po.order_date, 'YYYY-MM-DD') as order_date
      FROM purchase_orders po
      JOIN companies c ON po.vendor_id = c.id
      WHERE po.company_id = $1
      ORDER BY po.order_date DESC
      LIMIT 5
    `;
    
    const recentOrders = await externalPool.query(recentOrdersQuery, [companyIdInt]);
    
    // Combine the results
    const summary = {
      ...result.rows[0],
      recent: recentOrders.rows
    };
    
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error retrieving purchase order details:', error);
    return res.status(500).json({ error: 'Failed to retrieve purchase order details' });
  }
});

export default router;