import express from 'express';
import pg from 'pg';
const { Pool } = pg;
const router = express.Router();

// Connect to the external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to external database for credit/debit notes API:', err);
  } else {
    console.log('Successfully connected to external database for credit/debit notes API');
  }
});

/**
 * @swagger
 * /api/credit-notes:
 *   get:
 *     summary: Get all credit notes
 *     tags: [Credit/Debit Notes]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *     responses:
 *       200:
 *         description: List of credit notes
 */
router.get('/api/credit-notes', async (req, res) => {
  try {
    const { companyId, customerId } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (companyId) {
      whereConditions.push(`cn.company_id = $${paramIndex}`);
      queryParams.push(companyId);
      paramIndex++;
    }
    
    if (customerId) {
      whereConditions.push(`cn.customer_id = $${paramIndex}`);
      queryParams.push(customerId);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        cn.id,
        cn.credit_note_number,
        cn.invoice_id,
        cn.company_id,
        cn.customer_id,
        cn.amount,
        cn.reason,
        cn.status,
        cn.credit_note_date,
        cn.created_at,
        cn.updated_at,
        c.name as company_name,
        cust.name as customer_name,
        i.invoice_number,
        i.total_amount as original_invoice_amount
      FROM credit_notes cn
      LEFT JOIN companies c ON cn.company_id = c.id
      LEFT JOIN companies cust ON cn.customer_id = cust.id
      LEFT JOIN invoices i ON cn.invoice_id = i.id
      ${whereClause}
      ORDER BY cn.created_at DESC
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      count: result.rows.length,
      creditNotes: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch credit notes',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/credit-notes:
 *   post:
 *     summary: Create a new credit note with product details
 *     tags: [Credit/Debit Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoice_id:
 *                 type: integer
 *               company_id:
 *                 type: integer
 *               customer_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *               credit_note_date:
 *                 type: string
 *                 format: date-time
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unit_price:
 *                       type: number
 *                     total_amount:
 *                       type: number
 *                     reason:
 *                       type: string
 *     responses:
 *       201:
 *         description: Credit note created successfully with product details
 */
router.post('/api/credit-notes', async (req, res) => {
  try {
    const { invoice_id, company_id, customer_id, amount, reason, credit_note_date, products } = req.body;
    
    // Generate credit note number
    const creditNoteNumber = `CN-${company_id}-${Date.now()}`;
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Create credit note
      const creditNoteQuery = `
        INSERT INTO credit_notes (
          credit_note_number, 
          invoice_id, 
          company_id, 
          customer_id, 
          amount, 
          reason, 
          status, 
          credit_note_date, 
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;
      
      const creditNoteValues = [
        creditNoteNumber,
        invoice_id,
        company_id,
        customer_id,
        amount,
        reason,
        'issued',
        credit_note_date || new Date().toISOString()
      ];
      
      const creditNoteResult = await pool.query(creditNoteQuery, creditNoteValues);
      const creditNote = creditNoteResult.rows[0];
      
      // Create credit note items if products provided
      const creditNoteItems = [];
      if (products && products.length > 0) {
        for (const product of products) {
          const itemQuery = `
            INSERT INTO credit_note_items (
              credit_note_id, 
              product_id, 
              quantity, 
              unit_price, 
              total_amount, 
              reason,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
          `;
          
          const itemValues = [
            creditNote.id,
            product.product_id,
            product.quantity,
            product.unit_price,
            product.total_amount,
            product.reason || reason
          ];
          
          const itemResult = await pool.query(itemQuery, itemValues);
          creditNoteItems.push(itemResult.rows[0]);
        }
      }
      
      await pool.query('COMMIT');
      
      res.status(201).json({
        success: true,
        creditNote: creditNote,
        creditNoteItems: creditNoteItems
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating credit note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create credit note',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/debit-notes:
 *   get:
 *     summary: Get all debit notes
 *     tags: [Credit/Debit Notes]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: integer
 *         description: Filter by vendor ID
 *     responses:
 *       200:
 *         description: List of debit notes
 */
router.get('/api/debit-notes', async (req, res) => {
  try {
    const { companyId, vendorId } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (companyId) {
      whereConditions.push(`dn.company_id = $${paramIndex}`);
      queryParams.push(companyId);
      paramIndex++;
    }
    
    if (vendorId) {
      whereConditions.push(`dn.vendor_id = $${paramIndex}`);
      queryParams.push(vendorId);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        dn.id,
        dn.debit_note_number,
        dn.bill_id,
        dn.company_id,
        dn.vendor_id,
        dn.amount,
        dn.reason,
        dn.status,
        dn.debit_note_date,
        dn.created_at,
        dn.updated_at,
        c.name as company_name,
        v.name as vendor_name,
        b.bill_number,
        b.total_amount as original_bill_amount
      FROM debit_notes dn
      LEFT JOIN companies c ON dn.company_id = c.id
      LEFT JOIN companies v ON dn.vendor_id = v.id
      LEFT JOIN bills b ON dn.bill_id = b.id
      ${whereClause}
      ORDER BY dn.created_at DESC
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      count: result.rows.length,
      debitNotes: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching debit notes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch debit notes',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/debit-notes:
 *   post:
 *     summary: Create a new debit note with product details
 *     tags: [Credit/Debit Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bill_id:
 *                 type: integer
 *               company_id:
 *                 type: integer
 *               vendor_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *               debit_note_date:
 *                 type: string
 *                 format: date-time
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unit_price:
 *                       type: number
 *                     total_amount:
 *                       type: number
 *                     reason:
 *                       type: string
 *     responses:
 *       201:
 *         description: Debit note created successfully with product details
 */
router.post('/api/debit-notes', async (req, res) => {
  try {
    const { bill_id, company_id, vendor_id, amount, reason, debit_note_date, products } = req.body;
    
    // Generate debit note number
    const debitNoteNumber = `DN-${company_id}-${Date.now()}`;
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Create debit note
      const debitNoteQuery = `
        INSERT INTO debit_notes (
          debit_note_number, 
          bill_id, 
          company_id, 
          vendor_id, 
          amount, 
          reason, 
          status, 
          debit_note_date, 
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;
      
      const debitNoteValues = [
        debitNoteNumber,
        bill_id,
        company_id,
        vendor_id,
        amount,
        reason,
        'issued',
        debit_note_date || new Date().toISOString()
      ];
      
      const debitNoteResult = await pool.query(debitNoteQuery, debitNoteValues);
      const debitNote = debitNoteResult.rows[0];
      
      // Create debit note items if products provided
      const debitNoteItems = [];
      if (products && products.length > 0) {
        for (const product of products) {
          const itemQuery = `
            INSERT INTO debit_note_items (
              debit_note_id, 
              product_id, 
              quantity, 
              unit_price, 
              total_amount, 
              reason,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
          `;
          
          const itemValues = [
            debitNote.id,
            product.product_id,
            product.quantity,
            product.unit_price,
            product.total_amount,
            product.reason || reason
          ];
          
          const itemResult = await pool.query(itemQuery, itemValues);
          debitNoteItems.push(itemResult.rows[0]);
        }
      }
      
      await pool.query('COMMIT');
      
      res.status(201).json({
        success: true,
        debitNote: debitNote,
        debitNoteItems: debitNoteItems
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating debit note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create debit note',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/credit-debit-notes/summary:
 *   get:
 *     summary: Get credit and debit notes summary
 *     tags: [Credit/Debit Notes]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID
 *     responses:
 *       200:
 *         description: Summary of credit and debit notes
 */
router.get('/api/credit-debit-notes/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    const whereClause = companyId ? `WHERE company_id = $1` : '';
    const queryParams = companyId ? [companyId] : [];
    
    const creditNotesQuery = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued_count,
        COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied_count
      FROM credit_notes
      ${whereClause}
    `;
    
    const debitNotesQuery = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued_count,
        COUNT(CASE WHEN status = 'applied' THEN 1 END) as applied_count
      FROM debit_notes
      ${whereClause}
    `;
    
    const [creditResult, debitResult] = await Promise.all([
      pool.query(creditNotesQuery, queryParams),
      pool.query(debitNotesQuery, queryParams)
    ]);
    
    res.json({
      success: true,
      companyId: companyId ? parseInt(companyId) : null,
      creditNotes: creditResult.rows[0],
      debitNotes: debitResult.rows[0],
      summary: {
        totalCreditAmount: parseFloat(creditResult.rows[0].total_amount),
        totalDebitAmount: parseFloat(debitResult.rows[0].total_amount),
        netAmount: parseFloat(creditResult.rows[0].total_amount) - parseFloat(debitResult.rows[0].total_amount)
      }
    });
    
  } catch (error) {
    console.error('Error fetching credit/debit notes summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch credit/debit notes summary',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/intercompany-adjustment:
 *   post:
 *     summary: Create intercompany adjustment with credit and debit notes for both companies
 *     tags: [Credit/Debit Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source_company_id:
 *                 type: integer
 *                 description: Company issuing the credit note
 *               target_company_id:
 *                 type: integer
 *                 description: Company receiving the debit note
 *               invoice_id:
 *                 type: integer
 *                 description: Related invoice ID for credit note
 *               bill_id:
 *                 type: integer
 *                 description: Related bill ID for debit note
 *               amount:
 *                 type: number
 *                 description: Adjustment amount
 *               reason:
 *                 type: string
 *                 description: Reason for the adjustment
 *               adjustment_date:
 *                 type: string
 *                 format: date-time
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     unit_price:
 *                       type: number
 *                     total_amount:
 *                       type: number
 *                     reason:
 *                       type: string
 *               reference_number:
 *                 type: string
 *                 description: Reference linking both notes
 *     responses:
 *       201:
 *         description: Intercompany adjustment created successfully
 */
router.post('/api/intercompany-adjustment', async (req, res) => {
  try {
    const { 
      source_company_id, 
      target_company_id, 
      invoice_id, 
      bill_id, 
      amount, 
      reason, 
      adjustment_date,
      products,
      reference_number 
    } = req.body;
    
    if (!source_company_id || !target_company_id || !amount || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: source_company_id, target_company_id, amount, reason' 
      });
    }
    
    const timestamp = Date.now();
    const adjustmentDate = adjustment_date || new Date().toISOString();
    const intercompanyReference = reference_number || `IC-ADJ-${source_company_id}-${target_company_id}-${timestamp}`;
    
    // Start transaction for both companies
    await pool.query('BEGIN');
    
    try {
      // 1. Create Credit Note for Source Company (reduces their receivables)
      const creditNoteNumber = `CN-IC-${source_company_id}-${timestamp}`;
      const creditNoteQuery = `
        INSERT INTO credit_notes (
          credit_note_number, 
          invoice_id, 
          company_id, 
          customer_id, 
          amount, 
          reason, 
          status, 
          credit_note_date,
          reference_number,
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const creditNoteValues = [
        creditNoteNumber,
        invoice_id,
        source_company_id,
        target_company_id,
        amount,
        `Intercompany Adjustment: ${reason}`,
        'issued',
        adjustmentDate,
        intercompanyReference
      ];
      
      const creditNoteResult = await pool.query(creditNoteQuery, creditNoteValues);
      const creditNote = creditNoteResult.rows[0];
      
      // 2. Create Debit Note for Target Company (increases their payables)
      const debitNoteNumber = `DN-IC-${target_company_id}-${timestamp}`;
      const debitNoteQuery = `
        INSERT INTO debit_notes (
          debit_note_number, 
          bill_id, 
          company_id, 
          vendor_id, 
          amount, 
          reason, 
          status, 
          debit_note_date,
          reference_number,
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const debitNoteValues = [
        debitNoteNumber,
        bill_id,
        target_company_id,
        source_company_id,
        amount,
        `Intercompany Adjustment: ${reason}`,
        'issued',
        adjustmentDate,
        intercompanyReference
      ];
      
      const debitNoteResult = await pool.query(debitNoteQuery, debitNoteValues);
      const debitNote = debitNoteResult.rows[0];
      
      // 3. Create product items for both notes if provided
      const creditNoteItems = [];
      const debitNoteItems = [];
      
      if (products && products.length > 0) {
        for (const product of products) {
          // Credit note item
          const creditItemQuery = `
            INSERT INTO credit_note_items (
              credit_note_id, 
              product_id, 
              quantity, 
              unit_price, 
              total_amount, 
              reason,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
          `;
          
          const creditItemValues = [
            creditNote.id,
            product.product_id,
            product.quantity,
            product.unit_price,
            product.total_amount,
            product.reason || reason
          ];
          
          const creditItemResult = await pool.query(creditItemQuery, creditItemValues);
          creditNoteItems.push(creditItemResult.rows[0]);
          
          // Debit note item
          const debitItemQuery = `
            INSERT INTO debit_note_items (
              debit_note_id, 
              product_id, 
              quantity, 
              unit_price, 
              total_amount, 
              reason,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
          `;
          
          const debitItemValues = [
            debitNote.id,
            product.product_id,
            product.quantity,
            product.unit_price,
            product.total_amount,
            product.reason || reason
          ];
          
          const debitItemResult = await pool.query(debitItemQuery, debitItemValues);
          debitNoteItems.push(debitItemResult.rows[0]);
        }
      }
      
      // 4. Create intercompany adjustment record for tracking
      const adjustmentQuery = `
        INSERT INTO intercompany_adjustments (
          reference_number,
          source_company_id,
          target_company_id,
          credit_note_id,
          debit_note_id,
          amount,
          reason,
          adjustment_date,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;
      
      const adjustmentValues = [
        intercompanyReference,
        source_company_id,
        target_company_id,
        creditNote.id,
        debitNote.id,
        amount,
        reason,
        adjustmentDate,
        'completed'
      ];
      
      const adjustmentResult = await pool.query(adjustmentQuery, adjustmentValues);
      const adjustment = adjustmentResult.rows[0];
      
      await pool.query('COMMIT');
      
      res.status(201).json({
        success: true,
        intercompanyAdjustment: {
          reference: intercompanyReference,
          sourceCompany: source_company_id,
          targetCompany: target_company_id,
          amount: amount,
          reason: reason,
          adjustmentDate: adjustmentDate,
          status: 'completed'
        },
        creditNote: {
          ...creditNote,
          items: creditNoteItems
        },
        debitNote: {
          ...debitNote,
          items: debitNoteItems
        },
        adjustment: adjustment
      });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating intercompany adjustment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create intercompany adjustment',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/intercompany-adjustments:
 *   get:
 *     summary: Get all intercompany adjustments
 *     tags: [Credit/Debit Notes]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: integer
 *         description: Filter by company ID (either source or target)
 *       - in: query
 *         name: reference
 *         schema:
 *           type: string
 *         description: Filter by reference number
 *     responses:
 *       200:
 *         description: List of intercompany adjustments
 */
router.get('/api/intercompany-adjustments', async (req, res) => {
  try {
    const { companyId, reference } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (companyId) {
      whereConditions.push(`(ia.source_company_id = $${paramIndex} OR ia.target_company_id = $${paramIndex})`);
      queryParams.push(companyId);
      paramIndex++;
    }
    
    if (reference) {
      whereConditions.push(`ia.reference_number = $${paramIndex}`);
      queryParams.push(reference);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        ia.*,
        sc.name as source_company_name,
        tc.name as target_company_name,
        cn.credit_note_number,
        dn.debit_note_number
      FROM intercompany_adjustments ia
      LEFT JOIN companies sc ON ia.source_company_id = sc.id
      LEFT JOIN companies tc ON ia.target_company_id = tc.id
      LEFT JOIN credit_notes cn ON ia.credit_note_id = cn.id
      LEFT JOIN debit_notes dn ON ia.debit_note_id = dn.id
      ${whereClause}
      ORDER BY ia.created_at DESC
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      count: result.rows.length,
      adjustments: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching intercompany adjustments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch intercompany adjustments',
      details: error.message 
    });
  }
});

export default router;