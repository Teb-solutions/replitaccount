/**
 * Journal Entries API - Double-Entry Bookkeeping
 * 
 * Provides complete journal entries showing all debits and credits
 * for proper double-entry accounting tracking
 */

import express from 'express';
import { externalPool } from './db-config.js';

const router = express.Router();

// Get all journal entries for a company
router.get('/api/journal-entries', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log(`📊 Getting journal entries for company ${companyId}`);

    // Query journal entries from database
    const query = `
      SELECT 
        je.id,
        je.entry_number,
        je.entry_date,
        je.description,
        je.reference,
        je.total_amount,
        jei.account_id,
        a.name as account_name,
        a.account_number,
        jei.debit_amount,
        jei.credit_amount,
        jei.description as line_description
      FROM journal_entries je
      LEFT JOIN journal_entry_items jei ON je.id = jei.journal_entry_id
      LEFT JOIN accounts a ON jei.account_id = a.id
      WHERE je.company_id = $1
      ORDER BY je.entry_date DESC, je.id, jei.id
    `;

    const result = await externalPool.query(query, [companyId]);

    // Group by journal entry
    const journalEntries = {};
    
    result.rows.forEach(row => {
      if (!journalEntries[row.id]) {
        journalEntries[row.id] = {
          id: row.id,
          entryNumber: row.entry_number,
          entryDate: row.entry_date,
          description: row.description,
          reference: row.reference,
          totalAmount: parseFloat(row.total_amount || 0),
          lineItems: []
        };
      }

      if (row.account_id) {
        journalEntries[row.id].lineItems.push({
          accountId: row.account_id,
          accountName: row.account_name,
          accountNumber: row.account_number,
          debitAmount: parseFloat(row.debit_amount || 0),
          creditAmount: parseFloat(row.credit_amount || 0),
          description: row.line_description
        });
      }
    });

    const entries = Object.values(journalEntries);
    console.log(`✅ Found ${entries.length} journal entries for company ${companyId}`);
    
    res.json(entries);

  } catch (error) {
    console.error('❌ Journal entries API error:', error.message);
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

// Get journal entry by ID
router.get('/api/journal-entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📊 Getting journal entry ${id}`);

    const query = `
      SELECT 
        je.id,
        je.entry_number,
        je.entry_date,
        je.description,
        je.reference,
        je.total_amount,
        je.company_id,
        c.name as company_name,
        jei.account_id,
        a.name as account_name,
        a.account_number,
        jei.debit_amount,
        jei.credit_amount,
        jei.description as line_description
      FROM journal_entries je
      LEFT JOIN companies c ON je.company_id = c.id
      LEFT JOIN journal_entry_items jei ON je.id = jei.journal_entry_id
      LEFT JOIN accounts a ON jei.account_id = a.id
      WHERE je.id = $1
      ORDER BY jei.id
    `;

    const result = await externalPool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    const firstRow = result.rows[0];
    const journalEntry = {
      id: firstRow.id,
      entryNumber: firstRow.entry_number,
      entryDate: firstRow.entry_date,
      description: firstRow.description,
      reference: firstRow.reference,
      totalAmount: parseFloat(firstRow.total_amount || 0),
      companyId: firstRow.company_id,
      companyName: firstRow.company_name,
      lineItems: result.rows.map(row => ({
        accountId: row.account_id,
        accountName: row.account_name,
        accountNumber: row.account_number,
        debitAmount: parseFloat(row.debit_amount || 0),
        creditAmount: parseFloat(row.credit_amount || 0),
        description: row.line_description
      }))
    };

    res.json(journalEntry);

  } catch (error) {
    console.error('❌ Journal entry API error:', error.message);
    res.status(500).json({ error: 'Failed to get journal entry' });
  }
});

// Get journal entries summary
router.get('/api/journal-entries/summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log(`📊 Getting journal entries summary for company ${companyId}`);

    const query = `
      SELECT 
        COUNT(*) as total_entries,
        SUM(total_amount) as total_amount,
        MIN(entry_date) as earliest_date,
        MAX(entry_date) as latest_date
      FROM journal_entries
      WHERE company_id = $1
    `;

    const result = await externalPool.query(query, [companyId]);
    const summary = result.rows[0];

    res.json({
      totalEntries: parseInt(summary.total_entries || 0),
      totalAmount: parseFloat(summary.total_amount || 0),
      earliestDate: summary.earliest_date,
      latestDate: summary.latest_date
    });

  } catch (error) {
    console.error('❌ Journal entries summary API error:', error.message);
    res.status(500).json({ error: 'Failed to get journal entries summary' });
  }
});

export { router as journalEntriesRouter };