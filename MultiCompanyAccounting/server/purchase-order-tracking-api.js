/**
 * Purchase Order Tracking API
 * 
 * This module provides API endpoints to retrieve detailed purchase order tracking
 * information with connected bills and payments.
 */

import express from 'express';
import dbConfig from './db-config.js';
const router = express.Router();

/**
 * Get purchase orders with connected bills and payments for a company
 */
router.get('/purchase-order-tracking', async (req, res) => {
  try {
    const { companyId, startDate, endDate, vendorId, status } = req.query;
    
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
    
    // Build the base query for purchase orders with filters
    let purchaseOrdersQuery = `
      SELECT po.id, po.order_number AS "orderNumber", po.order_date AS "orderDate", 
             po.status, po.order_total AS amount, po.vendor_id AS "vendorId",
             c.name AS "vendorName"
      FROM purchase_orders po
      JOIN companies c ON po.vendor_id = c.id
      WHERE po.company_id = $1
    `;
    
    const queryParams = [companyId];
    let paramIndex = 2;
    
    // Add optional filters
    if (startDate) {
      purchaseOrdersQuery += ` AND po.order_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      purchaseOrdersQuery += ` AND po.order_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }
    
    if (vendorId) {
      purchaseOrdersQuery += ` AND po.vendor_id = $${paramIndex}`;
      queryParams.push(vendorId);
      paramIndex++;
    }
    
    if (status) {
      purchaseOrdersQuery += ` AND po.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    purchaseOrdersQuery += ' ORDER BY po.order_date DESC';
    
    const purchaseOrdersResult = await pool.query(purchaseOrdersQuery, queryParams);
    const purchaseOrders = purchaseOrdersResult.rows;
    
    // Get totals
    const totalPurchaseOrders = purchaseOrders.length;
    let totalBilled = 0;
    let totalPaid = 0;
    
    // For each purchase order, get the related bills
    for (const order of purchaseOrders) {
      // Get bills for this purchase order
      const billsQuery = `
        SELECT b.id, b.bill_number AS "billNumber", b.bill_date AS "billDate", 
               b.total_amount AS amount, b.status
        FROM bills b
        WHERE b.purchase_order_id = $1
        ORDER BY b.bill_date DESC
      `;
      
      const billsResult = await pool.query(billsQuery, [order.id]);
      order.bills = billsResult.rows;
      
      // For each bill, get the related payments
      for (const bill of order.bills) {
        const paymentsQuery = `
          SELECT p.id, p.payment_number AS "paymentNumber", p.payment_date AS "paymentDate",
                 p.amount, p.payment_method AS "paymentMethod", p.reference_number AS "referenceNumber",
                 ba.name AS "bankAccount"
          FROM payments p
          LEFT JOIN bank_accounts ba ON p.bank_account_id = ba.id
          WHERE p.bill_id = $1
          ORDER BY p.payment_date DESC
        `;
        
        const paymentsResult = await pool.query(paymentsQuery, [bill.id]);
        bill.payments = paymentsResult.rows;
        
        // Calculate totals
        totalBilled += parseFloat(bill.amount || 0);
        
        // Sum up payments for this bill
        bill.payments.forEach(payment => {
          totalPaid += parseFloat(payment.amount || 0);
        });
      }
      
      // Get order items
      const orderItemsQuery = `
        SELECT poi.id, poi.product_id AS "productId", p.name AS "productName",
               poi.quantity, poi.price, poi.total AS total
        FROM purchase_order_items poi
        JOIN products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = $1
      `;
      
      const orderItemsResult = await pool.query(orderItemsQuery, [order.id]);
      order.items = orderItemsResult.rows;
    }
    
    const outstandingAmount = totalBilled - totalPaid;
    
    // Compile the final response
    const response = {
      companyId: parseInt(companyId),
      companyName: company.name,
      totalPurchaseOrders,
      totalBilled,
      totalPaid,
      outstandingAmount,
      purchaseOrders
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching purchase order tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get purchase order items with product details
 */
router.get('/purchase-order-items', async (req, res) => {
  try {
    const { purchaseOrderId } = req.query;
    
    if (!purchaseOrderId) {
      return res.status(400).send({ error: 'Purchase Order ID is required' });
    }
    
    const pool = dbConfig.pool;
    
    // Get purchase order items with product details
    const itemsQuery = `
      SELECT poi.id, poi.purchase_order_id AS "purchaseOrderId", poi.product_id AS "productId",
             p.name AS "productName", p.code AS "productCode",
             poi.quantity, poi.price, poi.total,
             COALESCE(poi.received_quantity, 0) AS "receivedQuantity",
             (poi.quantity - COALESCE(poi.received_quantity, 0)) AS "pendingQuantity"
      FROM purchase_order_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = $1
    `;
    
    const itemsResult = await pool.query(itemsQuery, [purchaseOrderId]);
    
    if (itemsResult.rows.length === 0) {
      return res.status(404).send({ error: 'Purchase order not found or has no items' });
    }
    
    res.status(200).json(itemsResult.rows);
  } catch (error) {
    console.error('Error fetching purchase order items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get bill payment summary by vendor
 */
router.get('/purchase-order-bill-summary', async (req, res) => {
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
    
    // Build query for bill summary
    let summaryQuery = `
      WITH bill_totals AS (
        SELECT 
          b.vendor_id,
          SUM(b.total_amount) AS total_billed,
          COUNT(DISTINCT b.id) AS bill_count
        FROM bills b
        WHERE b.company_id = $1
    `;
    
    const queryParams = [companyId];
    let paramIndex = 2;
    
    // Add date filters
    if (startDate) {
      summaryQuery += ` AND b.bill_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      summaryQuery += ` AND b.bill_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }
    
    summaryQuery += `
        GROUP BY b.vendor_id
      ),
      payment_totals AS (
        SELECT 
          b.vendor_id,
          SUM(p.amount) AS total_paid,
          COUNT(DISTINCT p.id) AS payment_count
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        WHERE b.company_id = $1
    `;
    
    // Add date filters again for payments
    if (startDate) {
      summaryQuery += ` AND p.payment_date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      summaryQuery += ` AND p.payment_date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }
    
    summaryQuery += `
        GROUP BY b.vendor_id
      )
      SELECT 
        c.id AS "vendorId",
        c.name AS "vendorName",
        COALESCE(bt.total_billed, 0) AS "totalBilled",
        COALESCE(pt.total_paid, 0) AS "totalPaid",
        COALESCE(bt.total_billed, 0) - COALESCE(pt.total_paid, 0) AS "totalOutstanding",
        COALESCE(bt.bill_count, 0) AS "billCount",
        COALESCE(pt.payment_count, 0) AS "paymentCount"
      FROM companies c
      LEFT JOIN bill_totals bt ON c.id = bt.vendor_id
      LEFT JOIN payment_totals pt ON c.id = pt.vendor_id
      WHERE (bt.vendor_id IS NOT NULL OR pt.vendor_id IS NOT NULL)
      ORDER BY c.name
    `;
    
    const summaryResult = await pool.query(summaryQuery, queryParams);
    
    // Calculate overall totals
    let totalBilled = 0;
    let totalPaid = 0;
    
    summaryResult.rows.forEach(summary => {
      totalBilled += parseFloat(summary.totalBilled || 0);
      totalPaid += parseFloat(summary.totalPaid || 0);
    });
    
    const response = {
      companyId: parseInt(companyId),
      companyName: company.name,
      totalBilled,
      totalPaid,
      totalOutstanding: totalBilled - totalPaid,
      vendorSummaries: summaryResult.rows
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching bill payment summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the router as the default export for ES modules
export default router;