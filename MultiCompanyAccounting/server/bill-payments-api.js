/**
 * Bill Payments API - Track Payments Made by Companies
 * 
 * This API manages bill payments (money going out) to match receipts (money coming in)
 * for complete double-entry accounting
 */

import express from 'express';
import pg from 'pg';

const { Pool } = pg;

// External database connection - same pattern as receipts
const pool = new Pool({
  host: '135.235.154.222',
  user: 'pguser',
  password: 'StrongP@ss123',
  database: 'account_replit_staging',
  port: 5432
});

const router = express.Router();

// Create bill payments table if it doesn't exist
router.post('/api/setup-bill-payments-table', async (req, res) => {
  try {
    console.log('🏗️ Setting up bill payments table...');
    
    // Create bill_payments table with same structure as receipts
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bill_payments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        vendor_id INTEGER,
        bill_id INTEGER,
        purchase_order_id INTEGER,
        payment_number VARCHAR(100),
        amount DECIMAL(15,2) NOT NULL,
        payment_method VARCHAR(50),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reference_number VARCHAR(255),
        is_partial_payment BOOLEAN DEFAULT false,
        debit_account_id INTEGER,
        credit_account_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await pool.query(createTableQuery);
    
    // Add indexes for performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_bill_payments_company_id ON bill_payments(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_bill_payments_vendor_id ON bill_payments(vendor_id)',
      'CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments(bill_id)',
      'CREATE INDEX IF NOT EXISTS idx_bill_payments_date ON bill_payments(payment_date)'
    ];
    
    for (const indexQuery of indexQueries) {
      await pool.query(indexQuery);
    }
    
    console.log('✅ Bill payments table created successfully');
    
    res.json({
      success: true,
      message: 'Bill payments table created with indexes',
      tableStructure: 'Mirrors receipts table for double-entry accounting'
    });
    
  } catch (error) {
    console.error('❌ Error setting up bill payments table:', error.message);
    res.status(500).json({ 
      error: 'Failed to setup bill payments table',
      details: error.message 
    });
  }
});

// Get all bill payments for a company
router.get('/api/bill-payments', async (req, res) => {
  try {
    const companyId = req.query.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    console.log(`💳 Getting bill payments for company ${companyId}`);
    
    const query = `
      SELECT 
        bp.*,
        c.name as vendor_name
      FROM bill_payments bp
      LEFT JOIN companies c ON bp.vendor_id = c.id
      WHERE bp.company_id = $1
      ORDER BY bp.payment_date DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    
    const totalAmount = result.rows.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
    
    console.log(`✅ Found ${result.rows.length} bill payments totaling $${totalAmount.toFixed(2)}`);
    
    res.json({
      billPayments: result.rows,
      totalPayments: result.rows.length,
      totalAmount: totalAmount,
      companyId: parseInt(companyId)
    });
    
  } catch (error) {
    console.error('❌ Bill payments API error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get bill payments',
      details: error.message 
    });
  }
});

// Create a new bill payment with journal entries
router.post('/api/bill-payments', async (req, res) => {
  try {
    console.log('💳 Creating new bill payment with journal entries...');
    
    const {
      companyId,
      vendorId,
      billId,
      purchaseOrderId,
      amount,
      paymentMethod = 'Bank Transfer',
      referenceNumber,
      isPartialPayment = false,
      debitAccountId,
      creditAccountId,
      notes
    } = req.body;
    
    if (!companyId || !amount) {
      return res.status(400).json({ error: 'Company ID and amount are required' });
    }
    
    // Generate payment number
    const paymentNumber = `BP-${companyId}-${Date.now()}`;
    
    // Start transaction for bill payment + journal entries
    await pool.query('BEGIN');
    
    try {
      // 1. Insert bill payment record
      const insertPaymentQuery = `
        INSERT INTO bill_payments (
          company_id, vendor_id, bill_id, purchase_order_id,
          payment_number, amount, payment_method, reference_number,
          is_partial_payment, debit_account_id, credit_account_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const paymentValues = [
        companyId, vendorId, billId, purchaseOrderId,
        paymentNumber, amount, paymentMethod, referenceNumber,
        isPartialPayment, debitAccountId, creditAccountId, notes
      ];
      
      const paymentResult = await pool.query(insertPaymentQuery, paymentValues);
      const newPayment = paymentResult.rows[0];
      
      // 2. Create journal entries for double-entry accounting
      const journalEntryQuery = `
        INSERT INTO journal_entries (
          company_id, transaction_type, reference_id, reference_number,
          account_id, debit_amount, credit_amount, description,
          entry_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;
      
      // Debit entry (reduce cash/bank account)
      if (creditAccountId) {
        await pool.query(journalEntryQuery, [
          companyId, 'bill_payment', newPayment.id, paymentNumber,
          creditAccountId, 0, amount, 
          `Bill payment to vendor - ${notes || paymentMethod}`
        ]);
      }
      
      // Credit entry (reduce accounts payable)
      if (debitAccountId) {
        await pool.query(journalEntryQuery, [
          companyId, 'bill_payment', newPayment.id, paymentNumber,
          debitAccountId, amount, 0,
          `Bill payment - reduce payable to vendor`
        ]);
      }
      
      await pool.query('COMMIT');
      
      console.log(`✅ Created bill payment ${newPayment.payment_number} for $${newPayment.amount} with journal entries`);
      
      res.status(201).json({
        success: true,
        billPayment: newPayment,
        journalEntriesCreated: true,
        message: `Bill payment ${newPayment.payment_number} created with journal entries`
      });
      
    } catch (journalError) {
      await pool.query('ROLLBACK');
      throw journalError;
    }
    
  } catch (error) {
    console.error('❌ Error creating bill payment:', error.message);
    res.status(500).json({ 
      error: 'Failed to create bill payment',
      details: error.message 
    });
  }
});

// Get bill payments summary for a company
router.get('/api/bill-payments-summary', async (req, res) => {
  try {
    const companyId = req.query.companyId;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    console.log(`💳 Getting bill payments summary for company ${companyId}`);
    
    const query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        MIN(payment_date) as earliest_payment,
        MAX(payment_date) as latest_payment,
        COUNT(DISTINCT vendor_id) as unique_vendors,
        COUNT(DISTINCT bill_id) as unique_bills
      FROM bill_payments 
      WHERE company_id = $1
    `;
    
    const result = await pool.query(query, [companyId]);
    const summary = result.rows[0];
    
    res.json({
      totalPayments: parseInt(summary.total_payments || 0),
      totalAmount: parseFloat(summary.total_amount || 0),
      earliestPayment: summary.earliest_payment,
      latestPayment: summary.latest_payment,
      uniqueVendors: parseInt(summary.unique_vendors || 0),
      uniqueBills: parseInt(summary.unique_bills || 0)
    });
    
  } catch (error) {
    console.error('❌ Bill payments summary error:', error.message);
    res.status(500).json({ 
      error: 'Failed to get bill payments summary',
      details: error.message 
    });
  }
});

// Create bill payment for existing purchase order
router.post('/api/bill-payments/from-purchase-order', async (req, res) => {
  try {
    console.log('💳 Creating bill payment for existing purchase order...');
    
    const {
      purchaseOrderId,
      amount,
      paymentMethod = 'Bank Transfer',
      referenceNumber,
      isPartialPayment = false,
      notes
    } = req.body;
    
    if (!purchaseOrderId || !amount) {
      return res.status(400).json({ error: 'Purchase Order ID and amount are required' });
    }
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // 1. Get purchase order details
      const poQuery = `
        SELECT po.*, c.name as vendor_name, bills.id as bill_id
        FROM purchase_orders po
        LEFT JOIN companies c ON po.vendor_id = c.id
        LEFT JOIN bills ON bills.purchase_order_id = po.id
        WHERE po.id = $1
      `;
      
      const poResult = await pool.query(poQuery, [purchaseOrderId]);
      
      if (poResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Purchase order not found' });
      }
      
      const purchaseOrder = poResult.rows[0];
      const paymentNumber = `BP-${purchaseOrder.company_id}-${Date.now()}`;
      
      // 2. Insert bill payment record
      const insertPaymentQuery = `
        INSERT INTO bill_payments (
          company_id, vendor_id, bill_id, purchase_order_id,
          payment_number, amount, payment_method, reference_number,
          is_partial_payment, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const paymentValues = [
        purchaseOrder.company_id,
        purchaseOrder.vendor_id, 
        purchaseOrder.bill_id,
        purchaseOrderId,
        paymentNumber,
        amount,
        paymentMethod,
        referenceNumber,
        isPartialPayment,
        notes
      ];
      
      const paymentResult = await pool.query(insertPaymentQuery, paymentValues);
      const newPayment = paymentResult.rows[0];
      
      // 3. Create journal entries
      const journalEntryQuery = `
        INSERT INTO journal_entries (
          company_id, transaction_type, reference_id, reference_number,
          account_id, debit_amount, credit_amount, description,
          entry_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;
      
      // Get cash and payable accounts by name pattern (simpler approach)
      const cashAccountQuery = `
        SELECT id, name FROM accounts 
        WHERE company_id = $1 AND (name ILIKE '%cash%' OR name ILIKE '%bank%')
        LIMIT 1
      `;
      
      const payableAccountQuery = `
        SELECT id, name FROM accounts 
        WHERE company_id = $1 AND (name ILIKE '%payable%' OR name ILIKE '%creditor%')
        LIMIT 1
      `;
      
      const cashResult = await pool.query(cashAccountQuery, [purchaseOrder.company_id]);
      const payableResult = await pool.query(payableAccountQuery, [purchaseOrder.company_id]);
      
      const cashAccount = cashResult.rows[0];
      const payableAccount = payableResult.rows[0];
      
      // Credit Cash (money going out)
      if (cashAccount) {
        await pool.query(journalEntryQuery, [
          purchaseOrder.company_id, 'bill_payment', newPayment.id, paymentNumber,
          cashAccount.id, 0, amount,
          `Bill payment to ${purchaseOrder.vendor_name} - PO ${purchaseOrderId}`
        ]);
      }
      
      // Debit Accounts Payable (reducing liability)
      if (payableAccount) {
        await pool.query(journalEntryQuery, [
          purchaseOrder.company_id, 'bill_payment', newPayment.id, paymentNumber,
          payableAccount.id, amount, 0,
          `Payment reduces payable to ${purchaseOrder.vendor_name}`
        ]);
      }
      
      await pool.query('COMMIT');
      
      console.log(`✅ Created bill payment ${newPayment.payment_number} for PO ${purchaseOrderId}: $${amount}`);
      
      res.status(201).json({
        success: true,
        billPayment: newPayment,
        purchaseOrder: {
          id: purchaseOrder.id,
          vendor: purchaseOrder.vendor_name,
          total: purchaseOrder.total
        },
        journalEntriesCreated: true,
        message: `Bill payment created for purchase order ${purchaseOrderId}`
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error creating bill payment for purchase order:', error.message);
    res.status(500).json({ 
      error: 'Failed to create bill payment for purchase order',
      details: error.message 
    });
  }
});

// Get bill payments for a specific purchase order
router.get('/api/bill-payments/purchase-order/:id', async (req, res) => {
  try {
    const purchaseOrderId = req.params.id;
    
    console.log(`💳 Getting bill payments for purchase order ${purchaseOrderId}`);
    
    const query = `
      SELECT 
        bp.*,
        po.reference_number as po_reference,
        c.name as vendor_name
      FROM bill_payments bp
      JOIN purchase_orders po ON bp.purchase_order_id = po.id
      LEFT JOIN companies c ON bp.vendor_id = c.id
      WHERE bp.purchase_order_id = $1
      ORDER BY bp.payment_date DESC
    `;
    
    const result = await pool.query(query, [purchaseOrderId]);
    
    const totalPaid = result.rows.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
    
    res.json({
      billPayments: result.rows,
      totalPayments: result.rows.length,
      totalPaid: totalPaid,
      purchaseOrderId: parseInt(purchaseOrderId)
    });
    
  } catch (error) {
    console.error('❌ Error getting bill payments for purchase order:', error.message);
    res.status(500).json({ 
      error: 'Failed to get bill payments for purchase order',
      details: error.message 
    });
  }
});

export { router as billPaymentsRouter };