
/**
 * WORKING SWAGGER ENDPOINT EXAMPLES
 * 
 * Use these exact field names for successful API calls:
 */

// 1. Create Sales Order
// POST /api/intercompany/sales-order
{
  "sourceCompanyId": 7,
  "targetCompanyId": 8, 
  "orderDate": "2025-05-27",
  "expectedDate": "2025-06-03",
  "total": 10000,
  "status": "open",
  "referenceNumber": "SO-TEST-" + Date.now(),
  "items": [
    {
      "product_id": 1,
      "quantity": 10,
      "price": 1000
    }
  ]
}

// 2. Create Purchase Order  
// POST /api/intercompany/purchase-order
{
  "sourceCompanyId": 8,
  "targetCompanyId": 7,
  "orderDate": "2025-05-27", 
  "expectedDate": "2025-06-03",
  "total": 10000,
  "status": "open",
  "referenceNumber": "PO-TEST-" + Date.now(),
  "relatedSalesOrderId": [SALES_ORDER_ID_FROM_STEP_1]
}

// 3. Create Invoice
// POST /api/intercompany/invoice
{
  "salesOrderId": [SALES_ORDER_ID],
  "invoiceDate": "2025-05-27",
  "dueDate": "2025-06-27", 
  "total": 10000,
  "status": "pending",
  "referenceNumber": "INV-TEST-" + Date.now()
}
