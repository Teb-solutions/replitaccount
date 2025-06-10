/**
 * Order Transaction Processor - CommonJS Version
 * 
 * This module provides endpoints for creating intercompany transactions
 * based on existing sales orders.
 */

const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Configure PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create a transaction from an existing order
router.post('/api/order-transaction-processor/create-from-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { targetCompanyId, description } = req.body;
    
    console.log(`Creating transaction from order ${orderId} to company ${targetCompanyId}`);
    
    if (!orderId || !targetCompanyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: orderId and targetCompanyId are required' 
      });
    }
    
    // Get order details with order items to calculate accurate amounts
    const orderResult = await pool.query(
      `SELECT so.*, c.name as customer_name, 
         COALESCE(so.total_amount, 
           (SELECT SUM(quantity * unit_price) FROM sales_order_items WHERE sales_order_id = so.id)
         ) as order_amount
       FROM sales_orders so
       LEFT JOIN companies c ON so.customer_id = c.id
       WHERE so.id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Sales order with ID ${orderId} not found`
      });
    }
    
    const order = orderResult.rows[0];
    const sourceCompanyId = order.company_id;
    // Get order items to calculate total amount if not already present on the order
    const orderItemsResult = await pool.query(
      `SELECT * FROM sales_order_items WHERE sales_order_id = $1`,
      [orderId]
    );
    
    let orderAmount = parseFloat(order.order_amount || 0);
    
    // Calculate from order items if the total amount is still zero
    if (orderAmount <= 0 && orderItemsResult.rows.length > 0) {
      orderAmount = orderItemsResult.rows.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        return sum + (quantity * unitPrice);
      }, 0);
    }
    
    // Still use a minimum value if we can't calculate a proper amount
    const transactionAmount = orderAmount > 0 ? orderAmount : 5000;
    
    console.log(`Calculated transaction amount: ${transactionAmount} from order ${orderId}`);
    
    console.log(`Creating transaction with amount: ${transactionAmount}`);
    
    // Create a transaction record
    const now = new Date().toISOString().split('T')[0];
    const transactionResult = await pool.query(
      `INSERT INTO intercompany_transactions (
        date, type, source_company_id, target_company_id, 
        amount, status, reference, description, source_order_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        now,
        'Sale',
        sourceCompanyId,
        targetCompanyId,
        transactionAmount,
        'Processing',
        `Order #${order.id}`,
        description || `Intercompany transaction from order ${order.order_number || orderId}`,
        orderId
      ]
    );
    
    const transaction = transactionResult.rows[0];
    
    // Get company names for the response
    const sourceCompanyResult = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [sourceCompanyId]
    );
    
    const targetCompanyResult = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [targetCompanyId]
    );
    
    const sourceCompanyName = sourceCompanyResult.rows[0]?.name || 'Unknown Company';
    const targetCompanyName = targetCompanyResult.rows[0]?.name || 'Unknown Company';
    
    // Create enhanced transaction response with company names
    const enhancedTransaction = {
      ...transaction,
      sourceCompanyName,
      targetCompanyName
    };
    
    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction: enhancedTransaction
    });
  } catch (error) {
    console.error('Error creating transaction from order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create intercompany transaction',
      error: error.message
    });
  }
});

// Get transaction by order ID
router.get('/api/order-transaction-processor/by-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Find transaction by order ID
    const transactionResult = await pool.query(
      `SELECT t.*, 
        source.name as source_company_name,
        target.name as target_company_name
       FROM intercompany_transactions t
       JOIN companies source ON t.source_company_id = source.id
       JOIN companies target ON t.target_company_id = target.id
       WHERE t.source_order_id = $1`,
      [orderId]
    );
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No transaction found for order ID ${orderId}`
      });
    }
    
    res.json({
      success: true,
      transaction: transactionResult.rows[0]
    });
  } catch (error) {
    console.error(`Error getting transaction by order ID:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: error.message
    });
  }
});

// Add transaction by source order ID endpoint
router.get('/api/intercompany-transactions/by-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { companyId } = req.query;
    
    console.log(`Looking up intercompany transaction for order ID: ${orderId} and company ID: ${companyId}`);
    
    // First check if the order exists
    const orderResult = await pool.query(
      `SELECT so.*, c.name as customer_name 
       FROM sales_orders so
       LEFT JOIN companies c ON so.customer_id = c.id
       WHERE so.id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Sales order with ID ${orderId} not found`
      });
    }
    
    let query = `
      SELECT t.*, 
        source.name AS source_company_name,
        target.name AS target_company_name,
        so.order_number AS source_order_number,
        i.id AS invoice_id, i.invoice_number, i.date AS invoice_date, i.amount AS invoice_amount, i.status AS invoice_status,
        b.id AS bill_id, b.bill_number, b.date AS bill_date, b.amount AS bill_amount, b.status AS bill_status
      FROM intercompany_transactions t
      LEFT JOIN companies source ON t.source_company_id = source.id
      LEFT JOIN companies target ON t.target_company_id = target.id
      LEFT JOIN sales_orders so ON t.source_order_id = so.id
      LEFT JOIN invoices i ON t.source_invoice_id = i.id
      LEFT JOIN bills b ON t.target_bill_id = b.id
      WHERE t.source_order_id = $1
    `;
    
    const params = [orderId];
    
    if (companyId) {
      query += ` AND (t.source_company_id = $2 OR t.target_company_id = $2)`;
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No intercompany transaction found for order ID ${orderId}`
      });
    }
    
    const transaction = result.rows[0];
    
    // Format the response with nested invoice and bill objects
    const formattedTransaction = {
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      sourceCompanyId: transaction.source_company_id,
      sourceCompanyName: transaction.source_company_name,
      targetCompanyId: transaction.target_company_id,
      targetCompanyName: transaction.target_company_name,
      sourceOrderId: transaction.source_order_id,
      sourceOrderNumber: transaction.source_order_number,
      amount: parseFloat(transaction.amount || 0),
      status: transaction.status,
      reference: transaction.reference,
      description: transaction.description,
      invoice: transaction.invoice_id ? {
        id: transaction.invoice_id,
        invoiceNumber: transaction.invoice_number,
        date: transaction.invoice_date,
        amount: parseFloat(transaction.invoice_amount || 0),
        status: transaction.invoice_status
      } : null,
      bill: transaction.bill_id ? {
        id: transaction.bill_id,
        billNumber: transaction.bill_number,
        date: transaction.bill_date,
        amount: parseFloat(transaction.bill_amount || 0),
        status: transaction.bill_status
      } : null
    };
    
    res.json(formattedTransaction);
  } catch (error) {
    console.error('Error fetching intercompany transaction by order ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch intercompany transaction',
      error: error.message
    });
  }
});

module.exports = router;