/**
 * Transaction Reference Tracking API
 * 
 * Provides comprehensive endpoints for retrieving all transactions with reference numbers:
 * - Sales Orders with reference tracking
 * - Purchase Orders with reference tracking
 * - Invoices with reference tracking
 * - Bills with reference tracking
 * - Receipts with reference tracking
 * - Complete transaction overview by reference number
 */

import { pool as externalPool } from './database-checker.js';

/**
 * Register Transaction Reference Tracking API endpoints
 */
function registerTransactionReferenceTrackingAPI(app) {
  console.log('📋 Registering Transaction Reference Tracking API...');

  /**
   * @swagger
   * /api/transactions/all-with-references:
   *   get:
   *     summary: Get all transactions with reference numbers
   *     description: Retrieves all sales orders, purchase orders, invoices, bills, and receipts with their reference numbers for complete transaction tracking
   *     parameters:
   *       - in: query
   *         name: companyId
   *         schema:
   *           type: integer
   *         description: Filter by specific company ID (optional)
   *       - in: query
   *         name: referenceNumber
   *         schema:
   *           type: string
   *         description: Filter by specific reference number (optional)
   *     responses:
   *       200:
   *         description: All transactions with reference numbers
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 salesOrders:
   *                   type: array
   *                   items:
   *                     type: object
   *                 purchaseOrders:
   *                   type: array
   *                   items:
   *                     type: object
   *                 invoices:
   *                   type: array
   *                   items:
   *                     type: object
   *                 bills:
   *                   type: array
   *                   items:
   *                     type: object
   *                 receipts:
   *                   type: array
   *                   items:
   *                     type: object
   */
  app.get('/api/transactions/all-with-references', async (req, res) => {
    try {
      const { companyId, referenceNumber } = req.query;
      console.log(`🔍 Fetching all transactions with references - Company: ${companyId || 'ALL'}, Reference: ${referenceNumber || 'ALL'}`);

      // Base WHERE conditions
      let whereConditions = '';
      let queryParams = [];
      let paramIndex = 1;

      if (companyId) {
        whereConditions += ` WHERE company_id = $${paramIndex}`;
        queryParams.push(companyId);
        paramIndex++;
      }

      if (referenceNumber) {
        const refCondition = ` ${whereConditions ? 'AND' : 'WHERE'} (reference_number = $${paramIndex})`;
        whereConditions += refCondition;
        queryParams.push(referenceNumber);
        paramIndex++;
      }

      // Get Sales Orders with reference tracking
      const salesOrdersQuery = `
        SELECT 
          so.id,
          so.order_number,
          so.company_id,
          c.name as company_name,
          so.customer_id,
          cust.name as customer_name,
          so.total,
          so.order_date,
          so.expected_date,
          so.status,
          so.description as reference_info,
          'sales_order' as transaction_type
        FROM sales_orders so
        LEFT JOIN companies c ON so.company_id = c.id
        LEFT JOIN companies cust ON so.customer_id = cust.id
        ${whereConditions}
        ORDER BY so.order_date DESC
      `;

      // Get Purchase Orders with reference tracking
      const purchaseOrdersQuery = `
        SELECT 
          po.id,
          po.order_number,
          po.company_id,
          c.name as company_name,
          po.vendor_id,
          v.name as vendor_name,
          po.total,
          po.order_date,
          po.expected_date,
          po.status,
          po.description as reference_info,
          'purchase_order' as transaction_type
        FROM purchase_orders po
        LEFT JOIN companies c ON po.company_id = c.id
        LEFT JOIN companies v ON po.vendor_id = v.id
        ${whereConditions}
        ORDER BY po.order_date DESC
      `;

      // Get Invoices with reference tracking
      const invoicesQuery = `
        SELECT 
          i.id,
          i.invoice_number,
          i.company_id,
          c.name as company_name,
          i.customer_id,
          cust.name as customer_name,
          i.total_amount,
          i.invoice_date,
          i.due_date,
          i.status,
          i.reference_number,
          i.sales_order_id,
          so.order_number as related_sales_order,
          'invoice' as transaction_type
        FROM invoices i
        LEFT JOIN companies c ON i.company_id = c.id
        LEFT JOIN companies cust ON i.customer_id = cust.id
        LEFT JOIN sales_orders so ON i.sales_order_id = so.id
        ${whereConditions.replace('company_id', 'i.company_id').replace('description', 'i.reference_number').replace('order_number', 'i.invoice_number')}
        ORDER BY i.invoice_date DESC
      `;

      // Get Bills with reference tracking
      const billsQuery = `
        SELECT 
          b.id,
          b.bill_number,
          b.company_id,
          c.name as company_name,
          b.vendor_id,
          v.name as vendor_name,
          b.total_amount,
          b.bill_date,
          b.due_date,
          b.status,
          b.reference_number,
          b.purchase_order_id,
          po.order_number as related_purchase_order,
          'bill' as transaction_type
        FROM bills b
        LEFT JOIN companies c ON b.company_id = c.id
        LEFT JOIN companies v ON b.vendor_id = v.id
        LEFT JOIN purchase_orders po ON b.purchase_order_id = po.id
        ${whereConditions.replace('company_id', 'b.company_id').replace('description', 'b.reference_number').replace('order_number', 'b.bill_number')}
        ORDER BY b.bill_date DESC
      `;

      // Get Receipts with reference tracking
      const receiptsQuery = `
        SELECT 
          r.id,
          r.receipt_number,
          r.company_id,
          c.name as company_name,
          r.customer_id,
          cust.name as customer_name,
          r.amount,
          r.receipt_date,
          r.status,
          r.reference_number,
          r.sales_order_id,
          so.order_number as related_sales_order,
          'receipt' as transaction_type
        FROM receipts r
        LEFT JOIN companies c ON r.company_id = c.id
        LEFT JOIN companies cust ON r.customer_id = cust.id
        LEFT JOIN sales_orders so ON r.sales_order_id = so.id
        ${whereConditions.replace('company_id', 'r.company_id').replace('description', 'r.reference_number').replace('order_number', 'r.receipt_number')}
        ORDER BY r.receipt_date DESC
      `;

      // Execute all queries
      const [salesOrders, purchaseOrders, invoices, bills, receipts] = await Promise.all([
        externalPool.query(salesOrdersQuery, queryParams),
        externalPool.query(purchaseOrdersQuery, queryParams),
        externalPool.query(invoicesQuery, queryParams),
        externalPool.query(billsQuery, queryParams),
        externalPool.query(receiptsQuery, queryParams)
      ]);

      const result = {
        summary: {
          totalTransactions: salesOrders.rows.length + purchaseOrders.rows.length + invoices.rows.length + bills.rows.length + receipts.rows.length,
          salesOrdersCount: salesOrders.rows.length,
          purchaseOrdersCount: purchaseOrders.rows.length,
          invoicesCount: invoices.rows.length,
          billsCount: bills.rows.length,
          receiptsCount: receipts.rows.length
        },
        salesOrders: salesOrders.rows,
        purchaseOrders: purchaseOrders.rows,
        invoices: invoices.rows,
        bills: bills.rows,
        receipts: receipts.rows
      };

      console.log(`✅ Retrieved ${result.summary.totalTransactions} transactions with reference tracking`);
      res.json(result);

    } catch (error) {
      console.error('❌ Error fetching transactions with references:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions with references', 
        details: error.message 
      });
    }
  });

  /**
   * @swagger
   * /api/transactions/by-reference/{referenceNumber}:
   *   get:
   *     summary: Get all transactions by specific reference number
   *     description: Retrieves all related transactions (sales orders, purchase orders, invoices, bills, receipts) for a specific reference number
   *     parameters:
   *       - in: path
   *         name: referenceNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: The reference number to search for
   *     responses:
   *       200:
   *         description: All transactions matching the reference number
   */
  app.get('/api/transactions/by-reference/:referenceNumber', async (req, res) => {
    try {
      const { referenceNumber } = req.params;
      console.log(`🔍 Fetching transactions for reference: ${referenceNumber}`);

      // Search across all transaction types for the reference number
      const searchQuery = `
        SELECT 
          'sales_order' as type,
          id,
          order_number as number,
          company_id,
          total as amount,
          order_date as date,
          status,
          description as reference_info
        FROM sales_orders 
        WHERE description ILIKE $1 OR order_number ILIKE $1
        
        UNION ALL
        
        SELECT 
          'purchase_order' as type,
          id,
          order_number as number,
          company_id,
          total as amount,
          order_date as date,
          status,
          description as reference_info
        FROM purchase_orders 
        WHERE description ILIKE $1 OR order_number ILIKE $1
        
        UNION ALL
        
        SELECT 
          'invoice' as type,
          id,
          invoice_number as number,
          company_id,
          total_amount as amount,
          invoice_date as date,
          status,
          reference_number as reference_info
        FROM invoices 
        WHERE reference_number ILIKE $1 OR invoice_number ILIKE $1
        
        UNION ALL
        
        SELECT 
          'bill' as type,
          id,
          bill_number as number,
          company_id,
          total_amount as amount,
          bill_date as date,
          status,
          reference_number as reference_info
        FROM bills 
        WHERE reference_number ILIKE $1 OR bill_number ILIKE $1
        
        UNION ALL
        
        SELECT 
          'receipt' as type,
          id,
          receipt_number as number,
          company_id,
          amount,
          receipt_date as date,
          status,
          reference_number as reference_info
        FROM receipts 
        WHERE reference_number ILIKE $1 OR receipt_number ILIKE $1
        
        ORDER BY date DESC
      `;

      const result = await externalPool.query(searchQuery, [referenceNumber]);

      console.log(`✅ Found ${result.rows.length} transactions for reference: ${referenceNumber}`);
      res.json({
        referenceNumber,
        transactionsFound: result.rows.length,
        transactions: result.rows
      });

    } catch (error) {
      console.error('❌ Error fetching transactions by reference:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions by reference', 
        details: error.message 
      });
    }
  });

  /**
   * @swagger
   * /api/transactions/reference-summary:
   *   get:
   *     summary: Get summary of all reference numbers
   *     description: Provides an overview of all reference numbers used across the system
   *     parameters:
   *       - in: query
   *         name: companyId
   *         schema:
   *           type: integer
   *         description: Filter by specific company ID (optional)
   *     responses:
   *       200:
   *         description: Summary of reference numbers
   */
  app.get('/api/transactions/reference-summary', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Fetching reference summary - Company: ${companyId || 'ALL'}`);

      let whereClause = '';
      let queryParams = [];

      if (companyId) {
        whereClause = 'WHERE company_id = $1';
        queryParams.push(companyId);
      }

      // Get unique reference numbers from all transaction types
      const referenceSummaryQuery = `
        SELECT 
          COALESCE(SUBSTRING(description FROM 'IC-REF-[0-9]+-[0-9]+-[0-9]+'), 'No Reference') as reference_pattern,
          COUNT(*) as transaction_count,
          'sales_order' as source_type
        FROM sales_orders 
        ${whereClause}
        GROUP BY COALESCE(SUBSTRING(description FROM 'IC-REF-[0-9]+-[0-9]+-[0-9]+'), 'No Reference')
        
        UNION ALL
        
        SELECT 
          COALESCE(SUBSTRING(description FROM 'IC-REF-[0-9]+-[0-9]+-[0-9]+'), 'No Reference') as reference_pattern,
          COUNT(*) as transaction_count,
          'purchase_order' as source_type
        FROM purchase_orders 
        ${whereClause}
        GROUP BY COALESCE(SUBSTRING(description FROM 'IC-REF-[0-9]+-[0-9]+-[0-9]+'), 'No Reference')
        
        ORDER BY reference_pattern DESC
      `;

      const result = await externalPool.query(referenceSummaryQuery, queryParams);

      console.log(`✅ Retrieved reference summary with ${result.rows.length} reference patterns`);
      res.json({
        totalReferencePatterns: result.rows.length,
        referencePatterns: result.rows
      });

    } catch (error) {
      console.error('❌ Error fetching reference summary:', error);
      res.status(500).json({ 
        error: 'Failed to fetch reference summary', 
        details: error.message 
      });
    }
  });

  console.log('✅ Transaction Reference Tracking API registered successfully!');
}

export { registerTransactionReferenceTrackingAPI };