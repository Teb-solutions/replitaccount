/**
 * Intercompany Order Status API
 * 
 * This module provides an API endpoint for retrieving the status of intercompany orders
 * including related invoices and receipts.
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
    console.log('Successfully connected to external database for intercompany order status API');
  })
  .catch(err => {
    console.error('Failed to connect to external database for intercompany order status API:', err);
  });

/**
 * Get the status of an intercompany order including related invoices and receipts
 */
router.get(['/api/intercompany-order-status/:orderId', '/api/intercompany-order-status/:orderId/:transactionType'], async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID'
      });
    }
    
    // Get transaction details
    const transactionQuery = `
      SELECT 
        t.*, 
        source.name as source_company_name,
        target.name as target_company_name,
        so.order_number as sales_order_number,
        po.order_number as purchase_order_number,
        so.total as sales_order_total,
        po.total as purchase_order_total
      FROM intercompany_transactions t
      LEFT JOIN companies source ON t.source_company_id = source.id
      LEFT JOIN companies target ON t.target_company_id = target.id
      LEFT JOIN sales_orders so ON t.source_order_id = so.id
      LEFT JOIN purchase_orders po ON t.target_order_id = po.id
      WHERE t.id = $1
    `;
    
    const transactionResult = await pool.query(transactionQuery, [orderId]);
    
    if (transactionResult.rows.length === 0) {
      // If transaction not found by ID, try looking up by order ID
      const orderTransactionQuery = `
        SELECT 
          t.*, 
          source.name as source_company_name,
          target.name as target_company_name,
          so.order_number as sales_order_number,
          po.order_number as purchase_order_number,
          so.total as sales_order_total,
          po.total as purchase_order_total
        FROM intercompany_transactions t
        LEFT JOIN companies source ON t.source_company_id = source.id
        LEFT JOIN companies target ON t.target_company_id = target.id
        LEFT JOIN sales_orders so ON t.source_order_id = so.id
        LEFT JOIN purchase_orders po ON t.target_order_id = po.id
        WHERE t.source_order_id = $1 OR t.target_order_id = $1
      `;
      
      const orderTransactionResult = await pool.query(orderTransactionQuery, [orderId]);
      
      if (orderTransactionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }
      
      const transaction = orderTransactionResult.rows[0];
      return processAndReturnOrderStatus(transaction, res);
    }
    
    const transaction = transactionResult.rows[0];
    return processAndReturnOrderStatus(transaction, res);
    
  } catch (error) {
    console.error('Error retrieving intercompany order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order status'
    });
  }
});

async function processAndReturnOrderStatus(transaction, res) {
  try {
    // Get invoices - note: the column names might differ in this DB schema
    const invoicesQuery = `
      SELECT i.*
      FROM invoices i
      WHERE i.id = $1 OR (i.company_id = $2 AND i.sales_order_id = $3)
    `;
    
    const invoicesResult = await pool.query(invoicesQuery, [
      transaction.source_invoice_id,
      transaction.source_company_id,
      transaction.source_order_id
    ]);
    
    // Get bills
    const billsQuery = `
      SELECT b.*
      FROM bills b
      WHERE b.id = $1 OR b.company_id = $2 AND b.purchase_order_id = $3
    `;
    
    const billsResult = await pool.query(billsQuery, [
      transaction.target_bill_id,
      transaction.target_company_id,
      transaction.target_order_id
    ]);
    
    // Get receipts related to invoices
    let receiptsResult = { rows: [] };
    
    if (invoicesResult.rows.length > 0) {
      const invoiceIds = invoicesResult.rows.map(invoice => invoice.id);
      if (invoiceIds.length > 0) {
        const receiptsQuery = `
          SELECT r.*
          FROM receipts r
          WHERE r.invoice_id IN (${invoiceIds.map((_, i) => `$${i+1}`).join(',')})
        `;
        
        receiptsResult = await pool.query(receiptsQuery, invoiceIds);
      }
    }
    
    // Create empty payments result since there is no payments table
    const paymentsResult = { rows: [] };
    
    // If we need to check for payments in the future, we would use:
    // Check for any target_payment_id in the transaction record
    if (transaction.target_payment_id) {
      paymentsResult.rows.push({
        id: transaction.target_payment_id,
        date: transaction.updated_at,
        amount: transaction.amount,
        bill_id: transaction.target_bill_id,
        reference: `Payment-${transaction.target_payment_id}`,
        payment_method: 'Bank Transfer'
      });
    }
    
    // Calculate summary
    let totalInvoiced = 0;
    if (invoicesResult.rows.length > 0) {
      totalInvoiced = invoicesResult.rows.reduce((sum, invoice) => sum + parseFloat(invoice.total || 0), 0);
    }
    
    let totalReceived = 0;
    if (receiptsResult.rows && receiptsResult.rows.length > 0) {
      totalReceived = receiptsResult.rows.reduce((sum, receipt) => sum + parseFloat(receipt.amount || 0), 0);
    }
    
    const orderTotal = parseFloat(transaction.amount || 0);
    
    const summary = {
      orderTotal,
      totalInvoiced,
      totalReceived,
      balanceDue: totalInvoiced - totalReceived,
      invoiceCount: invoicesResult.rows.length,
      receiptCount: receiptsResult.rows ? receiptsResult.rows.length : 0,
      isFullyInvoiced: Math.abs(totalInvoiced - orderTotal) < 0.01,
      isFullyPaid: Math.abs(totalReceived - totalInvoiced) < 0.01 && totalInvoiced > 0
    };
    
    // Prepare response
    return res.status(200).json({
      success: true,
      order: transaction,
      invoices: invoicesResult.rows,
      bills: billsResult.rows,
      receipts: receiptsResult.rows || [],
      payments: paymentsResult.rows,
      summary
    });
  } catch (error) {
    console.error('Error processing order status data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process order status data'
    });
  }
}

export default router;