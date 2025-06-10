/**
 * Reference Lookup API - Find transactions by reference number
 * Matches your actual database structure
 */

import { Pool } from 'pg';

const externalPool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export function setupReferenceAPI(app) {
  console.log('🔍 Setting up reference lookup API...');

  // Get all transactions by reference number
  app.get('/api/transactions/reference', async (req, res) => {
    try {
      const { reference } = req.query;
      
      if (!reference) {
        return res.status(400).json({ error: 'Reference parameter is required' });
      }

      console.log(`🔍 Looking up transactions with reference: ${reference}`);
      
      const transactions = [];
      let totalAmount = 0;
      const summary = {
        sales_orders: 0,
        purchase_orders: 0,
        invoices: 0,
        receipts: 0,
        bills: 0,
        total_amount: '0.00'
      };

      // Search sales orders
      try {
        const salesOrdersQuery = `
          SELECT so.*, c.name as company_name 
          FROM sales_orders so
          LEFT JOIN companies c ON so.company_id = c.id
          WHERE so.reference_number ILIKE $1
        `;
        const salesResult = await externalPool.query(salesOrdersQuery, [`%${reference}%`]);
        
        salesResult.rows.forEach(row => {
          transactions.push({
            transaction_type: 'sales_order',
            id: row.id,
            transaction_number: row.order_number,
            reference_number: row.reference_number,
            transaction_date: row.order_date,
            amount: row.total || '0.00',
            status: row.status,
            company_id: row.company_id,
            company_name: row.company_name,
            related_company_id: null,
            related_company_name: null
          });
          totalAmount += parseFloat(row.total || 0);
          summary.sales_orders++;
        });
      } catch (err) {
        console.log('Sales orders search error:', err.message);
      }

      // Search purchase orders
      try {
        const purchaseOrdersQuery = `
          SELECT po.*, c.name as company_name 
          FROM purchase_orders po
          LEFT JOIN companies c ON po.company_id = c.id
          WHERE po.reference_number ILIKE $1
        `;
        const purchaseResult = await externalPool.query(purchaseOrdersQuery, [`%${reference}%`]);
        
        purchaseResult.rows.forEach(row => {
          transactions.push({
            transaction_type: 'purchase_order',
            id: row.id,
            transaction_number: row.order_number,
            reference_number: row.reference_number,
            transaction_date: row.order_date,
            amount: row.total || '0.00',
            status: row.status,
            company_id: row.company_id,
            company_name: row.company_name,
            related_company_id: null,
            related_company_name: null
          });
          totalAmount += parseFloat(row.total || 0);
          summary.purchase_orders++;
        });
      } catch (err) {
        console.log('Purchase orders search error:', err.message);
      }

      // Search invoices
      try {
        const invoicesQuery = `
          SELECT i.*, c.name as company_name 
          FROM invoices i
          LEFT JOIN companies c ON i.company_id = c.id
          WHERE i.reference_number ILIKE $1 OR i.invoice_number ILIKE $1
        `;
        const invoiceResult = await externalPool.query(invoicesQuery, [`%${reference}%`]);
        
        invoiceResult.rows.forEach(row => {
          transactions.push({
            transaction_type: 'invoice',
            id: row.id,
            transaction_number: row.invoice_number,
            reference_number: row.reference_number || row.invoice_number,
            transaction_date: row.invoice_date,
            amount: row.total || '0.00',
            status: row.status,
            company_id: row.company_id,
            company_name: row.company_name,
            related_company_id: null,
            related_company_name: null
          });
          totalAmount += parseFloat(row.total || 0);
          summary.invoices++;
        });
      } catch (err) {
        console.log('Invoices search error:', err.message);
      }

      // Search receipts
      try {
        const receiptsQuery = `
          SELECT r.*, c.name as company_name 
          FROM receipts r
          LEFT JOIN companies c ON r.company_id = c.id
          WHERE r.reference_number ILIKE $1
        `;
        const receiptResult = await externalPool.query(receiptsQuery, [`%${reference}%`]);
        
        receiptResult.rows.forEach(row => {
          transactions.push({
            transaction_type: 'receipt',
            id: row.id,
            transaction_number: row.receipt_number,
            reference_number: row.reference_number,
            transaction_date: row.receipt_date,
            amount: row.amount || '0.00',
            status: 'completed',
            company_id: row.company_id,
            company_name: row.company_name,
            related_company_id: null,
            related_company_name: null
          });
          totalAmount += parseFloat(row.amount || 0);
          summary.receipts++;
        });
      } catch (err) {
        console.log('Receipts search error:', err.message);
      }

      // Search bills
      try {
        const billsQuery = `
          SELECT b.*, c.name as company_name 
          FROM bills b
          LEFT JOIN companies c ON b.company_id = c.id
          WHERE b.reference_number ILIKE $1 OR b.bill_number ILIKE $1
        `;
        const billResult = await externalPool.query(billsQuery, [`%${reference}%`]);
        
        billResult.rows.forEach(row => {
          transactions.push({
            transaction_type: 'bill',
            id: row.id,
            transaction_number: row.bill_number,
            reference_number: row.reference_number || row.bill_number,
            transaction_date: row.bill_date,
            amount: row.total || '0.00',
            status: row.status,
            company_id: row.company_id,
            company_name: row.company_name,
            related_company_id: null,
            related_company_name: null
          });
          totalAmount += parseFloat(row.total || 0);
          summary.bills++;
        });
      } catch (err) {
        console.log('Bills search error:', err.message);
      }

      summary.total_amount = totalAmount.toFixed(2);

      const result = {
        reference_number: reference,
        total_transactions: transactions.length,
        transactions: transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)),
        summary
      };

      console.log(`✅ Found ${transactions.length} transactions for reference: ${reference}`);
      res.json(result);

    } catch (error) {
      console.error('Error in reference lookup:', error);
      res.status(500).json({ 
        error: 'Failed to lookup transactions by reference',
        reference: req.query.reference || 'unknown'
      });
    }
  });

  console.log('✅ Reference lookup API registered successfully');
}