const express = require('express');
const { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  PaymentTerm,
  Company,
  IntercompanyTransaction
} = require('../models');
const router = express.Router();
const { sequelize } = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     PurchaseOrderItem:
 *       type: object
 *       required:
 *         - purchaseOrderId
 *         - description
 *         - quantity
 *         - unitPrice
 *         - total
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the purchase order item
 *         purchaseOrderId:
 *           type: integer
 *           description: The ID of the purchase order this item belongs to
 *         productId:
 *           type: integer
 *           description: Optional ID of the product
 *         description:
 *           type: string
 *           description: Description of the item
 *         quantity:
 *           type: number
 *           format: decimal
 *           description: Quantity of the item
 *         unitPrice:
 *           type: number
 *           format: decimal
 *           description: Unit price of the item
 *         taxRate:
 *           type: number
 *           format: decimal
 *           description: Tax rate for the item
 *         taxAmount:
 *           type: number
 *           format: decimal
 *           description: Tax amount for the item
 *         discountRate:
 *           type: number
 *           format: decimal
 *           description: Discount rate for the item
 *         discountAmount:
 *           type: number
 *           format: decimal
 *           description: Discount amount for the item
 *         subtotal:
 *           type: number
 *           format: decimal
 *           description: Subtotal for the item (quantity × unitPrice)
 *         total:
 *           type: number
 *           format: decimal
 *           description: Total for the item (subtotal + taxAmount - discountAmount)
 *
 *     PurchaseOrder:
 *       type: object
 *       required:
 *         - orderNumber
 *         - supplierId
 *         - companyId
 *         - orderDate
 *         - subtotal
 *         - total
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the purchase order
 *         orderNumber:
 *           type: string
 *           description: The purchase order number
 *         supplierId:
 *           type: integer
 *           description: The ID of the supplier
 *         companyId:
 *           type: integer
 *           description: The ID of the company
 *         orderDate:
 *           type: string
 *           format: date
 *           description: The date the purchase order was placed
 *         expectedDeliveryDate:
 *           type: string
 *           format: date
 *           description: The expected delivery date
 *         paymentTermId:
 *           type: integer
 *           description: Optional ID of the payment term
 *         subtotal:
 *           type: number
 *           format: decimal
 *           description: Subtotal amount before tax and discount
 *         taxAmount:
 *           type: number
 *           format: decimal
 *           description: Total tax amount
 *         discountAmount:
 *           type: number
 *           format: decimal
 *           description: Total discount amount
 *         total:
 *           type: number
 *           format: decimal
 *           description: Total amount for the purchase order
 *         status:
 *           type: string
 *           enum: [draft, submitted, approved, partial, received, cancelled]
 *           description: The status of the purchase order
 *         notes:
 *           type: string
 *           description: Additional notes for the purchase order
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the purchase order was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the purchase order was last updated
 *         isIntercompany:
 *           type: boolean
 *           description: Whether this is an intercompany purchase order
 *         relatedCompanyId:
 *           type: integer
 *           description: For intercompany orders, the ID of the related company
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PurchaseOrderItem'
 *           description: The items included in the purchase order
 */

/**
 * @swagger
 * tags:
 *   name: Purchase Orders
 *   description: Purchase order management API
 */

/**
 * @swagger
 * /purchase-orders:
 *   get:
 *     summary: Returns a list of purchase orders for a company
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, approved, partial, received, cancelled, all]
 *         description: Filter by purchase order status
 *     responses:
 *       200:
 *         description: The list of purchase orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PurchaseOrder'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const companyId = Number(req.query.companyId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status || 'all';
    const offset = (page - 1) * limit;
    
    if (!companyId || isNaN(companyId)) {
      return res.status(400).json({ message: "Company ID is required" });
    }
    
    // Build where clause
    const whereClause = { companyId };
    if (status !== 'all') {
      whereClause.status = status;
    }
    
    const { count, rows: purchaseOrders } = await PurchaseOrder.findAndCountAll({
      where: whereClause,
      order: [['orderDate', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: PaymentTerm,
          as: 'paymentTerm',
          attributes: ['id', 'name', 'daysUntilDue']
        }
      ]
    });
    
    const totalPages = Math.ceil(count / limit);
    
    // Format data for response
    const formattedOrders = purchaseOrders.map(order => {
      const plainOrder = order.get({ plain: true });
      return {
        id: plainOrder.id,
        orderNumber: plainOrder.orderNumber,
        supplier: {
          id: plainOrder.supplierId,
          // We would include supplier name here if we had a Supplier model relationship
          name: "Supplier name would come from Supplier model"
        },
        orderDate: plainOrder.orderDate,
        expectedDeliveryDate: plainOrder.expectedDeliveryDate,
        total: parseFloat(plainOrder.total),
        status: plainOrder.status,
        isIntercompany: plainOrder.isIntercompany,
        paymentTerm: plainOrder.paymentTerm
      };
    });
    
    return res.status(200).json({
      data: formattedOrders,
      pagination: {
        total: count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return res.status(500).json({ message: "Failed to fetch purchase orders" });
  }
});

/**
 * @swagger
 * /purchase-orders/{id}:
 *   get:
 *     summary: Get a purchase order by ID
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Purchase Order ID
 *     responses:
 *       200:
 *         description: The purchase order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid purchase order ID" });
    }
    
    const purchaseOrder = await PurchaseOrder.findByPk(id, {
      include: [
        {
          model: PurchaseOrderItem,
          as: 'items'
        },
        {
          model: PaymentTerm,
          as: 'paymentTerm',
          attributes: ['id', 'name', 'daysUntilDue', 'discountDays', 'discountPercent']
        }
      ]
    });
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    
    // Format for response
    const plainOrder = purchaseOrder.get({ plain: true });
    
    // Get related company info if this is an intercompany order
    let relatedCompany = null;
    if (plainOrder.isIntercompany && plainOrder.relatedCompanyId) {
      relatedCompany = await Company.findByPk(plainOrder.relatedCompanyId);
    }
    
    return res.status(200).json({
      id: plainOrder.id,
      orderNumber: plainOrder.orderNumber,
      supplier: {
        id: plainOrder.supplierId,
        // We would include supplier name here if we had a Supplier model relationship
        name: "Supplier name would come from Supplier model"
      },
      companyId: plainOrder.companyId, 
      orderDate: plainOrder.orderDate,
      expectedDeliveryDate: plainOrder.expectedDeliveryDate,
      subtotal: parseFloat(plainOrder.subtotal),
      taxAmount: parseFloat(plainOrder.taxAmount),
      discountAmount: parseFloat(plainOrder.discountAmount),
      total: parseFloat(plainOrder.total),
      status: plainOrder.status,
      notes: plainOrder.notes,
      isIntercompany: plainOrder.isIntercompany,
      relatedCompany: relatedCompany ? {
        id: relatedCompany.id,
        name: relatedCompany.name,
        code: relatedCompany.code,
        type: relatedCompany.type
      } : null,
      paymentTerm: plainOrder.paymentTerm,
      items: plainOrder.items.map(item => ({
        id: item.id,
        productId: item.productId,
        // We would include product name here if we had a Product model relationship
        productName: "Product name would come from Product model",
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: item.taxRate ? parseFloat(item.taxRate) : 0,
        taxAmount: parseFloat(item.taxAmount),
        discountRate: item.discountRate ? parseFloat(item.discountRate) : 0,
        discountAmount: parseFloat(item.discountAmount),
        subtotal: parseFloat(item.subtotal),
        total: parseFloat(item.total)
      }))
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return res.status(500).json({ message: "Failed to fetch purchase order" });
  }
});

/**
 * @swagger
 * /purchase-orders:
 *   post:
 *     summary: Create a new purchase order
 *     tags: [Purchase Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *               - companyId
 *               - orderDate
 *               - items
 *             properties:
 *               supplierId:
 *                 type: integer
 *               companyId:
 *                 type: integer
 *               paymentTermId:
 *                 type: integer
 *               orderDate:
 *                 type: string
 *                 format: date
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, approved, partial, received, cancelled]
 *                 default: draft
 *               isIntercompany:
 *                 type: boolean
 *                 default: false
 *               relatedCompanyId:
 *                 type: integer
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     taxRate:
 *                       type: number
 *                     discountRate:
 *                       type: number
 *               createIntercompanyTransaction:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Successfully created purchase order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { 
      supplierId, 
      companyId,
      paymentTermId,
      orderDate, 
      expectedDeliveryDate, 
      notes, 
      status = 'draft',
      isIntercompany = false,
      relatedCompanyId,
      items,
      createIntercompanyTransaction = true
    } = req.body;
    
    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ message: "Supplier ID and at least one item are required" });
    }
    
    if (!companyId || isNaN(Number(companyId))) {
      return res.status(400).json({ message: "Valid company ID is required" });
    }

    // For intercompany orders, relatedCompanyId is required
    if (isIntercompany && (!relatedCompanyId || isNaN(Number(relatedCompanyId)))) {
      return res.status(400).json({ message: "For intercompany orders, related company ID is required" });
    }
    
    // Perform transaction - create purchase order
    const result = await sequelize.transaction(async (t) => {
      // Generate order number (format: PO-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await PurchaseOrder.count({
        where: { companyId },
        transaction: t
      });
      
      const nextNum = count + 1;
      const orderNumber = `PO-${year}-${nextNum.toString().padStart(4, '0')}`;
      
      // Calculate order totals
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;
      
      // Process items with calculations
      const processedItems = items.map(item => {
        const itemSubtotal = Number(item.quantity) * Number(item.unitPrice);
        const itemTaxAmount = item.taxRate ? (itemSubtotal * Number(item.taxRate) / 100) : 0;
        const itemDiscountAmount = item.discountRate ? (itemSubtotal * Number(item.discountRate) / 100) : 0;
        const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;
        
        subtotal += itemSubtotal;
        taxAmount += itemTaxAmount;
        discountAmount += itemDiscountAmount;
        
        return {
          ...item,
          subtotal: itemSubtotal,
          taxAmount: itemTaxAmount,
          discountAmount: itemDiscountAmount,
          total: itemTotal
        };
      });
      
      const total = subtotal + taxAmount - discountAmount;
      
      // Create purchase order
      const purchaseOrder = await PurchaseOrder.create({
        orderNumber,
        supplierId,
        companyId,
        paymentTermId: paymentTermId || null,
        orderDate: new Date(orderDate),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        status,
        notes: notes || null,
        isIntercompany: isIntercompany || false,
        relatedCompanyId: isIntercompany ? relatedCompanyId : null
      }, { transaction: t });
      
      // Create purchase order items
      const purchaseOrderItems = await Promise.all(
        processedItems.map(item => PurchaseOrderItem.create({
          purchaseOrderId: purchaseOrder.id,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          taxAmount: item.taxAmount,
          discountRate: item.discountRate || 0,
          discountAmount: item.discountAmount,
          subtotal: item.subtotal,
          total: item.total
        }, { transaction: t }))
      );
      
      // Create intercompany transaction if requested
      let intercompanyTransaction = null;
      if (isIntercompany && createIntercompanyTransaction) {
        const company = await Company.findByPk(companyId, { transaction: t });
        const relatedCompany = await Company.findByPk(relatedCompanyId, { transaction: t });
        
        if (company && relatedCompany) {
          intercompanyTransaction = await IntercompanyTransaction.create({
            transactionNumber: `ICT-${year}-PO${nextNum.toString().padStart(4, '0')}`,
            sourceCompanyId: companyId,
            targetCompanyId: relatedCompanyId,
            tenantId: company.tenantId,
            type: 'sales_order',
            sourceDocumentId: purchaseOrder.id,
            date: new Date(orderDate),
            amount: total,
            description: `Intercompany purchase order ${orderNumber} from ${company.name} to ${relatedCompany.name}`,
            status: 'pending'
          }, { transaction: t });
        }
      }
      
      return {
        purchaseOrder,
        items: purchaseOrderItems,
        intercompanyTransaction
      };
    });
    
    // Return the created purchase order
    return res.status(201).json({
      id: result.purchaseOrder.id,
      orderNumber: result.purchaseOrder.orderNumber,
      supplierId: result.purchaseOrder.supplierId,
      companyId: result.purchaseOrder.companyId,
      paymentTermId: result.purchaseOrder.paymentTermId,
      orderDate: result.purchaseOrder.orderDate,
      expectedDeliveryDate: result.purchaseOrder.expectedDeliveryDate,
      subtotal: parseFloat(result.purchaseOrder.subtotal),
      taxAmount: parseFloat(result.purchaseOrder.taxAmount),
      discountAmount: parseFloat(result.purchaseOrder.discountAmount),
      total: parseFloat(result.purchaseOrder.total),
      status: result.purchaseOrder.status,
      notes: result.purchaseOrder.notes,
      isIntercompany: result.purchaseOrder.isIntercompany,
      relatedCompanyId: result.purchaseOrder.relatedCompanyId,
      intercompanyTransaction: result.intercompanyTransaction ? {
        id: result.intercompanyTransaction.id,
        transactionNumber: result.intercompanyTransaction.transactionNumber,
        status: result.intercompanyTransaction.status
      } : null,
      items: result.items.map(item => ({
        id: item.id,
        purchaseOrderId: item.purchaseOrderId,
        productId: item.productId,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: parseFloat(item.taxRate),
        taxAmount: parseFloat(item.taxAmount),
        discountRate: parseFloat(item.discountRate),
        discountAmount: parseFloat(item.discountAmount),
        subtotal: parseFloat(item.subtotal),
        total: parseFloat(item.total)
      }))
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create purchase order" });
  }
});

/**
 * @swagger
 * /purchase-orders/{id}/status:
 *   put:
 *     summary: Update a purchase order status
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Purchase Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, approved, partial, received, cancelled]
 *     responses:
 *       200:
 *         description: Successfully updated purchase order status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    
    if (!id || isNaN(id) || !status) {
      return res.status(400).json({ message: "Valid purchase order ID and status are required" });
    }
    
    // Validate status
    const validStatuses = ['draft', 'submitted', 'approved', 'partial', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: " + validStatuses.join(", ") });
    }
    
    // Check if purchase order exists
    const purchaseOrder = await PurchaseOrder.findByPk(id);
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    
    // Validate status transition
    if (purchaseOrder.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({ message: "Cannot change status of a cancelled purchase order" });
    }
    
    if (purchaseOrder.status === 'received' && status !== 'received' && status !== 'cancelled') {
      return res.status(400).json({ message: "Cannot change status of a received purchase order except to cancelled" });
    }
    
    // Update status
    await purchaseOrder.update({ status });
    
    return res.status(200).json({
      id: purchaseOrder.id,
      status: purchaseOrder.status,
      message: "Purchase order status updated successfully"
    });
  } catch (error) {
    console.error("Error updating purchase order status:", error);
    return res.status(500).json({ message: "Failed to update purchase order status" });
  }
});

/**
 * @swagger
 * /purchase-orders/{id}:
 *   delete:
 *     summary: Delete a purchase order
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Purchase Order ID
 *     responses:
 *       200:
 *         description: Successfully deleted purchase order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or operation not allowed
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid purchase order ID" });
    }
    
    // Check if purchase order exists and is in draft status
    const purchaseOrder = await PurchaseOrder.findByPk(id);
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    
    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({ message: "Only draft purchase orders can be deleted" });
    }
    
    // Delete any associated intercompany transactions
    if (purchaseOrder.isIntercompany) {
      await IntercompanyTransaction.destroy({
        where: {
          sourceDocumentId: id,
          type: 'sales_order'
        }
      });
    }
    
    // Delete purchase order (items will be automatically deleted due to CASCADE constraint)
    await purchaseOrder.destroy();
    
    return res.status(200).json({
      message: "Purchase order deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return res.status(500).json({ message: "Failed to delete purchase order" });
  }
});

/**
 * @swagger
 * /purchase-orders/summary:
 *   get:
 *     summary: Get summary of purchase orders for a company
 *     tags: [Purchase Orders]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Summary of purchase orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 open:
 *                   type: integer
 *                 closed:
 *                   type: integer
 *                 value:
 *                   type: number
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Server error
 */
router.get('/summary', async (req, res) => {
  try {
    const companyId = Number(req.query.companyId);
    
    if (!companyId || isNaN(companyId)) {
      return res.status(400).json({ message: "Company ID is required" });
    }
    
    // Get all purchase orders for the company
    const purchaseOrders = await PurchaseOrder.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate summary
    const total = purchaseOrders.length;
    const open = purchaseOrders.filter(order => 
      ['draft', 'submitted', 'approved', 'partial'].includes(order.status)
    ).length;
    const closed = purchaseOrders.filter(order => 
      ['received', 'cancelled'].includes(order.status)
    ).length;
    const value = purchaseOrders.reduce((sum, order) => sum + Number(order.total), 0);
    
    // Get 5 most recent orders
    const recentOrders = purchaseOrders.slice(0, 5).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      total: parseFloat(order.total),
      status: order.status,
      isIntercompany: order.isIntercompany
    }));
    
    return res.status(200).json({
      total,
      open,
      closed,
      value,
      recentOrders
    });
  } catch (error) {
    console.error("Error fetching purchase order summary:", error);
    return res.status(500).json({ message: "Failed to fetch purchase order summary" });
  }
});

module.exports = router;