# Complete Database Schema for Credit/Debit Notes and Accounts

## Required Database Tables

### 1. Credit Notes Tables

```sql
-- Main credit notes table
CREATE TABLE credit_notes (
  id SERIAL PRIMARY KEY,
  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_id INTEGER REFERENCES invoices(id),
  company_id INTEGER REFERENCES companies(id),
  customer_id INTEGER REFERENCES companies(id),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'issued',
  credit_note_date TIMESTAMP WITH TIME ZONE,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit note line items
CREATE TABLE credit_note_items (
  id SERIAL PRIMARY KEY,
  credit_note_id INTEGER REFERENCES credit_notes(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Debit Notes Tables

```sql
-- Main debit notes table
CREATE TABLE debit_notes (
  id SERIAL PRIMARY KEY,
  debit_note_number VARCHAR(50) UNIQUE NOT NULL,
  bill_id INTEGER REFERENCES bills(id),
  company_id INTEGER REFERENCES companies(id),
  vendor_id INTEGER REFERENCES companies(id),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'issued',
  debit_note_date TIMESTAMP WITH TIME ZONE,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debit note line items
CREATE TABLE debit_note_items (
  id SERIAL PRIMARY KEY,
  debit_note_id INTEGER REFERENCES debit_notes(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Intercompany Adjustments Table

```sql
-- Intercompany adjustments tracking
CREATE TABLE intercompany_adjustments (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  source_company_id INTEGER REFERENCES companies(id),
  target_company_id INTEGER REFERENCES companies(id),
  credit_note_id INTEGER REFERENCES credit_notes(id),
  debit_note_id INTEGER REFERENCES debit_notes(id),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  adjustment_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Credit Accounts System

```sql
-- Credit accounts for companies
CREATE TABLE credit_accounts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
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

-- Credit account transactions
CREATE TABLE credit_account_transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES credit_accounts(id),
  credit_note_id INTEGER REFERENCES credit_notes(id),
  transaction_type VARCHAR(50) NOT NULL, -- credit_applied, credit_reversed, adjustment
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  transaction_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Debit Accounts System

```sql
-- Debit accounts for companies
CREATE TABLE debit_accounts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
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

-- Debit account transactions
CREATE TABLE debit_account_transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES debit_accounts(id),
  debit_note_id INTEGER REFERENCES debit_notes(id),
  transaction_type VARCHAR(50) NOT NULL, -- debit_applied, debit_reversed, adjustment
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  transaction_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Database Indexes for Performance

```sql
-- Credit notes indexes
CREATE INDEX idx_credit_notes_company_id ON credit_notes(company_id);
CREATE INDEX idx_credit_notes_customer_id ON credit_notes(customer_id);
CREATE INDEX idx_credit_notes_date ON credit_notes(credit_note_date);
CREATE INDEX idx_credit_notes_reference ON credit_notes(reference_number);
CREATE INDEX idx_credit_note_items_credit_note_id ON credit_note_items(credit_note_id);
CREATE INDEX idx_credit_note_items_product_id ON credit_note_items(product_id);

-- Debit notes indexes
CREATE INDEX idx_debit_notes_company_id ON debit_notes(company_id);
CREATE INDEX idx_debit_notes_vendor_id ON debit_notes(vendor_id);
CREATE INDEX idx_debit_notes_date ON debit_notes(debit_note_date);
CREATE INDEX idx_debit_notes_reference ON debit_notes(reference_number);
CREATE INDEX idx_debit_note_items_debit_note_id ON debit_note_items(debit_note_id);
CREATE INDEX idx_debit_note_items_product_id ON debit_note_items(product_id);

-- Intercompany adjustments indexes
CREATE INDEX idx_intercompany_adjustments_source ON intercompany_adjustments(source_company_id);
CREATE INDEX idx_intercompany_adjustments_target ON intercompany_adjustments(target_company_id);
CREATE INDEX idx_intercompany_adjustments_reference ON intercompany_adjustments(reference_number);

-- Account indexes
CREATE INDEX idx_credit_accounts_company_id ON credit_accounts(company_id);
CREATE INDEX idx_debit_accounts_company_id ON debit_accounts(company_id);
CREATE INDEX idx_credit_account_transactions_account_id ON credit_account_transactions(account_id);
CREATE INDEX idx_debit_account_transactions_account_id ON debit_account_transactions(account_id);
```

## Sample Data for Testing

```sql
-- Insert sample credit accounts
INSERT INTO credit_accounts (company_id, account_number, account_name, credit_limit, available_credit) VALUES
(17, 'CA-17-001', '03 June Plant Credit Line', 50000.00, 50000.00),
(26, 'CA-26-001', 'June4Dist Credit Line', 30000.00, 30000.00);

-- Insert sample debit accounts
INSERT INTO debit_accounts (company_id, account_number, account_name) VALUES
(17, 'DA-17-001', '03 June Plant Payables Account'),
(26, 'DA-26-001', 'June4Dist Payables Account');
```

## Database Setup Instructions

### Method 1: Direct SQL Execution
Connect to your PostgreSQL database and run each CREATE TABLE statement.

### Method 2: Using the API Test Script
The test script will attempt to use the tables and will show errors if they don't exist, helping identify which tables need creation.

### Method 3: Migration Script
```bash
# Create a migration file
cat > create_credit_debit_tables.sql << 'EOF'
-- Paste the complete SQL schema from above
EOF

# Execute the migration
psql -h 135.235.154.222 -U pguser -d account_replit_staging -f create_credit_debit_tables.sql
```

## Verification Queries

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('credit_notes', 'debit_notes', 'credit_accounts', 'debit_accounts');

-- Check table structures
\d credit_notes
\d credit_note_items
\d debit_notes
\d debit_note_items
\d intercompany_adjustments
\d credit_accounts
\d debit_accounts

-- Test basic operations
SELECT COUNT(*) FROM credit_notes;
SELECT COUNT(*) FROM debit_notes;
SELECT COUNT(*) FROM credit_accounts;
SELECT COUNT(*) FROM debit_accounts;
```

## Integration Notes

- All tables integrate with existing companies and products tables
- Foreign key constraints ensure data integrity
- Status fields allow for workflow management
- Reference numbers enable cross-system tracking
- Timestamps support audit trails and reporting
- Account balance calculations are handled automatically through transactions