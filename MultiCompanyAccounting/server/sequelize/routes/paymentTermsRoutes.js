const express = require('express');
const { PaymentTerm } = require('../models');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentTerm:
 *       type: object
 *       required:
 *         - name
 *         - daysUntilDue
 *         - billingFrequency
 *         - companyId
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the payment term
 *         name:
 *           type: string
 *           description: The name of the payment term
 *         description:
 *           type: string
 *           description: Optional description of the payment term
 *         daysUntilDue:
 *           type: integer
 *           description: Number of days until payment is due
 *         billingFrequency:
 *           type: string
 *           enum: [one_time, monthly, quarterly, annually]
 *           description: The billing frequency for this payment term
 *         discountDays:
 *           type: integer
 *           description: Number of days for early payment discount
 *         discountPercent:
 *           type: number
 *           format: decimal
 *           description: Percentage discount for early payment
 *         isActive:
 *           type: boolean
 *           description: Whether the payment term is active
 *         companyId:
 *           type: integer
 *           description: The ID of the company this payment term belongs to
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the payment term was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the payment term was last updated
 *       example:
 *         id: 1
 *         name: Net 30
 *         description: Payment due within 30 days
 *         daysUntilDue: 30
 *         billingFrequency: one_time
 *         discountDays: 10
 *         discountPercent: 2
 *         isActive: true
 *         companyId: 5
 *         createdAt: 2023-01-01T00:00:00.000Z
 *         updatedAt: 2023-01-01T00:00:00.000Z
 */

/**
 * @swagger
 * tags:
 *   name: Payment Terms
 *   description: Payment terms management API
 */

/**
 * @swagger
 * /payment-terms:
 *   get:
 *     summary: Returns a list of payment terms for a company
 *     tags: [Payment Terms]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: The list of payment terms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentTerm'
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const companyId = Number(req.query.companyId);
    
    if (!companyId || isNaN(companyId)) {
      return res.status(400).json({ message: "Valid company ID is required" });
    }
    
    const paymentTerms = await PaymentTerm.findAll({
      where: { companyId },
      order: [['name', 'ASC']]
    });
    
    return res.status(200).json(paymentTerms);
  } catch (error) {
    console.error("Error fetching payment terms:", error);
    return res.status(500).json({ message: "Failed to fetch payment terms" });
  }
});

/**
 * @swagger
 * /payment-terms/{id}:
 *   get:
 *     summary: Get a payment term by ID
 *     tags: [Payment Terms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Payment term ID
 *     responses:
 *       200:
 *         description: The payment term
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentTerm'
 *       404:
 *         description: Payment term not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Valid payment term ID is required" });
    }
    
    const paymentTerm = await PaymentTerm.findByPk(id);
    
    if (!paymentTerm) {
      return res.status(404).json({ message: "Payment term not found" });
    }
    
    return res.status(200).json(paymentTerm);
  } catch (error) {
    console.error("Error fetching payment term:", error);
    return res.status(500).json({ message: "Failed to fetch payment term" });
  }
});

/**
 * @swagger
 * /payment-terms:
 *   post:
 *     summary: Create a new payment term
 *     tags: [Payment Terms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - daysUntilDue
 *               - billingFrequency
 *               - companyId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               daysUntilDue:
 *                 type: integer
 *                 minimum: 0
 *               billingFrequency:
 *                 type: string
 *                 enum: [one_time, monthly, quarterly, annually]
 *               discountDays:
 *                 type: integer
 *                 minimum: 0
 *               discountPercent:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 100
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               companyId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Successfully created payment term
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentTerm'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      daysUntilDue,
      billingFrequency,
      discountDays,
      discountPercent,
      isActive,
      companyId
    } = req.body;
    
    if (!name || name.length < 2) {
      return res.status(400).json({ message: "Name is required and must be at least 2 characters" });
    }
    
    if (!companyId || isNaN(Number(companyId))) {
      return res.status(400).json({ message: "Valid company ID is required" });
    }
    
    const newPaymentTerm = await PaymentTerm.create({
      name,
      description,
      daysUntilDue: daysUntilDue || 30,
      billingFrequency: billingFrequency || 'one_time',
      discountDays: discountDays || 0,
      discountPercent: discountPercent || 0,
      isActive: isActive ?? true,
      companyId: Number(companyId)
    });
    
    return res.status(201).json(newPaymentTerm);
  } catch (error) {
    console.error("Error creating payment term:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create payment term" });
  }
});

/**
 * @swagger
 * /payment-terms/{id}:
 *   put:
 *     summary: Update a payment term
 *     tags: [Payment Terms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Payment term ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               daysUntilDue:
 *                 type: integer
 *                 minimum: 0
 *               billingFrequency:
 *                 type: string
 *                 enum: [one_time, monthly, quarterly, annually]
 *               discountDays:
 *                 type: integer
 *                 minimum: 0
 *               discountPercent:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 maximum: 100
 *               isActive:
 *                 type: boolean
 *               companyId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Successfully updated payment term
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentTerm'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Payment term not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Valid payment term ID is required" });
    }
    
    const paymentTerm = await PaymentTerm.findByPk(id);
    
    if (!paymentTerm) {
      return res.status(404).json({ message: "Payment term not found" });
    }
    
    const {
      name,
      description,
      daysUntilDue,
      billingFrequency,
      discountDays,
      discountPercent,
      isActive,
      companyId
    } = req.body;
    
    if (name && name.length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters" });
    }
    
    await paymentTerm.update({
      name: name || paymentTerm.name,
      description: description !== undefined ? description : paymentTerm.description,
      daysUntilDue: daysUntilDue !== undefined ? daysUntilDue : paymentTerm.daysUntilDue,
      billingFrequency: billingFrequency || paymentTerm.billingFrequency,
      discountDays: discountDays !== undefined ? discountDays : paymentTerm.discountDays,
      discountPercent: discountPercent !== undefined ? discountPercent : paymentTerm.discountPercent,
      isActive: isActive !== undefined ? isActive : paymentTerm.isActive,
      companyId: companyId || paymentTerm.companyId
    });
    
    return res.status(200).json(paymentTerm);
  } catch (error) {
    console.error("Error updating payment term:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to update payment term" });
  }
});

/**
 * @swagger
 * /payment-terms/{id}:
 *   delete:
 *     summary: Delete a payment term
 *     tags: [Payment Terms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Payment term ID
 *     responses:
 *       200:
 *         description: Successfully deleted payment term
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Payment term not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Valid payment term ID is required" });
    }
    
    const paymentTerm = await PaymentTerm.findByPk(id);
    
    if (!paymentTerm) {
      return res.status(404).json({ message: "Payment term not found" });
    }
    
    await paymentTerm.destroy();
    
    return res.status(200).json({ message: "Payment term deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment term:", error);
    return res.status(500).json({ message: "Failed to delete payment term" });
  }
});

module.exports = router;