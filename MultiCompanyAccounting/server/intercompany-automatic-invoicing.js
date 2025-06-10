/**
 * Intercompany Automatic Invoicing Module
 * 
 * This module automatically creates invoices and receipts for intercompany 
 * transactions that don't have them already in the database.
 */

const { Pool } = require('pg');

// External database configuration
const dbConfig = {
  host: '135.235.154.222',
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  port: 5432
};

const pool = new Pool(dbConfig);

// Get the current date formatted for SQL
function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

// Get next ID for a table
async function getNextId(table) {
  const result = await pool.query(
    `SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${table}`
  );
  return result.rows[0].next_id;
}

// Get pending intercompany transactions without invoices or receipts
async function getPendingTransactions() {
  const query = `
    SELECT t.id, t.transaction_date, t.amount, t.description, t.status,
           t.source_company_id, t.target_company_id, t.source_order_id, t.target_order_id,
           t.source_invoice_id, t.target_bill_id, t.source_receipt_id, t.payment_status,
           sc.name as source_company_name, tc.name as target_company_name,
           so.order_number as source_order_number, po.order_number as target_order_number
    FROM intercompany_transactions t
    JOIN companies sc ON t.source_company_id = sc.id
    JOIN companies tc ON t.target_company_id = tc.id
    LEFT JOIN sales_orders so ON t.source_order_id = so.id
    LEFT JOIN purchase_orders po ON t.target_order_id = po.id
    WHERE (t.source_invoice_id IS NULL OR t.target_bill_id IS NULL OR t.source_receipt_id IS NULL)
      AND t.source_order_id IS NOT NULL 
      AND t.target_order_id IS NOT NULL
    ORDER BY t.id DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

// Create invoice and bill for a transaction
async function createInvoicesForTransaction(transaction) {
  console.log(`Processing transaction ${transaction.id} for invoicing...`);
  
  try {
    // Check if invoices already exist
    if (transaction.source_invoice_id && transaction.target_bill_id) {
      console.log(`Transaction ${transaction.id} already has invoices. Skipping.`);
      return { 
        success: true, 
        invoiceId: transaction.source_invoice_id, 
        billId: transaction.target_bill_id 
      };
    }
    
    // Get order details and items
    const sourceOrderQuery = `
      SELECT so.*, soi.id as item_id, soi.product_id, soi.description as item_description, 
             soi.quantity, soi.unit_price, soi.amount, p.name as product_name
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.sales_order_id
      LEFT JOIN products p ON soi.product_id = p.id
      WHERE so.id = $1
    `;
    
    const sourceOrderResult = await pool.query(sourceOrderQuery, [transaction.source_order_id]);
    if (sourceOrderResult.rows.length === 0) {
      throw new Error(`No line items found for sales order ${transaction.source_order_id}`);
    }
    
    const orderItems = sourceOrderResult.rows;
    const order = {
      id: orderItems[0].id,
      orderNumber: orderItems[0].order_number,
      total: orderItems[0].total,
      items: orderItems.map(item => ({
        id: item.item_id,
        productId: item.product_id,
        description: item.item_description || item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        amount: item.amount
      }))
    };
    
    // 1. Create invoice if it doesn't exist
    let invoiceId = transaction.source_invoice_id;
    if (!invoiceId) {
      const currentDateTime = getCurrentDateTime();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now
      
      // Generate an invoice number
      const now = new Date();
      const dateCode = `${now.getMonth() + 1}${now.getDate()}`;
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const invoiceNumber = `INV-${dateCode}-${randomNum}`;
      
      // Get the next ID
      invoiceId = await getNextId('invoices');
      
      // Create the invoice record
      const insertInvoiceQuery = `
        INSERT INTO invoices (
          id, company_id, customer_id, invoice_number, date, due_date,
          total_amount, status, sales_order_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const invoiceResult = await pool.query(insertInvoiceQuery, [
        invoiceId,
        transaction.source_company_id,
        transaction.target_company_id,
        invoiceNumber,
        currentDateTime.split(' ')[0], // Just the date part
        dueDate,
        transaction.amount,
        'Unpaid',
        transaction.source_order_id,
        currentDateTime
      ]);
      
      if (invoiceResult.rows.length === 0) {
        throw new Error('Failed to create invoice');
      }
      
      invoiceId = invoiceResult.rows[0].id;
      console.log(`Created invoice ID: ${invoiceId} with number ${invoiceNumber}`);
      
      // Create invoice items based on sales order items
      for (const item of order.items) {
        const invoiceItemId = await getNextId('invoice_items');
        
        const insertInvoiceItemQuery = `
          INSERT INTO invoice_items (
            id, invoice_id, product_id, description, quantity, unit_price, amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        await pool.query(insertInvoiceItemQuery, [
          invoiceItemId,
          invoiceId,
          item.productId,
          item.description || 'Intercompany product',
          item.quantity,
          item.unitPrice,
          item.amount
        ]);
      }
      console.log(`Added ${order.items.length} items to invoice ${invoiceId}`);
    }
    
    // 2. Create bill if it doesn't exist
    let billId = transaction.target_bill_id;
    if (!billId) {
      const currentDateTime = getCurrentDateTime();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now
      
      // Generate a bill number
      const now = new Date();
      const dateCode = `${now.getMonth() + 1}${now.getDate()}`;
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const billNumber = `BILL-${dateCode}-${randomNum}`;
      
      // Get the next ID
      billId = await getNextId('bills');
      
      // Create the bill record
      const insertBillQuery = `
        INSERT INTO bills (
          id, company_id, vendor_id, bill_number, date, due_date,
          total_amount, status, purchase_order_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const billResult = await pool.query(insertBillQuery, [
        billId,
        transaction.target_company_id,
        transaction.source_company_id,
        billNumber,
        currentDateTime.split(' ')[0], // Just the date part
        dueDate,
        transaction.amount,
        'Unpaid',
        transaction.target_order_id,
        currentDateTime
      ]);
      
      if (billResult.rows.length === 0) {
        throw new Error('Failed to create bill');
      }
      
      billId = billResult.rows[0].id;
      console.log(`Created bill ID: ${billId} with number ${billNumber}`);
      
      // Create bill items based on sales order items
      for (const item of order.items) {
        const billItemId = await getNextId('bill_items');
        
        const insertBillItemQuery = `
          INSERT INTO bill_items (
            id, bill_id, product_id, description, quantity, unit_price, amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        await pool.query(insertBillItemQuery, [
          billItemId,
          billId,
          item.productId,
          item.description || 'Intercompany product',
          item.quantity,
          item.unitPrice,
          item.amount
        ]);
      }
      console.log(`Added ${order.items.length} items to bill ${billId}`);
    }
    
    // 3. Update transaction with invoice and bill IDs
    const updateTransactionQuery = `
      UPDATE intercompany_transactions
      SET source_invoice_id = $1, target_bill_id = $2, status = $3
      WHERE id = $4
      RETURNING id
    `;
    
    await pool.query(updateTransactionQuery, [
      invoiceId,
      billId,
      transaction.status === 'Pending' ? 'Active' : transaction.status,
      transaction.id
    ]);
    
    console.log(`Updated transaction ${transaction.id} with invoice ID ${invoiceId} and bill ID ${billId}`);
    
    return { success: true, invoiceId, billId };
  } catch (error) {
    console.error(`Error creating invoices for transaction ${transaction.id}:`, error);
    return { success: false, error: error.message };
  }
}

// Create a receipt for the invoice
async function createReceiptForTransaction(transaction, invoiceId) {
  console.log(`Processing transaction ${transaction.id} for receipt creation...`);
  
  try {
    // Check if receipt already exists
    if (transaction.source_receipt_id) {
      console.log(`Transaction ${transaction.id} already has a receipt. Skipping.`);
      return { success: true, receiptId: transaction.source_receipt_id };
    }
    
    // Make sure we have an invoice ID
    if (!invoiceId && !transaction.source_invoice_id) {
      throw new Error('No invoice ID provided for receipt creation');
    }
    invoiceId = invoiceId || transaction.source_invoice_id;
    
    // Get invoice details
    const invoiceQuery = `
      SELECT * FROM invoices WHERE id = $1
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [invoiceId]);
    if (invoiceResult.rows.length === 0) {
      throw new Error(`No invoice found with ID ${invoiceId}`);
    }
    
    const invoice = invoiceResult.rows[0];
    const currentDateTime = getCurrentDateTime();
    
    // Generate a receipt number
    const now = new Date();
    const dateCode = `${now.getMonth() + 1}${now.getDate()}`;
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const receiptNumber = `RCPT-${dateCode}-${randomNum}`;
    
    // Get the next ID
    const receiptId = await getNextId('receipts');
    
    // Create the receipt record
    const insertReceiptQuery = `
      INSERT INTO receipts (
        id, company_id, customer_id, invoice_id, receipt_number, receipt_date,
        amount, payment_method, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    
    const receiptResult = await pool.query(insertReceiptQuery, [
      receiptId,
      invoice.company_id,
      invoice.customer_id,
      invoiceId,
      receiptNumber,
      currentDateTime.split(' ')[0], // Just the date part
      invoice.total_amount,
      'Bank Transfer',
      `Automatic receipt for invoice ${invoice.invoice_number}`,
      currentDateTime
    ]);
    
    if (receiptResult.rows.length === 0) {
      throw new Error('Failed to create receipt');
    }
    
    console.log(`Created receipt ID: ${receiptId} with number ${receiptNumber}`);
    
    // Create journal entry for the receipt
    // Debit: Cash (1000), Credit: Intercompany Receivable (1150)
    const journalId = await getNextId('journal_entries');
    const journalEntryQuery = `
      INSERT INTO journal_entries (
        id, company_id, entry_date, description, reference_type, reference_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    await pool.query(journalEntryQuery, [
      journalId,
      invoice.company_id,
      currentDateTime.split(' ')[0], // Just the date part
      `Journal entry for receipt ${receiptId}`,
      'Receipt',
      receiptId,
      currentDateTime
    ]);
    
    // Get accounts for the company
    const accountsQuery = `
      SELECT id, code, name FROM accounts 
      WHERE company_id = $1 AND (code = '1000' OR code = '1150')
    `;
    
    const accountsResult = await pool.query(accountsQuery, [invoice.company_id]);
    if (accountsResult.rows.length < 2) {
      throw new Error(`Required accounts not found for company ${invoice.company_id}`);
    }
    
    const cashAccount = accountsResult.rows.find(a => a.code === '1000');
    const receivableAccount = accountsResult.rows.find(a => a.code === '1150');
    
    if (!cashAccount || !receivableAccount) {
      throw new Error(`Cash (1000) or Intercompany Receivable (1150) account not found for company ${invoice.company_id}`);
    }
    
    // Journal Entry Items
    const journalItem1Id = await getNextId('journal_entry_items');
    const journalItem2Id = await getNextId('journal_entry_items');
    
    // Debit: Cash
    await pool.query(
      `INSERT INTO journal_entry_items (id, journal_entry_id, account_id, description, debit, credit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        journalItem1Id,
        journalId,
        cashAccount.id,
        `Cash receipt for invoice ${invoiceId}`,
        invoice.total_amount,
        0
      ]
    );
    
    // Credit: Intercompany Receivable
    await pool.query(
      `INSERT INTO journal_entry_items (id, journal_entry_id, account_id, description, debit, credit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        journalItem2Id,
        journalId,
        receivableAccount.id,
        `Payment received for invoice ${invoiceId}`,
        0,
        invoice.total_amount
      ]
    );
    
    // Update account balances
    await pool.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [invoice.total_amount, cashAccount.id]
    );
    
    await pool.query(
      `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
      [invoice.total_amount, receivableAccount.id]
    );
    
    // Update invoice status
    await pool.query(
      `UPDATE invoices SET status = 'Paid' WHERE id = $1`,
      [invoiceId]
    );
    
    // Update the intercompany transaction with receipt ID
    await pool.query(
      `UPDATE intercompany_transactions 
       SET source_receipt_id = $1, payment_status = 'Paid', status = 'Completed'
       WHERE id = $2`,
      [receiptId, transaction.id]
    );
    
    console.log(`Created journal entry ID: ${journalId} for receipt`);
    console.log(`Updated account balances for company ${invoice.company_id}`);
    console.log(`Updated invoice ${invoiceId} status to Paid`);
    console.log(`Updated transaction ${transaction.id} payment status to Paid and status to Completed`);
    
    return { success: true, receiptId };
  } catch (error) {
    console.error(`Error creating receipt for transaction ${transaction.id}:`, error);
    return { success: false, error: error.message };
  }
}

// Process a single pending transaction
async function processTransaction(transaction) {
  console.log(`\nProcessing transaction ID: ${transaction.id}`);
  console.log(`Source Order: ${transaction.source_order_number} (ID: ${transaction.source_order_id})`);
  console.log(`Target Order: ${transaction.target_order_number} (ID: ${transaction.target_order_id})`);
  console.log(`Source Company: ${transaction.source_company_name} (ID: ${transaction.source_company_id})`);
  console.log(`Target Company: ${transaction.target_company_name} (ID: ${transaction.target_company_id})`);
  console.log(`Amount: ${transaction.amount}`);
  console.log(`Status: ${transaction.status}, Payment Status: ${transaction.payment_status || 'Not Paid'}`);
  console.log(`Has Invoice: ${transaction.source_invoice_id ? 'Yes' : 'No'}, Has Bill: ${transaction.target_bill_id ? 'Yes' : 'No'}, Has Receipt: ${transaction.source_receipt_id ? 'Yes' : 'No'}`);
  
  try {
    // 1. Create invoices if needed
    let invoiceId = transaction.source_invoice_id;
    let billId = transaction.target_bill_id;
    
    if (!invoiceId || !billId) {
      const invoiceResult = await createInvoicesForTransaction(transaction);
      if (!invoiceResult.success) {
        console.error(`Failed to create invoices: ${invoiceResult.error}`);
        return false;
      }
      
      invoiceId = invoiceResult.invoiceId;
      billId = invoiceResult.billId;
    }
    
    // 2. Create receipt if needed
    if (!transaction.source_receipt_id) {
      const receiptResult = await createReceiptForTransaction(transaction, invoiceId);
      if (!receiptResult.success) {
        console.error(`Failed to create receipt: ${receiptResult.error}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing transaction ${transaction.id}:`, error);
    return false;
  }
}

// Process all pending transactions
async function processAllPendingTransactions() {
  try {
    const transactions = await getPendingTransactions();
    console.log(`Found ${transactions.length} pending transactions to process`);
    
    for (const transaction of transactions) {
      await processTransaction(transaction);
    }
    
    return {
      success: true,
      processed: transactions.length,
      message: `Processed ${transactions.length} pending transactions`
    };
  } catch (error) {
    console.error("Error processing pending transactions:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getPendingTransactions,
  processTransaction,
  processAllPendingTransactions,
  createInvoicesForTransaction,
  createReceiptForTransaction
};