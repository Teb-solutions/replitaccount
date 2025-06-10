/**
 * @swagger
 * tags:
 *   name: Order Tracking
 *   description: Get comprehensive order tracking with invoices/bills and receipts/payments
 * 
 * /sales-order-tracking:
 *   get:
 *     summary: Get sales orders with connected invoices and receipts
 *     tags: [Sales Order Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID to retrieve sales data for
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (format YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (format YYYY-MM-DD)
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, Processing, Completed, Cancelled]
 *         description: Filter by sales order status
 *     responses:
 *       200:
 *         description: Detailed sales orders with connected invoices and receipts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 companyId:
 *                   type: integer
 *                   example: 7
 *                 companyName:
 *                   type: string
 *                   example: "Gas Manufacturing Company"
 *                 totalSalesOrders:
 *                   type: integer
 *                   example: 15
 *                 totalInvoiced:
 *                   type: number
 *                   format: float
 *                   example: 150000.00
 *                 totalReceived:
 *                   type: number
 *                   format: float
 *                   example: 100000.00
 *                 outstandingAmount:
 *                   type: number
 *                   format: float
 *                   example: 50000.00
 *                 salesOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 24
 *                       orderNumber:
 *                         type: string
 *                         example: "SO-7-12345"
 *                       orderDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-05-01"
 *                       customerId:
 *                         type: integer
 *                         example: 8
 *                       customerName:
 *                         type: string
 *                         example: "Gas Distributor Company"
 *                       amount:
 *                         type: number
 *                         format: float
 *                         example: 10000.00
 *                       status:
 *                         type: string
 *                         example: "Completed"
 *                       invoices:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 18
 *                             invoiceNumber:
 *                               type: string
 *                               example: "INV-7-12345"
 *                             invoiceDate:
 *                               type: string
 *                               format: date
 *                               example: "2025-05-02"
 *                             amount:
 *                               type: number
 *                               format: float
 *                               example: 10000.00
 *                             status:
 *                               type: string
 *                               enum: [open, partial, paid, cancelled]
 *                               example: "open"
 *                             receipts:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                     example: 7
 *                                   receiptNumber:
 *                                     type: string
 *                                     example: "RCPT-7-12345"
 *                                   receiptDate:
 *                                     type: string
 *                                     format: date
 *                                     example: "2025-05-05"
 *                                   amount:
 *                                     type: number
 *                                     format: float
 *                                     example: 5000.00
 *                                   paymentMethod:
 *                                     type: string
 *                                     enum: [cash, bank, wire, check]
 *                                     example: "bank"
 *                                   bankAccount:
 *                                     type: string
 *                                     example: "Main Operations Account"
 *                                   referenceNumber:
 *                                     type: string
 *                                     example: "WIRE-123456"
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 * 
 * /purchase-order-tracking:
 *   get:
 *     summary: Get purchase orders with connected bills and payments
 *     tags: [Sales Order Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID to retrieve purchase data for
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (format YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (format YYYY-MM-DD)
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: integer
 *         description: Filter by vendor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, Processing, Completed, Cancelled]
 *         description: Filter by purchase order status
 *     responses:
 *       200:
 *         description: Detailed purchase orders with connected bills and payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 companyId:
 *                   type: integer
 *                   example: 8
 *                 companyName:
 *                   type: string
 *                   example: "Gas Distributor Company"
 *                 totalPurchaseOrders:
 *                   type: integer
 *                   example: 12
 *                 totalBilled:
 *                   type: number
 *                   format: float
 *                   example: 144000.00
 *                 totalPaid:
 *                   type: number
 *                   format: float
 *                   example: 80000.00
 *                 outstandingAmount:
 *                   type: number
 *                   format: float
 *                   example: 64000.00
 *                 purchaseOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 12
 *                       orderNumber:
 *                         type: string
 *                         example: "PO-8-12345"
 *                       orderDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-05-01"
 *                       vendorId:
 *                         type: integer
 *                         example: 7
 *                       vendorName:
 *                         type: string
 *                         example: "Gas Manufacturing Company"
 *                       amount:
 *                         type: number
 *                         format: float
 *                         example: 10000.00
 *                       status:
 *                         type: string
 *                         example: "Completed"
 *                       bills:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 9
 *                             billNumber:
 *                               type: string
 *                               example: "BILL-8-12345"
 *                             billDate:
 *                               type: string
 *                               format: date
 *                               example: "2025-05-02"
 *                             amount:
 *                               type: number
 *                               format: float
 *                               example: 10000.00
 *                             status:
 *                               type: string
 *                               enum: [open, partial, paid, cancelled]
 *                               example: "open"
 *                             payments:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                     example: 5
 *                                   paymentNumber:
 *                                     type: string
 *                                     example: "PAY-8-12345"
 *                                   paymentDate:
 *                                     type: string
 *                                     format: date
 *                                     example: "2025-05-05"
 *                                   amount:
 *                                     type: number
 *                                     format: float
 *                                     example: 5000.00
 *                                   paymentMethod:
 *                                     type: string
 *                                     enum: [cash, bank, wire, check]
 *                                     example: "bank"
 *                                   bankAccount:
 *                                     type: string
 *                                     example: "AP Account"
 *                                   referenceNumber:
 *                                     type: string
 *                                     example: "CHECK-789012"
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */