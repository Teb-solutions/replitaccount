/**
 * Comprehensive Accounts Receivable and Accounts Payable API
 * Provides detailed AR/AP analysis with aging reports
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

export function setupComprehensiveARAPAPI(app) {
  // Comprehensive Accounts Receivable endpoint
  app.get('/api/accounts-receivable/comprehensive', async (req, res) => {
    try {
      const companyId = parseInt(req.query.companyId);
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      console.log(`📊 Getting comprehensive AR for company ${companyId}`);

      // Get company details
      const companyResult = await pool.query(
        'SELECT id, name FROM companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = companyResult.rows[0];

      // Get AR summary with aging analysis
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          SUM(total) as total_amount,
          SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_amount,
          SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END) as pending_amount,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - invoice_date) <= 30 THEN total ELSE 0 END) as current_0_30,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - invoice_date) BETWEEN 31 AND 60 THEN total ELSE 0 END) as days_31_60,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - invoice_date) BETWEEN 61 AND 90 THEN total ELSE 0 END) as days_61_90,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - invoice_date) > 90 THEN total ELSE 0 END) as over_90_days
        FROM invoices 
        WHERE company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get detailed invoice list with customer information
      const detailsQuery = `
        SELECT 
          i.id as invoice_id,
          i.invoice_number,
          i.invoice_date,
          i.due_date,
          i.total as total_amount,
          i.status,
          i.reference_number,
          c.name as customer_name,
          EXTRACT(DAYS FROM NOW() - i.invoice_date) as days_outstanding,
          CASE 
            WHEN i.status = 'paid' THEN 0
            WHEN EXTRACT(DAYS FROM NOW() - i.invoice_date) <= 30 THEN 1
            WHEN EXTRACT(DAYS FROM NOW() - i.invoice_date) BETWEEN 31 AND 60 THEN 2
            WHEN EXTRACT(DAYS FROM NOW() - i.invoice_date) BETWEEN 61 AND 90 THEN 3
            ELSE 4
          END as aging_bucket
        FROM invoices i
        LEFT JOIN companies c ON i.customer_id = c.id
        WHERE i.company_id = $1
        ORDER BY i.invoice_date DESC
      `;

      const detailsResult = await pool.query(detailsQuery, [companyId]);

      const response = {
        companyId: parseInt(companyId),
        companyName: company.name,
        reportDate: new Date().toISOString().split('T')[0],
        summary: {
          totalInvoices: parseInt(summary.total_invoices) || 0,
          totalAmount: parseFloat(summary.total_amount) || 0,
          paidAmount: parseFloat(summary.paid_amount) || 0,
          pendingAmount: parseFloat(summary.pending_amount) || 0,
          agingBuckets: {
            current0To30: parseFloat(summary.current_0_30) || 0,
            days31To60: parseFloat(summary.days_31_60) || 0,
            days61To90: parseFloat(summary.days_61_90) || 0,
            over90Days: parseFloat(summary.over_90_days) || 0
          }
        },
        details: detailsResult.rows.map(row => ({
          invoiceId: row.invoice_id,
          invoiceNumber: row.invoice_number,
          invoiceDate: row.invoice_date,
          dueDate: row.due_date,
          customerName: row.customer_name || 'Unknown Customer',
          totalAmount: parseFloat(row.total_amount),
          status: row.status,
          reference: row.reference,
          daysOutstanding: parseInt(row.days_outstanding) || 0,
          agingBucket: parseInt(row.aging_bucket)
        }))
      };

      console.log(`✅ AR comprehensive data: ${response.details.length} invoices, $${response.summary.totalAmount}`);
      res.json(response);

    } catch (error) {
      console.error('Error fetching comprehensive AR:', error);
      res.status(500).json({ 
        error: 'Failed to fetch comprehensive accounts receivable',
        details: error.message 
      });
    }
  });

  // Comprehensive Accounts Payable endpoint
  app.get('/api/accounts-payable/comprehensive', async (req, res) => {
    try {
      const companyId = parseInt(req.query.companyId);
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      console.log(`📊 Getting comprehensive AP for company ${companyId}`);

      // Get company details
      const companyResult = await pool.query(
        'SELECT id, name FROM companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = companyResult.rows[0];

      // Get AP summary with aging analysis
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_bills,
          SUM(total) as total_amount,
          SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_amount,
          SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END) as pending_amount,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - bill_date) <= 30 THEN total ELSE 0 END) as current_0_30,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - bill_date) BETWEEN 31 AND 60 THEN total ELSE 0 END) as days_31_60,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - bill_date) BETWEEN 61 AND 90 THEN total ELSE 0 END) as days_61_90,
          SUM(CASE WHEN status = 'pending' AND EXTRACT(DAYS FROM NOW() - bill_date) > 90 THEN total ELSE 0 END) as over_90_days
        FROM bills 
        WHERE company_id = $1
      `;

      const summaryResult = await pool.query(summaryQuery, [companyId]);
      const summary = summaryResult.rows[0];

      // Get detailed bill list with vendor information
      const detailsQuery = `
        SELECT 
          b.id as bill_id,
          b.bill_number,
          b.bill_date,
          b.due_date,
          b.total as total_amount,
          b.status,
          b.reference_number,
          c.name as vendor_name,
          EXTRACT(DAYS FROM NOW() - b.bill_date) as days_outstanding,
          CASE 
            WHEN b.status = 'paid' THEN 0
            WHEN EXTRACT(DAYS FROM NOW() - b.bill_date) <= 30 THEN 1
            WHEN EXTRACT(DAYS FROM NOW() - b.bill_date) BETWEEN 31 AND 60 THEN 2
            WHEN EXTRACT(DAYS FROM NOW() - b.bill_date) BETWEEN 61 AND 90 THEN 3
            ELSE 4
          END as aging_bucket
        FROM bills b
        LEFT JOIN companies c ON b.vendor_id = c.id
        WHERE b.company_id = $1
        ORDER BY b.bill_date DESC
      `;

      const detailsResult = await pool.query(detailsQuery, [companyId]);

      const response = {
        companyId: parseInt(companyId),
        companyName: company.name,
        reportDate: new Date().toISOString().split('T')[0],
        summary: {
          totalBills: parseInt(summary.total_bills) || 0,
          totalAmount: parseFloat(summary.total_amount) || 0,
          paidAmount: parseFloat(summary.paid_amount) || 0,
          pendingAmount: parseFloat(summary.pending_amount) || 0,
          agingBuckets: {
            current0To30: parseFloat(summary.current_0_30) || 0,
            days31To60: parseFloat(summary.days_31_60) || 0,
            days61To90: parseFloat(summary.days_61_90) || 0,
            over90Days: parseFloat(summary.over_90_days) || 0
          }
        },
        details: detailsResult.rows.map(row => ({
          billId: row.bill_id,
          billNumber: row.bill_number,
          billDate: row.bill_date,
          dueDate: row.due_date,
          vendorName: row.vendor_name || 'Unknown Vendor',
          totalAmount: parseFloat(row.total_amount),
          status: row.status,
          reference: row.reference,
          daysOutstanding: parseInt(row.days_outstanding) || 0,
          agingBucket: parseInt(row.aging_bucket)
        }))
      };

      console.log(`✅ AP comprehensive data: ${response.details.length} bills, $${response.summary.totalAmount}`);
      res.json(response);

    } catch (error) {
      console.error('Error fetching comprehensive AP:', error);
      res.status(500).json({ 
        error: 'Failed to fetch comprehensive accounts payable',
        details: error.message 
      });
    }
  });

  console.log('✅ Comprehensive AR/AP API endpoints registered');
}