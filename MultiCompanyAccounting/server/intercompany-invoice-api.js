/**
 * Intercompany Invoice API
 * 
 * This module provides an API endpoint for creating invoices from intercompany sales orders.
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
    console.log('Successfully connected to external database for intercompany invoice API');
  })
  .catch(err => {
    console.error('Failed to connect to external database for intercompany invoice API:', err);
  });

/**
 * Get the next sequence for a given table and company
 */
async function getNextSequence(tableName, companyId) {
  const sequenceQuery = `
    SELECT MAX(CAST(SUBSTRING(SPLIT_PART(${tableName}_number, '-', 3) FROM 1) AS INTEGER)) as max_seq
    FROM ${tableName}
    WHERE company_id = $1
  `;
  
  try {
    const sequenceResult = await pool.query(sequenceQuery, [companyId]);
    return (sequenceResult.rows[0].max_seq || 0) + 1;
  } catch (error) {
    console.error(`Error getting next sequence for ${tableName}:`, error);
    return 1; // Default to 1 if there's an error
  }
}

/**
 * Get the current date and time in ISO format
 */
function getCurrentDateTime() {
  return new Date().toISOString();
}

/**
 * Create an invoice for a sales order
 */
async function createInvoiceForSalesOrder(sourceCompanyId, orderId) {
  try {
    // Get the sales order details
    const salesOrderQuery = `
      SELECT 
        so.*,
        c.name as customer_name,
        t.id as transaction_id,
        t.target_company_id
      FROM sales_orders so
      JOIN companies c ON so.customer_id = c.id
      LEFT JOIN intercompany_transactions t ON so.id = t.source_order_id
      WHERE so.id = $1 AND so.company_id = $2
    `;
    
    const salesOrderResult = await pool.query(salesOrderQuery, [orderId, sourceCompanyId]);
    
    if (salesOrderResult.rows.length === 0) {
      return { success: false, error: 'Sales order not found' };
    }
    
    const salesOrder = salesOrderResult.rows[0];
    
    // Get the sales order items
    const orderItemsQuery = `
      SELECT 
        soi.*,
        p.name as product_name
      FROM sales_order_items soi
      JOIN products p ON soi.product_id = p.id
      WHERE soi.sales_order_id = $1
    `;
    
    const orderItemsResult = await pool.query(orderItemsQuery, [orderId]);
    
    if (orderItemsResult.rows.length === 0) {
      return { success: false, error: 'No order items found for the sales order' };
    }
    
    // Check if invoice already exists
    const existingInvoiceQuery = `
      SELECT id FROM invoices WHERE (sales_order_id = $1 OR order_id = $1) AND company_id = $2
    `;
    
    const existingInvoiceResult = await pool.query(existingInvoiceQuery, [orderId, sourceCompanyId]);
    
    if (existingInvoiceResult.rows.length > 0) {
      return { 
        success: false, 
        error: 'Invoice already exists for this order',
        invoiceId: existingInvoiceResult.rows[0].id
      };
    }
    
    // Get the next invoice sequence
    const invoiceSequence = await getNextSequence('invoice', sourceCompanyId);
    
    // Create the invoice
    const now = getCurrentDateTime();
    const invoiceNumber = `INV-${sourceCompanyId}-${invoiceSequence}`;
    
    const insertInvoiceQuery = `
      INSERT INTO invoices (
        company_id, 
        order_id, 
        customer_id, 
        invoice_number, 
        date, 
        due_date, 
        status,
        total,
        balance_due,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
    
    const invoiceValues = [
      sourceCompanyId,
      orderId,
      salesOrder.customer_id,
      invoiceNumber,
      now,
      dueDate.toISOString(),
      'Pending',
      salesOrder.total,
      salesOrder.total,
      now,
      now
    ];
    
    const invoiceResult = await pool.query(insertInvoiceQuery, invoiceValues);
    const invoiceId = invoiceResult.rows[0].id;
    
    // Create invoice items
    for (const item of orderItemsResult.rows) {
      const insertInvoiceItemQuery = `
        INSERT INTO invoice_items (
          invoice_id,
          product_id,
          description,
          quantity,
          unit_price,
          total,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      const invoiceItemValues = [
        invoiceId,
        item.product_id,
        item.description || item.product_name,
        item.quantity,
        item.unit_price,
        (item.quantity * item.unit_price),
        now,
        now
      ];
      
      await pool.query(insertInvoiceItemQuery, invoiceItemValues);
    }
    
    // Create a journal entry for the invoice
    const journalEntryQuery = `
      INSERT INTO journal_entries (
        company_id,
        entry_date,
        reference_type,
        reference_id,
        description,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const journalEntryValues = [
      sourceCompanyId,
      now,
      'Invoice',
      invoiceId,
      `Journal entry for invoice ${invoiceNumber}`,
      now,
      now
    ];
    
    const journalEntryResult = await pool.query(journalEntryQuery, journalEntryValues);
    const journalEntryId = journalEntryResult.rows[0].id;
    
    // Get the company's chart of accounts
    const accountsQuery = `
      SELECT * FROM accounts WHERE company_id = $1
    `;
    
    const accountsResult = await pool.query(accountsQuery, [sourceCompanyId]);
    const accounts = accountsResult.rows;
    
    // Find the accounts receivable and revenue accounts
    const arAccount = accounts.find(a => a.code === '1100' || a.code === '1150');
    const revenueAccount = accounts.find(a => a.code === '4000');
    
    // Create journal entry items
    if (arAccount && revenueAccount) {
      // Debit accounts receivable
      const debitJournalItemQuery = `
        INSERT INTO journal_entry_items (
          journal_entry_id,
          account_id,
          description,
          debit,
          credit,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const debitJournalItemValues = [
        journalEntryId,
        arAccount.id,
        `Accounts receivable for invoice ${invoiceNumber}`,
        salesOrder.total,
        0,
        now,
        now
      ];
      
      await pool.query(debitJournalItemQuery, debitJournalItemValues);
      
      // Credit revenue
      const creditJournalItemQuery = `
        INSERT INTO journal_entry_items (
          journal_entry_id,
          account_id,
          description,
          debit,
          credit,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const creditJournalItemValues = [
        journalEntryId,
        revenueAccount.id,
        `Revenue for invoice ${invoiceNumber}`,
        0,
        salesOrder.total,
        now,
        now
      ];
      
      await pool.query(creditJournalItemQuery, creditJournalItemValues);
      
      // Update account balances
      // Increase accounts receivable
      const updateARAccountQuery = `
        UPDATE accounts 
        SET balance = balance + $1, updated_at = $2
        WHERE id = $3
      `;
      
      await pool.query(updateARAccountQuery, [salesOrder.total, now, arAccount.id]);
      
      // Increase revenue
      const updateRevenueAccountQuery = `
        UPDATE accounts 
        SET balance = balance + $1, updated_at = $2
        WHERE id = $3
      `;
      
      await pool.query(updateRevenueAccountQuery, [salesOrder.total, now, revenueAccount.id]);
    }
    
    // If this is part of an intercompany transaction, update the transaction with the invoice ID
    if (salesOrder.transaction_id) {
      const updateTransactionQuery = `
        UPDATE intercompany_transactions 
        SET source_invoice_id = $1, updated_at = $2
        WHERE id = $3
      `;
      
      await pool.query(updateTransactionQuery, [invoiceId, now, salesOrder.transaction_id]);
    }
    
    return { 
      success: true, 
      invoiceId,
      invoiceNumber,
      amount: salesOrder.total,
      targetCompanyId: salesOrder.target_company_id,
      transactionId: salesOrder.transaction_id
    };
  } catch (error) {
    console.error('Error creating invoice for sales order:', error);
    return { success: false, error: 'Failed to create invoice: ' + error.message };
  }
}

/**
 * Create a bill for a purchase order
 */
async function createBillForPurchaseOrder(targetCompanyId, orderId, sourceInvoiceDetails) {
  try {
    if (!sourceInvoiceDetails) {
      return { success: false, error: 'Source invoice details are required' };
    }
    
    // Get the purchase order details
    const purchaseOrderQuery = `
      SELECT 
        po.*,
        c.name as vendor_name,
        t.id as transaction_id
      FROM purchase_orders po
      JOIN companies c ON po.vendor_id = c.id
      LEFT JOIN intercompany_transactions t ON po.id = t.target_order_id
      WHERE po.id = $1 AND po.company_id = $2
    `;
    
    const purchaseOrderResult = await pool.query(purchaseOrderQuery, [orderId, targetCompanyId]);
    
    if (purchaseOrderResult.rows.length === 0) {
      return { success: false, error: 'Purchase order not found' };
    }
    
    const purchaseOrder = purchaseOrderResult.rows[0];
    
    // Get the purchase order items
    const orderItemsQuery = `
      SELECT 
        poi.*,
        p.name as product_name
      FROM purchase_order_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.purchase_order_id = $1
    `;
    
    const orderItemsResult = await pool.query(orderItemsQuery, [orderId]);
    
    // Check if bill already exists
    const existingBillQuery = `
      SELECT id FROM bills WHERE purchase_order_id = $1 AND company_id = $2
    `;
    
    const existingBillResult = await pool.query(existingBillQuery, [orderId, targetCompanyId]);
    
    if (existingBillResult.rows.length > 0) {
      return { 
        success: false, 
        error: 'Bill already exists for this order',
        billId: existingBillResult.rows[0].id
      };
    }
    
    // Get the next bill sequence
    const billSequence = await getNextSequence('bill', targetCompanyId);
    
    // Create the bill
    const now = getCurrentDateTime();
    const billNumber = `BILL-${targetCompanyId}-${billSequence}`;
    
    const insertBillQuery = `
      INSERT INTO bills (
        company_id, 
        purchase_order_id, 
        vendor_id, 
        reference_invoice_id,
        bill_number, 
        date, 
        due_date, 
        status,
        total,
        balance_due,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
    
    const billValues = [
      targetCompanyId,
      orderId,
      purchaseOrder.vendor_id,
      sourceInvoiceDetails.invoiceId,
      billNumber,
      now,
      dueDate.toISOString(),
      'Pending',
      purchaseOrder.total,
      purchaseOrder.total,
      now,
      now
    ];
    
    const billResult = await pool.query(insertBillQuery, billValues);
    const billId = billResult.rows[0].id;
    
    // Create bill items
    for (const item of orderItemsResult.rows) {
      const insertBillItemQuery = `
        INSERT INTO bill_items (
          bill_id,
          product_id,
          description,
          quantity,
          unit_price,
          total,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      const billItemValues = [
        billId,
        item.product_id,
        item.description || item.product_name,
        item.quantity,
        item.unit_price,
        (item.quantity * item.unit_price),
        now,
        now
      ];
      
      await pool.query(insertBillItemQuery, billItemValues);
    }
    
    // Create a journal entry for the bill
    const journalEntryQuery = `
      INSERT INTO journal_entries (
        company_id,
        entry_date,
        reference_type,
        reference_id,
        description,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const journalEntryValues = [
      targetCompanyId,
      now,
      'Bill',
      billId,
      `Journal entry for bill ${billNumber}`,
      now,
      now
    ];
    
    const journalEntryResult = await pool.query(journalEntryQuery, journalEntryValues);
    const journalEntryId = journalEntryResult.rows[0].id;
    
    // Get the company's chart of accounts
    const accountsQuery = `
      SELECT * FROM accounts WHERE company_id = $1
    `;
    
    const accountsResult = await pool.query(accountsQuery, [targetCompanyId]);
    const accounts = accountsResult.rows;
    
    // Find the accounts payable and expense accounts
    const apAccount = accounts.find(a => a.code === '2000' || a.code === '2050');
    const expenseAccount = accounts.find(a => a.code === '5000');
    
    // Create journal entry items
    if (apAccount && expenseAccount) {
      // Debit expense
      const debitJournalItemQuery = `
        INSERT INTO journal_entry_items (
          journal_entry_id,
          account_id,
          description,
          debit,
          credit,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const debitJournalItemValues = [
        journalEntryId,
        expenseAccount.id,
        `Expense for bill ${billNumber}`,
        purchaseOrder.total,
        0,
        now,
        now
      ];
      
      await pool.query(debitJournalItemQuery, debitJournalItemValues);
      
      // Credit accounts payable
      const creditJournalItemQuery = `
        INSERT INTO journal_entry_items (
          journal_entry_id,
          account_id,
          description,
          debit,
          credit,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      const creditJournalItemValues = [
        journalEntryId,
        apAccount.id,
        `Accounts payable for bill ${billNumber}`,
        0,
        purchaseOrder.total,
        now,
        now
      ];
      
      await pool.query(creditJournalItemQuery, creditJournalItemValues);
      
      // Update account balances
      // Increase expense
      const updateExpenseAccountQuery = `
        UPDATE accounts 
        SET balance = balance + $1, updated_at = $2
        WHERE id = $3
      `;
      
      await pool.query(updateExpenseAccountQuery, [purchaseOrder.total, now, expenseAccount.id]);
      
      // Increase accounts payable
      const updateAPAccountQuery = `
        UPDATE accounts 
        SET balance = balance + $1, updated_at = $2
        WHERE id = $3
      `;
      
      await pool.query(updateAPAccountQuery, [purchaseOrder.total, now, apAccount.id]);
    }
    
    // If this is part of an intercompany transaction, update the transaction with the bill ID
    if (purchaseOrder.transaction_id) {
      const updateTransactionQuery = `
        UPDATE intercompany_transactions 
        SET target_bill_id = $1, updated_at = $2, status = $3
        WHERE id = $4
      `;
      
      await pool.query(updateTransactionQuery, [
        billId, 
        now, 
        'Invoiced', 
        purchaseOrder.transaction_id
      ]);
    }
    
    return { 
      success: true, 
      billId,
      billNumber,
      amount: purchaseOrder.total
    };
  } catch (error) {
    console.error('Error creating bill for purchase order:', error);
    return { success: false, error: 'Failed to create bill: ' + error.message };
  }
}

/**
 * API endpoint to create an invoice and bill for an intercompany transaction
 */
router.post('/api/auto-invoicing/process-from-orders', async (req, res) => {
  try {
    const { sourceOrderId, targetOrderId } = req.body;
    
    if (!sourceOrderId || !targetOrderId) {
      return res.status(400).json({
        success: false,
        error: 'Source order ID and target order ID are required'
      });
    }
    
    // Get the transaction details to determine company IDs
    const transactionQuery = `
      SELECT * FROM intercompany_transactions
      WHERE source_order_id = $1 AND target_order_id = $2
    `;
    
    const transactionResult = await pool.query(transactionQuery, [sourceOrderId, targetOrderId]);
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Intercompany transaction not found'
      });
    }
    
    const transaction = transactionResult.rows[0];
    
    // Create invoice for the source company
    const invoiceResult = await createInvoiceForSalesOrder(
      transaction.source_company_id, 
      sourceOrderId
    );
    
    if (!invoiceResult.success) {
      return res.status(400).json({
        success: false,
        error: invoiceResult.error
      });
    }
    
    // Create bill for the target company
    const billResult = await createBillForPurchaseOrder(
      transaction.target_company_id, 
      targetOrderId,
      invoiceResult
    );
    
    if (!billResult.success) {
      return res.status(400).json({
        success: false,
        error: billResult.error
      });
    }
    
    return res.status(201).json({
      success: true,
      invoice: {
        id: invoiceResult.invoiceId,
        number: invoiceResult.invoiceNumber,
        amount: invoiceResult.amount
      },
      bill: {
        id: billResult.billId,
        number: billResult.billNumber,
        amount: billResult.amount
      },
      transactionId: transaction.id
    });
    
  } catch (error) {
    console.error('Error processing auto-invoicing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process auto-invoicing'
    });
  }
});

export default router;