const express = require('express');
const { Invoice, InvoiceItem, PaymentTerm } = require('../models');
const router = express.Router();
const { sequelize } = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     InvoiceItem:
 *       type: object
 *       required:
 *         - invoiceId
 *         - description
 *         - quantity
 *         - unitPrice
 *         - total
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the invoice item
 *         invoiceId:
 *           type: integer
 *           description: The ID of the invoice this item belongs to
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
 *       example:
 *         id: 1
 *         invoiceId: 1
 *         productId: 101
 *         description: Pressurized Cylinder - Medium
 *         quantity: 5
 *         unitPrice: 120.00
 *         taxRate: 10
 *         taxAmount: 60.00
 *         discountRate: 0
 *         discountAmount: 0
 *         subtotal: 600.00
 *         total: 660.00
 *
 *     Invoice:
 *       type: object
 *       required:
 *         - invoiceNumber
 *         - customerId
 *         - companyId
 *         - issueDate
 *         - subtotal
 *         - total
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the invoice
 *         invoiceNumber:
 *           type: string
 *           description: The invoice number
 *         customerId:
 *           type: integer
 *           description: The ID of the customer
 *         companyId:
 *           type: integer
 *           description: The ID of the company
 *         salesOrderId:
 *           type: integer
 *           description: Optional ID of the related sales order
 *         paymentTermId:
 *           type: integer
 *           description: Optional ID of the payment term
 *         issueDate:
 *           type: string
 *           format: date
 *           description: The date the invoice was issued
 *         dueDate:
 *           type: string
 *           format: date
 *           description: The due date for the invoice
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
 *           description: Total amount for the invoice
 *         balanceDue:
 *           type: number
 *           format: decimal
 *           description: Balance due for the invoice
 *         status:
 *           type: string
 *           enum: [draft, issued, partial, paid, overdue, cancelled]
 *           description: The status of the invoice
 *         notes:
 *           type: string
 *           description: Additional notes for the invoice
 *         termsAndConditions:
 *           type: string
 *           description: Terms and conditions for the invoice
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the invoice was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the invoice was last updated
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceItem'
 *           description: The items included in the invoice
 *         paymentTerm:
 *           $ref: '#/components/schemas/PaymentTerm'
 *           description: The payment term associated with the invoice
 *       example:
 *         id: 1
 *         invoiceNumber: INV-2023-0001
 *         customerId: 5
 *         companyId: 3
 *         salesOrderId: 10
 *         paymentTermId: 2
 *         issueDate: 2023-05-15
 *         dueDate: 2023-06-15
 *         subtotal: 600.00
 *         taxAmount: 60.00
 *         discountAmount: 0.00
 *         total: 660.00
 *         balanceDue: 660.00
 *         status: issued
 *         notes: Monthly cylinder supply order
 *         termsAndConditions: Payment due as per terms
 *         createdAt: 2023-05-15T10:30:00.000Z
 *         updatedAt: 2023-05-15T10:30:00.000Z
 */

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management API
 */

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Returns a list of invoices for a company
 *     tags: [Invoices]
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
 *           enum: [draft, issued, partial, paid, overdue, cancelled, all]
 *         description: Filter by invoice status
 *     responses:
 *       200:
 *         description: The list of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
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
    
    // Get real invoices from the external database linked to sales orders
    const { pool } = require('../../db');
    
    const invoicesQuery = `
      SELECT 
        i.id,
        i.invoice_number,
        i.customer_id,
        i.invoice_date as issue_date,
        i.due_date,
        i.total,
        i.balance_due,
        i.status,
        i.sales_order_id,
        so.order_number as sales_order_number,
        so.total as sales_order_total,
        c.name as customer_name
      FROM invoices i
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      LEFT JOIN companies c ON i.customer_id = c.id
      WHERE i.company_id = $1
      ${status !== 'all' ? 'AND i.status = $2' : ''}
      ORDER BY i.invoice_date DESC
      LIMIT $${status !== 'all' ? '3' : '2'} OFFSET $${status !== 'all' ? '4' : '3'}
    `;
    
    const queryParams = status !== 'all' 
      ? [companyId, status, limit, offset]
      : [companyId, limit, offset];
    
    const invoicesResult = await pool.query(invoicesQuery, queryParams);
    const invoices = invoicesResult.rows;
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM invoices 
      WHERE company_id = $1 
      ${status !== 'all' ? 'AND status = $2' : ''}
    `;
    const countParams = status !== 'all' ? [companyId, status] : [companyId];
    const countResult = await pool.query(countQuery, countParams);
    const count = parseInt(countResult.rows[0].total);
    
    const totalPages = Math.ceil(count / limit);
    
    // Format data for response with sales order linkage
    const formattedInvoices = invoices.map(invoice => {
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customer: {
          id: invoice.customer_id,
          name: invoice.customer_name || `Customer ${invoice.customer_id}`
        },
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        total: parseFloat(invoice.total || 0),
        balanceDue: parseFloat(invoice.balance_due || 0),
        status: invoice.status,
        salesOrder: invoice.sales_order_id ? {
          id: invoice.sales_order_id,
          orderNumber: invoice.sales_order_number,
          total: parseFloat(invoice.sales_order_total || 0)
        } : null,
        // Show relationship between invoice and sales order
        salesOrderId: invoice.sales_order_id,
        amountDue: parseFloat(invoice.balance_due || 0)
      };
    });
    
    return res.status(200).json({
      data: formattedInvoices,
      pagination: {
        total: count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get an invoice by ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: The invoice
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }
    
    const invoice = await Invoice.findByPk(id, {
      include: [
        {
          model: InvoiceItem,
          as: 'items'
        },
        {
          model: PaymentTerm,
          as: 'paymentTerm',
          attributes: ['id', 'name', 'daysUntilDue', 'discountDays', 'discountPercent']
        }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    // Format for response
    const plainInvoice = invoice.get({ plain: true });
    
    return res.status(200).json({
      id: plainInvoice.id,
      invoiceNumber: plainInvoice.invoiceNumber,
      customer: {
        id: plainInvoice.customerId,
        // We would include customer name here if we had a Customer model relationship
        name: "Customer name would come from Customer model"
      },
      salesOrder: plainInvoice.salesOrderId ? {
        id: plainInvoice.salesOrderId,
        // We would include sales order number here if we had a SalesOrder model relationship
        number: "Sales order number would come from SalesOrder model"
      } : null,
      issueDate: plainInvoice.issueDate,
      dueDate: plainInvoice.dueDate,
      subtotal: parseFloat(plainInvoice.subtotal),
      taxAmount: parseFloat(plainInvoice.taxAmount),
      discountAmount: parseFloat(plainInvoice.discountAmount),
      total: parseFloat(plainInvoice.total),
      balanceDue: parseFloat(plainInvoice.balanceDue),
      status: plainInvoice.status,
      notes: plainInvoice.notes,
      termsAndConditions: plainInvoice.termsAndConditions,
      paymentTerm: plainInvoice.paymentTerm,
      items: plainInvoice.items.map(item => ({
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
    console.error("Error fetching invoice:", error);
    return res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - companyId
 *               - issueDate
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *               companyId:
 *                 type: integer
 *               salesOrderId:
 *                 type: integer
 *               paymentTermId:
 *                 type: integer
 *               issueDate:
 *                 type: string
 *                 format: date
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               termsAndConditions:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, issued, partial, paid, overdue, cancelled]
 *                 default: draft
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
 *         description: Successfully created invoice
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
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
      salesOrderId,
      paymentTermId,
      issueDate, 
      dueDate, 
      notes, 
      termsAndConditions,
      status = 'draft', 
      items 
    } = req.body;
    
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ message: "Customer ID and at least one item are required" });
    }
    
    if (!companyId || isNaN(Number(companyId))) {
      return res.status(400).json({ message: "Valid company ID is required" });
    }
    
    // Perform transaction
    const result = await sequelize.transaction(async (t) => {
      // Generate invoice number (format: INV-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await Invoice.count({
        where: { companyId },
        transaction: t
      });
      
      const nextNum = count + 1;
      const invoiceNumber = `INV-${year}-${nextNum.toString().padStart(4, '0')}`;
      
      // Calculate invoice totals
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
      
      // Create invoice
      const invoice = await Invoice.create({
        invoiceNumber,
        customerId,
        companyId,
        salesOrderId: salesOrderId || null,
        paymentTermId: paymentTermId || null,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        balanceDue: total, // Initially balance due is equal to total
        status,
        notes: notes || null,
        termsAndConditions: termsAndConditions || null
      }, { transaction: t });
      
      // Create invoice items
      const invoiceItems = await Promise.all(
        processedItems.map(item => InvoiceItem.create({
          invoiceId: invoice.id,
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
        invoice,
        items: invoiceItems
      };
    });
    
    // Return the created invoice
    return res.status(201).json({
      id: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      customerId: result.invoice.customerId,
      companyId: result.invoice.companyId,
      salesOrderId: result.invoice.salesOrderId,
      paymentTermId: result.invoice.paymentTermId,
      issueDate: result.invoice.issueDate,
      dueDate: result.invoice.dueDate,
      subtotal: parseFloat(result.invoice.subtotal),
      taxAmount: parseFloat(result.invoice.taxAmount),
      discountAmount: parseFloat(result.invoice.discountAmount),
      total: parseFloat(result.invoice.total),
      balanceDue: parseFloat(result.invoice.balanceDue),
      status: result.invoice.status,
      notes: result.invoice.notes,
      termsAndConditions: result.invoice.termsAndConditions,
      items: result.items.map(item => ({
        id: item.id,
        invoiceId: item.invoiceId,
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
    console.error("Error creating invoice:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create invoice" });
  }
});

/**
 * @swagger
 * /invoices/{id}/status:
 *   put:
 *     summary: Update an invoice status
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID
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
 *                 enum: [draft, issued, partial, paid, overdue, cancelled]
 *     responses:
 *       200:
 *         description: Successfully updated invoice status
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
 *         description: Invoice not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    
    if (!id || isNaN(id) || !status) {
      return res.status(400).json({ message: "Valid invoice ID and status are required" });
    }
    
    // Validate status
    const validStatuses = ['draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: " + validStatuses.join(", ") });
    }
    
    // Check if invoice exists
    const invoice = await Invoice.findByPk(id);
    
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    // Validate status transition
    if (invoice.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({ message: "Cannot change status of a cancelled invoice" });
    }
    
    // Update status
    await invoice.update({ status });
    
    return res.status(200).json({
      id: invoice.id,
      status: invoice.status,
      message: "Invoice status updated successfully"
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return res.status(500).json({ message: "Failed to update invoice status" });
  }
});

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Delete an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Successfully deleted invoice
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
 *         description: Invoice not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }
    
    // Check if invoice exists and is in draft status
    const invoice = await Invoice.findByPk(id);
    
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    if (invoice.status !== 'draft') {
      return res.status(400).json({ message: "Only draft invoices can be deleted" });
    }
    
    // Delete invoice (items will be automatically deleted due to CASCADE constraint)
    await invoice.destroy();
    
    return res.status(200).json({
      message: "Invoice deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return res.status(500).json({ message: "Failed to delete invoice" });
  }
});

module.exports = router;