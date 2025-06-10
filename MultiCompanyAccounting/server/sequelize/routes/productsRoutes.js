const express = require('express');
const { Product, ProductCategory, Company } = require('../models');
const router = express.Router();
const { sequelize } = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - companyId
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the product
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         sku:
 *           type: string
 *           description: Stock keeping unit
 *         barcode:
 *           type: string
 *           description: Barcode for the product
 *         price:
 *           type: number
 *           format: decimal
 *           description: Selling price of the product
 *         cost:
 *           type: number
 *           format: decimal
 *           description: Cost of the product
 *         taxRate:
 *           type: number
 *           format: decimal
 *           description: Tax rate for the product
 *         companyId: 
 *           type: integer
 *           description: The company this product belongs to
 *         categoryId:
 *           type: integer
 *           description: The category this product belongs to
 *         isActive:
 *           type: boolean
 *           description: Whether this product is active
 *         inventoryTracking:
 *           type: boolean
 *           description: Whether inventory is tracked for this product
 *         stockQuantity:
 *           type: number
 *           format: decimal
 *           description: Current stock quantity
 *         reorderLevel:
 *           type: number
 *           format: decimal
 *           description: Level at which to reorder the product
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the product was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the product was last updated
 *     ProductCategory:
 *       type: object
 *       required:
 *         - name
 *         - companyId
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the product category
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         companyId: 
 *           type: integer
 *           description: The company this category belongs to
 *         isActive:
 *           type: boolean
 *           description: Whether this category is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the category was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the category was last updated
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management API
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Returns a list of products for a company
 *     tags: [Products]
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
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for product name or description
 *     responses:
 *       200:
 *         description: The list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
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
    const categoryId = req.query.category ? Number(req.query.category) : null;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    if (!companyId || isNaN(companyId)) {
      return res.status(400).json({ message: "Company ID is required" });
    }
    
    // Build where clause
    const whereClause = { companyId };
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    if (search) {
      whereClause[sequelize.Op.or] = [
        { name: { [sequelize.Op.iLike]: `%${search}%` } },
        { description: { [sequelize.Op.iLike]: `%${search}%` } },
        { sku: { [sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit,
      offset,
      include: [
        {
          model: ProductCategory,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });
    
    const totalPages = Math.ceil(count / limit);
    
    return res.status(200).json({
      data: products,
      pagination: {
        total: count,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: The product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    
    const product = await Product.findByPk(id, {
      include: [
        {
          model: ProductCategory,
          as: 'category',
          attributes: ['id', 'name', 'description']
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    return res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - companyId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               price:
 *                 type: number
 *               cost:
 *                 type: number
 *               taxRate:
 *                 type: number
 *               companyId:
 *                 type: integer
 *               categoryId:
 *                 type: integer
 *               inventoryTracking:
 *                 type: boolean
 *               stockQuantity:
 *                 type: number
 *               reorderLevel:
 *                 type: number
 *     responses:
 *       201:
 *         description: Successfully created product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
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
      sku, 
      barcode, 
      price, 
      cost, 
      taxRate,
      companyId,
      categoryId,
      inventoryTracking = false,
      stockQuantity = 0,
      reorderLevel
    } = req.body;
    
    if (!name || !companyId) {
      return res.status(400).json({ message: "Product name and company ID are required" });
    }
    
    // Validate numeric fields
    if (price && (isNaN(price) || Number(price) < 0)) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }
    
    if (cost && (isNaN(cost) || Number(cost) < 0)) {
      return res.status(400).json({ message: "Cost must be a positive number" });
    }
    
    if (taxRate && (isNaN(taxRate) || Number(taxRate) < 0 || Number(taxRate) > 100)) {
      return res.status(400).json({ message: "Tax rate must be a number between 0 and 100" });
    }
    
    // Check if company exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(400).json({ message: "Company not found" });
    }
    
    // Check if category exists if provided
    if (categoryId) {
      const category = await ProductCategory.findOne({
        where: { 
          id: categoryId,
          companyId // Ensure category belongs to the same company
        }
      });
      
      if (!category) {
        return res.status(400).json({ message: "Category not found or does not belong to the specified company" });
      }
    }
    
    // Create product
    const product = await Product.create({
      name,
      description: description || null,
      sku: sku || null,
      barcode: barcode || null,
      price: price || 0,
      cost: cost || null,
      taxRate: taxRate || null,
      companyId,
      categoryId: categoryId || null,
      inventoryTracking: !!inventoryTracking,
      stockQuantity: inventoryTracking ? (stockQuantity || 0) : null,
      reorderLevel: inventoryTracking ? (reorderLevel || null) : null,
      isActive: true
    });
    
    return res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create product" });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sku:
 *                 type: string
 *               barcode:
 *                 type: string
 *               price:
 *                 type: number
 *               cost:
 *                 type: number
 *               taxRate:
 *                 type: number
 *               categoryId:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               inventoryTracking:
 *                 type: boolean
 *               stockQuantity:
 *                 type: number
 *               reorderLevel:
 *                 type: number
 *     responses:
 *       200:
 *         description: Successfully updated product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { 
      name, 
      description, 
      sku, 
      barcode, 
      price, 
      cost, 
      taxRate,
      categoryId,
      isActive,
      inventoryTracking,
      stockQuantity,
      reorderLevel
    } = req.body;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    
    // Find product
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Validate numeric fields
    if (price !== undefined && (isNaN(price) || Number(price) < 0)) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }
    
    if (cost !== undefined && (isNaN(cost) || Number(cost) < 0)) {
      return res.status(400).json({ message: "Cost must be a positive number" });
    }
    
    if (taxRate !== undefined && (isNaN(taxRate) || Number(taxRate) < 0 || Number(taxRate) > 100)) {
      return res.status(400).json({ message: "Tax rate must be a number between 0 and 100" });
    }
    
    // Check if category exists if provided
    if (categoryId !== undefined && categoryId !== null) {
      const category = await ProductCategory.findOne({
        where: { 
          id: categoryId,
          companyId: product.companyId // Ensure category belongs to the same company
        }
      });
      
      if (!category) {
        return res.status(400).json({ message: "Category not found or does not belong to the product's company" });
      }
    }
    
    // Update product
    const updates = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sku !== undefined && { sku }),
      ...(barcode !== undefined && { barcode }),
      ...(price !== undefined && { price }),
      ...(cost !== undefined && { cost }),
      ...(taxRate !== undefined && { taxRate }),
      ...(categoryId !== undefined && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(inventoryTracking !== undefined && { inventoryTracking })
    };
    
    // Only update stock fields if inventory tracking is enabled
    if (inventoryTracking) {
      if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
      if (reorderLevel !== undefined) updates.reorderLevel = reorderLevel;
    }
    
    await product.update(updates);
    
    return res.status(200).json(await Product.findByPk(id, {
      include: [
        {
          model: ProductCategory,
          as: 'category',
          attributes: ['id', 'name', 'description']
        }
      ]
    }));
  } catch (error) {
    console.error("Error updating product:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to update product" });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Successfully deleted product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid product ID
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    
    // Find product
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // TODO: Check if product is used in any orders or invoices
    // If it is, we should prevent deletion or mark as inactive instead
    
    // For now, we'll just mark the product as inactive
    await product.update({ isActive: false });
    
    return res.status(200).json({
      message: "Product marked as inactive successfully"
    });
  } catch (error) {
    console.error("Error deactivating product:", error);
    return res.status(500).json({ message: "Failed to deactivate product" });
  }
});

/**
 * @swagger
 * /products/categories:
 *   get:
 *     summary: Get product categories for a company
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Company ID
 *     responses:
 *       200:
 *         description: List of product categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductCategory'
 *       400:
 *         description: Invalid company ID
 *       500:
 *         description: Server error
 */
router.get('/categories', async (req, res) => {
  try {
    const companyId = Number(req.query.companyId);
    
    if (!companyId || isNaN(companyId)) {
      return res.status(400).json({ message: "Company ID is required" });
    }
    
    const categories = await ProductCategory.findAll({
      where: { companyId },
      order: [['name', 'ASC']]
    });
    
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching product categories:", error);
    return res.status(500).json({ message: "Failed to fetch product categories" });
  }
});

/**
 * @swagger
 * /products/categories:
 *   post:
 *     summary: Create a new product category
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - companyId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               companyId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Successfully created product category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductCategory'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/categories', async (req, res) => {
  try {
    const { name, description, companyId } = req.body;
    
    if (!name || !companyId) {
      return res.status(400).json({ message: "Category name and company ID are required" });
    }
    
    // Check if company exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(400).json({ message: "Company not found" });
    }
    
    // Check if category with same name already exists for this company
    const existingCategory = await ProductCategory.findOne({
      where: { 
        name,
        companyId 
      }
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this name already exists for this company" });
    }
    
    // Create category
    const category = await ProductCategory.create({
      name,
      description: description || null,
      companyId,
      isActive: true
    });
    
    return res.status(201).json(category);
  } catch (error) {
    console.error("Error creating product category:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create product category" });
  }
});

/**
 * @swagger
 * /products/bulk-create:
 *   post:
 *     summary: Create multiple products at once
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - products
 *             properties:
 *               companyId:
 *                 type: integer
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - price
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     sku:
 *                       type: string
 *                     price:
 *                       type: number
 *                     cost:
 *                       type: number
 *                     taxRate:
 *                       type: number
 *                     categoryId:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Successfully created products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/bulk-create', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { companyId, products } = req.body;
    
    if (!companyId || !products || !Array.isArray(products) || products.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: "Company ID and at least one product are required" });
    }
    
    // Check if company exists
    const company = await Company.findByPk(companyId, { transaction });
    if (!company) {
      await transaction.rollback();
      return res.status(400).json({ message: "Company not found" });
    }
    
    // Create products
    const createdProducts = await Promise.all(products.map(async (productData) => {
      // Skip entries without a name
      if (!productData.name) return null;
      
      // Set defaults and ensure types
      const product = {
        name: productData.name,
        description: productData.description || null,
        sku: productData.sku || null,
        price: productData.price || 0,
        cost: productData.cost || null,
        taxRate: productData.taxRate || null,
        companyId,
        categoryId: productData.categoryId || null,
        isActive: true,
        inventoryTracking: false,
        stockQuantity: 0
      };
      
      return Product.create(product, { transaction });
    }));
    
    // Filter out any null results (skipped products)
    const validProducts = createdProducts.filter(p => p !== null);
    
    await transaction.commit();
    
    return res.status(201).json({
      success: true,
      count: validProducts.length,
      products: validProducts
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating products in bulk:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to create products" });
  }
});

module.exports = router;