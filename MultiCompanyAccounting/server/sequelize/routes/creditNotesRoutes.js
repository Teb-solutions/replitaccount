const express = require('express');
const { CreditNote, CreditNoteItem } = require('../models');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreditNoteItem:
 *       type: object
 *       required:
 *         - creditNoteId
 *         - description
 *         - quantity
 *         - unitPrice
 *         - amount
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the credit note item
 *         creditNoteId:
 *           type: integer
 *           description: The ID of the credit note this item belongs to
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
 *         amount:
 *           type: number
 *           format: decimal
 *           description: Total amount for the item
 *       example:
 *         id: 1
 *         creditNoteId: 1
 *         productId: 101
 *         description: Product return
 *         quantity: 2
 *         unitPrice: 25.50
 *         taxRate: 10
 *         amount: 51.00
 *
 *     CreditNote:
 *       type: object
 *       required:
 *         - noteNumber
 *         - customerId
 *         - companyId
 *         - issueDate
 *         - total
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the credit note
 *         noteNumber:
 *           type: string
 *           description: The credit note number
 *         customerId:
 *           type: integer
 *           description: The ID of the customer
 *         invoiceId:
 *           type: integer
 *           description: Optional ID of the related invoice
 *         companyId:
 *           type: integer
 *           description: The ID of the company
 *         issueDate:
 *           type: string
 *           format: date
 *           description: The date the credit note was issued
 *         dueDate:
 *           type: string
 *           format: date
 *           description: Optional due date for the credit note
 *         total:
 *           type: number
 *           format: decimal
 *           description: Total amount for the credit note
 *         status:
 *           type: string
 *           enum: [draft, issued, partial, applied, cancelled]
 *           description: The status of the credit note
 *         notes:
 *           type: string
 *           description: Additional notes for the credit note
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the credit note was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the credit note was last updated
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CreditNoteItem'
 *           description: The items included in the credit note
 *       example:
 *         id: 1
 *         noteNumber: CN-2023-0001
 *         customerId: 5
 *         invoiceId: 10
 *         companyId: 3
 *         issueDate: 2023-05-15
 *         dueDate: 2023-06-15
 *         total: 145.75
 *         status: issued
 *         notes: Customer returned products due to damage
 *         createdAt: 2023-05-15T10:30:00.000Z
 *         updatedAt: 2023-05-15T10:30:00.000Z
 */

/**
 * @swagger
 * tags:
 *   name: Credit Notes
 *   description: Credit notes management API
 */

/**
 * @swagger
 * /credit-notes:
 *   get:
 *     summary: Returns a list of credit notes for a company
 *     tags: [Credit Notes]
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
 *     responses:
 *       200:
 *         description: The list of credit notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CreditNote'
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
    const offset = (page - 1) * limit;
    
    if (!companyId || isNaN(companyId)) {
      return res.status(400).json({ message: "Company ID is required" });
    }
    
    const { count, rows: creditNotes } = await CreditNote.findAndCountAll({
      where: { companyId },
      order: [['issueDate', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: CreditNoteItem,
          as: 'items'
        }
      ]
    });
    
    const totalPages = Math.ceil(count / limit);
    
    // Format data for response
    const formattedCreditNotes = creditNotes.map(note => {
      const plainNote = note.get({ plain: true });
      return {
        id: plainNote.id,
        noteNumber: plainNote.noteNumber,
        customer: {
          id: plainNote.customerId,
          // We would include customer name here if we had a Customer model relationship
          name: "Customer name would come from Customer model"
        },
        invoiceId: plainNote.invoiceId,
        issueDate: plainNote.issueDate,
        dueDate: plainNote.dueDate,
        total: parseFloat(plainNote.total),
        status: plainNote.status,
        notes: plainNote.notes,
        items: plainNote.items
      };
    });
    
    return res.status(200).json({
      data: formattedCreditNotes,
      pagination: {
        total: count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching credit notes:", error);
    return res.status(500).json({ message: "Failed to fetch credit notes" });
  }
});

/**
 * @swagger
 * /credit-notes/{id}:
 *   get:
 *     summary: Get a credit note by ID
 *     tags: [Credit Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Credit note ID
 *     responses:
 *       200:
 *         description: The credit note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreditNote'
 *       404:
 *         description: Credit note not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid credit note ID" });
    }
    
    const creditNote = await CreditNote.findByPk(id, {
      include: [
        {
          model: CreditNoteItem,
          as: 'items'
        }
      ]
    });
    
    if (!creditNote) {
      return res.status(404).json({ message: "Credit note not found" });
    }
    
    // Format for response
    const plainNote = creditNote.get({ plain: true });
    const formattedCreditNote = {
      id: plainNote.id,
      noteNumber: plainNote.noteNumber,
      customer: {
        id: plainNote.customerId,
        // We would include customer name here if we had a Customer model relationship
        name: "Customer name would come from Customer model"
      },
      invoice: plainNote.invoiceId ? {
        id: plainNote.invoiceId,
        // We would include invoice number here if we had an Invoice model relationship
        invoiceNumber: "Invoice number would come from Invoice model"
      } : null,
      issueDate: plainNote.issueDate,
      dueDate: plainNote.dueDate,
      total: parseFloat(plainNote.total),
      status: plainNote.status,
      notes: plainNote.notes,
      items: plainNote.items.map(item => ({
        id: item.id,
        productId: item.productId,
        // We would include product name here if we had a Product model relationship
        productName: "Product name would come from Product model",
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: item.taxRate ? parseFloat(item.taxRate) : 0,
        amount: parseFloat(item.amount)
      }))
    };
    
    return res.status(200).json(formattedCreditNote);
  } catch (error) {
    console.error("Error fetching credit note:", error);
    return res.status(500).json({ message: "Failed to fetch credit note" });
  }
});

/**
 * @swagger
 * /credit-notes:
 *   post:
 *     summary: Create a new credit note
 *     tags: [Credit Notes]
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
 *               invoiceId:
 *                 type: integer
 *               companyId:
 *                 type: integer
 *               issueDate:
 *                 type: string
 *                 format: date
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, issued, partial, applied, cancelled]
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
 *                     - amount
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
 *                     amount:
 *                       type: number
 *     responses:
 *       201:
 *         description: Successfully created credit note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreditNote'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { 
      customerId, 
      invoiceId, 
      companyId,
      issueDate, 
      dueDate, 
      notes, 
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
      // Generate note number (format: CN-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await CreditNote.count({
        where: { companyId },
        transaction: t
      });
      
      const nextNum = count + 1;
      const noteNumber = `CN-${year}-${nextNum.toString().padStart(4, '0')}`;
      
      // Calculate total from items
      const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      
      // Create credit note
      const creditNote = await CreditNote.create({
        noteNumber,
        customerId,
        invoiceId: invoiceId || null,
        companyId,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        total,
        status,
        notes: notes || null
      }, { transaction: t });
      
      // Create credit note items
      const creditNoteItems = await Promise.all(
        items.map(item => CreditNoteItem.create({
          creditNoteId: creditNote.id,
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || null,
          amount: item.amount
        }, { transaction: t }))
      );
      
      return {
        creditNote,
        items: creditNoteItems
      };
    });
    
    // Return the created credit note
    return res.status(201).json({
      id: result.creditNote.id,
      noteNumber: result.creditNote.noteNumber,
      customerId: result.creditNote.customerId,
      invoiceId: result.creditNote.invoiceId,
      companyId: result.creditNote.companyId,
      issueDate: result.creditNote.issueDate,
      dueDate: result.creditNote.dueDate,
      total: parseFloat(result.creditNote.total),
      status: result.creditNote.status,
      notes: result.creditNote.notes,
      items: result.items.map(item => ({
        id: item.id,
        creditNoteId: item.creditNoteId,
        productId: item.productId,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: item.taxRate ? parseFloat(item.taxRate) : 0,
        amount: parseFloat(item.amount)
      }))
    });
  } catch (error) {
    console.error("Error creating credit note:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create credit note" });
  }
});

/**
 * @swagger
 * /credit-notes/{id}/status:
 *   put:
 *     summary: Update a credit note status
 *     tags: [Credit Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Credit note ID
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
 *                 enum: [draft, issued, partial, applied, cancelled]
 *     responses:
 *       200:
 *         description: Successfully updated credit note status
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
 *         description: Credit note not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    
    if (!id || isNaN(id) || !status) {
      return res.status(400).json({ message: "Valid credit note ID and status are required" });
    }
    
    // Validate status
    const validStatuses = ['draft', 'issued', 'partial', 'applied', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: " + validStatuses.join(", ") });
    }
    
    // Check if credit note exists
    const creditNote = await CreditNote.findByPk(id);
    
    if (!creditNote) {
      return res.status(404).json({ message: "Credit note not found" });
    }
    
    // Validate status transition
    if (creditNote.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({ message: "Cannot change status of a cancelled credit note" });
    }
    
    if (creditNote.status === 'applied' && status !== 'applied') {
      return res.status(400).json({ message: "Cannot change status of a fully applied credit note" });
    }
    
    // Update status
    await creditNote.update({ status });
    
    return res.status(200).json({
      id: creditNote.id,
      status: creditNote.status,
      message: "Credit note status updated successfully"
    });
  } catch (error) {
    console.error("Error updating credit note status:", error);
    return res.status(500).json({ message: "Failed to update credit note status" });
  }
});

/**
 * @swagger
 * /credit-notes/{id}:
 *   delete:
 *     summary: Delete a credit note
 *     tags: [Credit Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Credit note ID
 *     responses:
 *       200:
 *         description: Successfully deleted credit note
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
 *         description: Credit note not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid credit note ID" });
    }
    
    // Check if credit note exists and is in draft status
    const creditNote = await CreditNote.findByPk(id);
    
    if (!creditNote) {
      return res.status(404).json({ message: "Credit note not found" });
    }
    
    if (creditNote.status !== 'draft') {
      return res.status(400).json({ message: "Only draft credit notes can be deleted" });
    }
    
    // Delete credit note (items will be automatically deleted due to CASCADE constraint)
    await creditNote.destroy();
    
    return res.status(200).json({
      message: "Credit note deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting credit note:", error);
    return res.status(500).json({ message: "Failed to delete credit note" });
  }
});

module.exports = router;