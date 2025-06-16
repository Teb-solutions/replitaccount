# Complete API Documentation
## Multi-Company Accounting System

**Base URL:** https://multitenantapistaging.tebs.co.in/  
**Database:** External PostgreSQL at 135.235.154.222  
**Authentication:** None required  
**Content-Type:** application/json  

---

## 1. Company Management

### 1.1 Get All Companies
**Endpoint:** `GET /api/companies`  
**Description:** Retrieves all companies from the multi-tenant system  

**Request:**
```http
GET /api/companies HTTP/1.1
Host: multitenantapistaging.tebs.co.in
```

**Response:**
```json
[
  {
    "id": 7,
    "name": "Gas Manufacturing Company",
    "code": "GASMFG",
    "company_type": "Manufacturing",
    "address": "123 Industrial Ave",
    "phone": "555-0001",
    "email": "contact@gasmanufacturing.com",
    "tenant_id": 1,
    "is_active": true,
    "created_at": "2025-05-06T10:45:24.908Z",
    "updated_at": "2025-05-06T10:45:24.908Z"
  },
  {
    "id": 8,
    "name": "Gas Distributor Company",
    "code": "GASDIST",
    "company_type": "Distribution",
    "address": "456 Distribution Blvd",
    "phone": "555-0002",
    "email": "info@gasdistributor.com",
    "tenant_id": 1,
    "is_active": true,
    "created_at": "2025-05-06T10:45:25.719Z",
    "updated_at": "2025-05-06T10:45:25.719Z"
  }
]
```

### 1.2 Create Company with Chart of Accounts
**Endpoint:** `POST /api/companies`  
**Description:** Creates a new company with automatic 15 standard chart of accounts  

**Request:**
```http
POST /api/companies HTTP/1.1
Host: multitenantapistaging.tebs.co.in
Content-Type: application/json

{
  "name": "Test Energy Corporation",
  "code": "TEC",
  "company_type": "Energy",
  "address": "123 Energy Plaza",
  "phone": "555-ENERGY",
  "email": "admin@testenergy.com"
}
```

**Response:**
```json
{
  "success": true,
  "company": {
    "id": 15,
    "name": "Test Energy Corporation",
    "code": "TEC",
    "company_type": "Energy",
    "address": "123 Energy Plaza",
    "phone": "555-ENERGY",
    "email": "admin@testenergy.com",
    "tenant_id": 1,
    "fiscal_year": "calendar",
    "base_currency": "USD",
    "is_active": true,
    "created_at": "2025-06-02T15:30:00.000Z",
    "updated_at": "2025-06-02T15:30:00.000Z"
  },
  "chartOfAccounts": [
    {
      "id": 101,
      "name": "Cash and Cash Equivalents",
      "code": "1000",
      "account_type_id": 1
    },
    {
      "id": 102,
      "name": "Accounts Receivable",
      "code": "1100",
      "account_type_id": 1
    }
  ],
  "message": "Company created successfully with 15 default accounts"
}
```

---

## 2. Enhanced AR Summary with Sales Order Tracking

### 2.1 Get Enhanced AR Summary
**Endpoint:** `GET /api/invoices/summary?companyId={id}`  
**Description:** Complete AR workflow tracking: Sales Orders → Invoices → Receipts with individual breakdown  

**Request:**
```http
GET /api/invoices/summary?companyId=7 HTTP/1.1
Host: multitenantapistaging.tebs.co.in
```

**Response:**
```json
{
  "salesOrderWorkflow": {
    "totalSalesOrders": "92",
    "totalSalesOrderAmount": "83400.00",
    "totalSalesInvoices": "67",
    "totalSalesInvoiceAmount": "49000.00",
    "totalSalesReceipts": "21",
    "totalSalesReceiptAmount": "43000.00",
    "outstandingReceivables": "6000.00"
  },
  "salesOrderDetails": [
    {
      "salesOrderId": 145,
      "orderNumber": "SO-7-1748878054747",
      "referenceNumber": "TXN-GROUP-7-8-1748878054747",
      "orderDate": "2025-06-02",
      "status": "Pending",
      "salesOrderTotal": "9750.00",
      "customer": {
        "id": 8,
        "name": "Gas Distributor Company",
        "type": "Intercompany"
      },
      "invoices": {
        "count": 0,
        "totalAmount": "0.00"
      },
      "receipts": {
        "count": 0,
        "totalAmount": "0.00"
      },
      "outstandingAmount": "0.00",
      "workflowStatus": "0 invoices, 0 receipts"
    }
  ],
  "workflowStatistics": {
    "salesOrdersWithInvoices": "58",
    "salesOrdersWithoutInvoices": "34",
    "invoicesWithReceipts": "20",
    "invoicesWithoutReceipts": "47",
    "intercompanySalesOrders": "92",
    "externalSalesOrders": "0"
  },
  "customerBreakdown": [
    {
      "customerName": "Gas Distributor Company",
      "customerId": 8,
      "relationshipType": "Intercompany",
      "salesOrders": {
        "count": "92",
        "total": "83400.00"
      },
      "invoices": {
        "count": "67",
        "total": "49000.00"
      },
      "receipts": {
        "count": "21",
        "total": "43000.00"
      },
      "outstandingAmount": "6000.00"
    }
  ],
  "totalSalesOrders": "92",
  "salesOrdersTotal": "83400.00",
  "totalInvoices": "67",
  "invoicesTotal": "49000.00",
  "totalReceipts": "21",
  "receiptsTotal": "43000.00",
  "outstandingReceivables": "6000.00"
}
```

---

## 3. Enhanced AP Summary with Purchase Order Tracking

### 3.1 Get Enhanced AP Summary
**Endpoint:** `GET /api/bills/summary?companyId={id}`  
**Description:** Complete AP workflow tracking: Purchase Orders → Bills → Payments with individual breakdown  

**Request:**
```http
GET /api/bills/summary?companyId=8 HTTP/1.1
Host: multitenantapistaging.tebs.co.in
```

**Response:**
```json
{
  "purchaseOrderWorkflow": {
    "totalPurchaseOrders": "23",
    "totalPurchaseOrderAmount": "56500.00",
    "totalPurchaseBills": "28",
    "totalPurchaseBillAmount": "50200.00",
    "totalPurchasePayments": "1",
    "totalPurchasePaymentAmount": "2500.00",
    "outstandingPayables": "47700.00"
  },
  "purchaseOrderDetails": [
    {
      "purchaseOrderId": 36,
      "orderNumber": "PO-8-1748878054747",
      "referenceNumber": "TXN-GROUP-7-8-1748878054747",
      "orderDate": "2025-06-02",
      "status": "Pending",
      "purchaseOrderTotal": "9750.00",
      "vendor": {
        "id": 7,
        "name": "Gas Manufacturing Company",
        "type": "Intercompany"
      },
      "bills": {
        "count": 0,
        "totalAmount": "0.00"
      },
      "payments": {
        "count": 0,
        "totalAmount": "0.00"
      },
      "outstandingAmount": "0.00",
      "workflowStatus": "0 bills, 0 payments"
    }
  ],
  "workflowStatistics": {
    "purchaseOrdersWithBills": "25",
    "purchaseOrdersWithoutBills": "-2",
    "billsWithPayments": "0",
    "billsWithoutPayments": "28",
    "intercompanyPurchaseOrders": "23",
    "externalPurchaseOrders": "0"
  },
  "vendorBreakdown": [
    {
      "vendorName": "Gas Manufacturing Company",
      "vendorId": 7,
      "relationshipType": "Intercompany",
      "purchaseOrders": {
        "count": "23",
        "total": "56500.00"
      },
      "bills": {
        "count": "28",
        "total": "50200.00"
      },
      "payments": {
        "count": "1",
        "total": "2500.00"
      },
      "outstandingAmount": "47700.00"
    }
  ],
  "totalPurchaseOrders": "23",
  "purchaseOrdersTotal": "56500.00",
  "totalBills": "28",
  "billsTotal": "50200.00",
  "totalBillPayments": "1",
  "paymentsTotal": "2500.00",
  "outstandingPayables": "47700.00"
}
```

---

## 4. Intercompany Transaction Creation

### 4.1 Create Intercompany Sales Order
**Endpoint:** `POST /api/intercompany/sales-order`  
**Description:** Creates sales order and corresponding purchase order with transaction reference tracking  

**Request:**
```http
POST /api/intercompany/sales-order HTTP/1.1
Host: multitenantapistaging.tebs.co.in
Content-Type: application/json

{
  "sourceCompanyId": 7,
  "targetCompanyId": 8,
  "products": [
    {
      "productId": 1,
      "name": "Premium Industrial Gas Package",
      "quantity": 150,
      "unitPrice": 65
    }
  ],
  "orderTotal": 9750
}
```

**Response:**
```json
{
  "success": true,
  "message": "Intercompany sales order created successfully",
  "reference": "TXN-GROUP-7-8-1748878054747",
  "transactionGroupRef": "TXN-GROUP-7-8-1748878054747",
  "salesOrder": {
    "id": 147,
    "orderNumber": "SO-7-1748878054747",
    "total": 9750,
    "status": "Pending",
    "referenceNumber": "TXN-GROUP-7-8-1748878054747",
    "sourceCompany": "Gas Manufacturing Company",
    "targetCompany": "Gas Distributor Company"
  },
  "purchaseOrder": {
    "id": 36,
    "orderNumber": "PO-8-1748878054747",
    "total": 9750,
    "status": "Pending",
    "referenceNumber": "TXN-GROUP-7-8-1748878054747"
  },
  "trackingInstructions": {
    "getAllRelatedTransactions": "GET /api/transaction-group/TXN-GROUP-7-8-1748878054747",
    "createRelatedInvoice": "POST /api/intercompany/invoice with salesOrderId: 147",
    "trackFullWorkflow": "Use the reference field to track from sales order through invoice to receipt"
  }
}
```

### 4.2 Create Intercompany Invoice
**Endpoint:** `POST /api/intercompany/invoice`  
**Description:** Creates sales invoice and corresponding purchase bill linked to sales order  

**Request:**
```http
POST /api/intercompany/invoice HTTP/1.1
Host: multitenantapistaging.tebs.co.in
Content-Type: application/json

{
  "sourceCompanyId": 7,
  "targetCompanyId": 8,
  "salesOrderId": 147,
  "total": 9750
}
```

**Response:**
```json
{
  "success": true,
  "message": "Intercompany invoice created successfully",
  "salesInvoice": {
    "id": 89,
    "invoiceNumber": "INV-7-1748878120456",
    "total": 9750,
    "status": "pending",
    "companyId": 7,
    "customerId": 8,
    "salesOrderId": 147
  },
  "purchaseBill": {
    "id": 45,
    "billNumber": "BILL-8-1748878120456",
    "total": 9750,
    "status": "pending",
    "companyId": 8,
    "vendorId": 7,
    "purchaseOrderId": 36
  }
}
```

### 4.3 Create Intercompany Payment
**Endpoint:** `POST /api/intercompany/payment`  
**Description:** Creates receipt and corresponding bill payment  

**Request:**
```http
POST /api/intercompany/payment HTTP/1.1
Host: multitenantapistaging.tebs.co.in
Content-Type: application/json

{
  "sourceCompanyId": 8,
  "targetCompanyId": 7,
  "amount": 9750,
  "description": "Payment for Premium Industrial Gas Package"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Intercompany payment created successfully",
  "receipt": {
    "id": 56,
    "receiptNumber": "REC-7-1748878180789",
    "amount": 9750,
    "companyId": 7,
    "customerId": 8,
    "paymentMethod": "intercompany_transfer"
  },
  "billPayment": {
    "id": 23,
    "paymentNumber": "PAY-8-1748878180789",
    "amount": 9750,
    "companyId": 8,
    "vendorId": 7,
    "paymentMethod": "intercompany_transfer"
  }
}
```

---

## 5. Transaction Reference Tracking

### 5.1 Get Transaction Group by Reference
**Endpoint:** `GET /api/transaction-group/{reference}`  
**Description:** Retrieves all transactions linked to a transaction group reference  

**Request:**
```http
GET /api/transaction-group/TXN-GROUP-7-8-1748878054747 HTTP/1.1
Host: multitenantapistaging.tebs.co.in
```

**Response:**
```json
{
  "success": true,
  "transactionGroupReference": "TXN-GROUP-7-8-1748878054747",
  "summary": {
    "salesOrders": 1,
    "purchaseOrders": 1,
    "invoices": 1,
    "bills": 1,
    "receipts": 1,
    "billPayments": 1
  },
  "transactions": {
    "salesOrders": [
      {
        "id": 147,
        "order_number": "SO-7-1748878054747",
        "total": "9750.00",
        "company_name": "Gas Manufacturing Company",
        "customer_name": "Gas Distributor Company"
      }
    ],
    "purchaseOrders": [
      {
        "id": 36,
        "order_number": "PO-8-1748878054747",
        "total": "9750.00",
        "company_name": "Gas Distributor Company",
        "vendor_name": "Gas Manufacturing Company"
      }
    ],
    "invoices": [
      {
        "id": 89,
        "invoice_number": "INV-7-1748878120456",
        "total": "9750.00",
        "sales_order_number": "SO-7-1748878054747",
        "company_name": "Gas Manufacturing Company"
      }
    ],
    "bills": [
      {
        "id": 45,
        "bill_number": "BILL-8-1748878120456",
        "total": "9750.00",
        "purchase_order_number": "PO-8-1748878054747",
        "company_name": "Gas Distributor Company"
      }
    ],
    "receipts": [
      {
        "id": 56,
        "receipt_number": "REC-7-1748878180789",
        "amount": "9750.00",
        "invoice_number": "INV-7-1748878120456",
        "company_name": "Gas Manufacturing Company"
      }
    ],
    "billPayments": [
      {
        "id": 23,
        "payment_number": "PAY-8-1748878180789",
        "amount": "9750.00",
        "bill_number": "BILL-8-1748878120456",
        "company_name": "Gas Distributor Company"
      }
    ]
  },
  "workflow": {
    "completed": true,
    "status": "1 sales orders → 1 invoices → 1 receipts"
  }
}
```

---

## 6. Chart of Accounts Management

### 6.1 Get Chart of Accounts
**Endpoint:** `GET /api/accounts?companyId={id}`  
**Description:** Retrieves chart of accounts for a specific company  

**Request:**
```http
GET /api/accounts?companyId=7 HTTP/1.1
Host: multitenantapistaging.tebs.co.in
```

**Response:**
```json
[
  {
    "id": 1,
    "account_name": "Cash and Cash Equivalents",
    "account_code": "1000",
    "account_type": 1,
    "parent_account_id": null,
    "is_active": true,
    "description": null,
    "created_at": "2025-05-06T10:45:24.908Z",
    "updated_at": "2025-05-06T10:45:24.908Z"
  },
  {
    "id": 2,
    "account_name": "Accounts Receivable",
    "account_code": "1100",
    "account_type": 1,
    "parent_account_id": null,
    "is_active": true,
    "description": null,
    "created_at": "2025-05-06T10:45:24.908Z",
    "updated_at": "2025-05-06T10:45:24.908Z"
  }
]
```

### 6.2 Create Chart of Account
**Endpoint:** `POST /api/accounts`  
**Description:** Creates a new account for a specific company  

**Request:**
```http
POST /api/accounts HTTP/1.1
Host: multitenantapistaging.tebs.co.in
Content-Type: application/json

{
  "companyId": 7,
  "accountName": "Equipment Maintenance",
  "accountCode": "6200",
  "accountType": "Expense",
  "parentAccountId": null
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": 156,
    "account_name": "Equipment Maintenance",
    "account_code": "6200",
    "account_type": "Expense",
    "parent_account_id": null,
    "is_active": true,
    "created_at": "2025-06-02T15:45:00.000Z",
    "updated_at": "2025-06-02T15:45:00.000Z"
  },
  "message": "Account created successfully"
}
```

---

## 7. Health and System Status

### 7.1 Health Check
**Endpoint:** `GET /health`  
**Description:** System health and database connectivity check  

**Request:**
```http
GET /health HTTP/1.1
Host: multitenantapistaging.tebs.co.in
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-02T15:45:00.000Z",
  "database": "connected",
  "host": "135.235.154.222",
  "companies": 23,
  "version": "1.0.0"
}
```

---

## Error Responses

All endpoints return standardized error responses:

**400 Bad Request:**
```json
{
  "error": "companyId is required"
}
```

**404 Not Found:**
```json
{
  "error": "Company not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to fetch AR summary",
  "details": "Database connection error"
}
```

---

## Database Configuration

**Connection Details:**
- Host: 135.235.154.222
- Database: account_replit_staging
- User: pguser
- SSL: Disabled
- Companies: 23 authentic companies with real financial data
- Key Companies: Gas Manufacturing Company (ID: 7), Gas Distributor Company (ID: 8)

**Transaction Reference Format:**
`TXN-GROUP-{sourceCompanyId}-{targetCompanyId}-{timestamp}`

**Example:** `TXN-GROUP-7-8-1748878054747`