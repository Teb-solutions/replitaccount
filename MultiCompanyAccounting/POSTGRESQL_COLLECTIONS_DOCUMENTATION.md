# PostgreSQL Collections Documentation
## Multi-Company Accounting System Database Schema

**Database:** account_replit_staging  
**Host:** 135.235.154.222  
**Connection:** External PostgreSQL (SSL disabled)  
**Authentication:** pguser / StrongP@ss123  

---

## Core Collections (Tables)

### 1. companies
**Purpose:** Master table for all tenant companies in the multi-company system

**Schema:**
```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    company_type VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    fiscal_year VARCHAR(20) DEFAULT 'calendar',
    base_currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Sample Data:**
- ID: 7, Name: "Gas Manufacturing Company", Code: "GASMFG"
- ID: 8, Name: "Gas Distributor Company", Code: "GASDIST"
- Total Records: 23 companies

---

### 2. accounts
**Purpose:** Chart of accounts for each company (multi-tenant)

**Schema:**
```sql
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    account_type_id INTEGER,
    parent_id INTEGER REFERENCES accounts(id),
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    balance DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, code)
);
```

**Standard Chart of Accounts (Auto-created for new companies):**
- 1000: Cash and Cash Equivalents (Asset)
- 1100: Accounts Receivable (Asset)
- 1200: Inventory (Asset)
- 1500: Equipment (Asset)
- 2000: Accounts Payable (Liability)
- 2100: Accrued Expenses (Liability)
- 2500: Long-term Debt (Liability)
- 3000: Owner Equity (Equity)
- 3100: Retained Earnings (Equity)
- 4000: Sales Revenue (Revenue)
- 4100: Service Revenue (Revenue)
- 5000: Cost of Goods Sold (Expense)
- 6000: Operating Expenses (Expense)
- 6100: Administrative Expenses (Expense)
- 7000: Interest Expense (Expense)

---

### 3. sales_orders
**Purpose:** Sales orders with intercompany transaction support

**Schema:**
```sql
CREATE TABLE sales_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    customer_id INTEGER REFERENCES companies(id),
    order_number VARCHAR(100) UNIQUE,
    order_date DATE NOT NULL,
    expected_date DATE,
    status VARCHAR(50) DEFAULT 'Pending',
    total DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(255), -- Transaction group reference
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Authentic Data Examples:**
- Gas Manufacturing Company (ID: 7): 90 sales orders, Total: $83,400
- All sales orders are intercompany (customer_id references other companies)
- Reference format: TXN-GROUP-{sourceCompanyId}-{targetCompanyId}-{timestamp}

---

### 4. purchase_orders
**Purpose:** Purchase orders corresponding to sales orders in intercompany transactions

**Schema:**
```sql
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    vendor_id INTEGER REFERENCES companies(id),
    order_number VARCHAR(100) UNIQUE,
    order_date DATE NOT NULL,
    expected_date DATE,
    status VARCHAR(50) DEFAULT 'Pending',
    total DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(255), -- Same as corresponding sales order
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Authentic Data Examples:**
- Gas Distributor Company (ID: 8): 22 purchase orders, Total: $56,500
- All purchase orders are intercompany (vendor_id references other companies)

---

### 5. invoices
**Purpose:** Sales invoices generated from sales orders

**Schema:**
```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    customer_id INTEGER REFERENCES companies(id),
    sales_order_id INTEGER REFERENCES sales_orders(id),
    invoice_number VARCHAR(100) UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Authentic Data Examples:**
- Gas Manufacturing Company (ID: 7): 67 invoices, Total: $49,000
- 58 invoices linked to sales orders
- Outstanding receivables: $6,000

---

### 6. bills
**Purpose:** Purchase bills generated from purchase orders

**Schema:**
```sql
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    vendor_id INTEGER REFERENCES companies(id),
    purchase_order_id INTEGER REFERENCES purchase_orders(id),
    bill_number VARCHAR(100) UNIQUE,
    bill_date DATE NOT NULL,
    due_date DATE,
    total DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Authentic Data Examples:**
- Gas Distributor Company (ID: 8): 28 bills, Total: $50,200
- 25 bills linked to purchase orders
- Outstanding payables: $47,700

---

### 7. receipts
**Purpose:** Payments received against invoices (AR)

**Schema:**
```sql
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    customer_id INTEGER REFERENCES companies(id),
    invoice_id INTEGER REFERENCES invoices(id),
    receipt_number VARCHAR(100) UNIQUE,
    receipt_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Authentic Data Examples:**
- Gas Manufacturing Company (ID: 7): 21 receipts, Total: $43,000
- 20 receipts linked to invoices

---

### 8. bill_payments
**Purpose:** Payments made against bills (AP)

**Schema:**
```sql
CREATE TABLE bill_payments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    vendor_id INTEGER REFERENCES companies(id),
    bill_id INTEGER REFERENCES bills(id),
    payment_number VARCHAR(100) UNIQUE,
    payment_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Authentic Data Examples:**
- Gas Distributor Company (ID: 8): 1 payment, Total: $2,500
- 0 payments linked to bills (standalone payment)

---

## Transaction Reference System

### Transaction Group References
**Format:** `TXN-GROUP-{sourceCompanyId}-{targetCompanyId}-{timestamp}`

**Purpose:** Links all related transactions across the complete workflow:
1. Sales Order (source company) ↔ Purchase Order (target company)
2. Sales Invoice (source company) ↔ Purchase Bill (target company)
3. Receipt (source company) ↔ Bill Payment (target company)

**Example:** `TXN-GROUP-7-8-1748878054747`
- Links sales order from Gas Manufacturing to Gas Distributor
- Enables complete transaction lifecycle tracking

---

## Data Relationships

### Intercompany Transaction Flow
```
Company A (Seller)              Company B (Buyer)
├── Sales Order ────────────────── Purchase Order
├── Sales Invoice ──────────────── Purchase Bill
└── Receipt ────────────────────── Bill Payment
```

### AR/AP Workflow Tracking
- **AR (Accounts Receivable):** Sales Orders → Invoices → Receipts
- **AP (Accounts Payable):** Purchase Orders → Bills → Bill Payments
- **Outstanding Balances:** Invoice Total - Receipt Total (AR), Bill Total - Payment Total (AP)

---

## Performance Considerations

### Indexes (Recommended)
```sql
CREATE INDEX idx_sales_orders_company_id ON sales_orders(company_id);
CREATE INDEX idx_sales_orders_reference ON sales_orders(reference_number);
CREATE INDEX idx_invoices_sales_order_id ON invoices(sales_order_id);
CREATE INDEX idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX idx_bills_purchase_order_id ON bills(purchase_order_id);
CREATE INDEX idx_bill_payments_bill_id ON bill_payments(bill_id);
```

### Query Optimization
- Use company_id filtering for all multi-tenant queries
- Reference number indexing enables fast transaction group lookups
- Foreign key relationships maintain data integrity across intercompany transactions