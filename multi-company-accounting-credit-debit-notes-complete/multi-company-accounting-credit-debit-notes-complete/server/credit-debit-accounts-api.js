import express from 'express';
import pg from 'pg';
const { Pool } = pg;
const router = express.Router();

// Connect to the external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to external database for credit/debit accounts API:', err);
  } else {
    console.log('Successfully connected to external database for credit/debit accounts API');
  }
});

/**
 * @swagger
 * /api/credit-accounts:
 *   get:
 *     summary: Get credit accounts for a company
 *     tags: [Credit/Debit Accounts]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: List of credit accounts with balances
 */
router.get('/api/credit-accounts', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID is required' 
      });
    }
    
    const query = `
      SELECT 
        ca.id,
        ca.account_number,
        ca.account_name,
        ca.account_type,
        ca.current_balance,
        ca.available_credit,
        ca.credit_limit,
        ca.last_transaction_date,
        ca.status,
        c.name as company_name,
        COALESCE(recent_credits.credit_total, 0) as recent_credit_notes_total,
        COALESCE(recent_credits.credit_count, 0) as recent_credit_notes_count
      FROM credit_accounts ca
      LEFT JOIN companies c ON ca.company_id = c.id
      LEFT JOIN (
        SELECT 
          company_id,
          SUM(amount) as credit_total,
          COUNT(*) as credit_count
        FROM credit_notes 
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND status = 'applied'
        GROUP BY company_id
      ) recent_credits ON ca.company_id = recent_credits.company_id
      WHERE ca.company_id = $1
        AND ca.status = 'active'
      ORDER BY ca.account_name
    `;
    
    const result = await pool.query(query, [companyId]);
    
    // Calculate total available credit across all accounts
    const totalAvailableCredit = result.rows.reduce((sum, account) => 
      sum + parseFloat(account.available_credit || 0), 0);
    
    const totalCreditLimit = result.rows.reduce((sum, account) => 
      sum + parseFloat(account.credit_limit || 0), 0);
    
    res.json({
      success: true,
      companyId: parseInt(companyId),
      count: result.rows.length,
      creditAccounts: result.rows,
      summary: {
        totalAvailableCredit: totalAvailableCredit,
        totalCreditLimit: totalCreditLimit,
        totalUtilizedCredit: totalCreditLimit - totalAvailableCredit,
        utilizationPercentage: totalCreditLimit > 0 ? 
          ((totalCreditLimit - totalAvailableCredit) / totalCreditLimit * 100).toFixed(2) : 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching credit accounts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch credit accounts',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/debit-accounts:
 *   get:
 *     summary: Get debit accounts for a company
 *     tags: [Credit/Debit Accounts]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: List of debit accounts with balances
 */
router.get('/api/debit-accounts', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID is required' 
      });
    }
    
    const query = `
      SELECT 
        da.id,
        da.account_number,
        da.account_name,
        da.account_type,
        da.current_balance,
        da.pending_debits,
        da.last_transaction_date,
        da.status,
        c.name as company_name,
        COALESCE(recent_debits.debit_total, 0) as recent_debit_notes_total,
        COALESCE(recent_debits.debit_count, 0) as recent_debit_notes_count
      FROM debit_accounts da
      LEFT JOIN companies c ON da.company_id = c.id
      LEFT JOIN (
        SELECT 
          company_id,
          SUM(amount) as debit_total,
          COUNT(*) as debit_count
        FROM debit_notes 
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND status = 'applied'
        GROUP BY company_id
      ) recent_debits ON da.company_id = recent_debits.company_id
      WHERE da.company_id = $1
        AND da.status = 'active'
      ORDER BY da.account_name
    `;
    
    const result = await pool.query(query, [companyId]);
    
    // Calculate total balances across all accounts
    const totalCurrentBalance = result.rows.reduce((sum, account) => 
      sum + parseFloat(account.current_balance || 0), 0);
    
    const totalPendingDebits = result.rows.reduce((sum, account) => 
      sum + parseFloat(account.pending_debits || 0), 0);
    
    res.json({
      success: true,
      companyId: parseInt(companyId),
      count: result.rows.length,
      debitAccounts: result.rows,
      summary: {
        totalCurrentBalance: totalCurrentBalance,
        totalPendingDebits: totalPendingDebits,
        totalNetBalance: totalCurrentBalance + totalPendingDebits
      }
    });
    
  } catch (error) {
    console.error('Error fetching debit accounts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch debit accounts',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/credit-account-transactions:
 *   post:
 *     summary: Create a credit account transaction
 *     tags: [Credit/Debit Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               account_id:
 *                 type: integer
 *               credit_note_id:
 *                 type: integer
 *               transaction_type:
 *                 type: string
 *                 enum: [credit_applied, credit_reversed, adjustment]
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               reference_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: Credit account transaction created successfully
 */
router.post('/api/credit-account-transactions', async (req, res) => {
  try {
    const { account_id, credit_note_id, transaction_type, amount, description, reference_number } = req.body;
    
    if (!account_id || !transaction_type || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: account_id, transaction_type, amount' 
      });
    }
    
    await pool.query('BEGIN');
    
    try {
      // Create the transaction record
      const transactionQuery = `
        INSERT INTO credit_account_transactions (
          account_id,
          credit_note_id,
          transaction_type,
          amount,
          description,
          reference_number,
          transaction_date,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
        RETURNING *
      `;
      
      const transactionValues = [
        account_id,
        credit_note_id,
        transaction_type,
        amount,
        description,
        reference_number,
        'completed'
      ];
      
      const transactionResult = await pool.query(transactionQuery, transactionValues);
      const transaction = transactionResult.rows[0];
      
      // Update the credit account balance
      const balanceUpdateQuery = `
        UPDATE credit_accounts 
        SET 
          current_balance = current_balance + $1,
          available_credit = available_credit + $1,
          last_transaction_date = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const balanceResult = await pool.query(balanceUpdateQuery, [amount, account_id]);
      const updatedAccount = balanceResult.rows[0];
      
      await pool.query('COMMIT');
      
      res.status(201).json({
        success: true,
        transaction: transaction,
        updatedAccount: updatedAccount
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating credit account transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create credit account transaction',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/debit-account-transactions:
 *   post:
 *     summary: Create a debit account transaction
 *     tags: [Credit/Debit Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               account_id:
 *                 type: integer
 *               debit_note_id:
 *                 type: integer
 *               transaction_type:
 *                 type: string
 *                 enum: [debit_applied, debit_reversed, adjustment]
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               reference_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: Debit account transaction created successfully
 */
router.post('/api/debit-account-transactions', async (req, res) => {
  try {
    const { account_id, debit_note_id, transaction_type, amount, description, reference_number } = req.body;
    
    if (!account_id || !transaction_type || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: account_id, transaction_type, amount' 
      });
    }
    
    await pool.query('BEGIN');
    
    try {
      // Create the transaction record
      const transactionQuery = `
        INSERT INTO debit_account_transactions (
          account_id,
          debit_note_id,
          transaction_type,
          amount,
          description,
          reference_number,
          transaction_date,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
        RETURNING *
      `;
      
      const transactionValues = [
        account_id,
        debit_note_id,
        transaction_type,
        amount,
        description,
        reference_number,
        'completed'
      ];
      
      const transactionResult = await pool.query(transactionQuery, transactionValues);
      const transaction = transactionResult.rows[0];
      
      // Update the debit account balance
      const balanceUpdateQuery = `
        UPDATE debit_accounts 
        SET 
          current_balance = current_balance + $1,
          last_transaction_date = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const balanceResult = await pool.query(balanceUpdateQuery, [amount, account_id]);
      const updatedAccount = balanceResult.rows[0];
      
      await pool.query('COMMIT');
      
      res.status(201).json({
        success: true,
        transaction: transaction,
        updatedAccount: updatedAccount
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating debit account transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create debit account transaction',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/account-reconciliation:
 *   get:
 *     summary: Get account reconciliation between credit notes and credit accounts
 *     tags: [Credit/Debit Accounts]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for reconciliation
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for reconciliation
 *     responses:
 *       200:
 *         description: Account reconciliation data
 */
router.get('/api/account-reconciliation', async (req, res) => {
  try {
    const { companyId, fromDate, toDate } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID is required' 
      });
    }
    
    const dateFilter = fromDate && toDate ? 
      `AND created_at BETWEEN '${fromDate}' AND '${toDate}'` : 
      `AND created_at >= NOW() - INTERVAL '30 days'`;
    
    // Get credit notes summary
    const creditNotesQuery = `
      SELECT 
        COUNT(*) as total_credit_notes,
        SUM(amount) as total_credit_amount,
        COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied_credit_notes,
        SUM(CASE WHEN status = 'applied' THEN amount ELSE 0 END) as applied_credit_amount
      FROM credit_notes 
      WHERE company_id = $1 ${dateFilter}
    `;
    
    // Get debit notes summary
    const debitNotesQuery = `
      SELECT 
        COUNT(*) as total_debit_notes,
        SUM(amount) as total_debit_amount,
        COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied_debit_notes,
        SUM(CASE WHEN status = 'applied' THEN amount ELSE 0 END) as applied_debit_amount
      FROM debit_notes 
      WHERE company_id = $1 ${dateFilter}
    `;
    
    // Get credit account transactions
    const creditAccountQuery = `
      SELECT 
        COUNT(*) as total_credit_transactions,
        SUM(amount) as total_credit_transaction_amount
      FROM credit_account_transactions cat
      JOIN credit_accounts ca ON cat.account_id = ca.id
      WHERE ca.company_id = $1 ${dateFilter.replace('created_at', 'cat.created_at')}
    `;
    
    // Get debit account transactions
    const debitAccountQuery = `
      SELECT 
        COUNT(*) as total_debit_transactions,
        SUM(amount) as total_debit_transaction_amount
      FROM debit_account_transactions dat
      JOIN debit_accounts da ON dat.account_id = da.id
      WHERE da.company_id = $1 ${dateFilter.replace('created_at', 'dat.created_at')}
    `;
    
    const [creditNotesResult, debitNotesResult, creditAccountResult, debitAccountResult] = await Promise.all([
      pool.query(creditNotesQuery, [companyId]),
      pool.query(debitNotesQuery, [companyId]),
      pool.query(creditAccountQuery, [companyId]),
      pool.query(debitAccountQuery, [companyId])
    ]);
    
    const creditNotes = creditNotesResult.rows[0];
    const debitNotes = debitNotesResult.rows[0];
    const creditAccounts = creditAccountResult.rows[0];
    const debitAccounts = debitAccountResult.rows[0];
    
    // Calculate reconciliation
    const appliedCreditAmount = parseFloat(creditNotes.applied_credit_amount || 0);
    const appliedDebitAmount = parseFloat(debitNotes.applied_debit_amount || 0);
    const creditAccountAmount = parseFloat(creditAccounts.total_credit_transaction_amount || 0);
    const debitAccountAmount = parseFloat(debitAccounts.total_debit_transaction_amount || 0);
    
    const creditReconciliation = {
      notesAmount: appliedCreditAmount,
      accountsAmount: creditAccountAmount,
      difference: appliedCreditAmount - creditAccountAmount,
      isReconciled: Math.abs(appliedCreditAmount - creditAccountAmount) < 0.01
    };
    
    const debitReconciliation = {
      notesAmount: appliedDebitAmount,
      accountsAmount: debitAccountAmount,
      difference: appliedDebitAmount - debitAccountAmount,
      isReconciled: Math.abs(appliedDebitAmount - debitAccountAmount) < 0.01
    };
    
    res.json({
      success: true,
      companyId: parseInt(companyId),
      reconciliationPeriod: {
        fromDate: fromDate || 'Last 30 days',
        toDate: toDate || 'Current date'
      },
      creditNotes: creditNotes,
      debitNotes: debitNotes,
      creditAccounts: creditAccounts,
      debitAccounts: debitAccounts,
      reconciliation: {
        credit: creditReconciliation,
        debit: debitReconciliation,
        overallReconciled: creditReconciliation.isReconciled && debitReconciliation.isReconciled
      }
    });
    
  } catch (error) {
    console.error('Error performing account reconciliation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to perform account reconciliation',
      details: error.message 
    });
  }
});

export default router;