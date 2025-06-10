# Complete Intercompany Functionality Test

## Enhanced Dual-Company Transaction System

### 1. Intercompany Sales Order
**Creates:** Sales Order in Source + Purchase Order in Target
```bash
curl -X POST "http://localhost:3002/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "orderTotal": 5000
  }'
```
**Result:** 
- Gas Manufacturing (7): Creates Sales Order SO-7-timestamp
- Gas Distributor (8): Creates Purchase Order PO-8-timestamp

### 2. Intercompany Invoice 
**Creates:** Sales Invoice in Source + Purchase Bill in Target
```bash
curl -X POST "http://localhost:3002/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 7,
    "targetCompanyId": 8,
    "salesOrderId": 134,
    "total": 5000
  }'
```
**Result:**
- Gas Manufacturing (7): Creates Sales Invoice INV-7-timestamp
- Gas Distributor (8): Creates Purchase Bill BILL-8-timestamp

### 3. Intercompany Payment
**Creates:** Payment in Source + Receipt in Target
```bash
curl -X POST "http://localhost:3002/api/intercompany/payment" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCompanyId": 8,
    "targetCompanyId": 7,
    "invoiceId": [invoice_id],
    "billId": [bill_id],
    "amount": 5000
  }'
```
**Result:**
- Gas Distributor (8): Creates Payment PAY-8-timestamp
- Gas Manufacturing (7): Creates Receipt REC-7-timestamp

## Complete Workflow Test
```bash
# Step 1: Create intercompany sales order
SALES_ORDER=$(curl -X POST "http://localhost:3002/api/intercompany/sales-order" \
  -H "Content-Type: application/json" \
  -d '{"sourceCompanyId": 7, "targetCompanyId": 8, "orderTotal": 5000}')

# Step 2: Extract sales order ID and create invoice
SALES_ORDER_ID=$(echo $SALES_ORDER | jq -r '.salesOrder.id')
INVOICE_RESPONSE=$(curl -X POST "http://localhost:3002/api/intercompany/invoice" \
  -H "Content-Type: application/json" \
  -d "{\"sourceCompanyId\": 7, \"targetCompanyId\": 8, \"salesOrderId\": $SALES_ORDER_ID, \"total\": 5000}")

# Step 3: Extract invoice and bill IDs for payment
INVOICE_ID=$(echo $INVOICE_RESPONSE | jq -r '.salesInvoice.id')
BILL_ID=$(echo $INVOICE_RESPONSE | jq -r '.purchaseBill.id')

# Step 4: Create payment/receipt
curl -X POST "http://localhost:3002/api/intercompany/payment" \
  -H "Content-Type: application/json" \
  -d "{\"sourceCompanyId\": 8, \"targetCompanyId\": 7, \"invoiceId\": $INVOICE_ID, \"billId\": $BILL_ID, \"amount\": 5000}"
```

## Verification Queries
```bash
# Check AR summary for Gas Manufacturing (should include new invoice and receipt)
curl -s "http://localhost:3002/api/invoices/summary?companyId=7"

# Check AP summary for Gas Distributor (should include new bill and payment)
curl -s "http://localhost:3002/api/bills/summary?companyId=8"

# Verify intercompany balances
curl -s "http://localhost:3002/api/intercompany-balances?companyId=7"
curl -s "http://localhost:3002/api/intercompany-balances?companyId=8"
```

## Expected Results
Each intercompany transaction now properly creates records in both companies:
- **Sales Orders** create corresponding Purchase Orders
- **Invoices** create corresponding Bills
- **Payments** create corresponding Receipts

This ensures proper double-entry accounting across all intercompany relationships.