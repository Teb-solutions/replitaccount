const express = require('express');
const { Receipt, Invoice, JournalEntry, JournalEntryItem } = require('../models');
const router = express.Router();
const { sequelize } = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     Receipt:
 *       type: object
 *       required:
 *         - receiptNumber
 *         - invoiceId
 *         - companyId
 *         - customerId
 *         - date
 *         - amount
 *         - paymentMethod
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the receipt
 *         receiptNumber:
 *           type: string
 *           description: The receipt number
 *         invoiceId:
 *           type: integer
 *           description: The ID of the invoice
 *         companyId:
 *           type: integer
 *           description: The ID of the company
 *         customerId:
 *           type: integer
 *           description: The ID of the customer
 *         date:
 *           type: string
 *           format: date
 *           description: The date of the receipt
 *         amount:
 *           type: number
 *           format: decimal
 *           description: The amount of the receipt
 *         paymentMethod:
 *           type: string
 *           description: The payment method used
 *         reference:
 *           type: string
 *           description: Reference number (e.g., check number, transaction ID)
 *         notes:
 *           type: string
 *           description: Additional notes
 *         isPartialPayment:
 *           type: boolean
 *           description: Whether this is a partial payment
 *         journalEntryId:
 *           type: integer
 *           description: ID of the associated journal entry
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the receipt was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the receipt was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Receipts
 *   description: Receipt management API
 */

/**
 * @swagger
 * /receipts:
 *   get:
 *     summary: Returns a list of receipts for a company
 *     tags: [Receipts]
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
 *         description: The list of receipts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Receipt'
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
    
    const { count, rows: receipts } = await Receipt.findAndCountAll({
      where: { companyId },
      order: [['date', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'invoiceNumber', 'total', 'balanceDue']
        }
      ]
    });
    
    const totalPages = Math.ceil(count / limit);
    
    // Format data for response
    const formattedReceipts = receipts.map(receipt => {
      const plainReceipt = receipt.get({ plain: true });
      return {
        id: plainReceipt.id,
        receiptNumber: plainReceipt.receiptNumber,
        date: plainReceipt.date,
        amount: parseFloat(plainReceipt.amount),
        paymentMethod: plainReceipt.paymentMethod,
        reference: plainReceipt.reference,
        isPartialPayment: plainReceipt.isPartialPayment,
        invoice: plainReceipt.invoice ? {
          id: plainReceipt.invoice.id,
          invoiceNumber: plainReceipt.invoice.invoiceNumber,
          total: parseFloat(plainReceipt.invoice.total),
          balanceDue: parseFloat(plainReceipt.invoice.balanceDue)
        } : null,
        customer: {
          id: plainReceipt.customerId,
          // We would include customer name here if we had a Customer model relationship
          name: "Customer name would come from Customer model"
        }
      };
    });
    
    return res.status(200).json({
      data: formattedReceipts,
      pagination: {
        total: count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return res.status(500).json({ message: "Failed to fetch receipts" });
  }
});

/**
 * @swagger
 * /receipts/{id}:
 *   get:
 *     summary: Get a receipt by ID
 *     tags: [Receipts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Receipt ID
 *     responses:
 *       200:
 *         description: The receipt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Receipt'
 *       404:
 *         description: Receipt not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid receipt ID" });
    }
    
    const receipt = await Receipt.findByPk(id, {
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'invoiceNumber', 'total', 'balanceDue', 'status']
        }
      ]
    });
    
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    // Format for response
    const plainReceipt = receipt.get({ plain: true });
    
    return res.status(200).json({
      id: plainReceipt.id,
      receiptNumber: plainReceipt.receiptNumber,
      date: plainReceipt.date,
      amount: parseFloat(plainReceipt.amount),
      paymentMethod: plainReceipt.paymentMethod,
      reference: plainReceipt.reference,
      notes: plainReceipt.notes,
      isPartialPayment: plainReceipt.isPartialPayment,
      journalEntryId: plainReceipt.journalEntryId,
      companyId: plainReceipt.companyId,
      customerId: plainReceipt.customerId,
      createdAt: plainReceipt.createdAt,
      updatedAt: plainReceipt.updatedAt,
      invoice: plainReceipt.invoice ? {
        id: plainReceipt.invoice.id,
        invoiceNumber: plainReceipt.invoice.invoiceNumber,
        total: parseFloat(plainReceipt.invoice.total),
        balanceDue: parseFloat(plainReceipt.invoice.balanceDue),
        status: plainReceipt.invoice.status
      } : null,
      customer: {
        id: plainReceipt.customerId,
        // We would include customer name here if we had a Customer model relationship
        name: "Customer name would come from Customer model"
      }
    });
  } catch (error) {
    console.error("Error fetching receipt:", error);
    return res.status(500).json({ message: "Failed to fetch receipt" });
  }
});

/**
 * @swagger
 * /receipts:
 *   post:
 *     summary: Create a new receipt and corresponding journal entry
 *     tags: [Receipts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *               - companyId
 *               - customerId
 *               - date
 *               - amount
 *               - paymentMethod
 *             properties:
 *               invoiceId:
 *                 type: integer
 *               companyId:
 *                 type: integer
 *               customerId:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *               isPartialPayment:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Successfully created receipt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Receipt'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { 
      invoiceId, 
      companyId,
      customerId,
      date, 
      amount, 
      paymentMethod,
      reference,
      notes,
      isPartialPayment = false
    } = req.body;
    
    if (!invoiceId || !companyId || !customerId || !date || !amount || !paymentMethod) {
      return res.status(400).json({ 
        message: "Invoice ID, company ID, customer ID, date, amount and payment method are required" 
      });
    }
    
    // Check if invoice exists and payment doesn't exceed the balance due
    const invoice = await Invoice.findByPk(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    
    if (parseFloat(amount) > parseFloat(invoice.balanceDue)) {
      return res.status(400).json({ 
        message: "Payment amount cannot exceed the invoice balance due",
        balanceDue: parseFloat(invoice.balanceDue)
      });
    }
    
    // Perform transaction - create receipt and update invoice balance
    const result = await sequelize.transaction(async (t) => {
      // Generate receipt number (format: RCT-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await Receipt.count({
        where: { companyId },
        transaction: t
      });
      
      const nextNum = count + 1;
      const receiptNumber = `RCT-${year}-${nextNum.toString().padStart(4, '0')}`;
      
      // Update invoice balance due and status
      const newBalanceDue = parseFloat(invoice.balanceDue) - parseFloat(amount);
      let newStatus = invoice.status;
      
      if (newBalanceDue <= 0) {
        newStatus = 'paid';
      } else if (newBalanceDue < parseFloat(invoice.total) && invoice.status !== 'partial') {
        newStatus = 'partial';
      }
      
      await invoice.update({
        balanceDue: newBalanceDue,
        status: newStatus
      }, { transaction: t });
      
      // Create a journal entry for this receipt
      // Double-entry accounting: Cash (Debit) / Accounts Receivable (Credit)
      const journalEntry = await JournalEntry.create({
        entryNumber: `JE-${year}-R${nextNum.toString().padStart(4, '0')}`,
        companyId,
        entryDate: new Date(date),
        reference: reference || invoice.invoiceNumber,
        description: `Receipt for invoice #${invoice.invoiceNumber}`,
        amount: parseFloat(amount),
        entryType: 'system_generated',
        status: 'posted',
        postedBy: req.user?.id || null,
        postedAt: new Date()
      }, { transaction: t });
      
      // Create journal entry items
      // Debit Cash (Asset Account) - Account code 1000
      await JournalEntryItem.create({
        journalEntryId: journalEntry.id,
        accountId: 1000, // Assuming 1000 is Cash account
        description: `Payment received for invoice #${invoice.invoiceNumber}`,
        debit: parseFloat(amount),
        credit: 0,
        reference: invoice.invoiceNumber
      }, { transaction: t });
      
      // Credit Accounts Receivable (Asset Account) - Account code 1100
      await JournalEntryItem.create({
        journalEntryId: journalEntry.id,
        accountId: 1100, // Assuming 1100 is Accounts Receivable
        description: `Payment received for invoice #${invoice.invoiceNumber}`,
        debit: 0,
        credit: parseFloat(amount),
        reference: invoice.invoiceNumber
      }, { transaction: t });
      
      // Create receipt
      const receipt = await Receipt.create({
        receiptNumber,
        invoiceId,
        companyId,
        customerId,
        date: new Date(date),
        amount: parseFloat(amount),
        paymentMethod,
        reference,
        notes,
        isPartialPayment,
        journalEntryId: journalEntry.id
      }, { transaction: t });
      
      return { receipt, journalEntry };
    });
    
    // Return the created receipt
    return res.status(201).json({
      id: result.receipt.id,
      receiptNumber: result.receipt.receiptNumber,
      invoiceId: result.receipt.invoiceId,
      companyId: result.receipt.companyId,
      customerId: result.receipt.customerId,
      date: result.receipt.date,
      amount: parseFloat(result.receipt.amount),
      paymentMethod: result.receipt.paymentMethod,
      reference: result.receipt.reference,
      notes: result.receipt.notes,
      isPartialPayment: result.receipt.isPartialPayment,
      journalEntryId: result.receipt.journalEntryId,
      journalEntry: {
        id: result.journalEntry.id,
        entryNumber: result.journalEntry.entryNumber
      }
    });
  } catch (error) {
    console.error("Error creating receipt:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create receipt" });
  }
});

/**
 * @swagger
 * /receipts/{id}:
 *   delete:
 *     summary: Delete a receipt
 *     tags: [Receipts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Receipt ID
 *     responses:
 *       200:
 *         description: Successfully deleted receipt
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
 *         description: Receipt not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid receipt ID" });
    }
    
    // Check if receipt exists
    const receipt = await Receipt.findByPk(id, {
      include: [
        {
          model: Invoice,
          as: 'invoice'
        }
      ]
    });
    
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    // Can't delete receipts older than 24 hours
    const receiptDate = new Date(receipt.createdAt);
    const now = new Date();
    const hoursElapsed = (now.getTime() - receiptDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed > 24) {
      return res.status(400).json({ 
        message: "Cannot delete receipts that are more than 24 hours old. Please reverse using a credit note." 
      });
    }
    
    // Perform transaction - delete receipt, its journal entry, and update invoice
    await sequelize.transaction(async (t) => {
      // Update invoice balance and status
      if (receipt.invoice) {
        const newBalanceDue = parseFloat(receipt.invoice.balanceDue) + parseFloat(receipt.amount);
        let newStatus = receipt.invoice.status;
        
        if (newBalanceDue >= parseFloat(receipt.invoice.total)) {
          newStatus = 'issued';
        } else if (newBalanceDue > 0) {
          newStatus = 'partial';
        }
        
        await receipt.invoice.update({
          balanceDue: newBalanceDue,
          status: newStatus
        }, { transaction: t });
      }
      
      // Delete the journal entry if it exists
      if (receipt.journalEntryId) {
        const journalEntry = await JournalEntry.findByPk(receipt.journalEntryId);
        if (journalEntry) {
          // JournalEntryItems will be deleted automatically due to CASCADE constraint
          await journalEntry.destroy({ transaction: t });
        }
      }
      
      // Delete the receipt
      await receipt.destroy({ transaction: t });
    });
    
    return res.status(200).json({
      message: "Receipt deleted successfully and invoice updated"
    });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return res.status(500).json({ message: "Failed to delete receipt" });
  }
});

module.exports = router;