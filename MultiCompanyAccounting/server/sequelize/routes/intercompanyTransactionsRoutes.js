const express = require('express');
const { 
  IntercompanyTransaction, 
  Company, 
  SalesOrder, 
  Invoice, 
  JournalEntry,
  JournalEntryItem 
} = require('../models');
const router = express.Router();
const { sequelize } = require('../db');
const { Op } = require('sequelize');

/**
 * @swagger
 * components:
 *   schemas:
 *     IntercompanyTransaction:
 *       type: object
 *       required:
 *         - transactionNumber
 *         - sourceCompanyId
 *         - targetCompanyId
 *         - tenantId
 *         - type
 *         - date
 *         - amount
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the intercompany transaction
 *         transactionNumber:
 *           type: string
 *           description: The transaction number
 *         sourceCompanyId:
 *           type: integer
 *           description: The ID of the source company
 *         targetCompanyId:
 *           type: integer
 *           description: The ID of the target company
 *         tenantId:
 *           type: integer
 *           description: The ID of the tenant this transaction belongs to
 *         type:
 *           type: string
 *           enum: [sales_order, invoice, payment, receipt, transfer]
 *           description: The type of intercompany transaction
 *         sourceDocumentId:
 *           type: integer
 *           description: ID of the source document (based on type)
 *         targetDocumentId:
 *           type: integer
 *           description: ID of the target document (based on type)
 *         sourceJournalEntryId:
 *           type: integer
 *           description: ID of the source journal entry
 *         targetJournalEntryId:
 *           type: integer
 *           description: ID of the target journal entry
 *         date:
 *           type: string
 *           format: date
 *           description: The date of the transaction
 *         amount:
 *           type: number
 *           format: decimal
 *           description: The amount of the transaction
 *         description:
 *           type: string
 *           description: Description of the transaction
 *         status:
 *           type: string
 *           enum: [pending, matched, reconciled, cancelled]
 *           description: The status of the transaction
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * tags:
 *   name: Intercompany Transactions
 *   description: Intercompany transaction management API
 */

/**
 * @swagger
 * /intercompany-transactions:
 *   get:
 *     summary: Returns a list of intercompany transactions for a tenant
 *     tags: [Intercompany Transactions]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tenant ID
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by specific company (as source or target)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, matched, reconciled, cancelled, all]
 *         description: Filter by transaction status
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
 *         description: The list of intercompany transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IntercompanyTransaction'
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
 *         description: Invalid tenant ID
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = Number(req.query.tenantId);
    const companyId = req.query.companyId ? Number(req.query.companyId) : null;
    const status = req.query.status || 'all';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    if (!tenantId || isNaN(tenantId)) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }
    
    // Build where clause
    const whereClause = { tenantId };
    if (status !== 'all') {
      whereClause.status = status;
    }
    
    if (companyId) {
      whereClause[Op.or] = [
        { sourceCompanyId: companyId },
        { targetCompanyId: companyId }
      ];
    }
    
    const { count, rows: transactions } = await IntercompanyTransaction.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Company,
          as: 'sourceCompany',
          attributes: ['id', 'name', 'code', 'type']
        },
        {
          model: Company,
          as: 'targetCompany',
          attributes: ['id', 'name', 'code', 'type']
        }
      ]
    });
    
    const totalPages = Math.ceil(count / limit);
    
    // Format data for response
    const formattedTransactions = transactions.map(transaction => {
      const plainTransaction = transaction.get({ plain: true });
      return {
        id: plainTransaction.id,
        transactionNumber: plainTransaction.transactionNumber,
        type: plainTransaction.type,
        date: plainTransaction.date,
        amount: parseFloat(plainTransaction.amount),
        description: plainTransaction.description,
        status: plainTransaction.status,
        sourceCompany: plainTransaction.sourceCompany,
        targetCompany: plainTransaction.targetCompany,
        sourceDocumentId: plainTransaction.sourceDocumentId,
        targetDocumentId: plainTransaction.targetDocumentId,
        sourceJournalEntryId: plainTransaction.sourceJournalEntryId,
        targetJournalEntryId: plainTransaction.targetJournalEntryId
      };
    });
    
    return res.status(200).json({
      data: formattedTransactions,
      pagination: {
        total: count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching intercompany transactions:", error);
    return res.status(500).json({ message: "Failed to fetch intercompany transactions" });
  }
});

/**
 * @swagger
 * /intercompany-transactions/{id}:
 *   get:
 *     summary: Get an intercompany transaction by ID
 *     tags: [Intercompany Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Intercompany Transaction ID
 *     responses:
 *       200:
 *         description: The intercompany transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IntercompanyTransaction'
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid intercompany transaction ID" });
    }
    
    const transaction = await IntercompanyTransaction.findByPk(id, {
      include: [
        {
          model: Company,
          as: 'sourceCompany',
          attributes: ['id', 'name', 'code', 'type']
        },
        {
          model: Company,
          as: 'targetCompany',
          attributes: ['id', 'name', 'code', 'type']
        },
        {
          model: JournalEntry,
          as: 'sourceJournalEntry'
        },
        {
          model: JournalEntry,
          as: 'targetJournalEntry'
        }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ message: "Intercompany transaction not found" });
    }
    
    // Get related document info based on type
    let sourceDocument = null;
    let targetDocument = null;
    
    if (transaction.sourceDocumentId) {
      if (transaction.type === 'sales_order') {
        sourceDocument = await SalesOrder.findByPk(transaction.sourceDocumentId);
      } else if (transaction.type === 'invoice') {
        sourceDocument = await Invoice.findByPk(transaction.sourceDocumentId);
      }
    }
    
    if (transaction.targetDocumentId) {
      if (transaction.type === 'sales_order') {
        targetDocument = await SalesOrder.findByPk(transaction.targetDocumentId);
      } else if (transaction.type === 'invoice') {
        targetDocument = await Invoice.findByPk(transaction.targetDocumentId);
      }
    }
    
    // Format for response
    const plainTransaction = transaction.get({ plain: true });
    
    const response = {
      id: plainTransaction.id,
      transactionNumber: plainTransaction.transactionNumber,
      tenantId: plainTransaction.tenantId,
      type: plainTransaction.type,
      date: plainTransaction.date,
      amount: parseFloat(plainTransaction.amount),
      description: plainTransaction.description,
      status: plainTransaction.status,
      sourceCompany: plainTransaction.sourceCompany,
      targetCompany: plainTransaction.targetCompany,
      sourceDocument: sourceDocument ? {
        id: sourceDocument.id,
        type: transaction.type,
        number: transaction.type === 'sales_order' ? sourceDocument.orderNumber : sourceDocument.invoiceNumber,
        date: transaction.type === 'sales_order' ? sourceDocument.orderDate : sourceDocument.issueDate,
        amount: parseFloat(sourceDocument.total)
      } : null,
      targetDocument: targetDocument ? {
        id: targetDocument.id,
        type: transaction.type,
        number: transaction.type === 'sales_order' ? targetDocument.orderNumber : targetDocument.invoiceNumber,
        date: transaction.type === 'sales_order' ? targetDocument.orderDate : targetDocument.issueDate,
        amount: parseFloat(targetDocument.total)
      } : null,
      sourceJournalEntry: plainTransaction.sourceJournalEntry ? {
        id: plainTransaction.sourceJournalEntry.id,
        entryNumber: plainTransaction.sourceJournalEntry.entryNumber,
        date: plainTransaction.sourceJournalEntry.entryDate,
        amount: parseFloat(plainTransaction.sourceJournalEntry.amount)
      } : null,
      targetJournalEntry: plainTransaction.targetJournalEntry ? {
        id: plainTransaction.targetJournalEntry.id,
        entryNumber: plainTransaction.targetJournalEntry.entryNumber,
        date: plainTransaction.targetJournalEntry.entryDate,
        amount: parseFloat(plainTransaction.targetJournalEntry.amount)
      } : null,
      createdAt: plainTransaction.createdAt,
      updatedAt: plainTransaction.updatedAt
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching intercompany transaction:", error);
    return res.status(500).json({ message: "Failed to fetch intercompany transaction" });
  }
});

/**
 * @swagger
 * /intercompany-transactions:
 *   post:
 *     summary: Create a new intercompany transaction
 *     tags: [Intercompany Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceCompanyId
 *               - targetCompanyId
 *               - tenantId
 *               - type
 *               - date
 *               - amount
 *             properties:
 *               sourceCompanyId:
 *                 type: integer
 *               targetCompanyId:
 *                 type: integer
 *               tenantId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [sales_order, invoice, payment, receipt, transfer]
 *               sourceDocumentId:
 *                 type: integer
 *               targetDocumentId:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               createJournalEntries:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Successfully created intercompany transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IntercompanyTransaction'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { 
      sourceCompanyId, 
      targetCompanyId,
      tenantId,
      type,
      sourceDocumentId,
      targetDocumentId,
      date,
      amount,
      description,
      createJournalEntries = true
    } = req.body;
    
    if (!sourceCompanyId || !targetCompanyId || !tenantId || !type || !date || !amount) {
      return res.status(400).json({ 
        message: "Source company ID, target company ID, tenant ID, type, date, and amount are required" 
      });
    }
    
    // Validate that both companies exist and belong to the same tenant
    const sourceCompany = await Company.findOne({
      where: { id: sourceCompanyId, tenantId }
    });
    
    const targetCompany = await Company.findOne({
      where: { id: targetCompanyId, tenantId }
    });
    
    if (!sourceCompany || !targetCompany) {
      return res.status(400).json({ 
        message: "Both source and target companies must exist and belong to the specified tenant" 
      });
    }
    
    // Allow any company type (manufacturer, distributor, plant) to create intercompany transactions
    
    // Perform transaction - create intercompany transaction and journal entries if requested
    const result = await sequelize.transaction(async (t) => {
      // Generate transaction number (format: ICT-YYYY-XXXX)
      const year = new Date().getFullYear();
      const count = await IntercompanyTransaction.count({
        where: { tenantId },
        transaction: t
      });
      
      const nextNum = count + 1;
      const transactionNumber = `ICT-${year}-${nextNum.toString().padStart(4, '0')}`;
      
      let sourceJournalEntryId = null;
      let targetJournalEntryId = null;
      
      // Create journal entries if requested
      if (createJournalEntries) {
        // Source company journal entry (debit intercompany receivable, credit revenue)
        const sourceJournalEntry = await JournalEntry.create({
          entryNumber: `JE-${year}-S${nextNum.toString().padStart(4, '0')}`,
          companyId: sourceCompanyId,
          entryDate: new Date(date),
          reference: transactionNumber,
          description: `Intercompany transaction with ${targetCompany.name} (${targetCompany.code})`,
          amount: parseFloat(amount),
          entryType: 'system_generated',
          status: 'posted',
          postedBy: req.user?.id || null,
          postedAt: new Date()
        }, { transaction: t });
        
        // Create journal entry items for source company
        // Debit Intercompany Receivable (Asset Account) - Account code 1150
        await JournalEntryItem.create({
          journalEntryId: sourceJournalEntry.id,
          accountId: 1150, // Assuming 1150 is Intercompany Receivable account
          description: `Intercompany receivable from ${targetCompany.name}`,
          debit: parseFloat(amount),
          credit: 0,
          reference: transactionNumber
        }, { transaction: t });
        
        // Credit Revenue (Revenue Account) - Account code 4000
        await JournalEntryItem.create({
          journalEntryId: sourceJournalEntry.id,
          accountId: 4000, // Assuming 4000 is Revenue account
          description: `Intercompany revenue from ${targetCompany.name}`,
          debit: 0,
          credit: parseFloat(amount),
          reference: transactionNumber
        }, { transaction: t });
        
        sourceJournalEntryId = sourceJournalEntry.id;
        
        // Target company journal entry (debit expense, credit intercompany payable)
        const targetJournalEntry = await JournalEntry.create({
          entryNumber: `JE-${year}-T${nextNum.toString().padStart(4, '0')}`,
          companyId: targetCompanyId,
          entryDate: new Date(date),
          reference: transactionNumber,
          description: `Intercompany transaction with ${sourceCompany.name} (${sourceCompany.code})`,
          amount: parseFloat(amount),
          entryType: 'system_generated',
          status: 'posted',
          postedBy: req.user?.id || null,
          postedAt: new Date()
        }, { transaction: t });
        
        // Create journal entry items for target company
        // Debit Expense (Expense Account) - Account code 5000
        await JournalEntryItem.create({
          journalEntryId: targetJournalEntry.id,
          accountId: 5000, // Assuming 5000 is Expense account
          description: `Intercompany expense to ${sourceCompany.name}`,
          debit: parseFloat(amount),
          credit: 0,
          reference: transactionNumber
        }, { transaction: t });
        
        // Credit Intercompany Payable (Liability Account) - Account code 2150
        await JournalEntryItem.create({
          journalEntryId: targetJournalEntry.id,
          accountId: 2150, // Assuming 2150 is Intercompany Payable account
          description: `Intercompany payable to ${sourceCompany.name}`,
          debit: 0,
          credit: parseFloat(amount),
          reference: transactionNumber
        }, { transaction: t });
        
        targetJournalEntryId = targetJournalEntry.id;
      }
      
      // Create intercompany transaction
      const transaction = await IntercompanyTransaction.create({
        transactionNumber,
        sourceCompanyId,
        targetCompanyId,
        tenantId,
        type,
        sourceDocumentId: sourceDocumentId || null,
        targetDocumentId: targetDocumentId || null,
        sourceJournalEntryId,
        targetJournalEntryId,
        date: new Date(date),
        amount: parseFloat(amount),
        description: description || `Intercompany ${type} between ${sourceCompany.code} and ${targetCompany.code}`,
        status: 'pending'
      }, { transaction: t });
      
      return {
        transaction,
        sourceJournalEntryId,
        targetJournalEntryId
      };
    });
    
    // Return the created intercompany transaction
    return res.status(201).json({
      id: result.transaction.id,
      transactionNumber: result.transaction.transactionNumber,
      sourceCompanyId: result.transaction.sourceCompanyId,
      targetCompanyId: result.transaction.targetCompanyId,
      tenantId: result.transaction.tenantId,
      type: result.transaction.type,
      sourceDocumentId: result.transaction.sourceDocumentId,
      targetDocumentId: result.transaction.targetDocumentId,
      sourceJournalEntryId: result.sourceJournalEntryId,
      targetJournalEntryId: result.targetJournalEntryId,
      date: result.transaction.date,
      amount: parseFloat(result.transaction.amount),
      description: result.transaction.description,
      status: result.transaction.status,
      createdAt: result.transaction.createdAt,
      updatedAt: result.transaction.updatedAt
    });
  } catch (error) {
    console.error("Error creating intercompany transaction:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create intercompany transaction" });
  }
});

/**
 * @swagger
 * /intercompany-transactions/{id}/status:
 *   put:
 *     summary: Update an intercompany transaction status
 *     tags: [Intercompany Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Intercompany Transaction ID
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
 *                 enum: [pending, matched, reconciled, cancelled]
 *     responses:
 *       200:
 *         description: Successfully updated intercompany transaction status
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
 *         description: Intercompany transaction not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    
    if (!id || isNaN(id) || !status) {
      return res.status(400).json({ 
        message: "Valid intercompany transaction ID and status are required" 
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'matched', 'reconciled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be one of: " + validStatuses.join(", ") 
      });
    }
    
    // Check if transaction exists
    const transaction = await IntercompanyTransaction.findByPk(id);
    
    if (!transaction) {
      return res.status(404).json({ message: "Intercompany transaction not found" });
    }
    
    // Validate status transition
    if (transaction.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({ 
        message: "Cannot change status of a cancelled intercompany transaction" 
      });
    }
    
    if (transaction.status === 'reconciled' && status !== 'reconciled' && status !== 'cancelled') {
      return res.status(400).json({ 
        message: "Cannot change status of a reconciled intercompany transaction except to cancelled" 
      });
    }
    
    // Update status
    await transaction.update({ status });
    
    return res.status(200).json({
      id: transaction.id,
      status: transaction.status,
      message: "Intercompany transaction status updated successfully"
    });
  } catch (error) {
    console.error("Error updating intercompany transaction status:", error);
    return res.status(500).json({ message: "Failed to update intercompany transaction status" });
  }
});

/**
 * @swagger
 * /intercompany-transactions/match:
 *   post:
 *     summary: Match two intercompany transactions between companies
 *     tags: [Intercompany Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceTransactionId
 *               - targetTransactionId
 *             properties:
 *               sourceTransactionId:
 *                 type: integer
 *               targetTransactionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully matched transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IntercompanyTransaction'
 *       400:
 *         description: Invalid input data or matching not possible
 *       404:
 *         description: One or both transactions not found
 *       500:
 *         description: Server error
 */
router.post('/match', async (req, res) => {
  try {
    const { sourceTransactionId, targetTransactionId } = req.body;
    
    if (!sourceTransactionId || !targetTransactionId) {
      return res.status(400).json({ 
        message: "Source and target transaction IDs are required" 
      });
    }
    
    // Get both transactions
    const sourceTransaction = await IntercompanyTransaction.findByPk(sourceTransactionId);
    const targetTransaction = await IntercompanyTransaction.findByPk(targetTransactionId);
    
    if (!sourceTransaction || !targetTransaction) {
      return res.status(404).json({ 
        message: "One or both intercompany transactions not found" 
      });
    }
    
    // Validate matching possibility
    if (sourceTransaction.status === 'cancelled' || targetTransaction.status === 'cancelled') {
      return res.status(400).json({ 
        message: "Cannot match cancelled transactions" 
      });
    }
    
    if (sourceTransaction.status === 'matched' || targetTransaction.status === 'matched' ||
        sourceTransaction.status === 'reconciled' || targetTransaction.status === 'reconciled') {
      return res.status(400).json({ 
        message: "One or both transactions are already matched or reconciled" 
      });
    }
    
    // Validate that transactions are compatible (same tenant, reverse companies, similar amounts)
    if (sourceTransaction.tenantId !== targetTransaction.tenantId) {
      return res.status(400).json({ 
        message: "Transactions must belong to the same tenant" 
      });
    }
    
    if (sourceTransaction.sourceCompanyId !== targetTransaction.targetCompanyId ||
        sourceTransaction.targetCompanyId !== targetTransaction.sourceCompanyId) {
      return res.status(400).json({ 
        message: "Transaction companies must match in reverse (A→B and B→A)" 
      });
    }
    
    // Update both transaction statuses to 'matched'
    await sequelize.transaction(async (t) => {
      await sourceTransaction.update({ status: 'matched' }, { transaction: t });
      await targetTransaction.update({ status: 'matched' }, { transaction: t });
    });
    
    return res.status(200).json({
      message: "Intercompany transactions successfully matched",
      transactions: [
        {
          id: sourceTransaction.id,
          transactionNumber: sourceTransaction.transactionNumber,
          status: 'matched'
        },
        {
          id: targetTransaction.id,
          transactionNumber: targetTransaction.transactionNumber,
          status: 'matched'
        }
      ]
    });
  } catch (error) {
    console.error("Error matching intercompany transactions:", error);
    return res.status(500).json({ message: "Failed to match intercompany transactions" });
  }
});

module.exports = router;