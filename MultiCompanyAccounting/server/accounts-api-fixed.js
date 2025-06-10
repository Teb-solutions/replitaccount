/**
 * Accounts API - Fixed for External Database Schema
 * 
 * This module provides account endpoints that match your actual database schema
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
  console.log('🔧 Setting up fixed accounts endpoints for UI...');

  // Main Accounts API - Fixed for your database schema
  app.get('/api/accounts', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting accounts for company ${companyId}`);
      
      // First, let's check what columns actually exist
      const schemaCheck = await externalPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        AND table_schema = 'public'
      `);
      
      console.log('Available columns:', schemaCheck.rows.map(r => r.column_name));
      
      // Use actual column names from your database
      const result = await externalPool.query(`
        SELECT 
          a.id,
          a.id as account_number,
          a.name,
          COALESCE(at.name, 'Asset') as type,
          a.parent_id,
          COALESCE(a.is_active, true) as is_active,
          COALESCE(a.balance, 0) as balance
        FROM accounts a
        LEFT JOIN account_types at ON a.account_type_id = at.id
        WHERE a.company_id = $1
        ORDER BY a.id
      `, [companyId]);

      console.log(`✅ Found ${result.rows.length} accounts for company ${companyId}`);
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Accounts API error:', error.message);
      res.status(500).json({ error: 'Failed to get accounts' });
    }
  });

  // Gas Accounts API - Fixed for your database schema
  app.get('/api/gas-accounts', async (req, res) => {
    try {
      const { companyId } = req.query;
      console.log(`📊 Getting gas accounts for company ${companyId}`);
      
      const result = await externalPool.query(`
        SELECT 
          a.id,
          a.name,
          COALESCE(at.name, 'Asset') as type,
          COALESCE(a.balance, 0) as balance,
          a.company_id
        FROM accounts a
        LEFT JOIN account_type_ids at ON a.account_type_id_id = at.id
        WHERE a.company_id = $1
        ORDER BY name
      `, [companyId]);

      console.log(`✅ Found ${result.rows.length} gas accounts for company ${companyId}`);
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
      
      const standardTypes = [
        { id: 'Asset', name: 'Assets', category: 'balance_sheet' },
        { id: 'Liability', name: 'Liabilities', category: 'balance_sheet' },
        { id: 'Equity', name: 'Equity', category: 'balance_sheet' },
        { id: 'Revenue', name: 'Revenue', category: 'income_statement' },
        { id: 'Expense', name: 'Expenses', category: 'income_statement' }
      ];
      
      res.json(standardTypes);
    } catch (error) {
      console.error('❌ Account types API error:', error.message);
      res.status(500).json({ error: 'Failed to get account types' });
    }
  });

  console.log('✅ Fixed accounts endpoints setup complete');
}