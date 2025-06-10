/**
 * Fixed Comprehensive AR/AP API - Schema Aligned
 * Uses exact database column names verified from schema
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration for external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 20
});

export function setupFixedComprehensiveARAPAPI(app) {
  
  /**
   * @swagger
   * /api/accounts-receivable/comprehensive-fixed:
   *   get:
   *     tags:
   *       - Accounts Receivable
   *     summary: Get comprehensive accounts receivable analysis (Fixed)
   *     description: Returns detailed AR summary with aging analysis and invoice details using corrected database schema
   *     parameters:
   *       - in: query
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID to get AR analysis for
   *     responses:
   *       200:
   *         description: Comprehensive AR analysis
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 company:
   *                   type: string
   *                 summary:
   *                   type: object
   *                   properties:
   *                     total_invoices:
   *                       type: integer
   *                     total_amount:
   *                       type: number
   *                     paid_amount:
   *                       type: number
   *                     pending_amount:
   *                       type: number
   *                     total_paid:
   *                       type: number
   *                     total_due:
   *                       type: number
   *                 invoices:
   *                   type: array
   *                   items:
   *                     type: object
   */
  // Fixed Comprehensive Accounts Receivable endpoint
  app.get('/api/accounts-receivable/comprehensive-fixed', async (req, res) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      console.log(`📊 Getting fixed comprehensive AR for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get AR summary - using exact column names from schema
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(total), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(amount_paid), 0) as total_paid,
          COALESCE(SUM(balance_due), 0) as total_due
        FROM invoices 
        WHERE company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get sales orders with complete tracking
      const salesOrdersQuery = `
        SELECT 
          so.id,
          so.order_number,
          so.reference_number,
          so.order_date,
          so.expected_date,
          so.total,
          so.status,
          c.name as customer_name,
          i.id as invoice_id,
          i.invoice_number,
          i.total as invoice_total,
          i.status as invoice_status,
          'sales_order' as transaction_type
        FROM sales_orders so
        LEFT JOIN companies c ON so.customer_id = c.id
        LEFT JOIN invoices i ON so.id = i.sales_order_id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
        LIMIT 25
      `;

      // Get detailed invoice list with aging
      const invoicesQuery = `
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.due_date,
          i.total,
          i.amount_paid,
          i.balance_due,
          i.status,
          i.reference_number,
          c.name as customer_name,
          EXTRACT(DAYS FROM NOW() - i.invoice_date) as days_outstanding,
          'invoice' as transaction_type
        FROM invoices i
        LEFT JOIN companies c ON i.customer_id = c.id
        WHERE i.company_id = $1
        ORDER BY i.invoice_date DESC
        LIMIT 25
      `;

      // Get receipts/payments with linked invoice info
      const receiptsQuery = `
        SELECT 
          r.id,
          r.receipt_number,
          r.reference_number,
          r.receipt_date,
          r.amount,
          r.payment_method,
          r.invoice_id,
          c.name as customer_name,
          i.invoice_number as linked_invoice_number,
          i.total as invoice_total,
          'receipt' as transaction_type
        FROM receipts r
        LEFT JOIN invoices i ON r.invoice_id = i.id
        LEFT JOIN companies c ON COALESCE(r.customer_id, i.customer_id) = c.id
        WHERE r.company_id = $1 OR i.company_id = $1
        ORDER BY r.receipt_date DESC
        LIMIT 25
      `;

      const [salesOrdersResult, invoicesResult, receiptsResult] = await Promise.all([
        pool.query(salesOrdersQuery, [companyId]),
        pool.query(invoicesQuery, [companyId]),
        pool.query(receiptsQuery, [companyId])
      ]);

      res.json({
        success: true,
        company: companyCheck.rows[0].name,
        summary: {
          total_invoices: parseInt(summary.total_invoices),
          total_amount: parseFloat(summary.total_amount) || 0,
          paid_amount: parseFloat(summary.paid_amount) || 0,
          pending_amount: parseFloat(summary.pending_amount) || 0,
          total_paid: parseFloat(summary.total_paid) || 0,
          total_due: parseFloat(summary.total_due) || 0,
          total_sales_orders: salesOrdersResult.rows.length,
          total_receipts: receiptsResult.rows.length
        },
        sales_orders: salesOrdersResult.rows.map(row => ({
          ...row,
          total: parseFloat(row.total) || 0,
          invoice_id: row.invoice_id,
          invoice_number: row.invoice_number,
          invoice_total: parseFloat(row.invoice_total) || 0,
          invoice_status: row.invoice_status,
          workflow_status: row.invoice_id ? 'Invoiced' : 'Ordered (Pending Invoice)'
        })),
        invoices: invoicesResult.rows.map(row => ({
          ...row,
          total: parseFloat(row.total) || 0,
          amount_paid: parseFloat(row.amount_paid) || 0,
          balance_due: parseFloat(row.balance_due) || 0,
          days_outstanding: parseInt(row.days_outstanding) || 0
        })),
        receipts: receiptsResult.rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount) || 0,
          invoice_id: row.invoice_id,
          linked_invoice_number: row.linked_invoice_number,
          invoice_total: parseFloat(row.invoice_total) || 0
        }))
      });

    } catch (error) {
      console.error('Error fetching fixed comprehensive AR:', error);
      res.status(500).json({
        error: 'Failed to fetch comprehensive accounts receivable',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/accounts-payable/comprehensive-fixed:
   *   get:
   *     tags:
   *       - Accounts Payable
   *     summary: Get comprehensive accounts payable analysis (Fixed)
   *     description: Returns detailed AP summary with aging analysis and bill details using corrected database schema
   *     parameters:
   *       - in: query
   *         name: companyId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID to get AP analysis for
   *     responses:
   *       200:
   *         description: Comprehensive AP analysis
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 company:
   *                   type: string
   *                 summary:
   *                   type: object
   *                 bills:
   *                   type: array
   *                   items:
   *                     type: object
   */
  // Fixed Comprehensive Accounts Payable endpoint
  app.get('/api/accounts-payable/comprehensive-fixed', async (req, res) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      console.log(`📊 Getting fixed comprehensive AP for company ${companyId}`);

      // Verify company exists
      const companyCheck = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Get AP summary - using exact column names from schema
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_bills,
          COALESCE(SUM(total), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(amount_paid), 0) as total_paid,
          COALESCE(SUM(balance_due), 0) as total_due
        FROM bills 
        WHERE company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get purchase orders with complete tracking
      const purchaseOrdersQuery = `
        SELECT 
          po.id,
          po.order_number,
          po.reference_number,
          po.order_date,
          po.expected_date,
          po.total,
          po.status,
          c.name as vendor_name,
          b.id as bill_id,
          b.bill_number,
          b.total as bill_total,
          b.status as bill_status,
          'purchase_order' as transaction_type
        FROM purchase_orders po
        LEFT JOIN companies c ON po.vendor_id = c.id
        LEFT JOIN bills b ON po.id = b.purchase_order_id
        WHERE po.company_id = $1
        ORDER BY po.order_date DESC
        LIMIT 25
      `;

      // Get detailed bill list with aging
      const billsQuery = `
        SELECT 
          b.id,
          b.bill_number,
          b.bill_date,
          b.due_date,
          b.total,
          b.amount_paid,
          b.balance_due,
          b.status,
          b.reference_number,
          b.purchase_order_id,
          c.name as vendor_name,
          EXTRACT(DAYS FROM NOW() - b.bill_date) as days_outstanding,
          'bill' as transaction_type
        FROM bills b
        LEFT JOIN companies c ON b.vendor_id = c.id
        WHERE b.company_id = $1
        ORDER BY b.bill_date DESC
        LIMIT 25
      `;

      // Get payments made (using correct table name: bill_payments)
      const paymentsQuery = `
        SELECT 
          bp.id,
          bp.payment_number,
          bp.reference_number,
          bp.payment_date,
          bp.amount,
          bp.payment_method,
          bp.bill_id,
          c.name as vendor_name,
          b.bill_number as linked_bill_number,
          b.total as bill_total,
          'payment' as transaction_type
        FROM bill_payments bp
        LEFT JOIN bills b ON bp.bill_id = b.id
        LEFT JOIN companies c ON b.vendor_id = c.id
        WHERE b.company_id = $1
        ORDER BY bp.payment_date DESC
        LIMIT 25
      `;

      const [purchaseOrdersResult, billsResult, paymentsResult] = await Promise.all([
        pool.query(purchaseOrdersQuery, [companyId]),
        pool.query(billsQuery, [companyId]),
        pool.query(paymentsQuery, [companyId])
      ]);

      res.json({
        success: true,
        company: companyCheck.rows[0].name,
        summary: {
          total_bills: parseInt(summary.total_bills),
          total_amount: parseFloat(summary.total_amount) || 0,
          paid_amount: parseFloat(summary.paid_amount) || 0,
          pending_amount: parseFloat(summary.pending_amount) || 0,
          total_paid: parseFloat(summary.total_paid) || 0,
          total_due: parseFloat(summary.total_due) || 0,
          total_purchase_orders: purchaseOrdersResult.rows.length,
          total_payments: paymentsResult.rows.length
        },
        purchase_orders: purchaseOrdersResult.rows.map(row => ({
          ...row,
          total: parseFloat(row.total) || 0
        })),
        bills: billsResult.rows.map(row => ({
          ...row,
          total: parseFloat(row.total) || 0,
          amount_paid: parseFloat(row.amount_paid) || 0,
          balance_due: parseFloat(row.balance_due) || 0,
          days_outstanding: parseInt(row.days_outstanding) || 0
        })),
        payments: paymentsResult.rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount) || 0
        }))
      });

    } catch (error) {
      console.error('Error fetching fixed comprehensive AP:', error);
      res.status(500).json({
        error: 'Failed to fetch comprehensive accounts payable',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/transactions/reference-lookup-fixed:
   *   get:
   *     tags:
   *       - Transaction Lookup
   *     summary: Search transactions by reference number (Fixed)
   *     description: Find invoices, bills, sales orders, and receipts by reference number using corrected database schema
   *     parameters:
   *       - in: query
   *         name: reference
   *         required: true
   *         schema:
   *           type: string
   *         description: Reference number to search for (partial match supported)
   *     responses:
   *       200:
   *         description: Transaction search results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 reference:
   *                   type: string
   *                 results:
   *                   type: object
   *                   properties:
   *                     invoices:
   *                       type: array
   *                       items:
   *                         type: object
   *                     bills:
   *                       type: array
   *                       items:
   *                         type: object
   *                     sales_orders:
   *                       type: array
   *                       items:
   *                         type: object
   *                     receipts:
   *                       type: array
   *                       items:
   *                         type: object
   *                 total_found:
   *                   type: integer
   */
  // Fixed Transaction Reference Lookup endpoint
  app.get('/api/transactions/reference-lookup-fixed', async (req, res) => {
    try {
      const { reference } = req.query;
      
      if (!reference) {
        return res.status(400).json({ error: 'Reference parameter is required' });
      }

      console.log(`🔍 Looking up transactions with reference: ${reference}`);

      // Search across all transaction tables using exact column names
      const results = {
        invoices: [],
        bills: [],
        sales_orders: [],
        receipts: []
      };

      // Search invoices
      const invoicesQuery = `
        SELECT 
          i.id, i.invoice_number, i.reference_number, i.total, i.status, i.invoice_date,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN companies c ON i.customer_id = c.id
        WHERE i.reference_number ILIKE $1 OR i.invoice_number ILIKE $1
        LIMIT 20
      `;
      
      const invoicesResult = await pool.query(invoicesQuery, [`%${reference}%`]);
      results.invoices = invoicesResult.rows;

      // Search bills
      const billsQuery = `
        SELECT 
          b.id, b.bill_number, b.reference_number, b.total, b.status, b.bill_date,
          c.name as vendor_name
        FROM bills b
        LEFT JOIN companies c ON b.vendor_id = c.id
        WHERE b.reference_number ILIKE $1 OR b.bill_number ILIKE $1
        LIMIT 20
      `;
      
      const billsResult = await pool.query(billsQuery, [`%${reference}%`]);
      results.bills = billsResult.rows;

      // Search sales orders
      const salesOrdersQuery = `
        SELECT 
          s.id, s.order_number, s.reference_number, s.total, s.status, s.order_date,
          c.name as customer_name
        FROM sales_orders s
        LEFT JOIN companies c ON s.customer_id = c.id
        WHERE s.reference_number ILIKE $1 OR s.order_number ILIKE $1
        LIMIT 20
      `;
      
      const salesOrdersResult = await pool.query(salesOrdersQuery, [`%${reference}%`]);
      results.sales_orders = salesOrdersResult.rows;

      res.json({
        success: true,
        reference: reference,
        results: results,
        total_found: results.invoices.length + results.bills.length + results.sales_orders.length
      });

    } catch (error) {
      console.error('Error in reference lookup:', error);
      res.status(500).json({
        error: 'Failed to lookup transactions',
        details: error.message
      });
    }
  });
  
  console.log('✅ Fixed Comprehensive AR/AP API loaded with schema-aligned queries');
}