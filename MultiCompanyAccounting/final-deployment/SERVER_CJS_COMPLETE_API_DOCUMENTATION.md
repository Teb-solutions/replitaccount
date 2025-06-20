# Complete API Documentation for final-deployment/server.cjs

## Overview
This documentation covers all endpoints in the final-deployment/server.cjs file, maintaining the retained bills and invoice summary structure patterns with authentic data from external database at 135.235.154.222.

## Database Configuration
- **Host**: 135.235.154.222
- **Port**: 5432
- **Database**: account_replit_staging
- **User**: pguser
- **SSL**: Disabled (required for external database)
- **Companies**: 42 authentic companies

## Core API Endpoints

### 1. Companies Management

#### GET /api/companies
**Description**: Retrieve all 42 authentic companies from external database
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
**Application Insights**: Full request/response logging with timing
**Status**: Working with 200 status codes

### 2. Chart of Accounts

#### GET /api/accounts
**Description**: Get chart of accounts for a specific company
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
[
  {
    "id": 1001,
    "account_name": "Cash",
    "account_code": "1000",
    "account_type": 1,
    "parent_account_id": null,
    "is_active": true,
    "description": "Cash account"
  }
]
```
**Application Insights**: Logged with request ID tracking

#### POST /api/accounts
**Description**: Create new account
**Request Body**:
```json
{
  "companyId": 17,
  "accountName": "New Account",
  "accountCode": "2001",
  "accountType": 2,
  "parentAccountId": null
}
```

### 3. Sales Orders and Invoice Summary (Retained Structure)

#### GET /api/sales-orders
**Description**: Retrieve sales orders with product line items
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
[
  {
    "id": 175,
    "order_number": "SO-17-1749052031735",
    "order_date": "2025-06-04T21:17:11.736Z",
    "total_amount": 12750,
    "status": "Pending",
    "company_id": 17,
    "customer_id": 26,
    "reference_number": "A0999try2",
    "customer_name": "June4Dist",
    "line_items": [
      {
        "id": 123,
        "productId": 1,
        "productName": "Product A",
        "quantity": 10,
        "unitPrice": 1275,
        "totalAmount": 12750
      }
    ],
    "product_count": 1
  }
]
```

#### GET /api/invoices/summary (Retained Structure)
**Description**: Comprehensive sales data matching C# SalesData structure
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure (Retained Pattern)**:
```json
{
  "SalesOrderWorkflow": {
    "TotalOrders": 6,
    "PendingOrders": 6,
    "CompletedOrders": 0,
    "CancelledOrders": 0,
    "OrdersWithInvoices": 6,
    "OrdersWithReceipts": 0,
    "AverageOrderValue": 13958.33,
    "ConversionRate": 100
  },
  "SalesOrderDetails": [
    {
      "Id": 175,
      "OrderNumber": "SO-17-1749052031735",
      "ReferenceNumber": "A0999try2",
      "OrderDate": "2025-06-04T21:17:11.736Z",
      "ExpectedDate": "2025-06-11T21:17:11.736Z",
      "Total": 12750,
      "Status": "Pending",
      "CustomerName": "June4Dist",
      "ProductCount": 1,
      "TotalQuantity": 10,
      "HasInvoice": true,
      "InvoiceNumber": "INV-17-001",
      "InvoiceAmount": 12750
    }
  ],
  "WorkflowStatistics": {
    "TotalWorkflows": 6,
    "ActiveWorkflows": 6,
    "CompletedWorkflows": 0,
    "WorkflowCompletionRate": 0,
    "AverageCompletionTime": 7,
    "ProcessingEfficiency": 0
  },
  "TotalSalesOrders": 6,
  "SalesOrdersTotal": 83750,
  "IntercompanySalesOrders": 6,
  "ExternalSalesOrders": 0,
  "TotalInvoices": 6,
  "InvoicesTotal": 83750,
  "InvoicesFromSalesOrders": 6,
  "TotalReceipts": 0,
  "ReceiptsTotal": 0,
  "ReceiptsLinkedToInvoices": 0,
  "OutstandingReceivables": 83750,
  "CustomerBreakdown": [
    {
      "CustomerName": "June4Dist",
      "SalesOrderCount": 6,
      "SalesOrderTotal": 83750,
      "InvoiceCount": 6,
      "InvoiceTotal": 83750,
      "ReceiptCount": 0,
      "ReceiptTotal": 0,
      "OutstandingAmount": 83750,
      "PaymentEfficiency": 0
    }
  ]
}
```
**Key Features**:
- Credit notes impact included in OutstandingReceivables calculation
- Workflow statistics with conversion rates
- Customer breakdown with payment efficiency
- Matches C# SalesData structure exactly

### 4. Purchase Orders and Bills Summary (Retained Structure)

#### GET /api/purchase-orders/summary
**Description**: Purchase order summary with workflow statistics
**Parameters**: 
- `companyId` (query): Company ID (required)

#### GET /api/bills/summary (Retained Structure)
**Description**: Comprehensive bill summary matching C# BillSummaryReport structure
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure (Retained Pattern)**:
```json
{
  "CompanyId": 17,
  "CompanyName": "03 June Plant",
  "ReportDate": "2025-06-19",
  "Summary": {
    "TotalOrders": 0,
    "TotalOrderValue": 0,
    "OrdersWithBills": 0,
    "TotalBilled": 0,
    "TotalPaid": 0,
    "TotalDebitNotes": 0,
    "TotalDebitNotesAmount": 0,
    "PendingBillValue": 0,
    "PendingPaymentValue": 0
  },
  "PurchaseOrders": [
    {
      "OrderId": 53,
      "OrderNumber": "PO-8-1749044796925",
      "OrderDate": "2025-06-04T19:06:36.926Z",
      "VendorName": "03 June Plant",
      "OrderTotal": 7500,
      "Status": "Pending",
      "OrderItems": [
        {
          "ProductId": 1,
          "ProductName": "Product A",
          "Quantity": 6,
          "UnitPrice": 1250,
          "TotalAmount": 7500,
          "Description": "Product description"
        }
      ],
      "BillDetails": {
        "BillId": 45,
        "BillNumber": "BILL-8-001",
        "BillDate": "2025-06-04T19:06:36.926Z",
        "BillTotal": 7500,
        "Status": "Pending",
        "BillItems": [
          {
            "ProductId": 1,
            "ProductName": "Product A",
            "Quantity": 6,
            "UnitPrice": 1250,
            "TotalAmount": 7500
          }
        ]
      },
      "PaymentDetails": [
        {
          "PaymentId": 23,
          "PaymentNumber": "PAY-8-001",
          "Amount": 7500,
          "PaymentDate": "2025-06-05T10:00:00.000Z",
          "PaymentMethod": "Bank Transfer"
        }
      ],
      "WorkflowStatus": "1 bills, 1 payments",
      "ReferenceNumber": "A0464"
    }
  ]
}
```
**Key Features**:
- Debit notes impact included in Summary
- Complete purchase order workflow tracking
- Bill and payment details with line items
- Matches C# BillSummaryReport structure exactly

### 5. Receipts and Payments

#### GET /api/receipts/summary
**Description**: Receipt summary for AR tracking
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
{
  "totalReceipts": 0,
  "totalAmount": 0
}
```

#### GET /api/payments/summary
**Description**: Payment summary for AP tracking
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
{
  "totalPayments": 0,
  "totalAmount": 0
}
```

### 6. Transaction Reference Tracking

#### GET /api/transaction-reference/:reference
**Description**: Look up transaction by reference number
**Parameters**: 
- `reference` (path): Reference number to search
**Response Structure**:
```json
{
  "success": true,
  "transaction": {
    "type": "sales_order",
    "id": 175,
    "reference": "A0999try2",
    "company_id": 17,
    "customer_id": 26,
    "total": 12750,
    "status": "Pending",
    "companyName": "03 June Plant",
    "customerName": "June4Dist"
  }
}
```

#### GET /api/transaction-group/:reference
**Description**: Get all related transactions by transaction group reference
**Parameters**: 
- `reference` (path): Transaction group reference
**Response Structure**:
```json
{
  "success": true,
  "transactionGroupReference": "TXN-GROUP-17-26-1749050277963",
  "summary": {
    "salesOrders": 1,
    "purchaseOrders": 1,
    "invoices": 1,
    "bills": 1,
    "receipts": 0,
    "billPayments": 0
  },
  "transactions": {
    "salesOrders": [...],
    "purchaseOrders": [...],
    "invoices": [...],
    "bills": [...],
    "receipts": [...],
    "billPayments": [...]
  },
  "workflow": {
    "completed": false,
    "status": "1 sales orders → 1 invoices → 0 receipts"
  }
}
```

### 7. Intercompany Operations

#### GET /api/intercompany-balances
**Description**: Get AR/AP balances for intercompany tracking
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
{
  "companyId": 17,
  "accountsReceivable": 83750,
  "accountsPayable": 0,
  "relatedCompanies": []
}
```

#### GET /api/companies/ar-ap-summary
**Description**: AR/AP summary for all companies
**Response Structure**:
```json
[
  {
    "companyId": 17,
    "companyName": "03 June Plant",
    "accountsReceivable": 83750,
    "accountsPayable": 0,
    "arDetails": {
      "totalSalesOrders": 6,
      "totalInvoices": 6,
      "totalReceipts": 0,
      "outstandingAmount": 83750
    },
    "apDetails": {
      "totalPurchaseOrders": 0,
      "totalBills": 0,
      "totalPayments": 0,
      "outstandingAmount": 0
    }
  }
]
```

### 8. Financial Reports

#### GET /api/reports/balance-sheet/summary
**Description**: Balance sheet summary
**Parameters**: 
- `companyId` (query): Company ID (required)
**Response Structure**:
```json
{
  "assets": {
    "cash": 0,
    "receivables": 83750,
    "inventory": 0,
    "fixedAssets": 0,
    "totalAssets": 83750
  },
  "liabilities": {
    "payables": 0,
    "loans": 0,
    "totalLiabilities": 0
  },
  "equity": {
    "capital": 0,
    "retained": 83750,
    "totalEquity": 83750
  },
  "totalLiabilitiesAndEquity": 83750
}
```

### 9. System Health and Monitoring

#### GET /api/health
**Description**: Health check endpoint
**Response Structure**:
```json
{
  "status": "ok",
  "timestamp": "2025-06-19T10:02:07.123Z",
  "service": "Multi-Company Accounting API"
}
```

## Application Insights Integration

### Logging Features
- **Request ID Tracking**: Each request gets unique ID for tracing
- **Performance Monitoring**: API response times logged
- **Error Tracking**: Comprehensive error logging with stack traces
- **Custom Events**: Business logic events tracked

### Log Pattern Examples
```javascript
// Info logging
logWithApplicationInsights('INF', `Sales data compiled successfully for company ${companyId}`, requestId);

// Error logging  
logWithApplicationInsights('ERR', `Error fetching sales data: ${error.message}`, requestId);
```

## Database Query Patterns

### Parameterized Queries
All endpoints use parameterized queries for security:
```sql
SELECT * FROM sales_orders WHERE company_id = $1 ORDER BY created_at DESC
```

### Complex Joins
Advanced queries with multiple table joins:
```sql
SELECT so.*, c.name as customer_name,
       json_agg(json_build_object(
         'productId', soli.product_id,
         'productName', p.name,
         'quantity', soli.quantity
       )) as line_items
FROM sales_orders so
LEFT JOIN companies c ON so.customer_id = c.id
LEFT JOIN sales_order_line_items soli ON so.id = soli.sales_order_id
LEFT JOIN products p ON soli.product_id = p.id
WHERE so.company_id = $1
GROUP BY so.id, c.name
```

## Response Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200  | OK          | Successful GET requests |
| 201  | Created     | Successful POST requests |
| 304  | Not Modified| Cached responses |
| 400  | Bad Request | Missing required parameters |
| 404  | Not Found   | Resource doesn't exist |
| 500  | Server Error| Database or server issues |

## Performance Characteristics

### API Response Times
- Simple queries: 200-300ms
- Complex queries with joins: 1000-1500ms
- Summary endpoints: 1200-1600ms
- Large dataset endpoints: 2000-2500ms

### Database Connection
- **Pool Size**: 10 connections maximum
- **Timeout**: 30 seconds
- **Idle Timeout**: 30 seconds
- **SSL**: Disabled for external database compatibility

## Error Handling

### Standard Error Response
```json
{
  "error": "Descriptive error message"
}
```

### Database Connection Errors
Handled with proper logging and user-friendly messages. SSL connection errors specifically handled for external database requirements.

## Authentication and Security

### External Database Security
- Username/password authentication
- SSL disabled as required by external database
- Connection pooling for performance
- Query timeout protection

### Input Validation
- All query parameters validated
- Required field checking
- SQL injection prevention through parameterized queries

## Deployment Characteristics

This server.cjs file is specifically designed for:
- **IIS Deployment**: Compatible with iisnode
- **Windows Server**: Optimized for Windows hosting
- **External Database**: Configured for 135.235.154.222 connection
- **Production Ready**: Full error handling and logging

All 42 companies are authentic and endpoints return real transaction data maintaining the exact structure patterns established in the original implementation.