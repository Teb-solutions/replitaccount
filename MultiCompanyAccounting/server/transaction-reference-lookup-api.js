/**
 * Transaction Reference Lookup API
 * Provides comprehensive reference-based transaction search
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

export function setupTransactionReferenceLookupAPI(app) {
  // Transaction reference lookup endpoint
  app.get('/api/transactions/reference-lookup', async (req, res) => {
    try {
      const { reference } = req.query;
      
      if (!reference) {
        return res.status(400).json({ error: 'Reference parameter is required' });
      }

      console.log(`🔍 Looking up transactions for reference: ${reference}`);

      const transactions = [];

      // Search in sales orders
      const salesOrderQuery = `
        SELECT 
          'sales_order' as transaction_type,
          id,
          order_number as reference_number,
          order_date as transaction_date,
          total as total_amount,
          status,
          company_id,
          vendor_company_id as related_company_id,
          reference
        FROM sales_orders 
        WHERE reference ILIKE $1 OR order_number ILIKE $1
      `;

      const salesOrderResult = await pool.query(salesOrderQuery, [`%${reference}%`]);
      transactions.push(...salesOrderResult.rows);

      // Search in purchase orders
      const purchaseOrderQuery = `
        SELECT 
          'purchase_order' as transaction_type,
          id,
          order_number as reference_number,
          order_date as transaction_date,
          total_amount,
          status,
          company_id,
          vendor_company_id as related_company_id,
          reference
        FROM purchase_orders 
        WHERE reference ILIKE $1 OR order_number ILIKE $1
      `;

      const purchaseOrderResult = await pool.query(purchaseOrderQuery, [`%${reference}%`]);
      transactions.push(...purchaseOrderResult.rows);

      // Search in invoices
      const invoiceQuery = `
        SELECT 
          'invoice' as transaction_type,
          id,
          invoice_number as reference_number,
          invoice_date as transaction_date,
          total_amount,
          status,
          company_id,
          customer_company_id as related_company_id,
          reference
        FROM invoices 
        WHERE reference ILIKE $1 OR invoice_number ILIKE $1
      `;

      const invoiceResult = await pool.query(invoiceQuery, [`%${reference}%`]);
      transactions.push(...invoiceResult.rows);

      // Search in bills
      const billQuery = `
        SELECT 
          'bill' as transaction_type,
          id,
          bill_number as reference_number,
          bill_date as transaction_date,
          total_amount,
          status,
          company_id,
          vendor_company_id as related_company_id,
          reference
        FROM bills 
        WHERE reference ILIKE $1 OR bill_number ILIKE $1
      `;

      const billResult = await pool.query(billQuery, [`%${reference}%`]);
      transactions.push(...billResult.rows);

      // Search in receipts
      const receiptQuery = `
        SELECT 
          'receipt' as transaction_type,
          id,
          receipt_number as reference_number,
          receipt_date as transaction_date,
          amount as total_amount,
          'completed' as status,
          company_id,
          NULL as related_company_id,
          reference
        FROM receipts 
        WHERE reference ILIKE $1 OR receipt_number ILIKE $1
      `;

      const receiptResult = await pool.query(receiptQuery, [`%${reference}%`]);
      transactions.push(...receiptResult.rows);

      // Get company names for all transactions
      const companyIds = [...new Set(transactions.flatMap(t => [t.company_id, t.related_company_id].filter(Boolean)))];
      
      let companyNames = {};
      if (companyIds.length > 0) {
        const companyQuery = `SELECT id, name FROM companies WHERE id = ANY($1)`;
        const companyResult = await pool.query(companyQuery, [companyIds]);
        companyNames = companyResult.rows.reduce((acc, company) => {
          acc[company.id] = company.name;
          return acc;
        }, {});
      }

      // Format the response
      const formattedTransactions = transactions.map(transaction => ({
        transactionType: transaction.transaction_type,
        transactionId: transaction.id,
        referenceNumber: transaction.reference_number,
        transactionDate: transaction.transaction_date,
        totalAmount: parseFloat(transaction.total_amount) || 0,
        status: transaction.status,
        companyId: transaction.company_id,
        companyName: companyNames[transaction.company_id] || 'Unknown Company',
        relatedCompanyId: transaction.related_company_id,
        relatedCompanyName: transaction.related_company_id ? 
          (companyNames[transaction.related_company_id] || 'Unknown Company') : null,
        originalReference: transaction.reference
      }));

      // Sort by transaction date (newest first)
      formattedTransactions.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

      const response = {
        reference: reference,
        searchResults: {
          totalFound: formattedTransactions.length,
          transactionTypes: [...new Set(formattedTransactions.map(t => t.transactionType))]
        },
        transactions: formattedTransactions
      };

      console.log(`✅ Found ${formattedTransactions.length} transactions for reference: ${reference}`);
      res.json(response);

    } catch (error) {
      console.error('Error looking up transaction reference:', error);
      res.status(500).json({ 
        error: 'Failed to lookup transaction reference',
        details: error.message 
      });
    }
  });

  console.log('✅ Transaction Reference Lookup API endpoint registered');
}