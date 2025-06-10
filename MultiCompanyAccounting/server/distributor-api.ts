import express from 'express';
import db from './db-config.js';
import { logger } from './simple-logger';

const pool = db.pool;
const router = express.Router();

// Middleware to check user role and company access
const checkCompanyAccess = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.headers['user-id'];
    const companyId = req.params.id || req.query.companyId;
    const companyType = req.query.companyType;
    
    // If no user ID provided, default to access for testing
    if (!userId) {
      logger.warn('No user ID provided, using test access');
      req.userRole = 'admin';
      req.userCompanyAccess = true;
      return next();
    }
    
    // Get user role and permissions
    const userResult = await pool.query(`
      SELECT role, company_id FROM users WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      logger.warn(`User not found with ID: ${userId}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = userResult.rows[0];
    req.userRole = user.role;
    
    // Admin users have access to all companies
    if (user.role === 'admin') {
      logger.info(`Admin user ${userId} granted access to company ${companyId}`);
      req.userCompanyAccess = true;
      return next();
    }
    
    // Company-specific role checks
    if (companyId) {
      // Check if user has access to this company
      const companyAccess = user.company_id === parseInt(companyId);
      
      if (!companyAccess) {
        logger.warn(`User ${userId} denied access to company ${companyId}`);
        return res.status(403).json({ error: 'Forbidden: No access to this company' });
      }
      
      // If company type is specified, verify it matches
      if (companyType) {
        const companyTypeResult = await pool.query(`
          SELECT company_type FROM companies WHERE id = $1
        `, [companyId]);
        
        if (companyTypeResult.rows.length === 0 || 
            companyTypeResult.rows[0].company_type !== companyType) {
          logger.warn(`Company ${companyId} is not of type ${companyType}`);
          return res.status(403).json({ error: `Forbidden: Not a ${companyType} company` });
        }
      }
      
      logger.info(`User ${userId} granted access to company ${companyId}`);
      req.userCompanyAccess = true;
      return next();
    }
    
    // No specific company requested, allow access
    req.userCompanyAccess = true;
    return next();
  } catch (error) {
    logger.error(`Access check error: ${error.message}`, { error });
    return res.status(500).json({ error: 'Internal server error during access check' });
  }
};

/**
 * @swagger
 * tags:
 *   name: Distributors
 *   description: API endpoints for managing distributors
 */

/**
 * @swagger
 * /api/distributors:
 *   get:
 *     summary: Get all distributors
 *     tags: [Distributors]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: User ID for access control
 *       - in: query
 *         name: companyType
 *         schema:
 *           type: string
 *           enum: [distributor, manufacturer, plant]
 *         description: Filter by company type
 *     responses:
 *       200:
 *         description: A list of all distributors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   code:
 *                     type: string
 *                   address:
 *                     type: string
 *                   companyType:
 *                     type: string
 *       401:
 *         description: Unauthorized - Invalid or missing user credentials
 *       403:
 *         description: Forbidden - User does not have access to this resource
 *       500:
 *         description: Server error
 */
router.get('/api/distributors', checkCompanyAccess, async (req, res) => {
  try {
    logger.info('Fetching all distributors');
    
    const result = await pool.query(`
      SELECT id, name, company_code as code, address, company_type as "companyType"
      FROM companies
      WHERE company_type = 'distributor'
      ORDER BY name ASC
    `);
    
    logger.info(`Successfully found ${result.rows.length} distributors`);
    return res.json(result.rows);
  } catch (error: any) {
    logger.error(`Error fetching distributors: ${error.message}`, { error });
    return res.status(500).json({ error: 'Failed to retrieve distributors' });
  }
});

/**
 * @swagger
 * /api/distributors/{id}:
 *   get:
 *     summary: Get a distributor by ID
 *     tags: [Distributors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The distributor ID
 *     responses:
 *       200:
 *         description: Detailed distributor information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 code:
 *                   type: string
 *                 address:
 *                   type: string
 *                 companyType:
 *                   type: string
 *                 financialSummary:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                     totalExpenses:
 *                       type: number
 *                     receivables:
 *                       type: number
 *                     payables:
 *                       type: number
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Server error
 */
router.get('/api/distributors/:id', async (req, res) => {
  const distributorId = req.params.id;
  
  try {
    logger.info(`Fetching distributor details for ID: ${distributorId}`);
    
    // Get basic company info
    const companyResult = await pool.query(`
      SELECT id, name, company_code as code, address, company_type as "companyType"
      FROM companies
      WHERE id = $1 AND company_type = 'distributor'
    `, [distributorId]);
    
    if (companyResult.rows.length === 0) {
      logger.warn(`Distributor not found with ID: ${distributorId}`);
      return res.status(404).json({ error: 'Distributor not found' });
    }
    
    const company = companyResult.rows[0];
    
    // Get financial summary
    const financialSummary = await getDistributorFinancialSummary(distributorId);
    
    // Get account balances
    const accountBalances = await getDistributorAccountBalances(distributorId);
    
    // Get recent orders
    const recentOrders = await getDistributorRecentOrders(distributorId);
    
    const response = {
      ...company,
      financialSummary,
      accountBalances,
      recentOrders
    };
    
    logger.info(`Successfully retrieved distributor details for ID: ${distributorId}`);
    return res.json(response);
  } catch (error: any) {
    logger.error(`Error fetching distributor details: ${error.message}`, { error, distributorId });
    return res.status(500).json({ error: 'Failed to retrieve distributor details' });
  }
});

/**
 * @swagger
 * /api/distributors/{id}/accounts:
 *   get:
 *     summary: Get all accounts for a distributor
 *     tags: [Distributors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The distributor ID
 *     responses:
 *       200:
 *         description: A list of distributor accounts with balances
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Server error
 */
router.get('/api/distributors/:id/accounts', async (req, res) => {
  const distributorId = req.params.id;
  
  try {
    logger.info(`Fetching accounts for distributor ID: ${distributorId}`);
    
    // Verify this is a distributor
    const companyCheck = await pool.query(`
      SELECT id FROM companies 
      WHERE id = $1 AND company_type = 'distributor'
    `, [distributorId]);
    
    if (companyCheck.rows.length === 0) {
      logger.warn(`Distributor not found with ID: ${distributorId}`);
      return res.status(404).json({ error: 'Distributor not found' });
    }
    
    const accounts = await pool.query(`
      SELECT a.id, a.code, a.name, a.description, a.account_type as "accountType", 
             a.balance, a.is_intercompany as "isIntercompany"
      FROM accounts a
      WHERE a.company_id = $1
      ORDER BY a.code ASC
    `, [distributorId]);
    
    logger.info(`Found ${accounts.rows.length} accounts for distributor ID: ${distributorId}`);
    return res.json(accounts.rows);
  } catch (error: any) {
    logger.error(`Error fetching distributor accounts: ${error.message}`, { error, distributorId });
    return res.status(500).json({ error: 'Failed to retrieve distributor accounts' });
  }
});

/**
 * @swagger
 * /api/distributors/{id}/orders:
 *   get:
 *     summary: Get all orders for a distributor
 *     tags: [Distributors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The distributor ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sales, purchase, all]
 *         description: Type of orders to retrieve (default is 'all')
 *     responses:
 *       200:
 *         description: A list of distributor orders
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Server error
 */
router.get('/api/distributors/:id/orders', async (req, res) => {
  const distributorId = req.params.id;
  const orderType = req.query.type || 'all';
  
  try {
    logger.info(`Fetching ${orderType} orders for distributor ID: ${distributorId}`);
    
    // Verify this is a distributor
    const companyCheck = await pool.query(`
      SELECT id FROM companies 
      WHERE id = $1 AND company_type = 'distributor'
    `, [distributorId]);
    
    if (companyCheck.rows.length === 0) {
      logger.warn(`Distributor not found with ID: ${distributorId}`);
      return res.status(404).json({ error: 'Distributor not found' });
    }
    
    let orders = [];
    
    // Get sales orders if requested
    if (orderType === 'all' || orderType === 'sales') {
      const salesOrders = await pool.query(`
        SELECT so.id, so.order_number as "orderNumber", 
               so.order_date as "date", 
               so.total_amount as "amount",
               so.status,
               c.name as "customerName"
        FROM sales_orders so
        JOIN companies c ON so.customer_id = c.id
        WHERE so.company_id = $1
        ORDER BY so.order_date DESC
      `, [distributorId]);
      
      orders = [...orders, ...salesOrders.rows.map(order => ({...order, type: 'sales'}))];
    }
    
    // Get purchase orders if requested
    if (orderType === 'all' || orderType === 'purchase') {
      const purchaseOrders = await pool.query(`
        SELECT po.id, po.order_number as "orderNumber", 
               po.order_date as "date", 
               po.total_amount as "amount",
               po.status,
               c.name as "vendorName"
        FROM purchase_orders po
        JOIN companies c ON po.vendor_id = c.id
        WHERE po.company_id = $1
        ORDER BY po.order_date DESC
      `, [distributorId]);
      
      orders = [...orders, ...purchaseOrders.rows.map(order => ({...order, type: 'purchase'}))];
    }
    
    logger.info(`Found ${orders.length} ${orderType} orders for distributor ID: ${distributorId}`);
    return res.json(orders);
  } catch (error: any) {
    logger.error(`Error fetching distributor orders: ${error.message}`, { error, distributorId });
    return res.status(500).json({ error: 'Failed to retrieve distributor orders' });
  }
});

/**
 * @swagger
 * /api/distributors/{id}/intercompany:
 *   get:
 *     summary: Get intercompany transactions for a distributor
 *     tags: [Distributors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The distributor ID
 *     responses:
 *       200:
 *         description: A list of intercompany transactions
 *       404:
 *         description: Distributor not found
 *       500:
 *         description: Server error
 */
router.get('/api/distributors/:id/intercompany', async (req, res) => {
  const distributorId = req.params.id;
  
  try {
    logger.info(`Fetching intercompany transactions for distributor ID: ${distributorId}`);
    
    // Verify this is a distributor
    const companyCheck = await pool.query(`
      SELECT id FROM companies 
      WHERE id = $1 AND company_type = 'distributor'
    `, [distributorId]);
    
    if (companyCheck.rows.length === 0) {
      logger.warn(`Distributor not found with ID: ${distributorId}`);
      return res.status(404).json({ error: 'Distributor not found' });
    }
    
    // Get all intercompany transactions where this distributor is either source or target
    const transactions = await pool.query(`
      SELECT t.id, t.transaction_date as "date", t.amount, t.status, t.payment_status as "paymentStatus",
             source.name as "sourceCompanyName", target.name as "targetCompanyName",
             CASE WHEN t.source_company_id = $1 THEN 'outgoing' ELSE 'incoming' END as "direction"
      FROM intercompany_transactions t
      JOIN companies source ON t.source_company_id = source.id
      JOIN companies target ON t.target_company_id = target.id
      WHERE t.source_company_id = $1 OR t.target_company_id = $1
      ORDER BY t.transaction_date DESC
    `, [distributorId]);
    
    logger.info(`Found ${transactions.rows.length} intercompany transactions for distributor ID: ${distributorId}`);
    return res.json(transactions.rows);
  } catch (error: any) {
    logger.error(`Error fetching distributor intercompany transactions: ${error.message}`, { error, distributorId });
    return res.status(500).json({ error: 'Failed to retrieve distributor intercompany transactions' });
  }
});

// Helper functions
async function getDistributorFinancialSummary(distributorId: string | number) {
  try {
    // Get revenue (from sales orders)
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM sales_orders
      WHERE company_id = $1 AND status = 'Completed'
    `, [distributorId]);
    
    // Get expenses (from purchase orders and other expenses)
    const expensesResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as expenses
      FROM purchase_orders
      WHERE company_id = $1 AND status = 'Completed'
    `, [distributorId]);
    
    // Get accounts receivable
    const receivablesResult = await pool.query(`
      SELECT COALESCE(balance, 0) as receivables
      FROM accounts
      WHERE company_id = $1 AND code = '1100' -- Accounts Receivable account
    `, [distributorId]);
    
    // Get accounts payable
    const payablesResult = await pool.query(`
      SELECT COALESCE(balance, 0) as payables
      FROM accounts
      WHERE company_id = $1 AND code = '2000' -- Accounts Payable account
    `, [distributorId]);
    
    return {
      totalRevenue: parseFloat(revenueResult.rows[0]?.revenue || '0'),
      totalExpenses: parseFloat(expensesResult.rows[0]?.expenses || '0'),
      receivables: parseFloat(receivablesResult.rows[0]?.receivables || '0'),
      payables: parseFloat(payablesResult.rows[0]?.payables || '0')
    };
  } catch (error: any) {
    logger.error(`Error getting distributor financial summary: ${error.message}`, { error, distributorId });
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      receivables: 0,
      payables: 0
    };
  }
}

async function getDistributorAccountBalances(distributorId: string | number) {
  try {
    // Get cash balance
    const cashResult = await pool.query(`
      SELECT COALESCE(balance, 0) as balance
      FROM accounts
      WHERE company_id = $1 AND code = '1000' -- Cash account
    `, [distributorId]);
    
    // Get receivables balance
    const receivablesResult = await pool.query(`
      SELECT COALESCE(balance, 0) as balance
      FROM accounts
      WHERE company_id = $1 AND code = '1100' -- Accounts Receivable account
    `, [distributorId]);
    
    // Get payables balance
    const payablesResult = await pool.query(`
      SELECT COALESCE(balance, 0) as balance
      FROM accounts
      WHERE company_id = $1 AND code = '2000' -- Accounts Payable account
    `, [distributorId]);
    
    // Get intercompany receivables balance
    const intercompanyReceivablesResult = await pool.query(`
      SELECT COALESCE(balance, 0) as balance
      FROM accounts
      WHERE company_id = $1 AND code = '1150' -- Intercompany Receivables account
    `, [distributorId]);
    
    // Get intercompany payables balance
    const intercompanyPayablesResult = await pool.query(`
      SELECT COALESCE(balance, 0) as balance
      FROM accounts
      WHERE company_id = $1 AND code = '2100' -- Intercompany Payables account
    `, [distributorId]);
    
    return {
      cash: parseFloat(cashResult.rows[0]?.balance || '0'),
      receivables: parseFloat(receivablesResult.rows[0]?.balance || '0'),
      payables: parseFloat(payablesResult.rows[0]?.balance || '0'),
      intercompanyReceivables: parseFloat(intercompanyReceivablesResult.rows[0]?.balance || '0'),
      intercompanyPayables: parseFloat(intercompanyPayablesResult.rows[0]?.balance || '0')
    };
  } catch (error: any) {
    logger.error(`Error getting distributor account balances: ${error.message}`, { error, distributorId });
    return {
      cash: 0,
      receivables: 0,
      payables: 0,
      intercompanyReceivables: 0,
      intercompanyPayables: 0
    };
  }
}

async function getDistributorRecentOrders(distributorId: string | number) {
  try {
    // Get recent sales orders
    const salesOrdersResult = await pool.query(`
      SELECT id, order_number as "orderNumber", order_date as "date", 
             total_amount as "amount", status, 'sales' as "type"
      FROM sales_orders
      WHERE company_id = $1
      ORDER BY order_date DESC
      LIMIT 5
    `, [distributorId]);
    
    // Get recent purchase orders
    const purchaseOrdersResult = await pool.query(`
      SELECT id, order_number as "orderNumber", order_date as "date", 
             total_amount as "amount", status, 'purchase' as "type"
      FROM purchase_orders
      WHERE company_id = $1
      ORDER BY order_date DESC
      LIMIT 5
    `, [distributorId]);
    
    // Combine and sort by date
    const allOrders = [
      ...salesOrdersResult.rows,
      ...purchaseOrdersResult.rows
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 5);
    
    return allOrders;
  } catch (error: any) {
    logger.error(`Error getting distributor recent orders: ${error.message}`, { error, distributorId });
    return [];
  }
}

console.log('Registering distributor API...');
export default router;