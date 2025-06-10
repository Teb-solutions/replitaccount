const express = require('express');
const { JournalEntry, JournalEntryItem } = require('../models');
const router = express.Router();
const { sequelize } = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     JournalEntryItem:
 *       type: object
 *       required:
 *         - journalEntryId
 *         - accountId
 *         - debit
 *         - credit
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the journal entry item
 *         journalEntryId:
 *           type: integer
 *           description: The ID of the journal entry this item belongs to
 *         accountId:
 *           type: integer
 *           description: The ID of the account
 *         description:
 *           type: string
 *           description: Description for this line item
 *         debit:
 *           type: number
 *           format: decimal
 *           description: Debit amount (0 if credit entry)
 *         credit:
 *           type: number
 *           format: decimal
 *           description: Credit amount (0 if debit entry)
 *         reference:
 *           type: string
 *           description: Optional reference code for this line
 *         memo:
 *           type: string
 *           description: Additional notes for this line
 *       example:
 *         id: 1
 *         journalEntryId: 1
 *         accountId: 1000
 *         description: Cash payment for invoice #INV-2023-0001
 *         debit: 500.00
 *         credit: 0.00
 *         reference: INV-2023-0001
 *         memo: Cash payment received from customer ABC Ltd.
 *
 *     JournalEntry:
 *       type: object
 *       required:
 *         - entryNumber
 *         - companyId
 *         - entryDate
 *         - amount
 *         - entryType
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the journal entry
 *         entryNumber:
 *           type: string
 *           description: The journal entry number
 *         companyId:
 *           type: integer
 *           description: The ID of the company
 *         entryDate:
 *           type: string
 *           format: date
 *           description: The date of the journal entry
 *         reference:
 *           type: string
 *           description: Optional reference number
 *         description:
 *           type: string
 *           description: Description of the journal entry
 *         amount:
 *           type: number
 *           format: decimal
 *           description: Total amount of the journal entry
 *         entryType:
 *           type: string
 *           enum: [manual, system_generated, imported]
 *           description: The type of journal entry
 *         status:
 *           type: string
 *           enum: [draft, posted, archived]
 *           description: The status of the journal entry
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the journal entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the journal entry was last updated
 *         postedBy:
 *           type: integer
 *           description: ID of the user who posted the entry
 *         postedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the entry was posted
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/JournalEntryItem'
 *           description: The line items of the journal entry
 *       example:
 *         id: 1
 *         entryNumber: JE-2023-0001
 *         companyId: 3
 *         entryDate: 2023-05-15
 *         reference: INV-2023-0001
 *         description: Invoice payment recording
 *         amount: 500.00
 *         entryType: manual
 *         status: posted
 *         createdAt: 2023-05-15T10:30:00.000Z
 *         updatedAt: 2023-05-15T10:30:00.000Z
 *         postedBy: 1
 *         postedAt: 2023-05-15T10:35:00.000Z
 */

/**
 * @swagger
 * tags:
 *   name: Journal Entries
 *   description: Journal entries management API
 */

/**
 * @swagger
 * /journal-entries:
 *   get:
 *     summary: Returns a list of journal entries for a company
 *     tags: [Journal Entries]
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
 *           enum: [draft, posted, archived, all]
 *           default: all
 *         description: Filter by journal entry status
 *     responses:
 *       200:
 *         description: The list of journal entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JournalEntry'
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
    
    const { count, rows: journalEntries } = await JournalEntry.findAndCountAll({
      where: whereClause,
      order: [['entryDate', 'DESC']],
      limit,
      offset,
    });
    
    const totalPages = Math.ceil(count / limit);
    
    // Format data for response
    const formattedEntries = journalEntries.map(entry => {
      const plainEntry = entry.get({ plain: true });
      return {
        id: plainEntry.id,
        entryNumber: plainEntry.entryNumber,
        entryDate: plainEntry.entryDate,
        reference: plainEntry.reference,
        description: plainEntry.description,
        amount: parseFloat(plainEntry.amount),
        entryType: plainEntry.entryType,
        status: plainEntry.status,
        createdAt: plainEntry.createdAt,
        updatedAt: plainEntry.updatedAt
      };
    });
    
    return res.status(200).json({
      data: formattedEntries,
      pagination: {
        total: count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    return res.status(500).json({ message: "Failed to fetch journal entries" });
  }
});

/**
 * @swagger
 * /journal-entries/{id}:
 *   get:
 *     summary: Get a journal entry by ID
 *     tags: [Journal Entries]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Journal Entry ID
 *     responses:
 *       200:
 *         description: The journal entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalEntry'
 *       404:
 *         description: Journal entry not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid journal entry ID" });
    }
    
    const journalEntry = await JournalEntry.findByPk(id, {
      include: [
        {
          model: JournalEntryItem,
          as: 'items'
        }
      ]
    });
    
    if (!journalEntry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    
    // Format for response
    const plainEntry = journalEntry.get({ plain: true });
    
    return res.status(200).json({
      id: plainEntry.id,
      entryNumber: plainEntry.entryNumber,
      companyId: plainEntry.companyId,
      entryDate: plainEntry.entryDate,
      reference: plainEntry.reference,
      description: plainEntry.description,
      amount: parseFloat(plainEntry.amount),
      entryType: plainEntry.entryType,
      status: plainEntry.status,
      createdAt: plainEntry.createdAt,
      updatedAt: plainEntry.updatedAt,
      postedBy: plainEntry.postedBy,
      postedAt: plainEntry.postedAt,
      items: plainEntry.items.map(item => ({
        id: item.id,
        accountId: item.accountId,
        // We would include account name here if we had an Account model relationship
        accountName: "Account name would come from Account model",
        description: item.description,
        debit: parseFloat(item.debit),
        credit: parseFloat(item.credit),
        reference: item.reference,
        memo: item.memo
      }))
    });
  } catch (error) {
    console.error("Error fetching journal entry:", error);
    return res.status(500).json({ message: "Failed to fetch journal entry" });
  }
});

/**
 * @swagger
 * /journal-entries:
 *   post:
 *     summary: Create a new journal entry
 *     tags: [Journal Entries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - entryDate
 *               - items
 *             properties:
 *               companyId:
 *                 type: integer
 *               entryDate:
 *                 type: string
 *                 format: date
 *               reference:
 *                 type: string
 *               description:
 *                 type: string
 *               entryType:
 *                 type: string
 *                 enum: [manual, system_generated, imported]
 *                 default: manual
 *               status:
 *                 type: string
 *                 enum: [draft, posted]
 *                 default: draft
 *               items:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required:
 *                     - accountId
 *                     - debit
 *                     - credit
 *                   properties:
 *                     accountId:
 *                       type: integer
 *                     description:
 *                       type: string
 *                     debit:
 *                       type: number
 *                     credit:
 *                       type: number
 *                     reference:
 *                       type: string
 *                     memo:
 *                       type: string
 *     responses:
 *       201:
 *         description: Successfully created journal entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalEntry'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { 
      companyId,
      entryDate,
      reference,
      description,
      entryType = 'manual',
      status = 'draft',
      items = []
    } = req.body;
    
    if (!companyId || !items || items.length < 2) {
      return res.status(400).json({ 
        message: "Company ID and at least two items (one debit and one credit) are required" 
      });
    }
    
    // Validate that debits equal credits (fundamental accounting principle)
    let totalDebits = 0;
    let totalCredits = 0;
    
    items.forEach(item => {
      totalDebits += Number(item.debit) || 0;
      totalCredits += Number(item.credit) || 0;
    });
    
    // Using toFixed(2) for precision comparison to handle floating point issues
    if (totalDebits.toFixed(2) !== totalCredits.toFixed(2)) {
      return res.status(400).json({ 
        message: "Journal entry must balance: total debits must equal total credits",
        totalDebits,
        totalCredits
      });
    }
    
    // Perform transaction
    const result = await sequelize.transaction(async (t) => {
      // Generate journal entry number (format: JE-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await JournalEntry.count({
        where: { companyId },
        transaction: t
      });
      
      const nextNum = count + 1;
      const entryNumber = `JE-${year}-${nextNum.toString().padStart(4, '0')}`;
      
      // Create journal entry
      const journalEntry = await JournalEntry.create({
        entryNumber,
        companyId,
        entryDate: new Date(entryDate),
        reference,
        description,
        amount: totalDebits, // Using totalDebits since they equal totalCredits
        entryType,
        status,
        postedBy: status === 'posted' ? req.user?.id : null,
        postedAt: status === 'posted' ? new Date() : null
      }, { transaction: t });
      
      // Create journal entry items
      const journalEntryItems = await Promise.all(
        items.map(item => JournalEntryItem.create({
          journalEntryId: journalEntry.id,
          accountId: item.accountId,
          description: item.description,
          debit: item.debit || 0,
          credit: item.credit || 0,
          reference: item.reference,
          memo: item.memo
        }, { transaction: t }))
      );
      
      return {
        journalEntry,
        items: journalEntryItems
      };
    });
    
    // Return the created journal entry
    return res.status(201).json({
      id: result.journalEntry.id,
      entryNumber: result.journalEntry.entryNumber,
      companyId: result.journalEntry.companyId,
      entryDate: result.journalEntry.entryDate,
      reference: result.journalEntry.reference,
      description: result.journalEntry.description,
      amount: parseFloat(result.journalEntry.amount),
      entryType: result.journalEntry.entryType,
      status: result.journalEntry.status,
      postedBy: result.journalEntry.postedBy,
      postedAt: result.journalEntry.postedAt,
      items: result.items.map(item => ({
        id: item.id,
        journalEntryId: item.journalEntryId,
        accountId: item.accountId,
        description: item.description,
        debit: parseFloat(item.debit),
        credit: parseFloat(item.credit),
        reference: item.reference,
        memo: item.memo
      }))
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create journal entry" });
  }
});

/**
 * @swagger
 * /journal-entries/{id}/status:
 *   put:
 *     summary: Update a journal entry status
 *     tags: [Journal Entries]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Journal Entry ID
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
 *                 enum: [draft, posted, archived]
 *     responses:
 *       200:
 *         description: Successfully updated journal entry status
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
 *         description: Journal entry not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    
    if (!id || isNaN(id) || !status) {
      return res.status(400).json({ message: "Valid journal entry ID and status are required" });
    }
    
    // Validate status
    const validStatuses = ['draft', 'posted', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be one of: " + validStatuses.join(", ") });
    }
    
    // Check if journal entry exists
    const journalEntry = await JournalEntry.findByPk(id);
    
    if (!journalEntry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    
    // Validate status transition
    if (journalEntry.status === 'archived' && status !== 'archived') {
      return res.status(400).json({ message: "Cannot change status of an archived journal entry" });
    }
    
    if (journalEntry.status === 'posted' && status === 'draft') {
      return res.status(400).json({ message: "Cannot change status from posted to draft" });
    }
    
    // Set additional fields if posting
    const updateData = { status };
    if (status === 'posted' && journalEntry.status !== 'posted') {
      updateData.postedBy = req.user?.id || null;
      updateData.postedAt = new Date();
    }
    
    // Update status
    await journalEntry.update(updateData);
    
    return res.status(200).json({
      id: journalEntry.id,
      status: journalEntry.status,
      message: "Journal entry status updated successfully"
    });
  } catch (error) {
    console.error("Error updating journal entry status:", error);
    return res.status(500).json({ message: "Failed to update journal entry status" });
  }
});

/**
 * @swagger
 * /journal-entries/{id}:
 *   delete:
 *     summary: Delete a journal entry
 *     tags: [Journal Entries]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Journal Entry ID
 *     responses:
 *       200:
 *         description: Successfully deleted journal entry
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
 *         description: Journal entry not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid journal entry ID" });
    }
    
    // Check if journal entry exists and is in draft status
    const journalEntry = await JournalEntry.findByPk(id);
    
    if (!journalEntry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    
    if (journalEntry.status !== 'draft') {
      return res.status(400).json({ message: "Only draft journal entries can be deleted" });
    }
    
    // Delete journal entry (items will be automatically deleted due to CASCADE constraint)
    await journalEntry.destroy();
    
    return res.status(200).json({
      message: "Journal entry deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    return res.status(500).json({ message: "Failed to delete journal entry" });
  }
});

module.exports = router;