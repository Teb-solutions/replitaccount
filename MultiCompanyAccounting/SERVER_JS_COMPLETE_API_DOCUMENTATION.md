# Complete API Documentation for server.js

## Overview
This documentation covers all endpoints in the main server.js file, following the established structure pattern used by bills summary and invoice summary endpoints.

## Database Configuration
- **Host**: 135.235.154.222
- **Port**: 5432
- **Database**: account_replit_staging
- **User**: pguser
- **SSL**: Disabled (required for external database)

## API Endpoints

### 1. Companies Management

#### GET /api/companies
**Description**: Retrieve all companies from the database
**Parameters**: None
**Response Structure**:
```json
[
  {
    "id": 17,
    "name": "03 June Plant",
    "code": "103",
    "company_type": "General",
    "address": "03 June Plant",
    "phone": "103",
    "email": "103",
    "tax_id": null,
    "industry": null,
    "base_currency": "USD",
    "tenant_id": 1,
    "created_at": "2025-06-03T17:28:43.569Z",
    "updated_at": "2025-06-03T17:28:43.569Z"
  }
]
```
**Status Codes**: 200 (Success), 500 (Server Error)

#### GET /api/companies/:id/accounts
**Description**: Get chart of accounts for a specific company
**Parameters**: 
- `id` (path): Company ID (integer)
**Response Structure**:
```json
[
  {
    "id": 1001,
    "code": "1000",
    "name": "Cash",
    "type": "Asset",
    "category": "Current Assets",
    "balance": 50000.00,
    "is_active": true,
    "created_at": "2025-06-03T17:28:43.569Z",
    "updated_at": "2025-06-03T17:28:43.569Z"
  }
]
```
**Status Codes**: 200 (Success), 404 (Company Not Found), 500 (Server Error)

### 2. Bill Management

#### GET /api/bills-direct
**Description**: Retrieve bills directly from database for a company
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
{
  "bills": [
    {
      "id": 123,
      "bill_number": "BILL-001",
      "company_id": 17,
      "vendor_id": 45,
      "amount": 5000.00,
      "status": "pending",
      "due_date": "2025-07-01T00:00:00.000Z",
      "created_at": "2025-06-03T17:28:43.569Z"
    }
  ],
  "summary": {
    "totalBills": 1,
    "totalAmount": 5000.00
  }
}
```
**Status Codes**: 200 (Success), 400 (Missing Company ID), 500 (Server Error)

#### GET /api/bill-payments-direct
**Description**: Retrieve bill payments for a company
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
{
  "billPayments": [
    {
      "id": 456,
      "bill_id": 123,
      "amount": 2500.00,
      "payment_date": "2025-06-15T00:00:00.000Z",
      "payment_method": "Bank Transfer",
      "reference": "PAY-001"
    }
  ],
  "summary": {
    "totalPayments": 1,
    "totalAmount": 2500.00
  }
}
```
**Status Codes**: 200 (Success), 400 (Missing Company ID), 500 (Server Error)

### 3. Receipt Management

#### GET /api/receipts-direct
**Description**: Retrieve receipts directly from database for a company
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
{
  "receipts": [
    {
      "id": 789,
      "company_id": 17,
      "sales_order_id": 101,
      "customer_id": 22,
      "receipt_number": "REC-001",
      "receipt_date": "2025-06-15T00:00:00.000Z",
      "amount": 12750.00,
      "payment_method": "Bank Transfer",
      "reference": "RCPT-REF-001",
      "invoice_id": 55
    }
  ],
  "summary": {
    "totalReceipts": 1,
    "totalAmount": 12750.00
  }
}
```
**Status Codes**: 200 (Success), 400 (Missing Company ID), 500 (Server Error)

### 4. Intercompany Transactions

#### POST /api/intercompany/receipt-payment
**Description**: Create intercompany receipt payment linking invoices and bills
**Request Body**:
```json
{
  "invoiceId": 55,
  "companyId": 17,
  "amount": 12750.00,
  "paymentMethod": "Bank Transfer",
  "referenceNumber": "RCPT-REF-CUSTOM-001"
}
```
**Response Structure**:
```json
{
  "receiptId": 789,
  "receiptNumber": "REC-17-1640995200000",
  "invoiceId": 55,
  "invoiceNumber": "INV-001",
  "salesOrderId": 101,
  "amount": 12750.00,
  "status": "completed",
  "referenceNumber": "RCPT-REF-CUSTOM-001",
  "sourceCompany": {
    "id": 17,
    "receiptId": 789,
    "receiptNumber": "REC-17-1640995200000",
    "receiptReference": "RCPT-REF-CUSTOM-001"
  },
  "targetCompany": {
    "id": 17,
    "name": "Target Company",
    "billPayment": {
      "billId": 123,
      "billNumber": "BILL-001",
      "billReference": "BILL-REF-001",
      "amount": 12750.00,
      "status": "paid"
    }
  },
  "intercompanyTransaction": {
    "salesOrderId": 101,
    "payingCompany": 17,
    "receivingCompany": 17,
    "receiptDetails": {
      "id": 789,
      "number": "REC-17-1640995200000",
      "reference": "RCPT-REF-CUSTOM-001"
    },
    "invoiceDetails": {
      "id": 55,
      "number": "INV-001",
      "reference": "INV-REF-001"
    },
    "billDetails": {
      "id": 123,
      "number": "BILL-001",
      "reference": "BILL-REF-001"
    },
    "amount": 12750.00
  },
  "tracking": {
    "receiptId": 789,
    "receiptNumber": "REC-17-1640995200000",
    "invoiceId": 55,
    "invoiceNumber": "INV-001",
    "salesOrderId": 101,
    "billId": 123,
    "billNumber": "BILL-001",
    "reference": "RCPT-REF-CUSTOM-001",
    "companyId": 17,
    "targetCompanyId": 17
  }
}
```
**Status Codes**: 201 (Created), 400 (Missing Required Fields), 404 (Invoice Not Found), 500 (Server Error)

### 5. System Health

#### GET /api/health
**Description**: Health check endpoint for system monitoring
**Parameters**: None
**Response Structure**:
```json
{
  "status": "ok",
  "timestamp": "2025-06-19T09:53:45.123Z",
  "service": "Multi-Company Accounting API"
}
```
**Status Codes**: 200 (Success)

## Common Response Patterns

### Success Response Structure
All successful endpoints follow this pattern:
- **Data**: Primary response data (array or object)
- **Summary**: Aggregated totals when applicable
- **Status**: HTTP 200/201 for success

### Error Response Structure
All error responses follow this pattern:
```json
{
  "error": "Descriptive error message"
}
```

### Database Query Pattern
All endpoints use parameterized queries to prevent SQL injection:
```javascript
const result = await pool.query('SELECT * FROM table WHERE id = $1', [id]);
```

### Logging Pattern
All endpoints include comprehensive logging:
```javascript
console.log(`✅ Operation completed successfully`);
console.error('❌ Error description:', error);
```

## Response Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200  | OK          | Successful GET requests |
| 201  | Created     | Successful POST requests |
| 400  | Bad Request | Missing required parameters |
| 404  | Not Found   | Resource doesn't exist |
| 500  | Server Error| Database or server issues |

## Database Tables Referenced

### Companies Table
- **Fields**: id, name, code, company_type, address, phone, email, tax_id, industry, base_currency, tenant_id, created_at, updated_at
- **Primary Key**: id
- **Indexes**: name, tenant_id

### Accounts Table
- **Fields**: id, code, name, type, category, balance, is_active, company_id, created_at, updated_at
- **Primary Key**: id
- **Foreign Keys**: company_id → companies.id

### Bills Table
- **Fields**: id, bill_number, company_id, vendor_id, amount, status, due_date, created_at, updated_at
- **Primary Key**: id
- **Foreign Keys**: company_id → companies.id

### Receipts Table
- **Fields**: id, company_id, sales_order_id, customer_id, receipt_number, receipt_date, amount, payment_method, reference, invoice_id, debit_account_id, credit_account_id, created_at, updated_at
- **Primary Key**: id
- **Foreign Keys**: company_id → companies.id, sales_order_id → sales_orders.id, invoice_id → invoices.id

### Bills Payments (Bill payments are stored in a separate payments table)
- **Fields**: id, bill_id, amount, payment_date, payment_method, reference, created_at, updated_at
- **Primary Key**: id
- **Foreign Keys**: bill_id → bills.id

## Authentication and Security
- All endpoints use parameterized queries for SQL injection prevention
- Database connections use connection pooling for performance
- Error messages are logged server-side but sanitized for client responses
- CORS enabled for cross-origin requests with appropriate headers

## Performance Considerations
- Database connection pooling (max 10 connections)
- Query timeout: 30 seconds
- Idle timeout: 30 seconds
- Results ordered by date/name for consistent pagination
- Aggregations performed at database level for efficiency

This documentation reflects the actual implementation in server.js and follows the established patterns used throughout the application.