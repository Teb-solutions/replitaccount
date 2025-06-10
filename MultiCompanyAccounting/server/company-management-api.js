/**
 * Company Management API
 * 
 * Provides endpoints for creating new companies with their complete chart of accounts
 * and managing company-related operations in the multi-tenant accounting system.
 */

/**
 * @swagger
 * /api/companies:
 *   get:
 *     tags:
 *       - Company Management
 *     summary: Get All Companies
 *     description: Retrieve a list of all companies in the system
 *     responses:
 *       200:
 *         description: Successfully retrieved companies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Company ID
 *                     example: 1
 *                   name:
 *                     type: string
 *                     description: Company name
 *                     example: "Acme Manufacturing Inc"
 *                   code:
 *                     type: string
 *                     description: Company code
 *                     example: "ACME"
 *                   type:
 *                     type: string
 *                     description: Company type
 *                     example: "manufacturer"
 *                   address:
 *                     type: string
 *                     description: Company address
 *                     example: "123 Business St, City, State 12345"
 *                   phone:
 *                     type: string
 *                     description: Company phone number
 *                     example: "+1-555-123-4567"
 *                   email:
 *                     type: string
 *                     description: Company email
 *                     example: "contact@acme.com"
 *                   currency:
 *                     type: string
 *                     description: Company currency
 *                     example: "USD"
 *                   tenant_id:
 *                     type: integer
 *                     description: Tenant ID
 *                     example: 1
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch companies"
 */

import { pool as externalPool } from './database-checker.js';

/**
 * Default Chart of Accounts Template
 * Standard accounting structure for new companies
 */
const DEFAULT_CHART_OF_ACCOUNTS = [
  // Assets (1000-1999)
  { code: '1000', name: 'Cash', type: 'asset', category: 'current_assets' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_assets' },
  { code: '1150', name: 'Intercompany Receivable', type: 'asset', category: 'current_assets' },
  { code: '1200', name: 'Inventory', type: 'asset', category: 'current_assets' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', category: 'current_assets' },
  { code: '1500', name: 'Equipment', type: 'asset', category: 'fixed_assets' },
  { code: '1600', name: 'Accumulated Depreciation - Equipment', type: 'asset', category: 'fixed_assets' },
  
  // Liabilities (2000-2999)
  { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liabilities' },
  { code: '2050', name: 'Intercompany Payable', type: 'liability', category: 'current_liabilities' },
  { code: '2100', name: 'Accrued Expenses', type: 'liability', category: 'current_liabilities' },
  { code: '2200', name: 'Short-term Loans', type: 'liability', category: 'current_liabilities' },
  { code: '2500', name: 'Long-term Debt', type: 'liability', category: 'long_term_liabilities' },
  
  // Equity (3000-3999)
  { code: '3000', name: 'Owner\'s Capital', type: 'equity', category: 'capital' },
  { code: '3100', name: 'Retained Earnings', type: 'equity', category: 'retained_earnings' },
  { code: '3200', name: 'Current Year Earnings', type: 'equity', category: 'current_earnings' },
  
  // Revenue (4000-4999)
  { code: '4000', name: 'Sales Revenue', type: 'revenue', category: 'operating_revenue' },
  { code: '4100', name: 'Service Revenue', type: 'revenue', category: 'operating_revenue' },
  { code: '4200', name: 'Intercompany Revenue', type: 'revenue', category: 'intercompany_revenue' },
  { code: '4900', name: 'Other Income', type: 'revenue', category: 'other_revenue' },
  
  // Expenses (5000-5999)
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'cost_of_sales' },
  { code: '5100', name: 'Wages and Salaries', type: 'expense', category: 'operating_expenses' },
  { code: '5200', name: 'Rent Expense', type: 'expense', category: 'operating_expenses' },
  { code: '5300', name: 'Utilities', type: 'expense', category: 'operating_expenses' },
  { code: '5400', name: 'Office Supplies', type: 'expense', category: 'operating_expenses' },
  { code: '5500', name: 'Marketing and Advertising', type: 'expense', category: 'operating_expenses' },
  { code: '5600', name: 'Professional Services', type: 'expense', category: 'operating_expenses' },
  { code: '5700', name: 'Depreciation Expense', type: 'expense', category: 'operating_expenses' },
  { code: '5800', name: 'Interest Expense', type: 'expense', category: 'financial_expenses' },
  { code: '5900', name: 'Other Expenses', type: 'expense', category: 'other_expenses' }
];

/**
 * Get next sequence number for a table with proper buffer
 */
async function getNextSequence(tableName) {
  try {
    const result = await externalPool.query(
      `SELECT COALESCE(MAX(id), 0) + 100 as next_id FROM ${tableName}`
    );
    console.log(`🔍 DEBUG: Getting next sequence for ${tableName}: ${result.rows[0].next_id}`);
    return result.rows[0].next_id;
  } catch (error) {
    console.error(`Error getting sequence for ${tableName}:`, error);
    return 100;
  }
}

/**
 * Create company with complete chart of accounts
 */
async function createCompanyWithAccounts(companyData) {
  const client = await externalPool.connect();
  
  try {
    console.log('🔍 DEBUG: Starting company creation transaction');
    await client.query('BEGIN');
    
    // Get next company ID without sequence dependency
    const maxCompanyQuery = await client.query('SELECT COALESCE(MAX(id), 0) + 100 as next_id FROM companies');
    const companyId = maxCompanyQuery.rows[0].next_id;
    console.log(`🔍 DEBUG: Using company ID: ${companyId}`);
    
    // Create the company
    const companyInsertQuery = `
      INSERT INTO companies (
        id, name, code, company_type, address, phone, email, 
        tax_id, industry, base_currency, tenant_id, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;
    
    console.log('🔍 DEBUG: About to insert company...');
    const companyResult = await client.query(companyInsertQuery, [
      companyId,
      companyData.name,
      companyData.code,
      companyData.type || 'general',
      companyData.address || '',
      companyData.phone || '',
      companyData.email || '',
      companyData.tax_id || '',
      companyData.type || 'general', // industry field
      companyData.currency || 'USD',
      companyData.tenant_id || 1
    ]);
    
    const newCompany = companyResult.rows[0];
    console.log(`✅ Created company: ${newCompany.name} (ID: ${newCompany.id})`);
    
    // Create chart of accounts for the new company - completely bypass sequences
    const accountsCreated = [];
    
    console.log('🔍 DEBUG: About to query max account ID...');
    const maxIdQuery = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM accounts');
    const currentMaxId = maxIdQuery.rows[0].max_id;
    let baseId = currentMaxId + 50000; // Start with huge buffer to avoid any conflicts
    
    console.log(`🔍 DEBUG: Current MAX account ID in database: ${currentMaxId}`);
    console.log(`🔍 DEBUG: Starting account creation from ID: ${baseId}`);
    console.log(`🔍 DEBUG: Buffer gap: ${baseId - currentMaxId}`);
    console.log(`🔍 DEBUG: Will create ${DEFAULT_CHART_OF_ACCOUNTS.length} accounts`);
    
    // Create accounts with guaranteed unique IDs
    for (let i = 0; i < DEFAULT_CHART_OF_ACCOUNTS.length; i++) {
      const accountTemplate = DEFAULT_CHART_OF_ACCOUNTS[i];
      const accountId = baseId + i;
      
      console.log(`🔍 DEBUG: Creating account ${i + 1}/${DEFAULT_CHART_OF_ACCOUNTS.length}: ${accountTemplate.name} with ID ${accountId}`);
      
      try {
        const accountInsertQuery = `
          INSERT INTO accounts (
            id, company_id, code, name, account_type_id, 
            balance, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING *
        `;
        
        const accountResult = await client.query(accountInsertQuery, [
          accountId,
          companyId,
          accountTemplate.code,
          accountTemplate.name,
          1, // Using account_type_id instead of type_code
          0.00, // Initial balance
          true  // Active by default
        ]);
        
        accountsCreated.push(accountResult.rows[0]);
        console.log(`✅ Created account: ${accountTemplate.name} (ID: ${accountId})`);
        
      } catch (error) {
        console.error(`❌ Failed to create account ${accountTemplate.name} with ID ${accountId}:`, error.message);
        console.error(`❌ Error code: ${error.code}, Detail: ${error.detail}`);
        // Continue with other accounts even if one fails
      }
    }
    
    console.log(`🔍 DEBUG: Account creation loop completed. Created ${accountsCreated.length} accounts`);
    
    console.log(`✅ Created ${accountsCreated.length} accounts for company ${newCompany.name}`);
    
    console.log('🔍 DEBUG: About to commit transaction...');
    await client.query('COMMIT');
    
    return {
      company: newCompany,
      accounts: accountsCreated,
      message: `Successfully created company "${newCompany.name}" with ${accountsCreated.length} chart of accounts`
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating company with accounts:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Register company management API routes
 */
export function registerCompanyManagementAPI(app) {
  console.log('Registering company management API...');
  
  /**
   * @swagger
   * /api/companies:
   *   post:
   *     summary: Create a new company with chart of accounts
   *     description: Creates a new company along with a complete standard chart of accounts
   *     tags: [Company Management]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - code
   *             properties:
   *               name:
   *                 type: string
   *                 description: Company name
   *                 example: "New Manufacturing Corp"
   *               code:
   *                 type: string
   *                 description: Unique company code
   *                 example: "NEWMFG"
   *               type:
   *                 type: string
   *                 description: Company type
   *                 enum: [manufacturer, distributor, plant, general]
   *                 example: "manufacturer"
   *               address:
   *                 type: string
   *                 description: Company address
   *                 example: "123 Business St, City, State 12345"
   *               phone:
   *                 type: string
   *                 description: Company phone number
   *                 example: "+1-555-123-4567"
   *               email:
   *                 type: string
   *                 description: Company email
   *                 example: "contact@newmfg.com"
   *               tax_id:
   *                 type: string
   *                 description: Tax identification number
   *                 example: "12-3456789"
   *               registration_number:
   *                 type: string
   *                 description: Business registration number
   *                 example: "REG123456"
   *               currency:
   *                 type: string
   *                 description: Company currency
   *                 example: "USD"
   *               tenant_id:
   *                 type: integer
   *                 description: Tenant ID for multi-tenant setup
   *                 example: 1
   *     responses:
   *       201:
   *         description: Company created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 company:
   *                   type: object
   *                   description: Created company details
   *                 accounts:
   *                   type: array
   *                   description: Created chart of accounts
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                       code:
   *                         type: string
   *                       name:
   *                         type: string
   *                       type:
   *                         type: string
   *                       category:
   *                         type: string
   *                       balance:
   *                         type: number
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid request data
   *       500:
   *         description: Server error
   */
  app.post('/api/companies', async (req, res) => {
    try {
      console.log('📋 Creating new company with chart of accounts...');
      console.log('Company data:', req.body);
      
      // Validate required fields
      if (!req.body.name || !req.body.code) {
        return res.status(400).json({
          error: 'Company name and code are required'
        });
      }
      
      // Check if company code already exists
      const existingCompany = await externalPool.query(
        'SELECT id FROM companies WHERE code = $1',
        [req.body.code]
      );
      
      if (existingCompany.rows.length > 0) {
        return res.status(400).json({
          error: `Company with code "${req.body.code}" already exists`
        });
      }
      
      const result = await createCompanyWithAccounts(req.body);
      
      console.log(`✅ Successfully created company: ${result.company.name}`);
      console.log(`✅ Created ${result.accounts.length} chart of accounts entries`);
      
      res.status(201).json(result);
      
    } catch (error) {
      console.error('❌ Error creating company:', error);
      res.status(500).json({
        error: 'Failed to create company',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/companies/{id}/accounts:
   *   get:
   *     summary: Get chart of accounts for a company
   *     description: Retrieves the complete chart of accounts for a specific company
   *     tags: [Company Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID
   *     responses:
   *       200:
   *         description: Chart of accounts retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 company_id:
   *                   type: integer
   *                 accounts:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                       code:
   *                         type: string
   *                       name:
   *                         type: string
   *                       type:
   *                         type: string
   *                       category:
   *                         type: string
   *                       balance:
   *                         type: number
   *                 total_accounts:
   *                   type: integer
   *       404:
   *         description: Company not found
   */
  app.get('/api/companies/:id/accounts', async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      // Verify company exists
      const companyCheck = await externalPool.query(
        'SELECT name FROM companies WHERE id = $1',
        [companyId]
      );
      
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({
          error: `Company with ID ${companyId} not found`
        });
      }
      
      // Get chart of accounts
      const accountsResult = await externalPool.query(`
        SELECT id, code, name, type, category, balance, is_active, created_at, updated_at
        FROM accounts 
        WHERE company_id = $1 
        ORDER BY code
      `, [companyId]);
      
      console.log(`📊 Retrieved ${accountsResult.rows.length} accounts for company ${companyId}`);
      
      res.json({
        company_id: companyId,
        company_name: companyCheck.rows[0].name,
        accounts: accountsResult.rows,
        total_accounts: accountsResult.rows.length
      });
      
    } catch (error) {
      console.error('❌ Error retrieving company accounts:', error);
      res.status(500).json({
        error: 'Failed to retrieve company accounts',
        details: error.message
      });
    }
  });

  /**
   * @swagger
   * /api/companies/{id}:
   *   get:
   *     summary: Get company details
   *     description: Retrieves detailed information about a specific company
   *     tags: [Company Management]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Company ID
   *     responses:
   *       200:
   *         description: Company details retrieved successfully
   *       404:
   *         description: Company not found
   */
  app.get('/api/companies/:id', async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      const result = await pool.query(`
        SELECT * FROM companies WHERE id = $1
      `, [companyId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: `Company with ID ${companyId} not found`
        });
      }
      
      res.json(result.rows[0]);
      
    } catch (error) {
      console.error('❌ Error retrieving company:', error);
      res.status(500).json({
        error: 'Failed to retrieve company',
        details: error.message
      });
    }
  });
  
  console.log('✅ Company management API registered successfully');
}

export default { registerCompanyManagementAPI };