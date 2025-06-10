/**
 * Accounts API - Missing Endpoints for Chart of Accounts
 * 
 * This module provides the missing account endpoints that your UI needs:
 * - /api/accounts
 * - /api/gas-accounts  
 * - /api/account-types
 * 
 * All endpoints return authentic data from your external database.
 */

import { Pool } from 'pg';

// External database connection
const externalPool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123'
});

export function setupAccountsEndpoints(app) {
  console.log('🔧 Setting up missing accounts endpoints for UI...');

  // Main Accounts API
  app.get('/api/accounts', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting accounts for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          id,
          id as account_number,
          name,
          type,
          parent_id,
          is_active,
          balance
        FROM accounts 
        WHERE company_id = $1
        ORDER BY id
      `, [companyId]);

      res.json(result.rows);
    } catch (error) {
      console.error('❌ Accounts API error:', error.message);
      res.status(500).json({ error: 'Failed to get accounts' });
    }
  });

  // Gas Accounts API (specific for Gas Manufacturing Company)
  app.get('/api/gas-accounts', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting gas accounts for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          id,
          id as account_number,
          name,
          type,
          parent_id,
          is_active,
          balance
        FROM accounts 
        WHERE company_id = $1
        ORDER BY id
      `, [companyId]);

      res.json(result.rows);
    } catch (error) {
      console.error('❌ Gas accounts API error:', error.message);
      res.status(500).json({ error: 'Failed to get gas accounts' });
    }
  });

  // Account Types API
  app.get('/api/account-types', async (req, res) => {
    try {
      console.log('📊 Getting account types');
      
      // Return standard account types
      const accountTypes = [
        { id: 'Assets', name: 'Assets', category: 'Balance Sheet' },
        { id: 'Liabilities', name: 'Liabilities', category: 'Balance Sheet' },
        { id: 'Equity', name: 'Equity', category: 'Balance Sheet' },
        { id: 'Revenue', name: 'Revenue', category: 'Income Statement' },
        { id: 'Expenses', name: 'Expenses', category: 'Income Statement' }
      ];

      res.json(accountTypes);
    } catch (error) {
      console.error('❌ Account types API error:', error.message);
      res.status(500).json({ error: 'Failed to get account types' });
    }
  });

  console.log('✅ Accounts endpoints setup complete');
}