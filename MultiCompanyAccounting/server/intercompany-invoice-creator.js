/**
 * Intercompany Invoice Creator
 * 
 * This module creates matching purchase invoices (bills) whenever a sales invoice is created
 * for intercompany transactions to ensure proper dual-sided accounting.
 */

import pg from 'pg';

// Create a PostgreSQL connection pool for the external database
const pool = new pg.Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123'
});

/**
 * Creates a matching purchase invoice (bill) for an intercompany sales invoice
 * and updates the intercompany transaction record.
 * 
 * @param {Object} params - Parameters for creating the bill
 * @param {number} params.invoiceId - The sales invoice ID
 * @param {number} params.sourceCompanyId - The source (seller) company ID
 * @param {number} params.targetCompanyId - The target (buyer) company ID
 * @param {string} params.description - Bill description
 * @param {number} params.amount - Bill amount
 * @param {Date|string} params.invoiceDate - Invoice date
 * @param {number} params.salesOrderId - Related sales order ID
 * @param {number} params.purchaseOrderId - Related purchase order ID (optional)
 * @returns {Promise<Object>} The created bill and updated intercompany transaction
 */
export async function createMatchingBill(params) {
  const {
    invoiceId,
    sourceCompanyId,
    targetCompanyId,
    description,
    amount,
    invoiceDate,
    salesOrderId,
    purchaseOrderId = null
  } = params;
  
  console.log(`Creating matching bill for invoice ID: ${invoiceId}`);
  console.log(`Source company: ${sourceCompanyId}, Target company: ${targetCompanyId}`);
  console.log(`Amount: ${amount}, Invoice date: ${invoiceDate}`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Find account IDs for target company (Accounts Payable and Inventory)
    const targetAccountsQuery = `
      SELECT 
        id, 
        code,
        name
      FROM 
        accounts 
      WHERE 
        company_id = $1 AND 
        (code = '2000' OR code = '1300')
    `;
    
    const targetAccountsResult = await client.query(targetAccountsQuery, [targetCompanyId]);
    
    if (targetAccountsResult.rows.length < 2) {
      throw new Error(`Target company ${targetCompanyId} is missing required accounts (AP and Inventory)`);
    }
    
    // Find the AP and Inventory accounts for target company
    const targetAPAccount = targetAccountsResult.rows.find(acc => acc.code === '2000');
    const targetInventoryAccount = targetAccountsResult.rows.find(acc => acc.code === '1300');
    
    if (!targetAPAccount || !targetInventoryAccount) {
      throw new Error('Required accounts are missing for target company');
    }
    
    // Generate bill number
    const billNumber = `BILL-${targetCompanyId}-${Date.now()}`;
    
    // Create bill
    const createBillQuery = `
      INSERT INTO bills (
        company_id,
        vendor_id,
        purchase_order_id,
        bill_number,
        bill_date,
        due_date,
        amount,
        description,
        status,
        debit_account_id,
        credit_account_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;
    
    // Calculate due date (30 days from invoice date)
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const billResult = await client.query(createBillQuery, [
      targetCompanyId,                // company_id
      sourceCompanyId,                // vendor_id
      purchaseOrderId,                // purchase_order_id
      billNumber,                     // bill_number
      invoiceDate,                    // bill_date
      dueDate.toISOString().split('T')[0],  // due_date
      amount,                         // amount
      description,                    // description
      'unpaid',                       // status
      targetInventoryAccount.id,      // debit_account_id (DR Inventory)
      targetAPAccount.id              // credit_account_id (CR Accounts Payable)
    ]);
    
    const billId = billResult.rows[0].id;
    
    // Create journal entries for target company (customer) - Purchase side
    const targetJournalQuery = `
      INSERT INTO journal_entries (
        company_id,
        entry_date,
        reference_number,
        description,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id
    `;
    
    const targetJournalResult = await client.query(targetJournalQuery, [
      targetCompanyId,
      invoiceDate,
      billNumber,
      `Bill created for purchase from ${sourceCompanyId}`
    ]);
    
    const targetJournalId = targetJournalResult.rows[0].id;
    
    // Create journal entry items for target company
    const targetJournalItemsQuery = `
      INSERT INTO journal_entry_items (
        journal_entry_id,
        account_id,
        description,
        debit,
        credit,
        created_at,
        updated_at
      )
      VALUES 
        ($1, $2, $3, $4, 0, NOW(), NOW()),
        ($1, $5, $6, 0, $7, NOW(), NOW())
    `;
    
    await client.query(targetJournalItemsQuery, [
      targetJournalId,
      targetInventoryAccount.id,
      'Purchased inventory from supplier',
      amount,
      targetAPAccount.id,
      'Created accounts payable for supplier',
      amount
    ]);
    
    // Create or update intercompany transaction
    const intercompanyTransactionQuery = `
      SELECT id FROM intercompany_transactions 
      WHERE source_invoice_id = $1 OR sales_order_id = $2
    `;
    
    const transactionResult = await client.query(intercompanyTransactionQuery, [invoiceId, salesOrderId]);
    
    let intercompanyTransactionId;
    
    if (transactionResult.rows.length > 0) {
      // Update existing intercompany transaction
      intercompanyTransactionId = transactionResult.rows[0].id;
      
      const updateTransactionQuery = `
        UPDATE intercompany_transactions
        SET
          source_invoice_id = $1,
          target_bill_id = $2,
          amount = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      await client.query(updateTransactionQuery, [
        invoiceId,
        billId,
        amount,
        intercompanyTransactionId
      ]);
    } else {
      // Create new intercompany transaction
      const createTransactionQuery = `
        INSERT INTO intercompany_transactions (
          source_company_id,
          target_company_id,
          sales_order_id,
          purchase_order_id,
          source_invoice_id,
          target_bill_id,
          amount,
          status,
          transaction_date,
          description,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;
      
      const newTransactionResult = await client.query(createTransactionQuery, [
        sourceCompanyId,
        targetCompanyId,
        salesOrderId,
        purchaseOrderId,
        invoiceId,
        billId,
        amount,
        'invoice_created',
        invoiceDate,
        description
      ]);
      
      intercompanyTransactionId = newTransactionResult.rows[0].id;
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return {
      success: true,
      bill: billResult.rows[0],
      intercompanyTransactionId
    };
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error creating matching bill:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Hook function to be called after a sales invoice is created
 * to automatically create a matching bill for the other company
 * 
 * @param {Object} invoice - The newly created sales invoice
 * @returns {Promise<Object>} Result of the bill creation
 */
export async function createMatchingBillForInvoice(invoice) {
  try {
    console.log('Creating matching bill for newly created invoice:', invoice.id);
    
    // First, check if this is an intercompany transaction by looking for a related sales order
    // that involves two different companies
    const salesOrderQuery = `
      SELECT 
        so.*,
        it.id AS intercompany_transaction_id,
        it.source_company_id,
        it.target_company_id
      FROM 
        sales_orders so
      LEFT JOIN 
        intercompany_transactions it ON so.id = it.sales_order_id
      WHERE 
        so.id = $1
    `;
    
    const client = await pool.connect();
    
    try {
      const salesOrderResult = await client.query(salesOrderQuery, [invoice.sales_order_id]);
      
      if (salesOrderResult.rows.length === 0) {
        console.log('No related sales order found for invoice:', invoice.id);
        return { success: false, reason: 'No related sales order found' };
      }
      
      const salesOrder = salesOrderResult.rows[0];
      
      // If it's not an intercompany transaction (no intercompany_transaction_id and 
      // customer_id is not a company), skip bill creation
      if (!salesOrder.intercompany_transaction_id &&
          invoice.company_id === invoice.customer_id) {
        console.log('Not an intercompany transaction, skipping bill creation');
        return { success: false, reason: 'Not an intercompany transaction' };
      }
      
      // Determine source and target companies
      let sourceCompanyId = invoice.company_id;
      let targetCompanyId = invoice.customer_id;
      
      // If there's an existing intercompany transaction, use its details
      if (salesOrder.intercompany_transaction_id) {
        sourceCompanyId = salesOrder.source_company_id;
        targetCompanyId = salesOrder.target_company_id;
      }
      
      // Create the matching bill
      const matchingBill = await createMatchingBill({
        invoiceId: invoice.id,
        sourceCompanyId,
        targetCompanyId,
        description: `Bill for invoice ${invoice.invoice_number}`,
        amount: invoice.amount,
        invoiceDate: invoice.invoice_date,
        salesOrderId: invoice.sales_order_id,
        purchaseOrderId: null // Usually not available in this flow
      });
      
      console.log('Successfully created matching bill:', matchingBill.bill.id);
      return matchingBill;
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error in hook function to create matching bill:', error);
    throw error;
  }
}

/**
 * Hook function to register with the Express app
 * This adds route middleware to catch new invoice creation
 * and automatically create matching bills
 * 
 * @param {Express} app - The Express app instance
 */
export function registerInvoiceCreationHook(app) {
  // Middleware to capture invoice creation and create matching bills
  app.use((req, res, next) => {
    // Capture the original response.json method
    const originalJson = res.json;
    
    // Override the json method to intercept successful invoice creation responses
    res.json = function(data) {
      // Check if this is a successful invoice creation response
      const isInvoiceCreation = req.method === 'POST' && 
                               (req.path === '/api/invoices' || 
                                req.path.includes('/api/invoice'));
      
      if (isInvoiceCreation && res.statusCode >= 200 && res.statusCode < 300 && data) {
        // Avoid blocking the response - do this asynchronously
        setTimeout(() => {
          createMatchingBillForInvoice(data)
            .then(result => {
              console.log('Auto-created matching bill result:', result);
            })
            .catch(error => {
              console.error('Error auto-creating matching bill:', error);
            });
        }, 0);
      }
      
      // Call the original method to continue the response
      return originalJson.call(this, data);
    };
    
    next();
  });
}