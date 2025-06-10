const express = require('express');
const { Company } = require('../models');
const router = express.Router();
const { sequelize } = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - tenantId
 *         - type
 *         - currencyCode
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the company
 *         name:
 *           type: string
 *           description: The name of the company
 *         code:
 *           type: string
 *           description: Unique code identifier for the company
 *         tenantId:
 *           type: integer
 *           description: The ID of the tenant this company belongs to
 *         type:
 *           type: string
 *           enum: [manufacturer, distributor, plant]
 *           description: The type of company
 *         address:
 *           type: string
 *           description: Street address
 *         city:
 *           type: string
 *           description: City
 *         state:
 *           type: string
 *           description: State or province
 *         country:
 *           type: string
 *           description: Country
 *         postalCode:
 *           type: string
 *           description: Postal code
 *         phone:
 *           type: string
 *           description: Contact phone number
 *         email:
 *           type: string
 *           description: Contact email
 *         taxId:
 *           type: string
 *           description: Tax identification number
 *         fiscalYear:
 *           type: string
 *           enum: [jan-dec, apr-mar, jul-jun, oct-sep]
 *           description: Fiscal year start-end months
 *         currencyCode:
 *           type: string
 *           description: Currency code (ISO 4217)
 *         isActive:
 *           type: boolean
 *           description: Whether the company is active
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
 *   name: Companies
 *   description: Company management API
 */

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: Returns a list of companies for a tenant
 *     tags: [Companies]
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Tenant ID
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include inactive companies
 *     responses:
 *       200:
 *         description: The list of companies for the tenant
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Company'
 *       400:
 *         description: Invalid tenant ID
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = Number(req.query.tenantId);
    const includeInactive = req.query.includeInactive === 'true';
    
    if (!tenantId || isNaN(tenantId)) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }
    
    // Build where clause
    const whereClause = { tenantId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }
    
    const companies = await Company.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    // Format data for response
    const formattedCompanies = companies.map(company => {
      const plainCompany = company.get({ plain: true });
      return {
        id: plainCompany.id,
        name: plainCompany.name,
        code: plainCompany.code,
        tenantId: plainCompany.tenantId,
        type: plainCompany.type,
        address: plainCompany.address,
        city: plainCompany.city,
        state: plainCompany.state,
        country: plainCompany.country,
        postalCode: plainCompany.postalCode,
        phone: plainCompany.phone,
        email: plainCompany.email,
        taxId: plainCompany.taxId,
        fiscalYear: plainCompany.fiscalYear,
        currencyCode: plainCompany.currencyCode,
        isActive: plainCompany.isActive
      };
    });
    
    return res.status(200).json(formattedCompanies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return res.status(500).json({ message: "Failed to fetch companies" });
  }
});

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Get a company by ID
 *     tags: [Companies]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: The company
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }
    
    const company = await Company.findByPk(id);
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    // Format for response
    const plainCompany = company.get({ plain: true });
    
    return res.status(200).json({
      id: plainCompany.id,
      name: plainCompany.name,
      code: plainCompany.code,
      tenantId: plainCompany.tenantId,
      type: plainCompany.type,
      address: plainCompany.address,
      city: plainCompany.city,
      state: plainCompany.state,
      country: plainCompany.country,
      postalCode: plainCompany.postalCode,
      phone: plainCompany.phone,
      email: plainCompany.email,
      taxId: plainCompany.taxId,
      fiscalYear: plainCompany.fiscalYear,
      currencyCode: plainCompany.currencyCode,
      isActive: plainCompany.isActive,
      createdAt: plainCompany.createdAt,
      updatedAt: plainCompany.updatedAt
    });
  } catch (error) {
    console.error("Error fetching company:", error);
    return res.status(500).json({ message: "Failed to fetch company" });
  }
});

/**
 * @swagger
 * /companies:
 *   post:
 *     summary: Create a new company within a tenant
 *     tags: [Companies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - tenantId
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               tenantId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [manufacturer, distributor, plant]
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               taxId:
 *                 type: string
 *               fiscalYear:
 *                 type: string
 *                 enum: [jan-dec, apr-mar, jul-jun, oct-sep]
 *                 default: jan-dec
 *               currencyCode:
 *                 type: string
 *                 default: USD
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Successfully created company
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      code,
      tenantId,
      type,
      address,
      city,
      state,
      country,
      postalCode,
      phone,
      email,
      taxId,
      fiscalYear = 'jan-dec',
      currencyCode = 'USD',
      isActive = true
    } = req.body;
    
    if (!name || !code || !tenantId || !type) {
      return res.status(400).json({ 
        message: "Name, code, tenant ID, and type are required" 
      });
    }
    
    // Check if company code already exists
    const existingCompany = await Company.findOne({
      where: { code }
    });
    
    if (existingCompany) {
      return res.status(400).json({ 
        message: "Company with this code already exists" 
      });
    }
    
    // Perform transaction to create company and initial chart of accounts
    const result = await sequelize.transaction(async (t) => {
      // Create company
      const company = await Company.create({
        name,
        code,
        tenantId,
        type,
        address,
        city,
        state,
        country,
        postalCode,
        phone,
        email,
        taxId,
        fiscalYear,
        currencyCode,
        isActive
      }, { transaction: t });
      
      // In a real implementation, here you would set up the initial chart of accounts
      // For now, we'll just return the company
      
      return company;
    });
    
    // Return the created company
    return res.status(201).json({
      id: result.id,
      name: result.name,
      code: result.code,
      tenantId: result.tenantId,
      type: result.type,
      address: result.address,
      city: result.city,
      state: result.state,
      country: result.country,
      postalCode: result.postalCode,
      phone: result.phone,
      email: result.email,
      taxId: result.taxId,
      fiscalYear: result.fiscalYear,
      currencyCode: result.currencyCode,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    });
  } catch (error) {
    console.error("Error creating company:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create company" });
  }
});

/**
 * @swagger
 * /companies/{id}:
 *   put:
 *     summary: Update a company
 *     tags: [Companies]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [manufacturer, distributor, plant]
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               taxId:
 *                 type: string
 *               fiscalYear:
 *                 type: string
 *                 enum: [jan-dec, apr-mar, jul-jun, oct-sep]
 *               currencyCode:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully updated company
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }
    
    // Check if company exists
    const company = await Company.findByPk(id);
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    // Extract updatable fields
    const { 
      name, 
      code,
      type,
      address,
      city,
      state,
      country,
      postalCode,
      phone,
      email,
      taxId,
      fiscalYear,
      currencyCode,
      isActive
    } = req.body;
    
    // If changing code, check if it already exists
    if (code && code !== company.code) {
      const existingCompany = await Company.findOne({
        where: { code }
      });
      
      if (existingCompany) {
        return res.status(400).json({ 
          message: "Company with this code already exists" 
        });
      }
    }
    
    // Update company
    await company.update({
      name: name || company.name,
      code: code || company.code,
      type: type || company.type,
      address,
      city,
      state,
      country,
      postalCode,
      phone,
      email,
      taxId,
      fiscalYear: fiscalYear || company.fiscalYear,
      currencyCode: currencyCode || company.currencyCode,
      isActive: isActive !== undefined ? isActive : company.isActive
    });
    
    // Return the updated company
    return res.status(200).json({
      id: company.id,
      name: company.name,
      code: company.code,
      tenantId: company.tenantId,
      type: company.type,
      address: company.address,
      city: company.city,
      state: company.state,
      country: company.country,
      postalCode: company.postalCode,
      phone: company.phone,
      email: company.email,
      taxId: company.taxId,
      fiscalYear: company.fiscalYear,
      currencyCode: company.currencyCode,
      isActive: company.isActive,
      updatedAt: company.updatedAt
    });
  } catch (error) {
    console.error("Error updating company:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to update company" });
  }
});

/**
 * @swagger
 * /companies/{id}/activate:
 *   put:
 *     summary: Activate or deactivate a company
 *     tags: [Companies]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully updated company status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 isActive:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Company not found
 *       500:
 *         description: Server error
 */
router.put('/:id/activate', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;
    
    if (!id || isNaN(id) || isActive === undefined) {
      return res.status(400).json({ 
        message: "Valid company ID and activation status are required" 
      });
    }
    
    // Check if company exists
    const company = await Company.findByPk(id);
    
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    // Update status
    await company.update({ isActive });
    
    return res.status(200).json({
      id: company.id,
      isActive: company.isActive,
      message: `Company ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Error updating company activation status:", error);
    return res.status(500).json({ message: "Failed to update company activation status" });
  }
});

module.exports = router;