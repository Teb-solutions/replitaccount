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

/**
 * @swagger
 * /api/setup-database:
 *   post:
 *     summary: Set up required database tables for credit/debit notes system
 *     tags: [Database Setup]
 *     responses:
 *       200:
 *         description: Database tables created successfully
 */
router.post('/api/setup-database', async (req, res) => {
  try {
    await pool.query('BEGIN');

    const tables = [
      // Credit Notes Table
      `CREATE TABLE IF NOT EXISTS credit_notes (
        id SERIAL PRIMARY KEY,
        credit_note_number VARCHAR(50) UNIQUE NOT NULL,
        invoice_id INTEGER,
        company_id INTEGER,
        customer_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'issued',
        credit_note_date TIMESTAMP WITH TIME ZONE,
        reference_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Credit Note Items Table
      `CREATE TABLE IF NOT EXISTS credit_note_items (
        id SERIAL PRIMARY KEY,
        credit_note_id INTEGER,
        product_id INTEGER,
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Debit Notes Table
      `CREATE TABLE IF NOT EXISTS debit_notes (
        id SERIAL PRIMARY KEY,
        debit_note_number VARCHAR(50) UNIQUE NOT NULL,
        bill_id INTEGER,
        company_id INTEGER,
        vendor_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'issued',
        debit_note_date TIMESTAMP WITH TIME ZONE,
        reference_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Debit Note Items Table
      `CREATE TABLE IF NOT EXISTS debit_note_items (
        id SERIAL PRIMARY KEY,
        debit_note_id INTEGER,
        product_id INTEGER,
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Intercompany Adjustments Table
      `CREATE TABLE IF NOT EXISTS intercompany_adjustments (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        source_company_id INTEGER,
        target_company_id INTEGER,
        credit_note_id INTEGER,
        debit_note_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        adjustment_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Credit Accounts Table
      `CREATE TABLE IF NOT EXISTS credit_accounts (
        id SERIAL PRIMARY KEY,
        company_id INTEGER,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        account_type VARCHAR(50) DEFAULT 'credit_line',
        current_balance DECIMAL(15,2) DEFAULT 0.00,
        available_credit DECIMAL(15,2) DEFAULT 0.00,
        credit_limit DECIMAL(15,2) DEFAULT 0.00,
        last_transaction_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Credit Account Transactions Table
      `CREATE TABLE IF NOT EXISTS credit_account_transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER,
        credit_note_id INTEGER,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_number VARCHAR(100),
        transaction_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Debit Accounts Table
      `CREATE TABLE IF NOT EXISTS debit_accounts (
        id SERIAL PRIMARY KEY,
        company_id INTEGER,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        account_type VARCHAR(50) DEFAULT 'payable_account',
        current_balance DECIMAL(15,2) DEFAULT 0.00,
        pending_debits DECIMAL(15,2) DEFAULT 0.00,
        last_transaction_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Debit Account Transactions Table
      `CREATE TABLE IF NOT EXISTS debit_account_transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER,
        debit_note_id INTEGER,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        reference_number VARCHAR(100),
        transaction_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    // Execute all table creation queries
    for (const tableQuery of tables) {
      await pool.query(tableQuery);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_credit_notes_reference ON credit_notes(reference_number)',
      'CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id)',
      'CREATE INDEX IF NOT EXISTS idx_debit_notes_company_id ON debit_notes(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_debit_notes_vendor_id ON debit_notes(vendor_id)',
      'CREATE INDEX IF NOT EXISTS idx_debit_notes_reference ON debit_notes(reference_number)',
      'CREATE INDEX IF NOT EXISTS idx_debit_note_items_debit_note_id ON debit_note_items(debit_note_id)',
      'CREATE INDEX IF NOT EXISTS idx_intercompany_adjustments_source ON intercompany_adjustments(source_company_id)',
      'CREATE INDEX IF NOT EXISTS idx_intercompany_adjustments_target ON intercompany_adjustments(target_company_id)',
      'CREATE INDEX IF NOT EXISTS idx_intercompany_adjustments_reference ON intercompany_adjustments(reference_number)',
      'CREATE INDEX IF NOT EXISTS idx_credit_accounts_company_id ON credit_accounts(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_debit_accounts_company_id ON debit_accounts(company_id)'
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }

    // Insert sample accounts
    await pool.query(`
      INSERT INTO credit_accounts (company_id, account_number, account_name, credit_limit, available_credit) 
      VALUES 
      (17, 'CA-17-001', '03 June Plant Credit Line', 50000.00, 50000.00),
      (26, 'CA-26-001', 'June4Dist Credit Line', 30000.00, 30000.00)
      ON CONFLICT (account_number) DO NOTHING
    `);

    await pool.query(`
      INSERT INTO debit_accounts (company_id, account_number, account_name) 
      VALUES 
      (17, 'DA-17-001', '03 June Plant Payables Account'),
      (26, 'DA-26-001', 'June4Dist Payables Account')
      ON CONFLICT (account_number) DO NOTHING
    `);

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: 'Database tables created successfully',
      tablesCreated: [
        'credit_notes',
        'credit_note_items', 
        'debit_notes',
        'debit_note_items',
        'intercompany_adjustments',
        'credit_accounts',
        'credit_account_transactions',
        'debit_accounts',
        'debit_account_transactions'
      ],
      indexesCreated: indexes.length,
      sampleAccountsInserted: 4
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error setting up database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set up database',
      details: error.message
    });
  }
});

export default router;