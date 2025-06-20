# Server.cjs API Documentation
Complete API documentation for final-deployment/server.cjs - Multi-Company Accounting System

## Table of Contents
1. [Health Check](#health-check)
2. [Company Management](#company-management)
3. [Intercompany Operations](#intercompany-operations)
4. [Products Management](#products-management)
5. [Sales & Purchase Orders](#sales--purchase-orders)
6. [Financial Operations](#financial-operations)
7. [Credit & Debit Notes](#credit--debit-notes)
8. [Reports & Analytics](#reports--analytics)
9. [Database Operations](#database-operations)

---

## Health Check

### GET /health
Check server and database connectivity.

**Request:**
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected to 135.235.154.222",
  "timestamp": "2025-06-19T06:36:27.447Z"
}
```

---

## Company Management

### GET /api/companies
Get all active companies in the system.

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
    "code": "GMC",
    "company_type": "Manufacturing",
    "address": "123 Industrial Ave",
    "phone": "+1-555-0123",
    "email": "info@gasmanufacturing.com",
    "is_active": true,
    "created_at": "2025-06-04T18:15:43.000Z",
    "updated_at": "2025-06-04T18:15:43.000Z"
  },
  {
    "id": 8,
    "name": "Gas Distributor Company", 
    "code": "GDC",
    "company_type": "Distribution",
    "address": "456 Commerce St",
    "phone": "+1-555-0124",
    "email": "info@gasdistributor.com",
    "is_active": true,
    "created_at": "2025-06-04T18:15:43.000Z",
    "updated_at": "2025-06-04T18:15:43.000Z"
  }
]
```

### POST /api/companies
Create a new company with default chart of accounts.

**Request:**
```json
{
  "name": "New Manufacturing Company",
  "code": "NMC",
  "company_type": "Manufacturing",
  "address": "789 Industrial Blvd",
  "phone": "+1-555-0125",
  "email": "info@newmanufacturing.com"
}
```

**Response:**
```json
{
  "success": true,
  "company": {
    "id": 25,
    "tenant_id": 1,
    "name": "New Manufacturing Company",
    "code": "NMC",
    "company_type": "Manufacturing",
    "address": "789 Industrial Blvd",
    "phone": "+1-555-0125",
    "email": "info@newmanufacturing.com",
    "fiscal_year": "calendar",
    "base_currency": "USD",
    "is_active": true,
    "created_at": "2025-06-19T06:36:27.447Z",
    "updated_at": "2025-06-19T06:36:27.447Z"
  },
  "chartOfAccounts": [
    {
      "id": 301,
      "name": "Cash and Cash Equivalents",
      "code": "1000",
      "account_type_id": 1
    },
    {
      "id": 302,
      "name": "Accounts Receivable",
      "code": "1100",
      "account_type_id": 1
    }
  ],
  "message": "Company created successfully with 15 default accounts"
}
```

---

## Intercompany Operations

### POST /api/intercompany/sales-order
Create intercompany sales order with corresponding purchase order.

**Request:**
```json
{
  "sourceCompanyId": 7,
  "targetCompanyId": 8,
  "orderTotal": 5000.00,
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "products": [
    {
      "id": 1,
      "quantity": 20,
      "unitPrice": 150.00,
      "lineTotal": 3000.00,
      "description": "Industrial Gas Cylinder"
    },
    {
      "id": 2,
      "quantity": 27,
      "unitPrice": 75.00,
      "lineTotal": 2025.00,
      "description": "Gas Regulator Valve"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "transactionGroupReference": "TXN-GROUP-7-8-1749044793865",
  "salesOrder": {
    "id": 171,
    "order_number": "SO-7-1749044793865",
    "total": 5000,
    "status": "Pending",
    "reference_number": "TXN-GROUP-7-8-1749044793865"
  },
  "purchaseOrder": {
    "id": 53,
    "order_number": "PO-8-1749044793865", 
    "total": 5000,
    "status": "Pending",
    "reference_number": "TXN-GROUP-7-8-1749044793865"
  },
  "sourceCompany": "Gas Manufacturing Company",
  "targetCompany": "Gas Distributor Company",
  "productCount": 2,
  "message": "Intercompany sales and purchase orders created successfully with product line items"
}
```

### POST /api/intercompany/invoice
Create intercompany invoice from sales order.

**Request:**
```json
{
  "salesOrderId": 171,
  "invoiceAmount": 5000.00,
  "dueDate": "2025-07-01",
  "invoiceItems": [
    {
      "productId": 1,
      "description": "Industrial Gas Cylinder",
      "quantity": 20,
      "unitPrice": 150.00,
      "amount": 3000.00
    },
    {
      "productId": 2,
      "description": "Gas Regulator Valve",
      "quantity": 27,
      "unitPrice": 75.00,
      "amount": 2025.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": 145,
    "invoice_number": "INV-7-123",
    "total_amount": 5000.00,
    "due_date": "2025-07-01T00:00:00.000Z",
    "reference_number": "TXN-GROUP-7-8-1749044793865"
  },
  "bill": {
    "id": 87,
    "bill_number": "BILL-8-456",
    "total_amount": 5000.00,
    "due_date": "2025-07-01T00:00:00.000Z",
    "reference_number": "TXN-GROUP-7-8-1749044793865"
  },
  "sourceCompany": "Gas Manufacturing Company",
  "targetCompany": "Gas Distributor Company",
  "message": "Intercompany invoice and bill created successfully"
}
```

### POST /api/intercompany/payment
Process intercompany payment between companies.

**Request:**
```json
{
  "payingCompanyId": 8,
  "receivingCompanyId": 7,
  "amount": 5000.00,
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "paymentMethod": "bank_transfer",
  "description": "Payment for gas cylinders and regulators"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": 42,
    "payment_number": "PAY-8-456",
    "amount": 5000.00,
    "payment_date": "2025-06-19T06:36:27.447Z",
    "payment_method": "bank_transfer",
    "reference_number": "TXN-GROUP-7-8-1749044793865"
  },
  "receipt": {
    "id": 35,
    "receipt_number": "REC-7-123",
    "amount": 5000.00,
    "receipt_date": "2025-06-19T06:36:27.447Z",
    "reference_number": "TXN-GROUP-7-8-1749044793865"
  },
  "payingCompany": "Gas Distributor Company",
  "receivingCompany": "Gas Manufacturing Company",
  "message": "Intercompany payment processed successfully"
}
```

### POST /api/intercompany/adjustment
Create credit and debit notes for intercompany adjustments.

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
  "adjustmentDate": "2025-06-19",
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
  "summary": {
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
      "created_date": "2025-06-19",
      "line_items": [
        {
          "product_id": 1,
          "product_name": "Industrial Gas Cylinder",
          "quantity": 10,
          "unit_price": "50.00",
          "total_amount": "500.00",
          "reason": "Product A adjustment"
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
      "created_date": "2025-06-19",
      "line_items": [
        {
          "product_id": 1,
          "product_name": "Industrial Gas Cylinder",
          "quantity": 10,
          "unit_price": "50.00",
          "total_amount": "500.00",
          "reason": "Product A adjustment"
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

---

## Products Management

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

## Sales & Purchase Orders

### GET /api/sales-orders
Get sales orders with product line items.

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

### GET /api/sales-orders/:id/products
Get product line items for a specific sales order.

**Request:**
```bash
GET /api/sales-orders/171/products
```

**Response:**
```json
{
  "salesOrderId": 171,
  "orderNumber": "SO-7-1749044793865",
  "products": [
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
  ],
  "productCount": 2,
  "totalValue": 5025.00
}
```

### GET /api/purchase-orders/:id/products
Get product line items for a specific purchase order.

**Request:**
```bash
GET /api/purchase-orders/53/products
```

**Response:**
```json
{
  "purchaseOrderId": 53,
  "orderNumber": "PO-8-1749044793865",
  "products": [
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
  ],
  "productCount": 2,
  "totalValue": 5025.00
}
```

---

## Financial Operations

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
      "lastTransactionDate": "2025-06-19T06:36:27.447Z"
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

### GET /api/companies/ar-ap-summary
Get AR/AP summary for all companies.

**Request:**
```bash
GET /api/companies/ar-ap-summary
```

**Response:**
```json
{
  "companies": [
    {
      "companyId": 7,
      "companyName": "Gas Manufacturing Company",
      "accountsReceivable": 398200,
      "accountsPayable": 0,
      "netPosition": 398200
    },
    {
      "companyId": 8,
      "companyName": "Gas Distributor Company",
      "accountsReceivable": 0,
      "accountsPayable": 215200,
      "netPosition": -215200
    }
  ],
  "totals": {
    "totalReceivables": 398200,
    "totalPayables": 215200,
    "netPosition": 183000
  },
  "intercompanyBalances": {
    "totalIntercompanyReceivables": 398200,
    "totalIntercompanyPayables": 215200,
    "netIntercompanyPosition": 183000
  }
}
```

---

## Credit & Debit Notes

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
    "created_date": "2025-06-19",
    "created_at": "2025-06-19T06:36:27.447Z",
    "line_items": [
      {
        "id": 25,
        "product_id": 1,
        "product_name": "Industrial Gas Cylinder",
        "quantity": 10,
        "unit_price": "50.00",
        "total_amount": "500.00",
        "reason": "Product A adjustment"
      }
    ]
  }
]
```

### POST /api/credit-notes
Create new credit note.

**Request:**
```json
{
  "companyId": 7,
  "customerId": 8,
  "invoiceId": 145,
  "totalAmount": 1000.00,
  "reason": "Product return adjustment",
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "lineItems": [
    {
      "productId": 1,
      "quantity": 10,
      "unitPrice": 50.00,
      "totalAmount": 500.00,
      "reason": "Product return"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "creditNote": {
    "id": 16,
    "credit_note_number": "CN-7-1750315123456",
    "company_id": 7,
    "customer_id": 8,
    "invoice_id": 145,
    "total_amount": "1000.00",
    "reason": "Product return adjustment",
    "reference_number": "TXN-GROUP-7-8-1749044793865",
    "created_date": "2025-06-19",
    "created_at": "2025-06-19T06:36:27.447Z"
  },
  "lineItems": [
    {
      "id": 26,
      "credit_note_id": 16,
      "product_id": 1,
      "quantity": 10,
      "unit_price": "50.00",
      "total_amount": "500.00",
      "reason": "Product return"
    }
  ],
  "message": "Credit note created successfully with 1 line items"
}
```

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
    "created_date": "2025-06-19",
    "created_at": "2025-06-19T06:36:27.447Z",
    "line_items": [
      {
        "id": 18,
        "product_id": 1,
        "product_name": "Industrial Gas Cylinder",
        "quantity": 10,
        "unit_price": "50.00",
        "total_amount": "500.00",
        "reason": "Product A adjustment"
      }
    ]
  }
]
```

### POST /api/debit-notes
Create new debit note.

**Request:**
```json
{
  "companyId": 8,
  "vendorId": 7,
  "billId": 87,
  "totalAmount": 1000.00,
  "reason": "Additional charges",
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "lineItems": [
    {
      "productId": 1,
      "quantity": 10,
      "unitPrice": 50.00,
      "totalAmount": 500.00,
      "reason": "Additional product charges"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "debitNote": {
    "id": 13,
    "debit_note_number": "DN-8-1750315123456",
    "company_id": 8,
    "vendor_id": 7,
    "bill_id": 87,
    "total_amount": "1000.00",
    "reason": "Additional charges",
    "reference_number": "TXN-GROUP-7-8-1749044793865",
    "created_date": "2025-06-19",
    "created_at": "2025-06-19T06:36:27.447Z"
  },
  "lineItems": [
    {
      "id": 19,
      "debit_note_id": 13,
      "product_id": 1,
      "quantity": 10,
      "unit_price": "50.00",
      "total_amount": "500.00",
      "reason": "Additional product charges"
    }
  ],
  "message": "Debit note created successfully with 1 line items"
}
```

### GET /api/credit-accounts
Get available accounts for credit operations.

**Request:**
```bash
GET /api/credit-accounts?companyId=7
```

**Response:**
```json
[
  {
    "id": 301,
    "code": "1100",
    "name": "Accounts Receivable",
    "account_type": "Asset",
    "company_id": 7,
    "is_active": true
  },
  {
    "id": 304,
    "code": "4000",
    "name": "Sales Revenue",
    "account_type": "Revenue",
    "company_id": 7,
    "is_active": true
  }
]
```

### GET /api/debit-accounts
Get available accounts for debit operations.

**Request:**
```bash
GET /api/debit-accounts?companyId=8
```

**Response:**
```json
[
  {
    "id": 320,
    "code": "2000",
    "name": "Accounts Payable",
    "account_type": "Liability",
    "company_id": 8,
    "is_active": true
  },
  {
    "id": 325,
    "code": "5000",
    "name": "Cost of Goods Sold",
    "account_type": "Expense",
    "company_id": 8,
    "is_active": true
  }
]
```

---

## Reports & Analytics

### GET /api/reference/:reference
Get all transactions related to a reference number.

**Request:**
```bash
GET /api/reference/TXN-GROUP-7-8-1749044793865
```

**Response:**
```json
{
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "transactionSummary": {
    "salesOrders": 1,
    "purchaseOrders": 1,
    "invoices": 1,
    "bills": 1,
    "payments": 1,
    "receipts": 1,
    "creditNotes": 1,
    "debitNotes": 1
  },
  "transactions": [
    {
      "type": "sales_order",
      "id": 171,
      "number": "SO-7-1749044793865",
      "company": "Gas Manufacturing Company",
      "amount": 5000.00,
      "date": "2025-06-04T18:39:53.868Z",
      "status": "Pending"
    },
    {
      "type": "purchase_order",
      "id": 53,
      "number": "PO-8-1749044793865",
      "company": "Gas Distributor Company",
      "amount": 5000.00,
      "date": "2025-06-04T18:39:53.868Z",
      "status": "Pending"
    },
    {
      "type": "invoice",
      "id": 145,
      "number": "INV-7-123",
      "company": "Gas Manufacturing Company",
      "amount": 5000.00,
      "date": "2025-06-19T06:36:27.447Z",
      "status": "Pending"
    },
    {
      "type": "bill",
      "id": 87,
      "number": "BILL-8-456",
      "company": "Gas Distributor Company",
      "amount": 5000.00,
      "date": "2025-06-19T06:36:27.447Z",
      "status": "Pending"
    },
    {
      "type": "credit_note",
      "id": 15,
      "number": "CN-7-1750239123456",
      "company": "Gas Manufacturing Company",
      "amount": 1000.00,
      "date": "2025-06-19T06:36:27.447Z",
      "status": "Completed"
    },
    {
      "type": "debit_note",
      "id": 12,
      "number": "DN-8-1750239123456",
      "company": "Gas Distributor Company",
      "amount": 1000.00,
      "date": "2025-06-19T06:36:27.447Z",
      "status": "Completed"
    }
  ],
  "totalValue": 22000.00,
  "netEffect": 0.00,
  "isBalanced": true
}
```

### GET /api/transaction-group/:reference
Get detailed transaction group analysis.

**Request:**
```bash
GET /api/transaction-group/TXN-GROUP-7-8-1749044793865
```

**Response:**
```json
{
  "referenceNumber": "TXN-GROUP-7-8-1749044793865",
  "analysis": {
    "totalTransactions": 8,
    "totalValue": 22000.00,
    "manufacturerNet": 4000.00,
    "distributorNet": -4000.00,
    "isBalanced": true,
    "completionStatus": "Partially Complete"
  },
  "workflow": {
    "step1_sales_order": {
      "status": "Completed",
      "amount": 5000.00,
      "company": "Gas Manufacturing Company"
    },
    "step2_purchase_order": {
      "status": "Completed",
      "amount": 5000.00,
      "company": "Gas Distributor Company"
    },
    "step3_invoice": {
      "status": "Completed",
      "amount": 5000.00,
      "company": "Gas Manufacturing Company"
    },
    "step4_bill": {
      "status": "Completed",
      "amount": 5000.00,
      "company": "Gas Distributor Company"
    },
    "step5_payment": {
      "status": "Pending",
      "amount": 0.00,
      "company": "Gas Distributor Company"
    },
    "step6_receipt": {
      "status": "Pending",
      "amount": 0.00,
      "company": "Gas Manufacturing Company"
    },
    "step7_adjustments": {
      "status": "Completed",
      "creditNotes": 1,
      "debitNotes": 1,
      "totalAdjustment": 1000.00
    }
  },
  "companies": [
    {
      "id": 7,
      "name": "Gas Manufacturing Company",
      "role": "Seller",
      "receivables": 4000.00,
      "payables": 0.00,
      "netPosition": 4000.00
    },
    {
      "id": 8,
      "name": "Gas Distributor Company",
      "role": "Buyer",
      "receivables": 0.00,
      "payables": 4000.00,
      "netPosition": -4000.00
    }
  ]
}
```

### GET /api/accounts
Get chart of accounts for a company.

**Request:**
```bash
GET /api/accounts?companyId=7
```

**Response:**
```json
[
  {
    "id": 301,
    "company_id": 7,
    "name": "Cash and Cash Equivalents",
    "code": "1000",
    "account_type_id": 1,
    "account_type_name": "Asset",
    "is_active": true,
    "created_at": "2025-06-04T18:15:43.000Z",
    "updated_at": "2025-06-04T18:15:43.000Z"
  },
  {
    "id": 302,
    "name": "Accounts Receivable",
    "code": "1100",
    "account_type_id": 1,
    "account_type_name": "Asset",
    "is_active": true,
    "created_at": "2025-06-04T18:15:43.000Z",
    "updated_at": "2025-06-04T18:15:43.000Z"
  }
]
```

### POST /api/accounts
Create new account for a company.

**Request:**
```json
{
  "companyId": 7,
  "name": "Office Supplies",
  "code": "6200",
  "accountTypeId": 2,
  "description": "Office supplies and materials"
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": 350,
    "company_id": 7,
    "name": "Office Supplies",
    "code": "6200",
    "account_type_id": 2,
    "description": "Office supplies and materials",
    "is_active": true,
    "created_at": "2025-06-19T06:36:27.447Z",
    "updated_at": "2025-06-19T06:36:27.447Z"
  },
  "message": "Account created successfully"
}
```

---

## Database Operations

### POST /api/setup-database
Initialize database with required tables and indexes.

**Request:**
```json
{
  "confirmSetup": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Database setup completed successfully",
  "tablesCreated": [
    "credit_notes",
    "credit_note_line_items",
    "debit_notes",
    "debit_note_line_items"
  ],
  "indexesCreated": [
    "idx_credit_notes_company_id",
    "idx_credit_notes_reference_number",
    "idx_debit_notes_company_id",
    "idx_debit_notes_reference_number"
  ],
  "timestamp": "2025-06-19T06:36:27.447Z"
}
```

---

## Error Handling

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

## Features

### Azure Application Insights Integration
- Full telemetry for all operations
- Performance tracking and error logging  
- Request correlation across related transactions
- Instrumentation Key: e04a0cf1-8129-4bc2-8707-016ae726c876

### Database Connectivity
- External PostgreSQL database at 135.235.154.222
- Database: account_replit_staging
- SSL disabled for compatibility
- Connection pooling for performance

### Business Logic
- Multi-company transaction isolation
- Intercompany workflow automation
- Credit notes reduce AR, debit notes increase AP
- Product line items integration across all transactions
- Reference number tracking for complete audit trails

### Authentication & Security
- Request ID generation for all operations
- Comprehensive logging with Application Insights
- Input validation and sanitization
- Error handling with proper HTTP status codes

---

## Base URLs
- Development: `http://localhost:3002`
- Production: `https://multitenantapistaging.tebs.co.in`

All endpoints are prefixed with `/api/` except for health checks and root endpoints.