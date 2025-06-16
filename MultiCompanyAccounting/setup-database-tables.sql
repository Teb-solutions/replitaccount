-- Complete Database Schema Setup for Credit/Debit Notes System
-- Execute this on the external database: 135.235.154.222

-- 1. Credit Notes Table
CREATE TABLE IF NOT EXISTS credit_notes (
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
);

-- 2. Credit Note Items Table
CREATE TABLE IF NOT EXISTS credit_note_items (
  id SERIAL PRIMARY KEY,
  credit_note_id INTEGER,
  product_id INTEGER,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Debit Notes Table
CREATE TABLE IF NOT EXISTS debit_notes (
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
);

-- 4. Debit Note Items Table
CREATE TABLE IF NOT EXISTS debit_note_items (
  id SERIAL PRIMARY KEY,
  debit_note_id INTEGER,
  product_id INTEGER,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Intercompany Adjustments Table
CREATE TABLE IF NOT EXISTS intercompany_adjustments (
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
);

-- 6. Credit Accounts Table
CREATE TABLE IF NOT EXISTS credit_accounts (
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
);

-- 7. Credit Account Transactions Table
CREATE TABLE IF NOT EXISTS credit_account_transactions (
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
);

-- 8. Debit Accounts Table
CREATE TABLE IF NOT EXISTS debit_accounts (
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
);

-- 9. Debit Account Transactions Table
CREATE TABLE IF NOT EXISTS debit_account_transactions (
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
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_reference ON credit_notes(reference_number);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);

CREATE INDEX IF NOT EXISTS idx_debit_notes_company_id ON debit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_vendor_id ON debit_notes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_reference ON debit_notes(reference_number);
CREATE INDEX IF NOT EXISTS idx_debit_note_items_debit_note_id ON debit_note_items(debit_note_id);

CREATE INDEX IF NOT EXISTS idx_intercompany_adjustments_source ON intercompany_adjustments(source_company_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_adjustments_target ON intercompany_adjustments(target_company_id);
CREATE INDEX IF NOT EXISTS idx_intercompany_adjustments_reference ON intercompany_adjustments(reference_number);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_company_id ON credit_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_debit_accounts_company_id ON debit_accounts(company_id);

-- Insert sample accounts for testing
INSERT INTO credit_accounts (company_id, account_number, account_name, credit_limit, available_credit) 
VALUES 
(17, 'CA-17-001', '03 June Plant Credit Line', 50000.00, 50000.00),
(26, 'CA-26-001', 'June4Dist Credit Line', 30000.00, 30000.00)
ON CONFLICT (account_number) DO NOTHING;

INSERT INTO debit_accounts (company_id, account_number, account_name) 
VALUES 
(17, 'DA-17-001', '03 June Plant Payables Account'),
(26, 'DA-26-001', 'June4Dist Payables Account')
ON CONFLICT (account_number) DO NOTHING;