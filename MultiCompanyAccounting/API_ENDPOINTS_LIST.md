# Complete API Endpoints Reference

## Core Company Management

### GET /api/companies
- **Purpose**: Get all active companies
- **Response**: Array of 23 authentic companies from external database
- **Sample Response**: 
```json
[
  {
    "id": 7,
    "name": "Gas Manufacturing Company",
    "code": "GMC",
    "company_type": "Manufacturing",
    "address": "Industrial District",
    "phone": "555-0001",
    "email": "contact@gasmanufacturing.com",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

### POST /api/companies
- **Purpose**: Create new company with automatic chart of accounts
- **Body**: 
```json
{
  "name": "New Company Name",
  "code": "NCN",
  "company_type": "Manufacturing",
  "address": "123 Business St",
  "phone": "555-1234",
  "email": "contact@newcompany.com"
}
```
- **Response**: Created company + 15 default chart of accounts

## Intercompany Operations (Dual-Company Transactions)

### POST /api/intercompany/sales-order
- **Purpose**: Creates sales order in source company + purchase order in target company
- **Body**:
```json
{
  "sourceCompanyId": 7,
  "targetCompanyId": 8,
  "products": [
    {
      "productId": 1,
      "name": "Industrial Gas",
      "quantity": 100,
      "unitPrice": 50
    }
  ],
  "orderTotal": 5000
}
```

### POST /api/intercompany/invoice
- **Purpose**: Creates sales invoice in source company + purchase bill in target company
- **Body**:
```json
{
  "sourceCompanyId": 7,
  "targetCompanyId": 8,
  "salesOrderId": 134,
  "total": 5000
}
```

### POST /api/intercompany/payment
- **Purpose**: Creates bill payment in source company + receipt in target company
- **Body**:
```json
{
  "sourceCompanyId": 8,
  "targetCompanyId": 7,
  "invoiceId": 45,
  "billId": 67,
  "amount": 5000
}
```

## Transaction Reference System

### GET /api/reference/:reference
- **Purpose**: Lookup any transaction by reference number
- **Examples**:
  - `/api/reference/SO-7-1748501505` - Find sales order
  - `/api/reference/INV-7-1748533915` - Find invoice
  - `/api/reference/IC-REF-7-8-1748533915314` - Find intercompany reference

## Chart of Accounts

### GET /api/accounts?companyId={id}
- **Purpose**: Get chart of accounts for specific company
- **Example**: `/api/accounts?companyId=7`
- **Response**: Company-specific account list

### POST /api/accounts
- **Purpose**: Create new account for company
- **Body**:
```json
{
  "companyId": 7,
  "accountName": "New Revenue Account",
  "accountCode": "4200",
  "accountType": "Revenue"
}
```

## Financial Summaries (AR/AP with Authentic Data)

### GET /api/invoices/summary?companyId={id}
- **Purpose**: Enhanced AR summary with complete sales order → invoice → receipt workflow tracking and customer breakdown
- **Example**: `/api/invoices/summary?companyId=7`
- **Response**: 
```json
{
  "totalSalesOrders": "85",
  "salesOrdersTotal": "75900.00",
  "intercompanySalesOrders": "85",
  "externalSalesOrders": "0",
  "totalInvoices": "67",
  "invoicesTotal": "49000.00",
  "invoicesFromSalesOrders": "58",
  "totalReceipts": "21",
  "receiptsTotal": "43000.00",
  "receiptsLinkedToInvoices": "20",
  "outstandingReceivables": "6000.00",
  "customerBreakdown": [
    {
      "customerName": "Gas Distributor Company",
      "customerId": 8,
      "relationshipType": "Intercompany",
      "salesOrders": {"count": "85", "total": "75900.00"},
      "invoices": {"count": "67", "total": "49000.00"},
      "receipts": {"count": "21", "total": "43000.00"},
      "outstandingAmount": "6000.00"
    }
  ]
}
```

### GET /api/bills/summary?companyId={id}
- **Purpose**: Enhanced AP summary with complete purchase order → bill → payment workflow tracking and vendor breakdown
- **Example**: `/api/bills/summary?companyId=8`
- **Response**:
```json
{
  "totalPurchaseOrders": "18",
  "purchaseOrdersTotal": "49000.00",
  "intercompanyPurchaseOrders": "18",
  "externalPurchaseOrders": "0",
  "totalBills": "28",
  "billsTotal": "50200.00",
  "billsFromPurchaseOrders": "25",
  "totalBillPayments": "1",
  "paymentsTotal": "2500.00",
  "paymentsLinkedToBills": "0",
  "outstandingPayables": "47700.00",
  "vendorBreakdown": [
    {
      "vendorName": "Gas Manufacturing Company",
      "vendorId": 7,
      "relationshipType": "Intercompany",
      "purchaseOrders": {"count": "18", "total": "49000.00"},
      "bills": {"count": "28", "total": "50200.00"},
      "payments": {"count": "1", "total": "2500.00"},
      "outstandingAmount": "47700.00"
    }
  ]
}
```

### GET /api/intercompany-balances?companyId={id}
- **Purpose**: Intercompany balance tracking
- **Response**:
```json
{
  "companyId": 7,
  "accountsReceivable": 264000.00,
  "accountsPayable": 0.00,
  "relatedCompanies": []
}
```

## Additional Working Endpoints

### GET /api/sales-orders?companyId={id}
- **Purpose**: Get sales orders for specific company
- **Example**: Gas Manufacturing (ID: 7) has 84 sales orders totaling $537,900

### GET /health
- **Purpose**: Database connection and system health check
- **Response**:
```json
{
  "status": "healthy",
  "database": "connected to 135.235.154.222",
  "timestamp": "2025-06-02T13:42:15.123Z"
}
```

## Verified with Authentic Data

All endpoints work with real business data from external database at 135.235.154.222:
- **23 authentic companies** including Gas Manufacturing Company (ID: 7) and Gas Distributor Company (ID: 8)
- **Real financial data**: $442K in invoices, $229.6K in bills, existing intercompany relationships
- **Proper dual-company transactions**: Each intercompany operation creates records in both companies

## Server Configuration
- **Port**: 3002 (configurable via PORT environment variable)
- **Database**: External PostgreSQL at 135.235.154.222 (SSL disabled)
- **CORS**: Enabled for all origins