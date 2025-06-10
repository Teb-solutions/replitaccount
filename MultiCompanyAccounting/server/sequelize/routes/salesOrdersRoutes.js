const express = require('express');
const { SalesOrder, SalesOrderItem, PaymentTerm } = require('../models');
const router = express.Router();
const { sequelize } = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     SalesOrderItem:
 *       type: object
 *       required:
 *         - salesOrderId
 *         - description
 *         - quantity
 *         - unitPrice
 *         - total
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the sales order item
 *         salesOrderId:
 *           type: integer
 *           description: The ID of the sales order this item belongs to
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
 *     SalesOrder:
 *       type: object
 *       required:
 *         - orderNumber
 *         - customerId
 *         - companyId
 *         - orderDate
 *         - subtotal
 *         - total
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the sales order
 *         orderNumber:
 *           type: string
 *           description: The sales order number
 *         customerId:
 *           type: integer
 *           description: The ID of the customer
 *         companyId:
 *           type: integer
 *           description: The ID of the company
 *         orderDate:
 *           type: string
 *           format: date
 *           description: The date the sales order was placed
 *         deliveryDate:
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
 *           description: Total amount for the sales order
 *         status:
 *           type: string
 *           enum: [draft, confirmed, processing, shipped, delivered, cancelled]
 *           description: The status of the sales order
 *         notes:
 *           type: string
 *           description: Additional notes for the sales order
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the sales order was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the sales order was last updated
 *         isIntercompany:
 *           type: boolean
 *           description: Whether this is an intercompany sales order
 *         relatedCompanyId:
 *           type: integer
 *           description: For intercompany orders, the ID of the related company
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SalesOrderItem'
 *           description: The items included in the sales order
 */

/**
 * @swagger
 * tags:
 *   name: Sales Orders
 *   description: Sales order management API
 */

/**
 * @swagger
 * /sales-orders:
 *   get:
 *     summary: Returns a list of sales orders for a company
 *     tags: [Sales Orders]
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
 *           enum: [draft, confirmed, processing, shipped, delivered, cancelled, all]
 *         description: Filter by sales order status
 *     responses:
 *       200:
 *         description: The list of sales orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalesOrder'
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
    
    const { count, rows: salesOrders } = await SalesOrder.findAndCountAll({
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
    const formattedOrders = salesOrders.map(order => {
      const plainOrder = order.get({ plain: true });
      return {
        id: plainOrder.id,
        orderNumber: plainOrder.orderNumber,
        customer: {
          id: plainOrder.customerId,
          // We would include customer name here if we had a Customer model relationship
          name: "Customer name would come from Customer model"
        },
        orderDate: plainOrder.orderDate,
        deliveryDate: plainOrder.deliveryDate,
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
    console.error("Error fetching sales orders:", error);
    return res.status(500).json({ message: "Failed to fetch sales orders" });
  }
});

/**
 * @swagger
 * /sales-orders/{id}:
 *   get:
 *     summary: Get a sales order by ID
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sales Order ID
 *     responses:
 *       200:
 *         description: The sales order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesOrder'
 *       404:
 *         description: Sales order not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid sales order ID" });
    }
    
    const salesOrder = await SalesOrder.findByPk(id, {
      include: [
        {
          model: SalesOrderItem,
          as: 'items'
        },
        {
          model: PaymentTerm,
          as: 'paymentTerm',
          attributes: ['id', 'name', 'daysUntilDue', 'discountDays', 'discountPercent']
        }
      ]
    });
    
    if (!salesOrder) {
      return res.status(404).json({ message: "Sales order not found" });
    }
    
    // Format for response
    const plainOrder = salesOrder.get({ plain: true });
    
    return res.status(200).json({
      id: plainOrder.id,
      orderNumber: plainOrder.orderNumber,
      customer: {
        id: plainOrder.customerId,
        // We would include customer name here if we had a Customer model relationship
        name: "Customer name would come from Customer model"
      },
      companyId: plainOrder.companyId, 
      orderDate: plainOrder.orderDate,
      deliveryDate: plainOrder.deliveryDate,
      subtotal: parseFloat(plainOrder.subtotal),
      taxAmount: parseFloat(plainOrder.taxAmount),
      discountAmount: parseFloat(plainOrder.discountAmount),
      total: parseFloat(plainOrder.total),
      status: plainOrder.status,
      notes: plainOrder.notes,
      isIntercompany: plainOrder.isIntercompany,
      relatedCompanyId: plainOrder.relatedCompanyId,
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
    console.error("Error fetching sales order:", error);
    return res.status(500).json({ message: "Failed to fetch sales order" });
  }
});

/**
 * @swagger
 * /sales-orders:
 *   post:
 *     summary: Create a new sales order
 *     tags: [Sales Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - companyId
 *               - orderDate
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *               companyId:
 *                 type: integer
 *               paymentTermId:
 *                 type: integer
 *               orderDate:
 *                 type: string
 *                 format: date
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, confirmed, processing, shipped, delivered, cancelled]
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
 *     responses:
 *       201:
 *         description: Successfully created sales order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesOrder'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { 
      customerId, 
      companyId,
      paymentTermId,
      orderDate, 
      deliveryDate, 
      notes, 
      status = 'draft',
      isIntercompany = false,
      relatedCompanyId,
      items 
    } = req.body;
    
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ message: "Customer ID and at least one item are required" });
    }
    
    if (!companyId || isNaN(Number(companyId))) {
      return res.status(400).json({ message: "Valid company ID is required" });
    }

    // For intercompany orders, relatedCompanyId is required
    if (isIntercompany && (!relatedCompanyId || isNaN(Number(relatedCompanyId)))) {
      return res.status(400).json({ message: "For intercompany orders, related company ID is required" });
    }
    
    // Perform transaction
    const result = await sequelize.transaction(async (t) => {
      // Generate order number (format: SO-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await SalesOrder.count({
        where: { companyId },
        transaction: t
      });
      
      const nextNum = count + 1;
      const orderNumber = `SO-${year}-${nextNum.toString().padStart(4, '0')}`;
      
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
      
      // Create sales order
      const salesOrder = await SalesOrder.create({
        orderNumber,
        customerId,
        companyId,
        paymentTermId: paymentTermId || null,
        orderDate: new Date(orderDate),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        status,
        notes: notes || null,
        isIntercompany: isIntercompany || false,
        relatedCompanyId: isIntercompany ? relatedCompanyId : null
      }, { transaction: t });
      
      // Create sales order items
      const salesOrderItems = await Promise.all(
        processedItems.map(item => SalesOrderItem.create({
          salesOrderId: salesOrder.id,
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
      
      return {
        salesOrder,
        items: salesOrderItems
      };
    });
    
    // Return the created sales order
    return res.status(201).json({
      id: result.salesOrder.id,
      orderNumber: result.salesOrder.orderNumber,
      customerId: result.salesOrder.customerId,
      companyId: result.salesOrder.companyId,
      paymentTermId: result.salesOrder.paymentTermId,
      orderDate: result.salesOrder.orderDate,
      deliveryDate: result.salesOrder.deliveryDate,
      subtotal: parseFloat(result.salesOrder.subtotal),
      taxAmount: parseFloat(result.salesOrder.taxAmount),
      discountAmount: parseFloat(result.salesOrder.discountAmount),
      total: parseFloat(result.salesOrder.total),
      status: result.salesOrder.status,
      notes: result.salesOrder.notes,
      isIntercompany: result.salesOrder.isIntercompany,
      relatedCompanyId: result.salesOrder.relatedCompanyId,
      items: result.items.map(item => ({
        id: item.id,
        salesOrderId: item.salesOrderId,
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
    console.error("Error creating sales order:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create sales order" });
  }
});

/**
 * @swagger
 * /sales-orders/{id}/status:
 *   put:
 *     summary: Update a sales order status
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sales Order ID
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
 *                 enum: [draft, confirmed, processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Successfully updated sales order status
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
 *         description: Sales order not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    
    if (!id || isNaN(id) || !status) {
      return res.status(400).json({ message: "Valid sales order ID and status are required" });
    }
    
    // Validate status
    const validStatuses = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: " + validStatuses.join(", ") });
    }
    
    // Check if sales order exists
    const salesOrder = await SalesOrder.findByPk(id);
    
    if (!salesOrder) {
      return res.status(404).json({ message: "Sales order not found" });
    }
    
    // Validate status transition
    if (salesOrder.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({ message: "Cannot change status of a cancelled sales order" });
    }
    
    if (salesOrder.status === 'delivered' && status !== 'delivered' && status !== 'cancelled') {
      return res.status(400).json({ message: "Cannot change status of a delivered sales order except to cancelled" });
    }
    
    // Update status
    await salesOrder.update({ status });
    
    return res.status(200).json({
      id: salesOrder.id,
      status: salesOrder.status,
      message: "Sales order status updated successfully"
    });
  } catch (error) {
    console.error("Error updating sales order status:", error);
    return res.status(500).json({ message: "Failed to update sales order status" });
  }
});

/**
 * @swagger
 * /sales-orders/{id}:
 *   delete:
 *     summary: Delete a sales order
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sales Order ID
 *     responses:
 *       200:
 *         description: Successfully deleted sales order
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
 *         description: Sales order not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid sales order ID" });
    }
    
    // Check if sales order exists and is in draft status
    const salesOrder = await SalesOrder.findByPk(id);
    
    if (!salesOrder) {
      return res.status(404).json({ message: "Sales order not found" });
    }
    
    if (salesOrder.status !== 'draft') {
      return res.status(400).json({ message: "Only draft sales orders can be deleted" });
    }
    
    // Delete sales order (items will be automatically deleted due to CASCADE constraint)
    await salesOrder.destroy();
    
    return res.status(200).json({
      message: "Sales order deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting sales order:", error);
    return res.status(500).json({ message: "Failed to delete sales order" });
  }
});

module.exports = router;