/**
 * Intercompany Sales Purchase API
 * 
 * This API provides endpoints for creating matched intercompany sales and purchase orders
 * between two companies, particularly for the gas manufacturing and distribution operations.
 */

import express from 'express';
import pg from 'pg';

const router = express.Router();

// Create a PostgreSQL connection pool for the external database
const pool = new pg.Pool({
  host: process.env.PGHOST || '135.235.154.222',
  user: process.env.PGUSER || 'pguser',
  password: process.env.PGPASSWORD || 'StrongP@ss123',
  database: process.env.PGDATABASE || 'account_replit_staging',
  port: Number(process.env.PGPORT) || 5432,
  ssl: false
});

// Test the database connection on startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Successfully connected to external database for intercompany sales-purchase API');
  })
  .catch(err => {
    console.error('Failed to connect to external database for intercompany sales-purchase API:', err);
  });

/**
 * Create matching sales and purchase orders between two companies
 * POST /api/intercompany/sales-purchase
 */
router.post('/api/intercompany/sales-purchase', async (req, res) => {
  try {
    const { 
      sourceCompanyId, 
      targetCompanyId, 
      date,
      expectedDate,
      description,
      items
    } = req.body;
    
    console.log('Creating intercompany sales/purchase order:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields
    if (!sourceCompanyId || !targetCompanyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: sourceCompanyId and targetCompanyId are required' 
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid items: at least one item is required' 
      });
    }
    
    // Check if source and target companies exist
    const companiesResult = await pool.query(
      'SELECT id, name, code FROM companies WHERE id = $1 OR id = $2',
      [sourceCompanyId, targetCompanyId]
    );
    
    if (companiesResult.rows.length < 2) {
      return res.status(404).json({
        success: false,
        error: 'One or both companies not found'
      });
    }
    
    // Create transaction to ensure both orders are created or none
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get maximum IDs from sales_orders and purchase_orders tables to generate new IDs
      const maxSalesOrderIdResult = await client.query(
        'SELECT COALESCE(MAX(id), 0) as max_id FROM sales_orders'
      );
      const maxPurchaseOrderIdResult = await client.query(
        'SELECT COALESCE(MAX(id), 0) as max_id FROM purchase_orders'
      );
      
      // Generate new IDs for sales and purchase orders
      const salesOrderId = parseInt(maxSalesOrderIdResult.rows[0].max_id) + 1;
      const purchaseOrderId = parseInt(maxPurchaseOrderIdResult.rows[0].max_id) + 1;
      
      // Generate order numbers
      const salesOrderNumber = `SO-${Date.now().toString().slice(-8)}-${sourceCompanyId}`;
      const purchaseOrderNumber = `PO-${Date.now().toString().slice(-8)}-${targetCompanyId}`;
      
      // Calculate total from items
      const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      // Insert sales order
      const insertSalesOrderQuery = `
        INSERT INTO sales_orders (
          id, order_number, company_id, customer_id, 
          order_date, expected_date, status, total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const salesOrderResult = await client.query(insertSalesOrderQuery, [
        salesOrderId,
        salesOrderNumber,
        sourceCompanyId,
        targetCompanyId, // In this context, target company is the customer
        date || new Date().toISOString().split('T')[0],
        expectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        'open',
        total,
        description || 'Intercompany Sales Order'
      ]);
      
      // Insert purchase order
      const insertPurchaseOrderQuery = `
        INSERT INTO purchase_orders (
          id, order_number, company_id, vendor_id, 
          order_date, expected_date, status, total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const purchaseOrderResult = await client.query(insertPurchaseOrderQuery, [
        purchaseOrderId,
        purchaseOrderNumber,
        targetCompanyId,
        sourceCompanyId, // In this context, source company is the vendor
        date || new Date().toISOString().split('T')[0],
        expectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        'open',
        total,
        description || 'Intercompany Purchase Order'
      ]);
      
      // Insert order items
      for (const item of items) {
        // Calculate amount from quantity and unit price
        const amount = item.quantity * item.unitPrice;
        
        // Insert sales order item
        const insertSalesOrderItemQuery = `
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, unit_price, description, amount
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        
        const salesOrderItemResult = await client.query(insertSalesOrderItemQuery, [
          salesOrderId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.description || '',
          amount
        ]);
        
        // Insert purchase order item
        const insertPurchaseOrderItemQuery = `
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id, quantity, unit_price, description, amount
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        
        await client.query(insertPurchaseOrderItemQuery, [
          purchaseOrderId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.description || '',
          amount
        ]);
      }
      
      // Get the next intercompany transaction ID
      const maxTransactionIdResult = await client.query(
        'SELECT COALESCE(MAX(id), 0) as max_id FROM intercompany_transactions'
      );
      const transactionId = parseInt(maxTransactionIdResult.rows[0].max_id) + 1;
      
      // Insert intercompany transaction record to link the orders
      const insertTransactionQuery = `
        INSERT INTO intercompany_transactions (
          id, source_company_id, target_company_id, source_order_id, target_order_id,
          amount, status, transaction_date, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      
      const transactionResult = await client.query(insertTransactionQuery, [
        transactionId,
        sourceCompanyId,
        targetCompanyId,
        salesOrderId,
        purchaseOrderId,
        total,
        'created',
        date || new Date().toISOString().split('T')[0],
        description || 'Intercompany Transaction'
      ]);
      
      await client.query('COMMIT');
      
      // Make sure we include all necessary fields in the response
      const sourceOrder = {
        id: salesOrderId,
        order_number: salesOrderNumber,
        ...salesOrderResult.rows[0]
      };
      
      const targetOrder = {
        id: purchaseOrderId,
        order_number: purchaseOrderNumber,
        ...purchaseOrderResult.rows[0]
      };
      
      res.status(201).json({
        success: true,
        sourceOrder: sourceOrder,
        targetOrder: targetOrder,
        transactionId: transactionResult.rows[0].id
      });
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('Database error during intercompany order creation:', dbError);
      res.status(500).json({
        success: false,
        error: 'Failed to create intercompany orders due to a database error'
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error in intercompany sales-purchase API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process intercompany sales-purchase request'
    });
  }
});

export default router;