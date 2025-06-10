/**
 * @swagger
 * tags:
 *   name: Purchase Order Tracking
 *   description: Get comprehensive purchase order tracking with bills and payments
 * 
 * /purchase-order-tracking:
 *   get:
 *     summary: Get purchase orders with connected bills and payments
 *     tags: [Purchase Order Tracking]
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
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 18
 *                             productId:
 *                               type: integer
 *                               example: 13
 *                             productName:
 *                               type: string
 *                               example: "Filled Gas Cylinder 12kg"
 *                             quantity:
 *                               type: number
 *                               example: 10
 *                             price:
 *                               type: number
 *                               format: float
 *                               example: 1000.00
 *                             total:
 *                               type: number
 *                               format: float
 *                               example: 10000.00
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
 *
 * /purchase-order-items:
 *   get:
 *     summary: Get purchase order line items with product details
 *     tags: [Purchase Order Tracking]
 *     parameters:
 *       - in: query
 *         name: purchaseOrderId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Purchase Order ID to retrieve items for
 *     responses:
 *       200:
 *         description: Purchase order line items with product details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 24
 *                   purchaseOrderId:
 *                     type: integer
 *                     example: 12
 *                   productId:
 *                     type: integer
 *                     example: 13
 *                   productName:
 *                     type: string
 *                     example: "Filled Gas Cylinder 12kg"
 *                   productCode:
 *                     type: string
 *                     example: "FILL-CYL12"
 *                   quantity:
 *                     type: number
 *                     example: 10
 *                   price:
 *                     type: number
 *                     format: float
 *                     example: 1000.00
 *                   total:
 *                     type: number
 *                     format: float
 *                     example: 10000.00
 *                   receivedQuantity:
 *                     type: number
 *                     example: 8
 *                   pendingQuantity:
 *                     type: number
 *                     example: 2
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Server error
 *
 * /purchase-order-bill-summary:
 *   get:
 *     summary: Get bill payment summary for purchase orders
 *     tags: [Purchase Order Tracking]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID to retrieve bill payment summary for
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
 *     responses:
 *       200:
 *         description: Bill payment summary by vendor
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
 *                 totalBilled:
 *                   type: number
 *                   format: float
 *                   example: 144000.00
 *                 totalPaid:
 *                   type: number
 *                   format: float
 *                   example: 80000.00
 *                 totalOutstanding:
 *                   type: number
 *                   format: float
 *                   example: 64000.00
 *                 vendorSummaries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       vendorId:
 *                         type: integer
 *                         example: 7
 *                       vendorName:
 *                         type: string
 *                         example: "Gas Manufacturing Company"
 *                       totalBilled:
 *                         type: number
 *                         format: float
 *                         example: 144000.00
 *                       totalPaid:
 *                         type: number
 *                         format: float
 *                         example: 80000.00
 *                       totalOutstanding:
 *                         type: number
 *                         format: float
 *                         example: 64000.00
 *                       billCount:
 *                         type: integer
 *                         example: 12
 *                       paymentCount:
 *                         type: integer
 *                         example: 8
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */