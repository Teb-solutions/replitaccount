import express from 'express';
import db from './db-config.js';
import { logger } from './simple-logger';

const pool = db.pool;
const externalPool = db.externalPool;

const router = express.Router();

/**
 * @swagger
 * /api/sales-orders:
 *   get:
 *     summary: Get all sales orders for a company
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The company ID
 *     responses:
 *       200:
 *         description: A list of sales orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   orderNumber:
 *                     type: string
 *                   date:
 *                     type: string
 *                   customerId:
 *                     type: integer
 *                   customerName:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   status:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/api/sales-orders', async (req, res) => {
  const companyId = req.query.companyId;
  
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    logger.info(`Fetching sales orders for company ID: ${companyId}`);
    console.log(`Checking sales orders for company: ${await getCompanyName(companyId)} (ID: ${companyId})`);
    
    // For Gas Manufacturing Company (ID: 7), check actual orders
    if (companyId == 7) {
      console.log(`Fetching actual sales orders for company ${companyId} (gas manufacturing company)`);
      const result = await externalPool.query(`
        SELECT so.id, so.order_number AS "orderNumber", 
               so.order_date AS "date", 
               so.customer_id AS "customerId",
               c.name AS "customerName",
               so.total_amount AS "amount",
               so.status
        FROM sales_orders so
        JOIN companies c ON so.customer_id = c.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
      `, [companyId]);
      
      if (result.rows.length > 0) {
        console.log(`Found ${result.rows.length} sales orders in database for company ${companyId}`);
        return res.json(result.rows);
      } else {
        console.log(`No sales orders found in database for company ${companyId}, returning empty list`);
        return res.json([]);
      }
    } else {
      // Check actual sales orders for any company
      console.log(`Fetching actual sales orders for company ${companyId} (${await getCompanyName(companyId)})`);
      const result = await externalPool.query(`
        SELECT so.id, so.order_number AS "orderNumber", 
               so.order_date AS "date", 
               so.customer_id AS "customerId",
               c.name AS "customerName",
               so.total_amount AS "amount",
               so.status
        FROM sales_orders so
        JOIN companies c ON so.customer_id = c.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
      `, [companyId]);
      
      if (result.rows.length > 0) {
        console.log(`Found ${result.rows.length} sales orders in database for company ${companyId}`);
        return res.json(result.rows);
      } else {
        console.log(`No sales orders found in database for company ${companyId}, returning empty list`);
        return res.json([]);
      }
    }
  } catch (error) {
    logger.error(`Error fetching sales orders: ${error.message}`, { error, companyId });
    return res.status(500).json({ error: 'Failed to retrieve sales orders' });
  }
});

/**
 * @swagger
 * /api/sales-orders/{id}:
 *   get:
 *     summary: Get a sales order by ID
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The sales order ID
 *     responses:
 *       200:
 *         description: The sales order
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/api/sales-orders/:id', async (req, res) => {
  const orderId = req.params.id;
  
  try {
    logger.info(`Fetching sales order details for order ID: ${orderId}`);
    
    const result = await pool.query(`
      SELECT so.id, so.order_number AS "orderNumber", 
             so.order_date AS "date", 
             so.company_id AS "companyId",
             comp.name AS "companyName",
             so.customer_id AS "customerId",
             cust.name AS "customerName",
             so.total AS "amount",
             so.status
      FROM sales_orders so
      JOIN companies comp ON so.company_id = comp.id
      JOIN companies cust ON so.customer_id = cust.id
      WHERE so.id = $1
    `, [orderId]);
    
    if (result.rows.length === 0) {
      logger.warn(`Sales order not found: ${orderId}`);
      return res.status(404).json({ error: 'Sales order not found' });
    }
    
    // Get order items
    const itemsResult = await pool.query(`
      SELECT id, product_id AS "productId", 
             quantity, price, 
             (quantity * price) AS "lineTotal"
      FROM sales_order_items
      WHERE sales_order_id = $1
    `, [orderId]);
    
    const orderDetails = {
      ...result.rows[0],
      items: itemsResult.rows || []
    };
    
    logger.info(`Successfully retrieved sales order: ${orderId}`);
    return res.json(orderDetails);
  } catch (error) {
    logger.error(`Error retrieving sales order details: ${error.message}`, { error });
    return res.status(500).json({ error: 'Failed to retrieve sales order details' });
  }
});

/**
 * @swagger
 * /api/sales-orders/summary:
 *   get:
 *     summary: Get summary statistics for sales orders
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The company ID
 *     responses:
 *       200:
 *         description: Sales order summary statistics
 *       500:
 *         description: Server error
 */
router.get('/api/sales-orders/summary', async (req, res) => {
  const companyId = req.query.companyId;
  
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }
  
  try {
    // Count total sales orders
    const totalResult = await pool.query(`
      SELECT COUNT(*) AS total
      FROM sales_orders
      WHERE company_id = $1
    `, [companyId]);
    
    // Count open sales orders
    const openResult = await pool.query(`
      SELECT COUNT(*) AS open
      FROM sales_orders
      WHERE company_id = $1 AND status = 'Open'
    `, [companyId]);
    
    // Count completed sales orders
    const completedResult = await pool.query(`
      SELECT COUNT(*) AS completed
      FROM sales_orders
      WHERE company_id = $1 AND status = 'Completed'
    `, [companyId]);
    
    // Get recent sales orders
    const recentResult = await pool.query(`
      SELECT id, order_number AS "orderNumber", 
             order_date AS "date",
             total AS "amount",
             status
      FROM sales_orders
      WHERE company_id = $1
      ORDER BY order_date DESC
      LIMIT 5
    `, [companyId]);
    
    const summary = {
      total: totalResult.rows[0].total,
      open: openResult.rows[0].open,
      completed: completedResult.rows[0].completed,
      recent: recentResult.rows
    };
    
    logger.info(`Successfully retrieved sales order summary for company: ${companyId}`);
    return res.json(summary);
  } catch (error) {
    logger.error(`Error retrieving sales order details: ${error.message}`, { error });
    return res.status(500).json({ error: 'Failed to retrieve sales order details' });
  }
});

async function getCompanyName(companyId: string | number) {
  try {
    const result = await externalPool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
    return result.rows[0]?.name || `Company ${companyId}`;
  } catch (error) {
    logger.error(`Error fetching company name: ${error.message}`, { error, companyId });
    return `Company ${companyId}`;
  }
}

export default router;