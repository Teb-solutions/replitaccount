/**
 * Intercompany Auto-Invoicing API
 * 
 * This module provides API endpoints for automatically creating invoices and receipts
 * for intercompany transactions, processing them in a single request.
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
    console.log('Successfully connected to external database for intercompany auto-invoicing API');
  })
  .catch(err => {
    console.error('Failed to connect to external database for intercompany auto-invoicing API:', err);
  });

/**
 * Get the next sequence for a given table and company
 */
async function getNextSequence(tableName, companyId) {
  try {
    const query = `
      SELECT COALESCE(MAX(SUBSTRING(sequence_number FROM '[0-9]+')::integer), 0) + 1 as next_sequence
      FROM ${tableName}_sequences
      WHERE company_id = $1
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows[0].next_sequence;
  } catch (error) {
    console.error(`Error getting next sequence for ${tableName}:`, error);
    return Math.floor(Math.random() * 100000);
  }
}

/**
 * Get the current date and time in ISO format
 */
function getCurrentDateTime() {
  return new Date().toISOString();
}

/**
 * Process intercompany orders to create invoice, bill, and receipts
 * POST /api/auto-invoicing/process-from-orders
 */
router.post('/process-from-orders', async (req, res) => {
  try {
    const { sourceOrderId, targetOrderId } = req.body;
    
    if (!sourceOrderId || !targetOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Source order ID and target order ID are required'
      });
    }
    
    // Get source and target order details
    const ordersQuery = `
      SELECT 
        so.*, 
        po.*,
        t.id as transaction_id,
        t.source_company_id,
        t.target_company_id,
        t.amount as transaction_amount
      FROM sales_orders so
      JOIN purchase_orders po ON so.id = $1 AND po.id = $2
      LEFT JOIN intercompany_transactions t ON t.source_order_id = so.id AND t.target_order_id = po.id
      WHERE so.id = $1 AND po.id = $2
    `;
    
    const ordersResult = await pool.query(ordersQuery, [sourceOrderId, targetOrderId]);
    
    if (ordersResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Orders not found or not matched'
      });
    }
    
    const orderData = ordersResult.rows[0];
    const sourceCompanyId = orderData.source_company_id;
    const targetCompanyId = orderData.target_company_id;
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // 1. Create invoice for the source company (seller)
    const invoiceSequence = await getNextSequence('invoice', sourceCompanyId);
    const invoiceNumber = `INV-${invoiceSequence}-${sourceCompanyId}`;
    const currentDateTime = getCurrentDateTime();
    
    const createInvoiceQuery = `
      INSERT INTO invoices (
        company_id, 
        invoice_number, 
        customer_id, 
        date, 
        due_date, 
        total, 
        status, 
        sales_order_id,
        order_id,
        notes, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    
    const invoiceValues = [
      sourceCompanyId,
      invoiceNumber,
      targetCompanyId,
      currentDateTime,
      currentDateTime,
      orderData.total,
      'Open',
      sourceOrderId,
      sourceOrderId,
      'Auto-generated invoice for intercompany order',
      currentDateTime,
      currentDateTime
    ];
    
    const invoiceResult = await pool.query(createInvoiceQuery, invoiceValues);
    const invoiceId = invoiceResult.rows[0].id;
    
    // 2. Create invoice items
    const orderItemsQuery = `
      SELECT * FROM sales_order_items WHERE sales_order_id = $1
    `;
    
    const orderItemsResult = await pool.query(orderItemsQuery, [sourceOrderId]);
    
    if (orderItemsResult.rows.length > 0) {
      const invoiceItemsQueries = orderItemsResult.rows.map(item => {
        return pool.query(`
          INSERT INTO invoice_items (
            invoice_id, 
            product_id, 
            description, 
            quantity, 
            unit_price, 
            total, 
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          invoiceId,
          item.product_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total,
          currentDateTime,
          currentDateTime
        ]);
      });
      
      await Promise.all(invoiceItemsQueries);
    }
    
    // 3. Create bill for the target company (buyer)
    const billSequence = await getNextSequence('bill', targetCompanyId);
    const billNumber = `BILL-${billSequence}-${targetCompanyId}`;
    
    const createBillQuery = `
      INSERT INTO bills (
        company_id, 
        bill_number, 
        vendor_id, 
        date, 
        due_date, 
        total, 
        status, 
        purchase_order_id, 
        notes, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const billValues = [
      targetCompanyId,
      billNumber,
      sourceCompanyId,
      currentDateTime,
      currentDateTime,
      orderData.total,
      'Open',
      targetOrderId,
      'Auto-generated bill for intercompany order',
      currentDateTime,
      currentDateTime
    ];
    
    const billResult = await pool.query(createBillQuery, billValues);
    const billId = billResult.rows[0].id;
    
    // 4. Create bill items
    const purchaseOrderItemsQuery = `
      SELECT * FROM purchase_order_items WHERE purchase_order_id = $1
    `;
    
    const purchaseOrderItemsResult = await pool.query(purchaseOrderItemsQuery, [targetOrderId]);
    
    if (purchaseOrderItemsResult.rows.length > 0) {
      const billItemsQueries = purchaseOrderItemsResult.rows.map(item => {
        return pool.query(`
          INSERT INTO bill_items (
            bill_id, 
            product_id, 
            description, 
            quantity, 
            unit_price, 
            total, 
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          billId,
          item.product_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total,
          currentDateTime,
          currentDateTime
        ]);
      });
      
      await Promise.all(billItemsQueries);
    }
    
    // 5. Create receipt for the invoice (full payment)
    const receiptSequence = await getNextSequence('receipt', sourceCompanyId);
    const receiptNumber = `REC-${receiptSequence}-${sourceCompanyId}`;
    
    const createReceiptQuery = `
      INSERT INTO receipts (
        company_id, 
        receipt_number, 
        customer_id, 
        invoice_id, 
        receipt_date, 
        amount, 
        payment_method, 
        reference, 
        notes, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const receiptValues = [
      sourceCompanyId,
      receiptNumber,
      targetCompanyId,
      invoiceId,
      currentDateTime,
      orderData.total,
      'Bank Transfer',
      'Auto-payment',
      'Auto-generated receipt for intercompany invoice',
      currentDateTime,
      currentDateTime
    ];
    
    const receiptResult = await pool.query(createReceiptQuery, receiptValues);
    const receiptId = receiptResult.rows[0].id;
    
    // 6. Update invoice status to Paid
    await pool.query(`
      UPDATE invoices SET status = 'Paid', updated_at = $1 WHERE id = $2
    `, [currentDateTime, invoiceId]);
    
    // 7. Update bill status to Paid
    await pool.query(`
      UPDATE bills SET status = 'Paid', updated_at = $1 WHERE id = $2
    `, [currentDateTime, billId]);
    
    // 8. Update transaction with invoice and bill IDs
    if (orderData.transaction_id) {
      await pool.query(`
        UPDATE intercompany_transactions 
        SET source_invoice_id = $1, target_bill_id = $2, status = 'Completed', updated_at = $3
        WHERE id = $4
      `, [invoiceId, billId, currentDateTime, orderData.transaction_id]);
    }
    
    // 9. Create journal entries for both companies
    
    // Source company journal entry (seller)
    const sourceJournalSequence = await getNextSequence('journal_entry', sourceCompanyId);
    const sourceJournalNumber = `JE-${sourceJournalSequence}-${sourceCompanyId}`;
    
    const createSourceJournalQuery = `
      INSERT INTO journal_entries (
        company_id, 
        journal_number, 
        entry_date, 
        description, 
        reference_id, 
        reference_type,
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const sourceJournalValues = [
      sourceCompanyId,
      sourceJournalNumber,
      currentDateTime,
      'Auto-generated journal entry for intercompany invoice and receipt',
      invoiceId,
      'Invoice',
      currentDateTime,
      currentDateTime
    ];
    
    const sourceJournalResult = await pool.query(createSourceJournalQuery, sourceJournalValues);
    const sourceJournalId = sourceJournalResult.rows[0].id;
    
    // Source company journal entry items (debit Cash, credit AR)
    // Get the Cash and AR account IDs for the source company
    const sourceAccountsQuery = `
      SELECT id, code FROM accounts 
      WHERE company_id = $1 AND (code = '1000' OR code = '1100')
    `;
    
    const sourceAccountsResult = await pool.query(sourceAccountsQuery, [sourceCompanyId]);
    const sourceAccounts = sourceAccountsResult.rows.reduce((acc, row) => {
      acc[row.code] = row.id;
      return acc;
    }, {});
    
    if (sourceAccounts['1000'] && sourceAccounts['1100']) {
      // Journal entry item for Cash (debit)
      await pool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, 
          account_id, 
          description, 
          debit, 
          credit, 
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        sourceJournalId,
        sourceAccounts['1000'],
        'Cash receipt from intercompany sale',
        orderData.total,
        0,
        currentDateTime,
        currentDateTime
      ]);
      
      // Journal entry item for Accounts Receivable (credit)
      await pool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, 
          account_id, 
          description, 
          debit, 
          credit, 
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        sourceJournalId,
        sourceAccounts['1100'],
        'Reduce AR from intercompany sale payment',
        0,
        orderData.total,
        currentDateTime,
        currentDateTime
      ]);
      
      // Update account balances
      await pool.query(`
        UPDATE accounts SET balance = balance + $1, updated_at = $2 WHERE id = $3
      `, [orderData.total, currentDateTime, sourceAccounts['1000']]);
      
      await pool.query(`
        UPDATE accounts SET balance = balance - $1, updated_at = $2 WHERE id = $3
      `, [orderData.total, currentDateTime, sourceAccounts['1100']]);
    }
    
    // Target company journal entry (buyer)
    const targetJournalSequence = await getNextSequence('journal_entry', targetCompanyId);
    const targetJournalNumber = `JE-${targetJournalSequence}-${targetCompanyId}`;
    
    const createTargetJournalQuery = `
      INSERT INTO journal_entries (
        company_id, 
        journal_number, 
        entry_date, 
        description, 
        reference_id, 
        reference_type,
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const targetJournalValues = [
      targetCompanyId,
      targetJournalNumber,
      currentDateTime,
      'Auto-generated journal entry for intercompany bill and payment',
      billId,
      'Bill',
      currentDateTime,
      currentDateTime
    ];
    
    const targetJournalResult = await pool.query(createTargetJournalQuery, targetJournalValues);
    const targetJournalId = targetJournalResult.rows[0].id;
    
    // Target company journal entry items (debit Inventory/Expense, credit Cash)
    // Get the Cash, AP, and Inventory account IDs for the target company
    const targetAccountsQuery = `
      SELECT id, code FROM accounts 
      WHERE company_id = $1 AND (code = '1000' OR code = '2000' OR code = '1400')
    `;
    
    const targetAccountsResult = await pool.query(targetAccountsQuery, [targetCompanyId]);
    const targetAccounts = targetAccountsResult.rows.reduce((acc, row) => {
      acc[row.code] = row.id;
      return acc;
    }, {});
    
    if (targetAccounts['1000'] && targetAccounts['2000'] && targetAccounts['1400']) {
      // Journal entry item for Inventory/Expense (debit)
      await pool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, 
          account_id, 
          description, 
          debit, 
          credit, 
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        targetJournalId,
        targetAccounts['1400'],
        'Inventory purchase from intercompany transaction',
        orderData.total,
        0,
        currentDateTime,
        currentDateTime
      ]);
      
      // Journal entry item for Cash (credit) - direct payment
      await pool.query(`
        INSERT INTO journal_entry_items (
          journal_entry_id, 
          account_id, 
          description, 
          debit, 
          credit, 
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        targetJournalId,
        targetAccounts['1000'],
        'Cash payment for intercompany purchase',
        0,
        orderData.total,
        currentDateTime,
        currentDateTime
      ]);
      
      // Update account balances
      await pool.query(`
        UPDATE accounts SET balance = balance + $1, updated_at = $2 WHERE id = $3
      `, [orderData.total, currentDateTime, targetAccounts['1400']]);
      
      await pool.query(`
        UPDATE accounts SET balance = balance - $1, updated_at = $2 WHERE id = $3
      `, [orderData.total, currentDateTime, targetAccounts['1000']]);
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    return res.status(201).json({
      success: true,
      message: 'Intercompany order processed successfully',
      data: {
        invoiceId,
        billId,
        receiptId,
        sourceJournalId,
        targetJournalId
      }
    });
    
  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    
    console.error('Error processing intercompany orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing intercompany orders',
      error: error.message
    });
  }
});

export default router;