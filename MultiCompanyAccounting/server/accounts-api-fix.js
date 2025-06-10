/**
 * Direct Accounts API
 * 
 * This module provides direct API routes to fetch real account balances
 * from the PostgreSQL database.
 */

const express = require('express');
const { Pool } = require('pg');

// Create a router
const router = express.Router();

// Connect to the external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123'
});

// Direct route to get accounts with real balances
router.get('/api/accounts-direct', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    console.log(`Getting accounts with real balances for company ID: ${companyId}`);
    
    const result = await pool.query(`
      SELECT 
        a.id, 
        a.code, 
        a.name, 
        a.description, 
        a.balance, 
        a.is_active as "isActive", 
        a.company_id as "companyId",
        at.id as "accountTypeId",
        at.code as "accountTypeCode",
        at.name as "accountTypeName"
      FROM accounts a
      JOIN account_types at ON a.account_type_id = at.id
      WHERE a.company_id = $1
      ORDER BY a.code
    `, [companyId]);
    
    // Format accounts for the UI
    const accounts = result.rows.map(account => ({
      id: account.id,
      code: account.code,
      name: account.name,
      description: account.description || '',
      balance: account.balance || '0.00',
      isActive: account.isActive,
      companyId: parseInt(account.companyId),
      accountType: {
        id: account.accountTypeId,
        code: account.accountTypeCode,
        name: account.accountTypeName
      }
    }));
    
    // Log accounts with non-zero balances for debugging
    const nonZeroAccounts = accounts.filter(a => parseFloat(a.balance) !== 0);
    if (nonZeroAccounts.length > 0) {
      console.log(`Found ${nonZeroAccounts.length} accounts with non-zero balances:`);
      nonZeroAccounts.forEach(a => {
        console.log(`- ${a.code}: ${a.name} - $${a.balance}`);
      });
    }
    
    res.json(accounts);
  } catch (error) {
    console.error('Error getting accounts with real balances:', error);
    res.status(500).json({ error: 'Failed to retrieve accounts with real balances' });
  }
});

// Function to register routes to the Express app
function registerAccountsApi(app) {
  app.use(router);
  console.log('✅ Registered direct accounts API routes');
}

module.exports = { registerAccountsApi };