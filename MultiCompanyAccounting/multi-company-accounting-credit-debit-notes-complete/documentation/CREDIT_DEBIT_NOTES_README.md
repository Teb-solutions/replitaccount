# Credit & Debit Notes Documentation

## Overview
The Credit & Debit Notes system provides comprehensive management for financial adjustments in the multi-company accounting platform. Credit notes reduce customer receivables, while debit notes increase vendor payables.

## Credit Notes
Credit notes are issued to customers to reduce the amount owed, typically for returns, discounts, or billing corrections.

### Credit Note Workflow
1. **Based on Invoice**: Credit notes reference original invoices
2. **Customer Reduction**: Reduces accounts receivable 
3. **Status Tracking**: Tracks issued/applied status
4. **Reference Linking**: Maintains audit trail to source invoice

### Credit Note API Endpoints

#### GET /api/credit-notes
Retrieve all credit notes with optional filtering.

**Parameters:**
- `companyId` (optional): Filter by company
- `customerId` (optional): Filter by customer

**Response:**
```json
{
  "success": true,
  "count": 2,
  "creditNotes": [
    {
      "id": 1,
      "credit_note_number": "CN-17-1749050277963",
      "invoice_id": 45,
      "company_id": 17,
      "customer_id": 26,
      "amount": 500.00,
      "reason": "Product return",
      "status": "issued",
      "credit_note_date": "2025-06-04T15:30:00Z",
      "company_name": "03 June Plant",
      "customer_name": "June4Dist",
      "invoice_number": "INV-17-1749030460198",
      "original_invoice_amount": 5000.00
    }
  ]
}
```

#### POST /api/credit-notes
Create a new credit note.

**Request Body:**
```json
{
  "invoice_id": 45,
  "company_id": 17,
  "customer_id": 26,
  "amount": 500.00,
  "reason": "Product return",
  "credit_note_date": "2025-06-04T15:30:00Z"
}
```

## Debit Notes
Debit notes are issued to vendors to increase the amount owed, typically for additional charges, penalties, or billing corrections.

### Debit Note Workflow
1. **Based on Bill**: Debit notes reference original bills
2. **Vendor Increase**: Increases accounts payable
3. **Status Tracking**: Tracks issued/applied status
4. **Reference Linking**: Maintains audit trail to source bill

### Debit Note API Endpoints

#### GET /api/debit-notes
Retrieve all debit notes with optional filtering.

**Parameters:**
- `companyId` (optional): Filter by company
- `vendorId` (optional): Filter by vendor

**Response:**
```json
{
  "success": true,
  "count": 1,
  "debitNotes": [
    {
      "id": 1,
      "debit_note_number": "DN-26-1749050277963",
      "bill_id": 23,
      "company_id": 26,
      "vendor_id": 17,
      "amount": 300.00,
      "reason": "Additional shipping charges",
      "status": "issued",
      "debit_note_date": "2025-06-04T15:30:00Z",
      "company_name": "June4Dist",
      "vendor_name": "03 June Plant",
      "bill_number": "BILL-26-1749030460198",
      "original_bill_amount": 2000.00
    }
  ]
}
```

#### POST /api/debit-notes
Create a new debit note.

**Request Body:**
```json
{
  "bill_id": 23,
  "company_id": 26,
  "vendor_id": 17,
  "amount": 300.00,
  "reason": "Additional shipping charges",
  "debit_note_date": "2025-06-04T15:30:00Z"
}
```

## Summary & Reporting

#### GET /api/credit-debit-notes/summary
Get comprehensive summary of credit and debit notes.

**Parameters:**
- `companyId` (optional): Filter by company

**Response:**
```json
{
  "success": true,
  "companyId": 17,
  "creditNotes": {
    "total_count": "5",
    "total_amount": "2500.00",
    "issued_count": "3",
    "applied_count": "2"
  },
  "debitNotes": {
    "total_count": "3",
    "total_amount": "800.00",
    "issued_count": "2",
    "applied_count": "1"
  },
  "summary": {
    "totalCreditAmount": 2500.00,
    "totalDebitAmount": 800.00,
    "netAmount": 1700.00
  }
}
```

## Intercompany Adjustments

### NEW: Intercompany Adjustment API
Handles credit and debit notes for both companies simultaneously in intercompany transactions.

#### POST /api/intercompany-adjustment
Create simultaneous credit and debit notes for intercompany adjustments.

**Request Body:**
```json
{
  "source_company_id": 17,
  "target_company_id": 26,
  "invoice_id": 45,
  "bill_id": 23,
  "amount": 1000.00,
  "reason": "Product quality adjustment",
  "adjustment_date": "2025-06-12T10:00:00Z",
  "products": [
    {
      "product_id": 101,
      "quantity": 5,
      "unit_price": 100.00,
      "total_amount": 500.00,
      "reason": "Defective units returned"
    },
    {
      "product_id": 102,
      "quantity": 10,
      "unit_price": 50.00,
      "total_amount": 500.00,
      "reason": "Pricing adjustment"
    }
  ],
  "reference_number": "IC-ADJ-17-26-1749623456789"
}
```

**Response:**
```json
{
  "success": true,
  "intercompanyAdjustment": {
    "reference": "IC-ADJ-17-26-1749623456789",
    "sourceCompany": 17,
    "targetCompany": 26,
    "amount": 1000.00,
    "reason": "Product quality adjustment",
    "adjustmentDate": "2025-06-12T10:00:00Z",
    "status": "completed"
  },
  "creditNote": {
    "id": 15,
    "credit_note_number": "CN-IC-17-1749623456789",
    "company_id": 17,
    "customer_id": 26,
    "amount": 1000.00,
    "items": [
      {
        "product_id": 101,
        "quantity": 5,
        "unit_price": 100.00,
        "total_amount": 500.00
      }
    ]
  },
  "debitNote": {
    "id": 12,
    "debit_note_number": "DN-IC-26-1749623456789",
    "company_id": 26,
    "vendor_id": 17,
    "amount": 1000.00,
    "items": [
      {
        "product_id": 101,
        "quantity": 5,
        "unit_price": 100.00,
        "total_amount": 500.00
      }
    ]
  }
}
```

#### GET /api/intercompany-adjustments
Retrieve all intercompany adjustments with filtering options.

**Parameters:**
- `companyId` (optional): Filter by company (either source or target)
- `reference` (optional): Filter by reference number

## Database Tables

### Credit Notes Table
```sql
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
```

### Credit Note Items Table
```sql
CREATE TABLE credit_note_items (
  id SERIAL PRIMARY KEY,
  credit_note_id INTEGER REFERENCES credit_notes(id),
  product_id INTEGER REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Debit Notes Table
```sql
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
```

### Debit Note Items Table
```sql
CREATE TABLE debit_note_items (
  id SERIAL PRIMARY KEY,
  debit_note_id INTEGER REFERENCES debit_notes(id),
  product_id INTEGER REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Intercompany Adjustments Table
```sql
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

## Integration with Invoice & Bill Workflow

### Credit Note Integration
- **Invoice Adjustment**: Credit notes automatically adjust invoice balances
- **AR Impact**: Reduces accounts receivable for the customer
- **Payment Processing**: Can be applied against future invoices
- **Audit Trail**: Maintains complete reference to original invoice

### Debit Note Integration
- **Bill Adjustment**: Debit notes automatically adjust bill balances
- **AP Impact**: Increases accounts payable to the vendor
- **Payment Processing**: Increases amount due on vendor statements
- **Audit Trail**: Maintains complete reference to original bill

## Status Management
- **issued**: Note has been created and sent
- **applied**: Note has been applied to reduce/increase balances
- **cancelled**: Note has been cancelled (requires audit trail)

## Reporting & Analytics
The system provides comprehensive reporting on credit and debit note activity:
- Monthly credit/debit note summaries
- Customer-wise credit note analysis
- Vendor-wise debit note analysis  
- Impact on AR/AP balances
- Trend analysis and forecasting

This system ensures complete financial accuracy and provides detailed audit trails for all adjustments made through credit and debit notes.