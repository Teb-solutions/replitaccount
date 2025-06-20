# Intercompany Adjustment API Documentation

## Overview
The Intercompany Adjustment API enables automatic creation of credit and debit notes based on reference numbers from sales orders and purchase orders. This facilitates proper balancing of intercompany transactions with full product line item support.

## API Endpoints

### Create Intercompany Adjustment
**POST** `/api/intercompany/adjustment`

Creates credit notes and debit notes for transactions with matching reference numbers.

**Request Body:**
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
  "productDetails": [...],
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

### Get Adjustment History
**GET** `/api/intercompany/adjustment/{reference}`

Retrieves all credit and debit notes created for a specific reference number.

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
      "line_items": [
        {
          "productId": 1,
          "quantity": 10,
          "unitPrice": 50.00,
          "totalAmount": 500.00,
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
      "line_items": [...]
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

## Key Features

### 1. Reference-Based Matching
- Finds sales orders and purchase orders using reference numbers
- Automatically locates related invoices and bills
- Creates balancing credit/debit notes

### 2. Product Line Items Support
- Optional products array for detailed adjustments
- Automatically distributes amounts across product lines
- Stores product details in credit_note_line_items and debit_note_line_items tables

### 3. AR/AP Integration
- Credit notes reduce Accounts Receivable
- Debit notes increase Accounts Payable
- Proper reflection in invoice/summary and bills/summary endpoints

### 4. Transaction Tracking
- Complete audit trail of all adjustments
- Reference number linking for workflow tracking
- Azure Application Insights logging for all operations

## Database Tables Updated

### Credit Notes
- `credit_notes` - Main credit note records
- `credit_note_line_items` - Product line items for credit notes

### Debit Notes
- `debit_notes` - Main debit note records  
- `debit_note_line_items` - Product line items for debit notes

### Enhanced Sales/Purchase Orders
- `sales_order_line_items` - Product details for sales orders
- `purchase_order_line_items` - Product details for purchase orders

## Error Handling
- Validates required parameters (referenceNumber, adjustmentAmount)
- Returns 404 if no transactions found for reference
- Returns 400 for missing parameters
- Full error logging with Application Insights

## Usage Examples

### Simple Adjustment (No Products)
```bash
curl -X POST "http://localhost:3002/api/intercompany/adjustment" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "TXN-GROUP-7-8-1749044793865",
    "adjustmentAmount": 500.00,
    "adjustmentReason": "Simple balance adjustment"
  }'
```

### Product-Based Adjustment
```bash
curl -X POST "http://localhost:3002/api/intercompany/adjustment" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "TXN-GROUP-7-8-1749044793865",
    "adjustmentAmount": 1000.00,
    "adjustmentReason": "Product return adjustment",
    "products": [
      {
        "productId": 1,
        "quantity": 10,
        "unitPrice": 100.00,
        "totalAmount": 1000.00,
        "reason": "Product return"
      }
    ]
  }'
```

### View Adjustment History
```bash
curl "http://localhost:3002/api/intercompany/adjustment/TXN-GROUP-7-8-1749044793865"
```

## Azure Application Insights Integration
All adjustment operations are logged with detailed telemetry including:
- Adjustment creation events
- Product line item details
- Error conditions
- Performance metrics
- Request correlation tracking