/**
 * Direct Receipt Eligible Transactions API
 * 
 * This endpoint directly queries the database for transactions in "Processing" status
 * to ensure we always have a reliable API endpoint for receipt creation.
 */

const express = require('express');
const { pool } = require('../db'); // Connect directly to the database
const router = express.Router();

/**
 * Get receipt-eligible transactions for a company
 * These are transactions with "Processing" status that can have receipts created for them
 */
router.get('/api/receipt-eligible-transactions-direct', async (req, res) => {
  // Set proper content type to ensure we return JSON
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const companyId = parseInt(req.query.companyId);
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    console.log(`📝 [Direct API] Getting receipt-eligible transactions for company ID: ${companyId}`);
    
    // Query transactions directly from the database
    // Looking specifically for transactions with "Processing" status
    // where the company is either the source or target company
    const query = `
      SELECT 
        t.id as transaction_id,
        t.source_company_id,
        t.target_company_id,
        t.description,
        t.amount,
        t.transaction_date,
        t.reference_number,
        t.status,
        i.id as source_invoice_id,
        i.invoice_number as source_invoice_number,
        b.id as target_bill_id,
        sc.name as source_company_name,
        tc.name as target_company_name,
        COALESCE(i.paid_amount, '0.00') as paid_amount,
        (t.amount::numeric - COALESCE(i.paid_amount, '0.00')::numeric) as remaining_amount,
        true as is_intercompany
      FROM 
        intercompany_transactions t
      LEFT JOIN 
        invoices i ON t.source_invoice_id = i.id
      LEFT JOIN 
        bills b ON t.target_bill_id = b.id
      LEFT JOIN 
        companies sc ON t.source_company_id = sc.id
      LEFT JOIN 
        companies tc ON t.target_company_id = tc.id
      WHERE 
        (t.source_company_id = $1 OR t.target_company_id = $1)
        AND t.status = 'Processing'
      ORDER BY 
        t.transaction_date DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    console.log(`✅ [Direct API] Found ${result.rows.length} receipt-eligible transactions`);
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ [Direct API] Error getting receipt-eligible transactions:', error);
    return res.status(500).json({ error: 'Error fetching receipt-eligible transactions' });
  }
});

module.exports = router;