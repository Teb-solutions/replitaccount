import express from 'express';
import { connectToExternalDatabase } from './db-config.js';

const router = express.Router();

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create new invoice
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: integer
 *                 description: Company ID
 *               customerId:
 *                 type: integer
 *                 description: Customer ID
 *               salesOrderId:
 *                 type: integer
 *                 description: Related sales order ID (optional)
 *               invoiceNumber:
 *                 type: string
 *                 description: Invoice number (auto-generated if not provided)
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *               total:
 *                 type: number
 *                 description: Total invoice amount
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 description: Invoice due date
 *             required: [companyId, customerId, items, total]
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/api/invoices', async (req, res) => {
  let pool;
  try {
    const { companyId, customerId, salesOrderId, invoiceNumber, items, total, dueDate } = req.body;
    
    // Validate required fields
    if (!companyId || !customerId || !items || !total) {
      return res.status(400).json({ 
        error: 'Missing required fields: companyId, customerId, items, total' 
      });
    }

    pool = await connectToExternalDatabase();
    
    // Generate invoice number if not provided
    const finalInvoiceNumber = invoiceNumber || `INV-${companyId}-${Date.now()}`;
    
    // Insert invoice
    const invoiceQuery = `
      INSERT INTO invoices (
        company_id, customer_id, sales_order_id, invoice_number, 
        total, due_date, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
      RETURNING *
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [
      companyId,
      customerId,
      salesOrderId || null,
      finalInvoiceNumber,
      total,
      dueDate || null
    ]);
    
    const invoiceId = invoiceResult.rows[0].id;
    
    // Insert invoice items
    for (const item of items) {
      const itemQuery = `
        INSERT INTO invoice_items (
          invoice_id, description, quantity, price, total
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      
      await pool.query(itemQuery, [
        invoiceId,
        item.description,
        item.quantity,
        item.price,
        item.quantity * item.price
      ]);
    }
    
    // Return created invoice with items
    const fullInvoiceQuery = `
      SELECT i.*, 
             json_agg(
               json_build_object(
                 'id', ii.id,
                 'description', ii.description,
                 'quantity', ii.quantity,
                 'price', ii.price,
                 'total', ii.total
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = $1
      GROUP BY i.id
    `;
    
    const fullInvoice = await pool.query(fullInvoiceQuery, [invoiceId]);
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: fullInvoice.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to create invoice',
      details: error.message 
    });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
});

export default router;