# Complete API Documentation
Multi-Company Accounting System - All Endpoints with Request/Response Examples

## Table of Contents
1. [Company Management](#company-management)
2. [Products CRUD](#products-crud)
3. [Sales Orders](#sales-orders)
4. [Purchase Orders](#purchase-orders)
5. [Invoices](#invoices)
6. [Bills](#bills)
7. [Receipts](#receipts)
8. [Payments](#payments)
9. [Credit Notes](#credit-notes)
10. [Debit Notes](#debit-notes)
11. [Intercompany Operations](#intercompany-operations)
12. [Reports](#reports)
13. [Dashboard](#dashboard)

---

## Company Management

### GET /api/companies
Get all companies in the system.

**Request:**
```bash
GET /api/companies
```

**Response:**
```json
[
  {
    "id": 7,
    "name": "Gas Manufacturing Company",
    "company_type": "Manufacturing",
    "address": "123 Industrial Ave",
    "phone": "+1-555-0123",
    "email": "info@gasmanufacturing.com",
    "registration_number": "REG001",
    "tax_id": "TAX001",
    "created_at": "2025-06-04T18:15:43.000Z"
  },
  {
    "id": 8,
    "name": "Gas Distributor Company",
    "company_type": "Distribution", 
    "address": "456 Commerce St",
    "phone": "+1-555-0124",
    "email": "info@gasdistributor.com",
    "registration_number": "REG002",
    "tax_id": "TAX002",
    "created_at": "2025-06-04T18:15:43.000Z"
  }
]
```

---

## Products CRUD

### GET /api/products
Get all products with optional company filtering.

**Request:**
```bash
GET /api/products?companyId=7
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Industrial Gas Cylinder",
    "description": "High-pressure industrial gas cylinder for manufacturing",
    "sku": "IGC-001",
    "sales_price": "150.00",
    "purchase_price": "100.00",
    "category": "Industrial Equipment",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 50,
    "reorder_level": 10,
    "status": "active",
    "created_at": "2025-06-19T06:00:00.000Z",
    "updated_at": "2025-06-19T06:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Gas Regulator Valve",
    "description": "Precision gas regulator valve",
    "sku": "GRV-002",
    "sales_price": "75.00",
    "purchase_price": "45.00",
    "category": "Components",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 25,
    "reorder_level": 5,
    "status": "active",
    "created_at": "2025-06-19T06:00:00.000Z",
    "updated_at": "2025-06-19T06:00:00.000Z"
  }
]
```

### GET /api/products/:id
Get single product by ID.

**Request:**
```bash
GET /api/products/1
```

**Response:**
```json
{
  "id": 1,
  "name": "Industrial Gas Cylinder",
  "description": "High-pressure industrial gas cylinder for manufacturing",
  "sku": "IGC-001",
  "sales_price": "150.00",
  "purchase_price": "100.00",
  "category": "Industrial Equipment",
  "company_id": 7,
  "unit_of_measure": "ea",
  "stock_quantity": 50,
  "reorder_level": 10,
  "status": "active",
  "created_at": "2025-06-19T06:00:00.000Z",
  "updated_at": "2025-06-19T06:00:00.000Z"
}
```

### POST /api/products
Create new product.

**Request:**
```json
{
  "name": "Industrial Gas Cylinder",
  "description": "High-pressure industrial gas cylinder",
  "sku": "IGC-001",
  "sales_price": 150.00,
  "purchase_price": 100.00,
  "category": "Industrial Equipment",
  "company_id": 7,
  "unit_of_measure": "ea",
  "stock_quantity": 50,
  "reorder_level": 10,
  "status": "active"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Industrial Gas Cylinder",
  "description": "High-pressure industrial gas cylinder",
  "sku": "IGC-001",
  "sales_price": "150.00",
  "purchase_price": "100.00",
  "category": "Industrial Equipment",
  "company_id": 7,
  "unit_of_measure": "ea",
  "stock_quantity": 50,
  "reorder_level": 10,
  "status": "active",
  "created_at": "2025-06-19T06:00:00.000Z",
  "updated_at": null
}
```

### PUT /api/products/:id
Update existing product.

**Request:**
```json
{
  "sales_price": 160.00,
  "stock_quantity": 45,
  "description": "Updated high-pressure industrial gas cylinder"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Industrial Gas Cylinder",
  "description": "Updated high-pressure industrial gas cylinder",
  "sku": "IGC-001",
  "sales_price": "160.00",
  "purchase_price": "100.00",
  "category": "Industrial Equipment",
  "company_id": 7,
  "unit_of_measure": "ea",
  "stock_quantity": 45,
  "reorder_level": 10,
  "status": "active",
  "created_at": "2025-06-19T06:00:00.000Z",
  "updated_at": "2025-06-19T06:15:00.000Z"
}
```

### DELETE /api/products/:id
Delete product (soft delete by default).

**Request:**
```bash
DELETE /api/products/1?permanent=false
```

**Response:**
```json
{
  "message": "Product deactivated",
  "product": {
    "id": 1,
    "name": "Industrial Gas Cylinder",
    "description": "Updated high-pressure industrial gas cylinder",
    "sku": "IGC-001",
    "sales_price": "160.00",
    "purchase_price": "100.00",
    "category": "Industrial Equipment",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 45,
    "reorder_level": 10,
    "status": "inactive",
    "created_at": "2025-06-19T06:00:00.000Z",
    "updated_at": "2025-06-19T06:20:00.000Z"
  }
}
```

### GET /api/products/category/:category
Get products by category.

**Request:**
```bash
GET /api/products/category/Industrial%20Equipment?companyId=7
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Industrial Gas Cylinder",
    "description": "High-pressure industrial gas cylinder",
    "sku": "IGC-001",
    "sales_price": "150.00",
    "purchase_price": "100.00",
    "category": "Industrial Equipment",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 50,
    "reorder_level": 10,
    "status": "active",
    "created_at": "2025-06-19T06:00:00.000Z",
    "updated_at": "2025-06-19T06:00:00.000Z"
  }
]
```

### GET /api/products/search/:query
Search products by name, SKU, or description.

**Request:**
```bash
GET /api/products/search/gas?companyId=7
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Industrial Gas Cylinder",
    "description": "High-pressure industrial gas cylinder",
    "sku": "IGC-001",
    "sales_price": "150.00",
    "purchase_price": "100.00",
    "category": "Industrial Equipment",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 50,
    "reorder_level": 10,
    "status": "active",
    "created_at": "2025-06-19T06:00:00.000Z",
    "updated_at": "2025-06-19T06:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Gas Regulator Valve",
    "description": "Precision gas regulator valve",
    "sku": "GRV-002",
    "sales_price": "75.00",
    "purchase_price": "45.00",
    "category": "Components",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 25,
    "reorder_level": 5,
    "status": "active",
    "created_at": "2025-06-19T06:00:00.000Z",
    "updated_at": "2025-06-19T06:00:00.000Z"
  }
]
```

### GET /api/products/low-stock
Get products below reorder level.

**Request:**
```bash
GET /api/products/low-stock?companyId=7
```

**Response:**
```json
[
  {
    "id": 3,
    "name": "Gas Filter Element",
    "description": "Replacement filter element",
    "sku": "GFE-003",
    "sales_price": "25.00",
    "purchase_price": "15.00",
    "category": "Components",
    "company_id": 7,
    "unit_of_measure": "ea",
    "stock_quantity": 2,
    "reorder_level": 10,
    "status": "active",
    "created_at": "2025-06-19T06:00:00.000Z",
    "updated_at": "2025-06-19T06:00:00.000Z"
  }
]
```

---

## Sales Orders

### GET /api/sales-orders
Get sales orders with optional company filtering.

**Request:**
```bash
GET /api/sales-orders?companyId=7
```

**Response:**
```json
[
  {
    "id": 171,
    "orderNumber": "SO-7-1749044793865",
    "referenceNumber": "TXN-GROUP-7-8-1749044793865",
    "orderDate": "2025-06-04T18:39:53.868Z",
    "expectedDate": "2025-06-11T18:39:53.868Z",
    "total": 5000,
    "status": "Pending",
    "customerName": "Gas Distributor Company",
    "product_count": 2,
    "line_items": [
      {
        "product_id": 1,
        "product_name": "Industrial Gas Cylinder",
        "product_description": "High-pressure industrial gas cylinder",
        "quantity": 20,
        "unit_price": "150.00",
        "total_price": "3000.00"
      },
      {
        "product_id": 2,
        "product_name": "Gas Regulator Valve",
        "product_description": "Precision gas regulator valve",
        "quantity": 27,
        "unit_price": "75.00",
        "total_price": "2025.00"
      }
    ]
  }
]
```

### GET /api/sales-orders/summary
Get sales orders summary for a company.

**Request:**
```bash
GET /api/sales-orders/summary?companyId=7
```

**Response:**
```json
{
  "totalOrders": 100,
  "totalAmount": 641650,
  "averageOrderValue": 6416.5,
  "pendingOrders": 85,
  "completedOrders": 15,
  "monthlyGrowth": 12.5
}
```

---

## Purchase Orders

### GET /api/purchase-orders
Get purchase orders with optional company filtering.

**Request:**
```bash
GET /api/purchase-orders?companyId=8
```

**Response:**
```json
[
  {
    "id": 53,
    "orderNumber": "PO-8-1749044793865",
    "referenceNumber": "TXN-GROUP-7-8-1749044793865",
    "orderDate": "2025-06-04T18:39:53.868Z",
    "expectedDate": "2025-06-11T18:39:53.868Z",
    "total": 5000,
    "status": "Pending",
    "vendorName": "Gas Manufacturing Company",
    "product_count": 2,
    "line_items": [
      {
        "product_id": 1,
        "product_name": "Industrial Gas Cylinder",
        "product_description": "High-pressure industrial gas cylinder",
        "quantity": 20,
        "unit_price": "150.00",
        "total_price": "3000.00"
      },
      {
        "product_id": 2,
        "product_name": "Gas Regulator Valve", 
        "product_description": "Precision gas regulator valve",
        "quantity": 27,
        "unit_price": "75.00",
        "total_price": "2025.00"
      }
    ]
  }
]
```

### GET /api/purchase-orders/summary
Get purchase orders summary for a company.

**Request:**
```bash
GET /api/purchase-orders/summary?companyId=8
```

**Response:**
```json
{
  "totalOrders": 43,
  "totalAmount": 238750,
  "averageOrderValue": 5552.33,
  "pendingOrders": 35,
  "completedOrders": 8,
  "monthlyGrowth": 8.2
}
```

---

## Invoices

### GET /api/invoices/summary
Get invoice summary with AR calculations including credit notes.

**Request:**
```bash
GET /api/invoices/summary?companyId=7
```

**Response:**
```json
{
  "totalInvoices": 82,
  "totalAmount": 468200,
  "paidInvoices": 12,
  "paidAmount": 68500,
  "unpaidInvoices": 70,
  "unpaidAmount": 399700,
  "overdueInvoices": 5,
  "overdueAmount": 45000,
  "creditNotes": 2,
  "creditAmount": 1500,
  "accountsReceivable": 398200,
  "arCalculation": "Invoices (468200) - Receipts (68500) - Credit Notes (1500) = 398200"
}
```

---

## Bills

### GET /api/bills/summary
Get bill summary with AP calculations including debit notes.

**Request:**
```bash
GET /api/bills/summary?companyId=8
```

**Response:**
```json
{
  "totalBills": 43,
  "totalAmount": 256200,
  "paidBills": 8,
  "paidAmount": 42000,
  "unpaidBills": 35,
  "unpaidAmount": 214200,
  "overdueBills": 3,
  "overdueAmount": 28500,
  "debitNotes": 1,
  "debitAmount": 1000,
  "accountsPayable": 215200,
  "apCalculation": "Bills (256200) - Payments (42000) + Debit Notes (1000) = 215200"
}
```

---

## Receipts

### GET /api/receipts/summary
Get receipts summary for a company.

**Request:**
```bash
GET /api/receipts/summary?companyId=7
```

**Response:**
```json
{
  "totalReceipts": 12,
  "totalAmount": 68500,
  "averageReceiptValue": 5708.33,
  "thisMonthReceipts": 3,
  "thisMonthAmount": 15000,
  "monthlyGrowth": 10.5
}
```

---

## Payments

### GET /api/payments/summary
Get payments summary for a company.

**Request:**
```bash
GET /api/payments/summary?companyId=8
```

**Response:**
```json
{
  "totalPayments": 8,
  "totalAmount": 42000,
  "averagePaymentValue": 5250.00,
  "thisMonthPayments": 2,
  "thisMonthAmount": 8500,
  "monthlyGrowth": 15.2
}
```

---

## Credit Notes

### GET /api/credit-notes
Get credit notes with optional company filtering.

**Request:**
```bash
GET /api/credit-notes?companyId=7
```

**Response:**
```json
[
  {
    "id": 15,
    "credit_note_number": "CN-7-1750239123456",
    "company_id": 7,
    "company_name": "Gas Manufacturing Company",
    "customer_id": 8,
    "customer_name": "Gas Distributor Company",
    "invoice_id": 145,
    "invoice_number": "INV-7-123",
    "total_amount": "1000.00",
    "reason": "Intercompany balance adjustment",
    "reference_number": "TXN-GROUP-7-8-1749044793865",
    "created_date": "2025-06-18",
    "created_at": "2025-06-18T09:32:03.456Z",
    "line_items": [
      {
        "id": 25,
        "product_id": 1,
        "product_name": "Industrial Gas Cylinder",
        "quantity": 10,
        "unit_price": "50.00",
        "total_amount": "500.00",
        "reason": "Product A adjustment"
      },
      {
        "id": 26,
        "product_id": 2,
        "product_name": "Gas Regulator Valve",
        "quantity": 5,
        "unit_price": "100.00",
        "total_amount": "500.00",
        "reason": "Product B adjustment"
      }
    ]
  }
]
```

---

## Debit Notes

### GET /api/debit-notes
Get debit notes with optional company filtering.

**Request:**
```bash
GET /api/debit-notes?companyId=8
```

**Response:**
```json
[
  {
    "id": 12,
    "debit_note_number": "DN-8-1750239123456",
    "company_id": 8,
    "company_name": "Gas Distributor Company",
    "vendor_id": 7,
    "vendor_name": "Gas Manufacturing Company",
    "bill_id": 87,
    "bill_number": "BILL-8-456",
    "total_amount": "1000.00",
    "reason": "Intercompany balance adjustment",
    "reference_number": "TXN-GROUP-7-8-1749044793865",
    "created_date": "2025-06-18",
    "created_at": "2025-06-18T09:32:03.456Z",
    "line_items": [
      {
        "id": 18,
        "product_id": 1,
        "product_name": "Industrial Gas Cylinder",
        "quantity": 10,
        "unit_price": "50.00",
        "total_amount": "500.00",
        "reason": "Product A adjustment"
      },
      {
        "id": 19,
        "product_id": 2,
        "product_name": "Gas Regulator Valve",
        "quantity": 5,
        "unit_price": "100.00", 
        "total_amount": "500.00",
        "reason": "Product B adjustment"
      }
    ]
  }
]
```

---

## Intercompany Operations

### POST /api/intercompany/adjustment
Create intercompany adjustment with credit and debit notes.

**Request:**
```json
{
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "adjustmentAmount": 1000.00,
  "adjustmentReason": "Intercompany balance adjustment",
  "products": [
    {
      "productId": 1,
      "quantity": 10,
      "unitPrice": 50.00,
      "totalAmount": 500.00,
      "reason": "Product A adjustment"
    },
    {
      "productId": 2,
      "quantity": 5,
      "unitPrice": 100.00,
      "totalAmount": 500.00,
      "reason": "Product B adjustment"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "adjustmentAmount": 1000.00,
  "adjustmentReason": "Intercompany balance adjustment",
  "adjustmentDate": "2025-06-18",
  "adjustments": [
    {
      "type": "credit_note",
      "id": 15,
      "number": "CN-7-1750239123456",
      "company": "Gas Manufacturing Company",
      "customer": "Gas Distributor Company",
      "invoice_number": "INV-7-123",
      "amount": 1000.00,
      "impact": "Reduces Accounts Receivable",
      "productLines": 2
    },
    {
      "type": "debit_note",
      "id": 12,
      "number": "DN-8-1750239123456",
      "company": "Gas Distributor Company",
      "vendor": "Gas Manufacturing Company",
      "bill_number": "BILL-8-456",
      "amount": 1000.00,
      "impact": "Increases Accounts Payable",
      "productLines": 2
    }
  ],
  "productDetails": [
    {
      "productId": 1,
      "productName": "Industrial Gas Cylinder",
      "quantity": 10,
      "unitPrice": 50.00,
      "totalAmount": 500.00,
      "reason": "Product A adjustment"
    },
    {
      "productId": 2,
      "productName": "Gas Regulator Valve",
      "quantity": 5,
      "unitPrice": 100.00,
      "totalAmount": 500.00,
      "reason": "Product B adjustment"
    }
  ],
  "summary": {
    "salesOrder": {
      "orderNumber": "SO-7-1749044793865",
      "company": "Gas Manufacturing Company",
      "customer": "Gas Distributor Company",
      "invoiceNumber": "INV-7-123",
      "invoiceAmount": 5000.00
    },
    "purchaseOrder": {
      "orderNumber": "PO-8-1749044793865",
      "company": "Gas Distributor Company",
      "vendor": "Gas Manufacturing Company",
      "billNumber": "BILL-8-456",
      "billAmount": 5000.00
    },
    "totalAdjustments": 2,
    "balancingEffect": "Complete intercompany balance",
    "productLinesAdded": 2
  }
}
```

### GET /api/intercompany/adjustment/:reference
Get adjustment history for a reference number.

**Request:**
```bash
GET /api/intercompany/adjustment/TXN-GROUP-7-8-1749044793865
```

**Response:**
```json
{
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "creditNotes": [
    {
      "id": 15,
      "credit_note_number": "CN-7-1750239123456",
      "total_amount": 1000.00,
      "company_name": "Gas Manufacturing Company",
      "customer_name": "Gas Distributor Company",
      "invoice_number": "INV-7-123",
      "reason": "Intercompany balance adjustment",
      "created_date": "2025-06-18",
      "line_items": [
        {
          "product_id": 1,
          "product_name": "Industrial Gas Cylinder",
          "quantity": 10,
          "unit_price": "50.00",
          "total_amount": "500.00",
          "reason": "Product A adjustment"
        },
        {
          "product_id": 2,
          "product_name": "Gas Regulator Valve",
          "quantity": 5,
          "unit_price": "100.00",
          "total_amount": "500.00",
          "reason": "Product B adjustment"
        }
      ]
    }
  ],
  "debitNotes": [
    {
      "id": 12,
      "debit_note_number": "DN-8-1750239123456",
      "total_amount": 1000.00,
      "company_name": "Gas Distributor Company",
      "vendor_name": "Gas Manufacturing Company",
      "bill_number": "BILL-8-456",
      "reason": "Intercompany balance adjustment",
      "created_date": "2025-06-18",
      "line_items": [
        {
          "product_id": 1,
          "product_name": "Industrial Gas Cylinder",
          "quantity": 10,
          "unit_price": "50.00",
          "total_amount": "500.00",
          "reason": "Product A adjustment"
        },
        {
          "product_id": 2,
          "product_name": "Gas Regulator Valve",
          "quantity": 5,
          "unit_price": "100.00",
          "total_amount": "500.00",
          "reason": "Product B adjustment"
        }
      ]
    }
  ],
  "summary": {
    "totalCreditNotes": 1,
    "totalCreditAmount": 1000.00,
    "totalDebitNotes": 1,
    "totalDebitAmount": 1000.00,
    "netAdjustment": 0.00,
    "isBalanced": true,
    "hasProductDetails": true
  }
}
```

### GET /api/intercompany-balances
Get intercompany balances for a company.

**Request:**
```bash
GET /api/intercompany-balances?companyId=7
```

**Response:**
```json
{
  "companyId": 7,
  "companyName": "Gas Manufacturing Company",
  "accountsReceivable": 398200,
  "accountsPayable": 0,
  "netPosition": 398200,
  "relatedCompanies": [
    {
      "companyId": 8,
      "companyName": "Gas Distributor Company",
      "receivableFrom": 398200,
      "payableTo": 0,
      "netBalance": 398200,
      "transactionCount": 82,
      "lastTransactionDate": "2025-06-18T09:32:03.456Z"
    }
  ],
  "summary": {
    "totalReceivables": 398200,
    "totalPayables": 0,
    "netIntercompanyPosition": 398200,
    "activeRelationships": 1
  }
}
```

---

## Reports

### GET /api/reports/balance-sheet/summary
Get balance sheet summary for a company.

**Request:**
```bash
GET /api/reports/balance-sheet/summary?companyId=7
```

**Response:**
```json
{
  "companyId": 7,
  "companyName": "Gas Manufacturing Company",
  "reportDate": "2025-06-19T06:00:00.000Z",
  "assets": {
    "cash": 125000,
    "receivables": 398200,
    "inventory": 75000,
    "fixedAssets": 250000,
    "totalAssets": 848200
  },
  "liabilities": {
    "payables": 0,
    "loans": 150000,
    "totalLiabilities": 150000
  },
  "equity": {
    "capital": 500000,
    "retained": 198200,
    "totalEquity": 698200
  },
  "totalLiabilitiesAndEquity": 848200,
  "balanceCheck": true
}
```

---

## Dashboard

### GET /api/dashboard/stats
Get dashboard statistics for a company.

**Request:**
```bash
GET /api/dashboard/stats?companyId=7
```

**Response:**
```json
{
  "companyId": 7,
  "companyName": "Gas Manufacturing Company",
  "totalRevenue": 468200,
  "totalExpenses": 0,
  "netProfit": 468200,
  "accountsReceivable": 398200,
  "accountsPayable": 0,
  "cashFlow": 68500,
  "activeCustomers": 5,
  "activeVendors": 0,
  "pendingSalesOrders": 85,
  "pendingPurchaseOrders": 0,
  "overdueInvoices": 5,
  "overdueBills": 0,
  "monthlyGrowth": 12.5,
  "reportDate": "2025-06-19T06:00:00.000Z"
}
```

### GET /api/dashboard/recent-transactions
Get recent transactions for dashboard.

**Request:**
```bash
GET /api/dashboard/recent-transactions?companyId=7&limit=10
```

**Response:**
```json
[
  {
    "id": 145,
    "type": "invoice",
    "number": "INV-7-123",
    "amount": 5000.00,
    "status": "pending",
    "date": "2025-06-18T09:32:03.456Z",
    "party": "Gas Distributor Company",
    "description": "Sales invoice for gas cylinders"
  },
  {
    "id": 15,
    "type": "credit_note",
    "number": "CN-7-1750239123456",
    "amount": 1000.00,
    "status": "completed",
    "date": "2025-06-18T09:32:03.456Z",
    "party": "Gas Distributor Company",
    "description": "Intercompany balance adjustment"
  },
  {
    "id": 171,
    "type": "sales_order",
    "number": "SO-7-1749044793865",
    "amount": 5000.00,
    "status": "pending",
    "date": "2025-06-04T18:39:53.868Z",
    "party": "Gas Distributor Company",
    "description": "Gas cylinders and regulators"
  }
]
```

### GET /api/dashboard/pending-actions
Get pending actions requiring attention.

**Request:**
```bash
GET /api/dashboard/pending-actions?companyId=7
```

**Response:**
```json
{
  "companyId": 7,
  "pendingInvoices": 70,
  "overdueInvoices": 5,
  "pendingSalesOrders": 85,
  "lowStockProducts": 3,
  "overdueReceivables": 45000,
  "upcomingPayments": 0,
  "requiresApproval": 2,
  "summary": {
    "totalPendingActions": 165,
    "highPriority": 8,
    "mediumPriority": 157,
    "lastUpdated": "2025-06-19T06:00:00.000Z"
  }
}
```

### GET /api/dashboard/pl-monthly
Get monthly P&L summary.

**Request:**
```bash
GET /api/dashboard/pl-monthly?companyId=7
```

**Response:**
```json
{
  "companyId": 7,
  "month": "2025-06",
  "revenue": 83750,
  "expenses": 0,
  "grossProfit": 83750,
  "netProfit": 83750,
  "profitMargin": 100.0,
  "previousMonth": {
    "revenue": 74500,
    "expenses": 0,
    "netProfit": 74500
  },
  "growth": {
    "revenueGrowth": 12.4,
    "profitGrowth": 12.4
  }
}
```

### GET /api/dashboard/cash-flow
Get cash flow summary.

**Request:**
```bash
GET /api/dashboard/cash-flow?companyId=7
```

**Response:**
```json
{
  "companyId": 7,
  "period": "2025-06",
  "inflows": 68500,
  "outflows": 0,
  "netCashFlow": 68500,
  "openingBalance": 125000,
  "closingBalance": 193500,
  "breakdown": {
    "operatingActivities": 68500,
    "investingActivities": 0,
    "financingActivities": 0
  },
  "projectedNextMonth": {
    "expectedInflows": 85000,
    "expectedOutflows": 15000,
    "projectedNet": 70000
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Product name and company_id are required"
}
```

### 404 Not Found
```json
{
  "error": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create product"
}
```

---

## Authentication & Headers

All requests should include:
```
Content-Type: application/json
Accept: application/json
```

## Rate Limiting
- 1000 requests per hour per IP
- 100 requests per minute per IP

## Pagination
For endpoints returning lists, add pagination parameters:
```
?page=1&limit=50&sortBy=created_at&sortOrder=desc
```

## Base URL
All endpoints are relative to: `http://localhost:3002/api/`

Production URL: `https://multitenantapistaging.tebs.co.in/api/`