/**
 * Chart of Accounts API
 * Provides hierarchical account structure management
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration for external database
const pool = new Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 20
});

export function setupChartOfAccountsAPI(app) {
  // Chart of accounts endpoint
  app.get('/api/accounts/chart', async (req, res) => {
    try {
      const companyId = parseInt(req.query.companyId);
      
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      console.log(`📊 Getting chart of accounts for company ${companyId}`);

      // Get company details
      const companyResult = await pool.query(
        'SELECT id, name FROM companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = companyResult.rows[0];

      // Get all accounts with their type information
      const accountsQuery = `
        SELECT 
          a.id,
          a.code,
          a.name,
          a.description,
          a.parent_id,
          a.level,
          a.is_active,
          a.balance,
          a.account_type_id,
          at.name as account_type_name,
          at.category as account_category,
          a.created_at,
          a.updated_at
        FROM accounts a
        LEFT JOIN account_types at ON a.account_type_id = at.id
        WHERE a.company_id = $1
        ORDER BY a.code, a.level, a.name
      `;

      const accountsResult = await pool.query(accountsQuery, [companyId]);

      // Build hierarchical structure
      const accountsMap = new Map();
      const rootAccounts = [];

      // First pass: create all accounts
      accountsResult.rows.forEach(row => {
        const account = {
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          parentId: row.parent_id,
          level: row.level || 0,
          isActive: row.is_active,
          balance: parseFloat(row.balance) || 0,
          accountTypeId: row.account_type_id,
          accountTypeName: row.account_type_name || 'Unknown',
          accountCategory: row.account_category || 'Other',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          children: []
        };
        
        accountsMap.set(account.id, account);
        
        if (!account.parentId) {
          rootAccounts.push(account);
        }
      });

      // Second pass: build hierarchy
      accountsResult.rows.forEach(row => {
        if (row.parent_id) {
          const parent = accountsMap.get(row.parent_id);
          const child = accountsMap.get(row.id);
          if (parent && child) {
            parent.children.push(child);
          }
        }
      });

      // Sort children recursively
      function sortChildren(accounts) {
        accounts.sort((a, b) => {
          if (a.code && b.code) {
            return a.code.localeCompare(b.code);
          }
          return a.name.localeCompare(b.name);
        });
        
        accounts.forEach(account => {
          if (account.children.length > 0) {
            sortChildren(account.children);
          }
        });
      }

      sortChildren(rootAccounts);

      // Get account type summary
      const typeSummaryQuery = `
        SELECT 
          at.category,
          COUNT(a.id) as account_count,
          SUM(a.balance) as total_balance
        FROM accounts a
        JOIN account_types at ON a.account_type_id = at.id
        WHERE a.company_id = $1 AND a.is_active = true
        GROUP BY at.category
      `;

      const typeSummaryResult = await pool.query(typeSummaryQuery, [companyId]);

      const accountSummary = {
        totalAccounts: accountsResult.rows.length,
        activeAccounts: accountsResult.rows.filter(a => a.is_active).length,
        inactiveAccounts: accountsResult.rows.filter(a => !a.is_active).length,
        totalBalance: accountsResult.rows.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0),
        byCategory: typeSummaryResult.rows.reduce((acc, row) => {
          acc[row.category] = {
            accountCount: parseInt(row.account_count),
            totalBalance: parseFloat(row.total_balance) || 0
          };
          return acc;
        }, {})
      };

      const response = {
        companyId: parseInt(companyId),
        companyName: company.name,
        reportDate: new Date().toISOString().split('T')[0],
        summary: accountSummary,
        accounts: rootAccounts,
        flatAccountList: Array.from(accountsMap.values()).map(account => ({
          id: account.id,
          code: account.code,
          name: account.name,
          fullName: account.code ? `${account.code} - ${account.name}` : account.name,
          accountType: account.accountTypeName,
          category: account.accountCategory,
          balance: account.balance,
          isActive: account.isActive,
          level: account.level
        }))
      };

      console.log(`✅ Chart of accounts: ${response.summary.totalAccounts} accounts in hierarchy`);
      res.json(response);

    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
      res.status(500).json({ 
        error: 'Failed to fetch chart of accounts',
        details: error.message 
      });
    }
  });

  console.log('✅ Chart of Accounts API endpoint registered');
}