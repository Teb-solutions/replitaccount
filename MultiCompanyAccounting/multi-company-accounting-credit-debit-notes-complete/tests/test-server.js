/**
 * Test Server for Credit/Debit Notes System
 * ES Module compatible server with all APIs
 */
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false
});

// Test database connection
pool.connect()
  .then(() => console.log('✅ Connected to external database'))
  .catch(err => console.error('❌ Database connection failed:', err.message));

// Basic endpoints for testing
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT id, company_name as name, company_code as code 
      FROM companies 
      WHERE company_name IS NOT NULL 
      ORDER BY company_name 
      LIMIT 50
    `);
    
    res.json({
      success: true,
      companies: result.rows
    });
  } catch (error) {
    console.error('Companies endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch companies',
      details: error.message 
    });
  }
});

app.get('/api/products/tested', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT id, product_name as name, unit_price as price 
      FROM products 
      WHERE product_name IS NOT NULL AND unit_price > 0 
      ORDER BY product_name 
      LIMIT 20
    `);
    
    res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Products endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch products',
      details: error.message 
    });
  }
});

// Database setup endpoint
app.post('/api/setup-database', async (req, res) => {
  try {
    await pool.query('BEGIN');

    const tables = [
      `CREATE TABLE IF NOT EXISTS credit_notes (
        id SERIAL PRIMARY KEY,
        credit_note_number VARCHAR(50) UNIQUE NOT NULL,
        invoice_id INTEGER,
        company_id INTEGER,
        customer_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'issued',
        credit_note_date TIMESTAMP WITH TIME ZONE,
        reference_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS credit_note_items (
        id SERIAL PRIMARY KEY,
        credit_note_id INTEGER,
        product_id INTEGER,
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS debit_notes (
        id SERIAL PRIMARY KEY,
        debit_note_number VARCHAR(50) UNIQUE NOT NULL,
        bill_id INTEGER,
        company_id INTEGER,
        vendor_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'issued',
        debit_note_date TIMESTAMP WITH TIME ZONE,
        reference_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS debit_note_items (
        id SERIAL PRIMARY KEY,
        debit_note_id INTEGER,
        product_id INTEGER,
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS intercompany_adjustments (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        source_company_id INTEGER,
        target_company_id INTEGER,
        credit_note_id INTEGER,
        debit_note_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        adjustment_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    for (const tableQuery of tables) {
      await pool.query(tableQuery);
    }

    await pool.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Database tables created successfully',
      tablesCreated: tables.length
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Database setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set up database',
      details: error.message
    });
  }
});

// Credit notes endpoints
app.get('/api/credit-notes', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT cn.*, 
             c1.company_name as company_name,
             c2.company_name as customer_name
      FROM credit_notes cn
      LEFT JOIN companies c1 ON cn.company_id = c1.id
      LEFT JOIN companies c2 ON cn.customer_id = c2.id
    `;
    
    const params = [];
    if (companyId) {
      query += ' WHERE cn.company_id = $1';
      params.push(companyId);
    }
    
    query += ' ORDER BY cn.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      creditNotes: result.rows
    });
  } catch (error) {
    console.error('Credit notes fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch credit notes',
      details: error.message 
    });
  }
});

app.post('/api/credit-notes', async (req, res) => {
  try {
    const { company_id, customer_id, amount, reason, credit_note_date, products, invoice_id } = req.body;
    
    await pool.query('BEGIN');
    
    // Generate credit note number
    const creditNoteNumber = `CN-${company_id}-${Date.now()}`;
    
    // Insert credit note
    const creditNoteResult = await pool.query(`
      INSERT INTO credit_notes (credit_note_number, invoice_id, company_id, customer_id, amount, reason, credit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [creditNoteNumber, invoice_id || null, company_id, customer_id, amount, reason, credit_note_date]);
    
    const creditNote = creditNoteResult.rows[0];
    
    // Insert credit note items
    if (products && products.length > 0) {
      for (const product of products) {
        await pool.query(`
          INSERT INTO credit_note_items (credit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [creditNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
      }
    }
    
    await pool.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Credit note created successfully',
      creditNote
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Credit note creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create credit note',
      details: error.message
    });
  }
});

// Debit notes endpoints
app.get('/api/debit-notes', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT dn.*, 
             c1.company_name as company_name,
             c2.company_name as vendor_name
      FROM debit_notes dn
      LEFT JOIN companies c1 ON dn.company_id = c1.id
      LEFT JOIN companies c2 ON dn.vendor_id = c2.id
    `;
    
    const params = [];
    if (companyId) {
      query += ' WHERE dn.company_id = $1';
      params.push(companyId);
    }
    
    query += ' ORDER BY dn.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      debitNotes: result.rows
    });
  } catch (error) {
    console.error('Debit notes fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch debit notes',
      details: error.message 
    });
  }
});

app.post('/api/debit-notes', async (req, res) => {
  try {
    const { company_id, vendor_id, amount, reason, debit_note_date, products, bill_id } = req.body;
    
    await pool.query('BEGIN');
    
    // Generate debit note number
    const debitNoteNumber = `DN-${company_id}-${Date.now()}`;
    
    // Insert debit note
    const debitNoteResult = await pool.query(`
      INSERT INTO debit_notes (debit_note_number, bill_id, company_id, vendor_id, amount, reason, debit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [debitNoteNumber, bill_id || null, company_id, vendor_id, amount, reason, debit_note_date]);
    
    const debitNote = debitNoteResult.rows[0];
    
    // Insert debit note items
    if (products && products.length > 0) {
      for (const product of products) {
        await pool.query(`
          INSERT INTO debit_note_items (debit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [debitNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
      }
    }
    
    await pool.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Debit note created successfully',
      debitNote
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Debit note creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create debit note',
      details: error.message
    });
  }
});

// Intercompany adjustments endpoints
app.get('/api/intercompany-adjustments', async (req, res) => {
  try {
    const { companyId } = req.query;
    let query = `
      SELECT ia.*, 
             c1.company_name as source_company_name,
             c2.company_name as target_company_name,
             cn.credit_note_number,
             dn.debit_note_number
      FROM intercompany_adjustments ia
      LEFT JOIN companies c1 ON ia.source_company_id = c1.id
      LEFT JOIN companies c2 ON ia.target_company_id = c2.id
      LEFT JOIN credit_notes cn ON ia.credit_note_id = cn.id
      LEFT JOIN debit_notes dn ON ia.debit_note_id = dn.id
    `;
    
    const params = [];
    if (companyId) {
      query += ' WHERE (ia.source_company_id = $1 OR ia.target_company_id = $1)';
      params.push(companyId);
    }
    
    query += ' ORDER BY ia.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      adjustments: result.rows
    });
  } catch (error) {
    console.error('Intercompany adjustments fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch intercompany adjustments',
      details: error.message 
    });
  }
});

app.post('/api/intercompany-adjustment', async (req, res) => {
  try {
    const { source_company_id, target_company_id, amount, reason, adjustment_date, products } = req.body;
    
    await pool.query('BEGIN');
    
    // Generate reference number
    const referenceNumber = `IA-${source_company_id}-${target_company_id}-${Date.now()}`;
    
    // Create credit note for source company
    const creditNoteNumber = `CN-${source_company_id}-${Date.now()}`;
    const creditNoteResult = await pool.query(`
      INSERT INTO credit_notes (credit_note_number, company_id, customer_id, amount, reason, credit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [creditNoteNumber, source_company_id, target_company_id, amount, reason, adjustment_date]);
    
    const creditNote = creditNoteResult.rows[0];
    
    // Create debit note for target company
    const debitNoteNumber = `DN-${target_company_id}-${Date.now()}`;
    const debitNoteResult = await pool.query(`
      INSERT INTO debit_notes (debit_note_number, company_id, vendor_id, amount, reason, debit_note_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [debitNoteNumber, target_company_id, source_company_id, amount, reason, adjustment_date]);
    
    const debitNote = debitNoteResult.rows[0];
    
    // Create intercompany adjustment record
    const adjustmentResult = await pool.query(`
      INSERT INTO intercompany_adjustments (reference_number, source_company_id, target_company_id, credit_note_id, debit_note_id, amount, reason, adjustment_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [referenceNumber, source_company_id, target_company_id, creditNote.id, debitNote.id, amount, reason, adjustment_date]);
    
    const adjustment = adjustmentResult.rows[0];
    
    // Insert product items for both notes
    if (products && products.length > 0) {
      for (const product of products) {
        // Credit note items
        await pool.query(`
          INSERT INTO credit_note_items (credit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [creditNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
        
        // Debit note items
        await pool.query(`
          INSERT INTO debit_note_items (debit_note_id, product_id, quantity, unit_price, total_amount, reason)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [debitNote.id, product.product_id, product.quantity, product.unit_price, product.total_amount, product.reason]);
      }
    }
    
    await pool.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Intercompany adjustment created successfully',
      adjustment,
      creditNote,
      debitNote
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Intercompany adjustment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create intercompany adjustment',
      details: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/companies',
      'GET /api/products/tested',
      'POST /api/setup-database',
      'GET /api/credit-notes',
      'POST /api/credit-notes',
      'GET /api/debit-notes',
      'POST /api/debit-notes',
      'GET /api/intercompany-adjustments',
      'POST /api/intercompany-adjustment'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Credit/Debit Notes Test Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏢 Companies: http://localhost:${PORT}/api/companies`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products/tested`);
});

export default app;