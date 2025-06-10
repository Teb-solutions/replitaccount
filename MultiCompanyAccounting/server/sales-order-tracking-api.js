/**
 * Sales Order Tracking API
 * 
 * This module provides API endpoints to retrieve detailed sales order tracking
 * information with connected invoices and receipts.
 */

import express from 'express';
import dbConfig from './db-config.js';
const router = express.Router();

/**
 * Get sales orders with connected invoices and receipts for a company
 */
router.get('/api/sales-order-tracking', async (req, res) => {
  try {
    const { companyId, startDate, endDate, customerId, status } = req.query;
    
    if (!companyId) {
      return res.status(400).send({ error: 'Company ID is required' });
    }
    
    const pool = dbConfig.pool;
    
    // Get the company information
    const companyQuery = 'SELECT id, name, code FROM companies WHERE id = $1';
    const companyResult = await pool.query(companyQuery, [companyId]);
    
    if (companyResult.rows.length === 0) {
      return res.status(404).send({ error: 'Company not found' });
    }
    
    const company = companyResult.rows[0];
    
    // Build the base query for sales orders with filters
    let salesOrdersQuery = `
      SELECT so.id, so.order_number AS "orderNumber", so.order_date AS "orderDate", 
             so.status, so.total AS amount, so.customer_id AS "customerId",
             c.name AS "customerName"
      FROM sales_orders so
      JOIN companies c ON so.customer_id = c.id
      WHERE so.company_id = $1
    `;
    
    const queryParams = [companyId];
    let paramIndex = 2;
    
    // Add optional filters
    if (startDate) {
      salesOrdersQuery += ` AND so.order_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      salesOrdersQuery += ` AND so.order_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }
    
    if (customerId) {
      salesOrdersQuery += ` AND so.customer_id = $${paramIndex}`;
      queryParams.push(customerId);
      paramIndex++;
    }
    
    if (status) {
      salesOrdersQuery += ` AND so.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    salesOrdersQuery += ' ORDER BY so.order_date DESC';
    
    const salesOrdersResult = await pool.query(salesOrdersQuery, queryParams);
    const salesOrders = salesOrdersResult.rows;
    
    // Get totals
    const totalSalesOrders = salesOrders.length;
    let totalInvoiced = 0;
    let totalReceived = 0;
    
    // For each sales order, get the related invoices
    for (const order of salesOrders) {
      // Get invoices for this sales order
      const invoicesQuery = `
        SELECT i.id, i.invoice_number AS "invoiceNumber", i.invoice_date AS "invoiceDate", 
               i.total AS amount, i.status
        FROM invoices i
        WHERE i.sales_order_id = $1
        ORDER BY i.invoice_date DESC
      `;
      
      const invoicesResult = await pool.query(invoicesQuery, [order.id]);
      order.invoices = invoicesResult.rows;
      
      // For each invoice, get the related receipts
      for (const invoice of order.invoices) {
        const receiptsQuery = `
          SELECT r.id, r.receipt_number AS "receiptNumber", r.receipt_date AS "receiptDate",
                 r.amount, r.payment_method AS "paymentMethod", r.reference_number AS "referenceNumber",
                 ba.name AS "bankAccount"
          FROM receipts r
          LEFT JOIN bank_accounts ba ON r.bank_account_id = ba.id
          WHERE r.invoice_id = $1
          ORDER BY r.receipt_date DESC
        `;
        
        const receiptsResult = await pool.query(receiptsQuery, [invoice.id]);
        invoice.receipts = receiptsResult.rows;
        
        // Calculate totals
        totalInvoiced += parseFloat(invoice.amount || 0);
        
        // Sum up receipts for this invoice
        invoice.receipts.forEach(receipt => {
          totalReceived += parseFloat(receipt.amount || 0);
        });
      }
      
      // Get order items
      const orderItemsQuery = `
        SELECT soi.id, soi.product_id AS "productId", p.name AS "productName",
               soi.quantity, soi.price, soi.total AS total
        FROM sales_order_items soi
        JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = $1
      `;
      
      const orderItemsResult = await pool.query(orderItemsQuery, [order.id]);
      order.items = orderItemsResult.rows;
    }
    
    const outstandingAmount = totalInvoiced - totalReceived;
    
    // Compile the final response
    const response = {
      companyId: parseInt(companyId),
      companyName: company.name,
      totalSalesOrders,
      totalInvoiced,
      totalReceived,
      outstandingAmount,
      salesOrders
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching sales order tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get sales order items with product details
 */
router.get('/api/sales-order-items', async (req, res) => {
  try {
    const { salesOrderId } = req.query;
    
    if (!salesOrderId) {
      return res.status(400).send({ error: 'Sales Order ID is required' });
    }
    
    const pool = dbConfig.pool;
    
    // Get sales order items with product details
    const itemsQuery = `
      SELECT soi.id, soi.sales_order_id AS "salesOrderId", soi.product_id AS "productId",
             p.name AS "productName", p.code AS "productCode",
             soi.quantity, soi.price, soi.total,
             COALESCE(soi.delivered_quantity, 0) AS "deliveredQuantity",
             (soi.quantity - COALESCE(soi.delivered_quantity, 0)) AS "pendingQuantity"
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      WHERE soi.sales_order_id = $1
    `;
    
    const itemsResult = await pool.query(itemsQuery, [salesOrderId]);
    
    if (itemsResult.rows.length === 0) {
      return res.status(404).send({ error: 'Sales order not found or has no items' });
    }
    
    res.status(200).json(itemsResult.rows);
  } catch (error) {
    console.error('Error fetching sales order items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get invoice receipt summary by customer
 */
router.get('/api/sales-order-invoice-summary', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;
    
    if (!companyId) {
      return res.status(400).send({ error: 'Company ID is required' });
    }
    
    const pool = dbConfig.pool;
    
    // Get the company information
    const companyQuery = 'SELECT id, name FROM companies WHERE id = $1';
    const companyResult = await pool.query(companyQuery, [companyId]);
    
    if (companyResult.rows.length === 0) {
      return res.status(404).send({ error: 'Company not found' });
    }
    
    const company = companyResult.rows[0];
    
    // Build query for invoice summary
    let summaryQuery = `
      WITH invoice_totals AS (
        SELECT 
          i.customer_id,
          SUM(i.total) AS total_invoiced,
          COUNT(DISTINCT i.id) AS invoice_count
        FROM invoices i
        WHERE i.company_id = $1
    `;
    
    const queryParams = [companyId];
    let paramIndex = 2;
    
    // Add date filters
    if (startDate) {
      summaryQuery += ` AND i.invoice_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      summaryQuery += ` AND i.invoice_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }
    
    summaryQuery += `
        GROUP BY i.customer_id
      ),
      receipt_totals AS (
        SELECT 
          i.customer_id,
          SUM(r.amount) AS total_received,
          COUNT(DISTINCT r.id) AS receipt_count
        FROM receipts r
        JOIN invoices i ON r.invoice_id = i.id
        WHERE i.company_id = $1
    `;
    
    // Add date filters again for receipts
    if (startDate) {
      summaryQuery += ` AND r.receipt_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      summaryQuery += ` AND r.receipt_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }
    
    summaryQuery += `
        GROUP BY i.customer_id
      )
      SELECT 
        c.id AS "customerId",
        c.name AS "customerName",
        COALESCE(it.total_invoiced, 0) AS "totalInvoiced",
        COALESCE(rt.total_received, 0) AS "totalReceived",
        COALESCE(it.total_invoiced, 0) - COALESCE(rt.total_received, 0) AS "totalOutstanding",
        COALESCE(it.invoice_count, 0) AS "invoiceCount",
        COALESCE(rt.receipt_count, 0) AS "receiptCount"
      FROM companies c
      LEFT JOIN invoice_totals it ON c.id = it.customer_id
      LEFT JOIN receipt_totals rt ON c.id = rt.customer_id
      WHERE (it.customer_id IS NOT NULL OR rt.customer_id IS NOT NULL)
      ORDER BY c.name
    `;
    
    const summaryResult = await pool.query(summaryQuery, queryParams);
    
    // Calculate overall totals
    let totalInvoiced = 0;
    let totalReceived = 0;
    
    summaryResult.rows.forEach(summary => {
      totalInvoiced += parseFloat(summary.totalInvoiced || 0);
      totalReceived += parseFloat(summary.totalReceived || 0);
    });
    
    const response = {
      companyId: parseInt(companyId),
      companyName: company.name,
      totalInvoiced,
      totalReceived,
      totalOutstanding: totalInvoiced - totalReceived,
      customerSummaries: summaryResult.rows
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching invoice receipt summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the router as the default export for ES modules
export default router;