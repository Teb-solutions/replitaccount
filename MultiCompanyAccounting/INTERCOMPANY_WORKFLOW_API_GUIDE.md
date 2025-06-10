# Intercompany Workflow API Guide

## Complete End-to-End Intercompany Transaction Workflow

This guide demonstrates how to use the Swagger API endpoints to create a complete intercompany transaction workflow between two companies (e.g., Gas Manufacturing Company and Gas Distributor Company).

### Workflow Overview

The complete intercompany workflow consists of these steps:
1. **Create Sales Order** - Manufacturing company creates order to sell to distributor
2. **Create Purchase Order** - Distributor creates order to buy from manufacturer  
3. **Create Invoice** - Manufacturing company invoices the sales order
4. **Create Bill** - Distributor receives bill for the purchase order
5. **Create Receipt Payment** - Distributor pays the invoice

---

## API Endpoints Available in Swagger

All endpoints are documented in Swagger at `/api-docs` under these sections:
- **Company Management** - Create new companies with chart of accounts
- **Intercompany Workflow** - Complete transaction workflow endpoints

---

## Step-by-Step Workflow Implementation

### Step 1: Create Sales Order
**Endpoint:** `POST /api/intercompany/sales-order`

Creates a sales order from the manufacturing company to the distributor company.

**Request Body:**
```json
{
  "sourceCompanyId": 7,
  "targetCompanyId": 8,
  "products": [
    {
      "productId": 15,
      "quantity": 10,
      "unitPrice": 500
    },
    {
      "productId": 16,
      "quantity": 5,
      "unitPrice": 1000
    }
  ],
  "orderTotal": 10000
}
```

**Expected Response:**
```json
{
  "salesOrderId": 95,
  "orderNumber": "SO-7-1747979205123-25",
  "totalAmount": 10000,
  "status": "Pending",
  "message": "Sales order created successfully"
}
```

---

### Step 2: Create Purchase Order
**Endpoint:** `POST /api/intercompany/purchase-order`

Creates a corresponding purchase order from the distributor company.

**Request Body:**
```json
{
  "sourceCompanyId": 8,
  "targetCompanyId": 7,
  "products": [
    {
      "productId": 15,
      "quantity": 10,
      "unitPrice": 500
    },
    {
      "productId": 16,
      "quantity": 5,
      "unitPrice": 1000
    }
  ],
  "orderTotal": 10000
}
```

**Expected Response:**
```json
{
  "purchaseOrderId": 45,
  "orderNumber": "PO-8-1747979205456-18",
  "totalAmount": 10000,
  "status": "Pending",
  "message": "Purchase order created successfully"
}
```

---

### Step 3: Create Invoice
**Endpoint:** `POST /api/intercompany/invoice`

Manufacturing company creates an invoice for the sales order.

**Request Body:**
```json
{
  "salesOrderId": 95,
  "companyId": 7,
  "partialAmount": null
}
```

**For Partial Invoice:**
```json
{
  "salesOrderId": 95,
  "companyId": 7,
  "partialAmount": 5000
}
```

**Expected Response:**
```json
{
  "invoiceId": 185,
  "invoiceNumber": "INV-7-1747979205789-42",
  "totalAmount": 10000,
  "status": "Open",
  "message": "Invoice created successfully"
}
```

---

### Step 4: Create Bill
**Endpoint:** `POST /api/intercompany/bill`

Distributor company creates a bill for the purchase order.

**Request Body:**
```json
{
  "purchaseOrderId": 45,
  "companyId": 8,
  "partialAmount": null
}
```

**Expected Response:**
```json
{
  "billId": 125,
  "billNumber": "BILL-8-1747979206012-28",
  "totalAmount": 10000,
  "status": "Open",
  "message": "Bill created successfully"
}
```

---

### Step 5: Create Receipt Payment
**Endpoint:** `POST /api/intercompany/receipt-payment`

Distributor company makes payment for the invoice.

**Request Body:**
```json
{
  "invoiceId": 185,
  "companyId": 8,
  "amount": 10000,
  "paymentMethod": "Bank Transfer"
}
```

**For Partial Payment:**
```json
{
  "invoiceId": 185,
  "companyId": 8,
  "amount": 5000,
  "paymentMethod": "Bank Transfer"
}
```

**Expected Response:**
```json
{
  "receiptId": 95,
  "receiptNumber": "REC-7-1747979206345-15",
  "paymentAmount": 10000,
  "paymentMethod": "Bank Transfer",
  "message": "Receipt payment created successfully"
}
```

---

## Complete Workflow Automation

### Single API Call for Complete Workflow
**Endpoint:** `POST /api/intercompany/complete-workflow`

Creates the entire workflow in one API call.

**Request Body:**
```json
{
  "manufacturingCompanyId": 7,
  "distributorCompanyId": 8,
  "products": [
    {
      "productId": 15,
      "quantity": 10,
      "unitPrice": 500
    },
    {
      "productId": 16,
      "quantity": 5,
      "unitPrice": 1000
    }
  ],
  "totalAmount": 10000,
  "paymentAmount": 5000
}
```

**Expected Response:**
```json
{
  "message": "Complete intercompany workflow created successfully",
  "workflow": {
    "salesOrder": {
      "salesOrderId": 96,
      "orderNumber": "SO-7-1747979207123-26",
      "totalAmount": 10000,
      "status": "Pending"
    },
    "invoice": {
      "invoiceId": 186,
      "invoiceNumber": "INV-7-1747979207456-43",
      "totalAmount": 10000,
      "status": "Open"
    },
    "purchaseOrder": {
      "purchaseOrderId": 46,
      "orderNumber": "PO-8-1747979207789-19",
      "totalAmount": 10000,
      "status": "Pending"
    },
    "bill": {
      "billId": 126,
      "billNumber": "BILL-8-1747979208012-29",
      "totalAmount": 10000,
      "status": "Open"
    },
    "receipt": {
      "receiptId": 96,
      "receiptNumber": "REC-7-1747979208345-16",
      "paymentAmount": 5000,
      "paymentMethod": "Bank Transfer"
    }
  },
  "summary": {
    "manufacturingCompany": 7,
    "distributorCompany": 8,
    "totalAmount": 10000,
    "paymentAmount": 5000,
    "status": "Partially Paid"
  }
}
```

---

## Test Cases for Swagger API Testing

### Test Case 1: Full Payment Workflow
**Scenario:** Complete intercompany transaction with full payment

1. **Create Sales Order** (`POST /api/intercompany/sales-order`)
   - Use Gas Manufacturing Co (ID: 7) as source
   - Use Gas Distributor Co (ID: 8) as target
   - Order total: $10,000

2. **Create Invoice** (`POST /api/intercompany/invoice`)
   - Invoice full amount: $10,000

3. **Create Purchase Order** (`POST /api/intercompany/purchase-order`)
   - Mirror the sales order details

4. **Create Bill** (`POST /api/intercompany/bill`)
   - Bill full amount: $10,000

5. **Create Receipt Payment** (`POST /api/intercompany/receipt-payment`)
   - Pay full amount: $10,000

**Expected Outcome:** Invoice status = "Paid", Bill status = "Open"

---

### Test Case 2: Partial Payment Workflow
**Scenario:** Intercompany transaction with partial payment

1. **Create Sales Order** - $10,000 total
2. **Create Partial Invoice** - $6,000 (60% of order)
3. **Create Purchase Order** - $10,000 total
4. **Create Partial Bill** - $6,000 
5. **Create Partial Payment** - $3,000 (50% of invoice)

**Expected Outcome:** Invoice status = "Partial", remaining balance = $3,000

---

### Test Case 3: Multiple Product Lines
**Scenario:** Complex order with multiple products

**Products Array:**
```json
[
  {
    "productId": 15,
    "quantity": 20,
    "unitPrice": 250
  },
  {
    "productId": 16,
    "quantity": 10,
    "unitPrice": 500
  },
  {
    "productId": 17,
    "quantity": 5,
    "unitPrice": 1000
  }
]
```

**Total:** $20,000 (5,000 + 5,000 + 5,000)

---

### Test Case 4: Complete Workflow Automation
**Scenario:** Use single API call for entire workflow

**Use Endpoint:** `POST /api/intercompany/complete-workflow`

**Verify:**
- Sales order created
- Purchase order created  
- Invoice generated
- Bill generated
- Payment processed
- All records properly linked

---

## Company Management Integration

### Create New Company
**Endpoint:** `POST /api/companies`

Before testing intercompany workflows, you can create new companies:

**Request Body:**
```json
{
  "name": "New Manufacturing Corp",
  "code": "NEWMFG",
  "type": "manufacturer",
  "address": "123 Industrial Blvd",
  "phone": "+1-555-123-4567",
  "email": "contact@newmfg.com",
  "tenant_id": 2
}
```

**Features:**
- Automatically creates complete chart of accounts (25+ accounts)
- Sets up intercompany receivable/payable accounts
- Ready for immediate intercompany transactions

---

## API Testing with Swagger UI

### Using Swagger Interface

1. **Navigate to:** `/api-docs`
2. **Find Sections:**
   - Company Management
   - Intercompany Workflow
3. **Test Endpoints:**
   - Click "Try it out" 
   - Fill in request body
   - Click "Execute"
   - Review response

### Authentication
Most endpoints require authentication. Ensure you're logged in to the system before testing.

### Error Handling
All endpoints include comprehensive error responses:
- 400: Invalid request data
- 404: Resource not found
- 500: Server error with details

---

## Expected Database Changes

After running the complete workflow, verify these database changes:

### Sales Orders Table
- New record with status "Pending"
- Linked to customer company

### Purchase Orders Table  
- New record with status "Pending"
- Linked to vendor company

### Invoices Table
- New record with status "Open" or "Paid"
- Linked to sales order and customer

### Bills Table
- New record with status "Open" 
- Linked to purchase order and vendor

### Receipts Table
- New payment record
- Updates invoice amount_paid and balance_due

### Journal Entries (Future Enhancement)
- Automatic double-entry accounting entries
- Debit/Credit postings for each transaction

---

## Validation and Verification

### Check Transaction Completion
Use these GET endpoints to verify workflow completion:

1. `GET /api/sales-orders?companyId=7` - Verify sales order
2. `GET /api/purchase-orders?companyId=8` - Verify purchase order  
3. `GET /api/invoices/summary?companyId=7` - Check invoice status
4. `GET /api/bills/summary?companyId=8` - Check bill status
5. `GET /api/intercompany-balances?companyId=7` - Verify receivables
6. `GET /api/intercompany-balances?companyId=8` - Verify payables

### Balance Verification
- Manufacturing Company: Increased receivables
- Distributor Company: Increased payables
- After payment: Reduced receivables/payables

---

## Best Practices

1. **Sequential Testing:** Execute steps in order for proper data relationships
2. **ID Tracking:** Save returned IDs for subsequent API calls
3. **Amount Consistency:** Ensure order, invoice, and payment amounts align
4. **Status Monitoring:** Check status changes after each step
5. **Error Handling:** Review error messages for debugging

---

## Production Considerations

- **Transaction Atomicity:** Consider wrapping multi-step workflows in database transactions
- **Audit Trail:** All operations are logged with timestamps and user information
- **Concurrency:** Handle simultaneous operations on the same orders
- **Validation:** Implement business rules for order limits and payment terms

This guide provides a complete framework for testing and implementing intercompany workflows using your Swagger API endpoints!