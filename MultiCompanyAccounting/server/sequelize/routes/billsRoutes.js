/**
 * Bills Routes
 * This module defines the API routes for bill management
 */

const express = require('express');
const router = express.Router();
const { models } = require('../models');
const { Bill, BillItem, Vendor, PurchaseOrder, sequelize } = models;
const { createBillJournalEntries, createBillPaymentJournalEntries } = require('./billJournalHelper');

/**
 * @swagger
 * /api/v2/bills:
 *   get:
 *     summary: Get all bills for a company
 *     tags: [Bills]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (open, paid, partial, overdue, void)
 *     responses:
 *       200:
 *         description: List of bills
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, status } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    const where = { companyId };
    if (status) {
      where.status = status;
    }
    
    const bills = await Bill.findAll({
      where,
      include: [
        { model: Vendor, attributes: ['id', 'name'] },
        { model: PurchaseOrder, attributes: ['id', 'orderNumber'] }
      ],
      order: [['billDate', 'DESC']]
    });
    
    res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

/**
 * @swagger
 * /api/v2/bills/{id}:
 *   get:
 *     summary: Get a bill by ID
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bill ID
 *     responses:
 *       200:
 *         description: Bill details
 *       404:
 *         description: Bill not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: Vendor, attributes: ['id', 'name'] },
        { model: PurchaseOrder, attributes: ['id', 'orderNumber'] },
        { model: BillItem, include: ['product'] }
      ]
    });
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

/**
 * @swagger
 * /api/v2/bills:
 *   post:
 *     summary: Create a new bill
 *     tags: [Bills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Bill created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const {
      companyId,
      billNumber,
      vendorId,
      purchaseOrderId,
      billDate,
      dueDate,
      subtotal,
      taxAmount,
      total,
      notes,
      items
    } = req.body;
    
    if (!companyId || !vendorId || !billNumber || !billDate || !dueDate || !total || !items) {
      await t.rollback();
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create bill
    const bill = await Bill.create({
      companyId,
      billNumber,
      vendorId,
      purchaseOrderId: purchaseOrderId || null,
      billDate,
      dueDate,
      status: 'open',
      subtotal,
      taxAmount,
      total,
      amountPaid: 0,
      balanceDue: total,
      notes,
      createdBy: req.user?.id || null
    }, { transaction: t });
    
    // Create bill items
    if (items && items.length > 0) {
      const billItems = items.map(item => ({
        billId: bill.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount
      }));
      
      await BillItem.bulkCreate(billItems, { transaction: t });
    }
    
    // Create journal entries for this bill
    const journalEntry = await createBillJournalEntries(bill, t);
    
    await t.commit();
    
    // Fetch the complete bill with related data
    const createdBill = await Bill.findByPk(bill.id, {
      include: [
        { model: Vendor, attributes: ['id', 'name'] },
        { model: PurchaseOrder, attributes: ['id', 'orderNumber'] },
        { model: BillItem, include: ['product'] }
      ]
    });
    
    res.status(201).json(createdBill);
  } catch (error) {
    await t.rollback();
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

/**
 * @swagger
 * /api/v2/bills/{id}:
 *   put:
 *     summary: Update a bill
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Bill updated successfully
 *       404:
 *         description: Bill not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const bill = await Bill.findByPk(req.params.id);
    
    if (!bill) {
      await t.rollback();
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const {
      billNumber,
      vendorId,
      purchaseOrderId,
      billDate,
      dueDate,
      subtotal,
      taxAmount,
      total,
      notes,
      items
    } = req.body;
    
    // Update bill
    await bill.update({
      billNumber,
      vendorId,
      purchaseOrderId: purchaseOrderId || null,
      billDate,
      dueDate,
      subtotal,
      taxAmount,
      total,
      balanceDue: total - bill.amountPaid,
      notes
    }, { transaction: t });
    
    // Update bill items
    if (items && items.length > 0) {
      // Delete existing items
      await BillItem.destroy({
        where: { billId: bill.id },
        transaction: t
      });
      
      // Create new items
      const billItems = items.map(item => ({
        billId: bill.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount
      }));
      
      await BillItem.bulkCreate(billItems, { transaction: t });
    }
    
    // Update or create journal entries if needed
    if (!bill.journalEntryId) {
      await createBillJournalEntries(bill, t);
    }
    
    await t.commit();
    
    // Fetch the updated bill with related data
    const updatedBill = await Bill.findByPk(bill.id, {
      include: [
        { model: Vendor, attributes: ['id', 'name'] },
        { model: PurchaseOrder, attributes: ['id', 'orderNumber'] },
        { model: BillItem, include: ['product'] }
      ]
    });
    
    res.json(updatedBill);
  } catch (error) {
    await t.rollback();
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

/**
 * @swagger
 * /api/v2/bills/{id}/pay:
 *   post:
 *     summary: Record payment for a bill
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Bill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               paymentDate:
 *                 type: string
 *                 format: date
 *               paymentMethod:
 *                 type: string
 *               reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 *       404:
 *         description: Bill not found
 *       500:
 *         description: Server error
 */
router.post('/:id/pay', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { amount, paymentDate, paymentMethod, reference } = req.body;
    
    if (!amount || !paymentDate) {
      await t.rollback();
      return res.status(400).json({ error: 'Amount and payment date are required' });
    }
    
    const bill = await Bill.findByPk(req.params.id);
    
    if (!bill) {
      await t.rollback();
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    // Create payment record
    const { Payment } = models;
    const payment = await Payment.create({
      billId: bill.id,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      companyId: bill.companyId,
      createdBy: req.user?.id || null
    }, { transaction: t });
    
    // Update bill
    const newAmountPaid = parseFloat(bill.amountPaid) + parseFloat(amount);
    const newBalanceDue = parseFloat(bill.total) - newAmountPaid;
    
    let newStatus = 'partial';
    if (newBalanceDue <= 0) {
      newStatus = 'paid';
    }
    
    await bill.update({
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus
    }, { transaction: t });
    
    // Create journal entries for this payment
    await createBillPaymentJournalEntries(payment, bill, t);
    
    await t.commit();
    
    // Fetch the updated bill with related data
    const updatedBill = await Bill.findByPk(bill.id, {
      include: [
        { model: Vendor, attributes: ['id', 'name'] },
        { model: PurchaseOrder, attributes: ['id', 'orderNumber'] },
        { model: BillItem, include: ['product'] }
      ]
    });
    
    res.json({
      bill: updatedBill,
      payment
    });
  } catch (error) {
    await t.rollback();
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

/**
 * @swagger
 * /api/v2/bills/summary:
 *   get:
 *     summary: Get bills summary for a company
 *     tags: [Bills]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Bills summary
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    // Get counts by status
    const [open, paid, partial, overdue] = await Promise.all([
      Bill.count({ where: { companyId, status: 'open' } }),
      Bill.count({ where: { companyId, status: 'paid' } }),
      Bill.count({ where: { companyId, status: 'partial' } }),
      Bill.count({ where: { companyId, status: 'overdue' } })
    ]);
    
    // Get total bill amount and due amount
    const totalAmountResult = await Bill.sum('total', { where: { companyId } });
    const totalDueResult = await Bill.sum('balanceDue', { where: { companyId } });
    
    const totalAmount = totalAmountResult || 0;
    const totalDue = totalDueResult || 0;
    
    // Get recent bills
    const recentBills = await Bill.findAll({
      where: { companyId },
      include: [{ model: Vendor, attributes: ['id', 'name'] }],
      order: [['billDate', 'DESC']],
      limit: 5
    });
    
    res.json({
      total: open + paid + partial + overdue,
      open,
      paid,
      partial,
      overdue,
      totalAmount,
      totalDue,
      recentBills
    });
  } catch (error) {
    console.error('Error fetching bills summary:', error);
    res.status(500).json({ error: 'Failed to fetch bills summary' });
  }
});

module.exports = router;