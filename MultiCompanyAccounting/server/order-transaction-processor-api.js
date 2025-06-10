/**
 * Order Transaction Processor API
 * 
 * This API provides endpoints for processing transactions from orders between companies,
 * particularly for the intercompany sales and purchase orders.
 */

import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import dbConfig from './db-config.js';

const router = express.Router();
dotenv.config();

// Configure database connection with external database
const pool = new Pool(dbConfig);

/**
 * Create a transaction from an existing sales order
 * POST /api/order-transaction-processor/create-from-order/:salesOrderId
 */
router.post('/api/order-transaction-processor/create-from-order/:salesOrderId', async (req, res) => {
  try {
    const { salesOrderId } = req.params;
    const { targetCompanyId, description } = req.body;
    
    if (!salesOrderId || !targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'Sales order ID and target company ID are required'
      });
    }

    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Get the sales order details
      const salesOrderResult = await client.query(
        'SELECT so.*, c.id as source_company_id, c.name as company_name FROM sales_orders so JOIN companies c ON so.company_id = c.id WHERE so.id = $1',
        [salesOrderId]
      );
      
      if (salesOrderResult.rows.length === 0) {
        throw new Error('Sales order not found');
      }
      
      const salesOrder = salesOrderResult.rows[0];
      const sourceCompanyId = salesOrder.source_company_id;
      
      // 2. Get the total amount from the sales order items
      const itemsResult = await client.query(
        'SELECT SUM(quantity * unit_price) as total_amount FROM sales_order_items WHERE sales_order_id = $1',
        [salesOrderId]
      );
      
      const amount = parseFloat(itemsResult.rows[0].total_amount || 0);

      // 3. Get target company details
      const targetCompanyResult = await client.query(
        'SELECT * FROM companies WHERE id = $1',
        [targetCompanyId]
      );
      
      if (targetCompanyResult.rows.length === 0) {
        throw new Error('Target company not found');
      }
      
      const targetCompany = targetCompanyResult.rows[0];
      
      // 4. Create intercompany transaction record
      const now = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
      
      // Get next sequence for intercompany_transactions
      const seqResult = await client.query("SELECT nextval('intercompany_transactions_id_seq')");
      const transactionId = parseInt(seqResult.rows[0].nextval);
      
      const transactionResult = await client.query(
        `INSERT INTO intercompany_transactions 
         (id, date, source_company_id, target_company_id, amount, status, description, source_order_id, type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [
          transactionId,
          now,
          sourceCompanyId,
          targetCompanyId,
          amount,
          'Processing',
          description || `Transaction for sales order #${salesOrderId}`,
          salesOrderId,
          'Sale'
        ]
      );
      
      const transaction = transactionResult.rows[0];
      
      // 5. Create invoice for the source company
      const invoiceId = await createInvoiceForTransaction(
        client, 
        transactionId, 
        sourceCompanyId, 
        targetCompanyId, 
        amount,
        salesOrderId
      );
      
      // 6. Create bill for the target company
      const billId = await createBillForTransaction(
        client, 
        transactionId, 
        targetCompanyId, 
        sourceCompanyId, 
        amount, 
        invoiceId,
        salesOrderId
      );
      
      // 7. Update transaction with invoice and bill IDs
      await updateTransactionWithDocuments(client, transactionId, invoiceId, billId);
      
      // 8. Create journal entries for both companies
      await createJournalEntriesForTransaction(client, transactionId, sourceCompanyId, targetCompanyId, amount);
      
      // Commit transaction
      await client.query('COMMIT');
      
      res.status(200).json({
        success: true,
        transaction: {
          id: transactionId,
          sourceCompanyId,
          targetCompanyId,
          sourceCompanyName: salesOrder.company_name,
          targetCompanyName: targetCompany.name,
          amount,
          date: now,
          status: 'Processing',
          description: description || `Transaction for sales order #${salesOrderId}`,
          invoiceId,
          billId
        }
      });
      
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating intercompany transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create intercompany transaction',
      error: error.message
    });
  }
});

/**
 * Create an invoice for an intercompany transaction
 */
async function createInvoiceForTransaction(client, transactionId, sourceCompanyId, targetCompanyId, amount, salesOrderId) {
  try {
    // Get next sequence for invoices
    const seqResult = await client.query("SELECT nextval('invoices_id_seq')");
    const invoiceId = parseInt(seqResult.rows[0].nextval);
    
    // Get invoice number format (INV-XXXX)
    const invoiceNumber = `INV-${invoiceId.toString().padStart(4, '0')}`;
    
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Insert invoice record
    const invoiceResult = await client.query(
      `INSERT INTO invoices 
       (id, invoice_number, company_id, customer_id, date, due_date, amount, tax_amount, status, reference, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        invoiceId,
        invoiceNumber,
        sourceCompanyId,
        targetCompanyId,
        now,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 30 days
        amount,
        0, // No tax for intercompany transactions
        'Pending',
        `Transaction #${transactionId}`,
        `Intercompany invoice for sales order #${salesOrderId}`
      ]
    );
    
    // Get the sales order items to create invoice items
    const itemsResult = await client.query(
      'SELECT * FROM sales_order_items WHERE sales_order_id = $1',
      [salesOrderId]
    );
    
    // Insert invoice items for each sales order item
    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO invoice_items 
         (invoice_id, product_id, description, quantity, unit_price, amount, tax_amount) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          invoiceId,
          item.product_id,
          item.description || 'Intercompany item',
          item.quantity,
          item.unit_price,
          parseFloat(item.quantity) * parseFloat(item.unit_price),
          0 // No tax for intercompany transactions
        ]
      );
    }
    
    return invoiceId;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw new Error(`Failed to create invoice: ${error.message}`);
  }
}

/**
 * Create a bill for an intercompany transaction
 */
async function createBillForTransaction(client, transactionId, targetCompanyId, sourceCompanyId, amount, invoiceId, salesOrderId) {
  try {
    // Get next sequence for bills
    const seqResult = await client.query("SELECT nextval('bills_id_seq')");
    const billId = parseInt(seqResult.rows[0].nextval);
    
    // Get bill number format (BILL-XXXX)
    const billNumber = `BILL-${billId.toString().padStart(4, '0')}`;
    
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Insert bill record - match the actual database schema
    const billResult = await client.query(
      `INSERT INTO bills 
       (id, bill_number, company_id, vendor_id, date, due_date, amount, tax_amount, status, reference, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        billId,
        billNumber,
        targetCompanyId,
        sourceCompanyId,
        now,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 30 days
        amount,
        0, // No tax for intercompany transactions
        'Pending',
        `Transaction #${transactionId}`,
        `Intercompany bill for invoice #${invoiceId} from sales order #${salesOrderId}`
      ]
    );
    
    // Get the sales order items to create bill items
    const itemsResult = await client.query(
      'SELECT * FROM sales_order_items WHERE sales_order_id = $1',
      [salesOrderId]
    );
    
    // Insert bill items for each sales order item
    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO bill_items 
         (bill_id, product_id, description, quantity, unit_price, amount, tax_amount) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          billId,
          item.product_id,
          item.description || 'Intercompany item',
          item.quantity,
          item.unit_price,
          parseFloat(item.quantity) * parseFloat(item.unit_price),
          0 // No tax for intercompany transactions
        ]
      );
    }
    
    return billId;
  } catch (error) {
    console.error('Error creating bill:', error);
    throw new Error(`Failed to create bill: ${error.message}`);
  }
}

/**
 * Update a transaction with invoice and bill IDs
 */
async function updateTransactionWithDocuments(client, transactionId, invoiceId, billId) {
  try {
    await client.query(
      `UPDATE intercompany_transactions 
       SET source_invoice_id = $1, target_bill_id = $2 
       WHERE id = $3`,
      [invoiceId, billId, transactionId]
    );
  } catch (error) {
    console.error('Error updating transaction with documents:', error);
    throw new Error(`Failed to update transaction with document IDs: ${error.message}`);
  }
}

/**
 * Create journal entries for a transaction
 */
async function createJournalEntriesForTransaction(client, transactionId, sourceCompanyId, targetCompanyId, amount) {
  try {
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 1. Create journal entry for source company (Seller)
    // --- Debit Intercompany Receivable (Asset account), Credit Revenue (Income account)
    
    // Get accounts for source company
    const sourceAccountsResult = await client.query(
      `SELECT * FROM accounts 
       WHERE company_id = $1 AND (code = '1150' OR code = '4000')`,
      [sourceCompanyId]
    );
    
    const sourceAccounts = sourceAccountsResult.rows;
    const sourceReceivableAccount = sourceAccounts.find(a => a.code === '1150');
    const sourceRevenueAccount = sourceAccounts.find(a => a.code === '4000');
    
    if (!sourceReceivableAccount || !sourceRevenueAccount) {
      throw new Error('Required accounts for source company not found');
    }
    
    // Get next sequence for journal entries
    const sourceJournalSeqResult = await client.query("SELECT nextval('journal_entries_id_seq')");
    const sourceJournalId = parseInt(sourceJournalSeqResult.rows[0].nextval);
    
    // Create journal entry for source company
    await client.query(
      `INSERT INTO journal_entries 
       (id, entry_number, company_id, entry_date, reference, notes, transaction_type, transaction_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sourceJournalId,
        `JE-${sourceJournalId.toString().padStart(4, '0')}`,
        sourceCompanyId,
        now,
        `Transaction #${transactionId}`,
        'Intercompany sale',
        'Sale',
        transactionId
      ]
    );
    
    // Create journal entry items for source company
    
    // Get next sequence for journal entry items
    const sourceItemSeq1Result = await client.query("SELECT nextval('journal_entry_items_id_seq')");
    const sourceItemId1 = parseInt(sourceItemSeq1Result.rows[0].nextval);
    
    const sourceItemSeq2Result = await client.query("SELECT nextval('journal_entry_items_id_seq')");
    const sourceItemId2 = parseInt(sourceItemSeq2Result.rows[0].nextval);
    
    // Debit Intercompany Receivable
    await client.query(
      `INSERT INTO journal_entry_items 
       (id, journal_entry_id, account_id, description, debit, credit) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sourceItemId1,
        sourceJournalId,
        sourceReceivableAccount.id,
        'Intercompany receivable',
        amount,
        0
      ]
    );
    
    // Credit Revenue
    await client.query(
      `INSERT INTO journal_entry_items 
       (id, journal_entry_id, account_id, description, debit, credit) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sourceItemId2,
        sourceJournalId,
        sourceRevenueAccount.id,
        'Intercompany revenue',
        0,
        amount
      ]
    );
    
    // Update account balances for source company
    await client.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, sourceReceivableAccount.id]
    );
    
    await client.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, sourceRevenueAccount.id]
    );
    
    // 2. Create journal entry for target company (Buyer)
    // --- Debit Inventory (Asset account), Credit Intercompany Payable (Liability account)
    
    // Get accounts for target company
    const targetAccountsResult = await client.query(
      `SELECT * FROM accounts 
       WHERE company_id = $1 AND (code = '1300' OR code = '2050')`,
      [targetCompanyId]
    );
    
    const targetAccounts = targetAccountsResult.rows;
    const targetInventoryAccount = targetAccounts.find(a => a.code === '1300');
    const targetPayableAccount = targetAccounts.find(a => a.code === '2050');
    
    if (!targetInventoryAccount || !targetPayableAccount) {
      throw new Error('Required accounts for target company not found');
    }
    
    // Get next sequence for journal entries
    const targetJournalSeqResult = await client.query("SELECT nextval('journal_entries_id_seq')");
    const targetJournalId = parseInt(targetJournalSeqResult.rows[0].nextval);
    
    // Create journal entry for target company
    await client.query(
      `INSERT INTO journal_entries 
       (id, entry_number, company_id, entry_date, reference, notes, transaction_type, transaction_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        targetJournalId,
        `JE-${targetJournalId.toString().padStart(4, '0')}`,
        targetCompanyId,
        now,
        `Transaction #${transactionId}`,
        'Intercompany purchase',
        'Purchase',
        transactionId
      ]
    );
    
    // Create journal entry items for target company
    
    // Get next sequence for journal entry items
    const targetItemSeq1Result = await client.query("SELECT nextval('journal_entry_items_id_seq')");
    const targetItemId1 = parseInt(targetItemSeq1Result.rows[0].nextval);
    
    const targetItemSeq2Result = await client.query("SELECT nextval('journal_entry_items_id_seq')");
    const targetItemId2 = parseInt(targetItemSeq2Result.rows[0].nextval);
    
    // Debit Inventory
    await client.query(
      `INSERT INTO journal_entry_items 
       (id, journal_entry_id, account_id, description, debit, credit) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        targetItemId1,
        targetJournalId,
        targetInventoryAccount.id,
        'Intercompany inventory purchase',
        amount,
        0
      ]
    );
    
    // Credit Intercompany Payable
    await client.query(
      `INSERT INTO journal_entry_items 
       (id, journal_entry_id, account_id, description, debit, credit) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        targetItemId2,
        targetJournalId,
        targetPayableAccount.id,
        'Intercompany payable',
        0,
        amount
      ]
    );
    
    // Update account balances for target company
    await client.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, targetInventoryAccount.id]
    );
    
    await client.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, targetPayableAccount.id]
    );
    
  } catch (error) {
    console.error('Error creating journal entries:', error);
    throw new Error(`Failed to create journal entries: ${error.message}`);
  }
}

/**
 * Get next sequence number for a table
 */
async function getNextSequence(client, tableName) {
  try {
    const result = await client.query(`SELECT nextval('${tableName}_id_seq')`);
    return parseInt(result.rows[0].nextval);
  } catch (error) {
    console.error(`Error getting next sequence for ${tableName}:`, error);
    throw new Error(`Failed to get next sequence for ${tableName}: ${error.message}`);
  }
}

export default router;