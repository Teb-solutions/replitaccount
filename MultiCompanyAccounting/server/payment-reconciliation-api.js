/**
 * Payment Reconciliation API
 * 
 * Comprehensive payment tracking and reconciliation
 * using existing working database connections
 */

import express from 'express';
import pg from 'pg';

// Direct database connection for payment reconciliation
const pool = new pg.Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123',
  ssl: false
});

const router = express.Router();

// Get comprehensive payment reconciliation for a company
router.get('/api/payment-reconciliation', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log(`💰 Getting payment reconciliation for company ${companyId}`);

    // Get cash account balance
    const cashQuery = `
      SELECT balance 
      FROM accounts 
      WHERE company_id = $1 AND name = 'Cash'
    `;
    
    const cashResult = await pool.query(cashQuery, [companyId]);
    const cashBalance = parseFloat(cashResult.rows[0]?.balance || 0);

    // Get invoice totals
    const invoiceQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_invoiced
      FROM invoices 
      WHERE company_id = $1
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [companyId]);
    const invoiceData = invoiceResult.rows[0];

    // Get bill totals  
    const billQuery = `
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(total), 0) as total_bills_amount
      FROM bills 
      WHERE company_id = $1
    `;
    
    const billResult = await pool.query(billQuery, [companyId]);
    const billData = billResult.rows[0];

    // Calculate expected cash flow based on authentic data
    const totalInvoiced = parseFloat(invoiceData.total_invoiced || 0);
    const totalBills = parseFloat(billData.total_bills_amount || 0);
    
    // Cash flow analysis
    const expectedPaymentsReceived = Math.abs(cashBalance + totalBills - totalInvoiced);
    const impliedPaymentsMade = totalBills + Math.abs(Math.min(cashBalance, 0));

    const reconciliation = {
      companyId: parseInt(companyId),
      cashBalance: cashBalance,
      invoiceData: {
        totalInvoices: parseInt(invoiceData.total_invoices || 0),
        totalAmount: totalInvoiced
      },
      billData: {
        totalBills: parseInt(billData.total_bills || 0),
        totalAmount: totalBills
      },
      paymentAnalysis: {
        estimatedPaymentsReceived: expectedPaymentsReceived,
        estimatedPaymentsMade: impliedPaymentsMade,
        netCashFlow: cashBalance,
        reconciliationStatus: cashBalance < 0 ? 'Payments exceed receipts' : 'Positive cash flow'
      }
    };

    console.log(`✅ Payment reconciliation complete for company ${companyId}`);
    console.log(`Cash balance: ${cashBalance}, Invoiced: ${totalInvoiced}, Bills: ${totalBills}`);
    
    res.json(reconciliation);

  } catch (error) {
    console.error('❌ Payment reconciliation API error:', error.message);
    res.status(500).json({ error: 'Failed to get payment reconciliation', details: error.message });
  }
});

// Get cash flow statement using authentic account data
router.get('/api/cash-flow-statement', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log(`📊 Getting cash flow statement for company ${companyId}`);

    // Get all relevant account balances
    const accountsQuery = `
      SELECT name, balance, account_type_id
      FROM accounts 
      WHERE company_id = $1 
      AND name IN ('Cash', 'Accounts Receivable', 'Accounts Payable', 'Sales', 'Purchases')
    `;
    
    const accountsResult = await pool.query(accountsQuery, [companyId]);
    const accounts = {};
    
    accountsResult.rows.forEach(row => {
      accounts[row.name] = parseFloat(row.balance || 0);
    });

    // Build cash flow statement from authentic data
    const cashFlow = {
      companyId: parseInt(companyId),
      operatingActivities: {
        cashFromCustomers: accounts['Sales'] || 0,
        cashToSuppliers: -(accounts['Purchases'] || 0),
        netOperatingCash: (accounts['Sales'] || 0) - (accounts['Purchases'] || 0)
      },
      accountBalances: accounts,
      currentCashPosition: accounts['Cash'] || 0,
      outstandingReceivables: accounts['Accounts Receivable'] || 0,
      outstandingPayables: accounts['Accounts Payable'] || 0
    };

    res.json(cashFlow);

  } catch (error) {
    console.error('❌ Cash flow statement API error:', error.message);
    res.status(500).json({ error: 'Failed to get cash flow statement', details: error.message });
  }
});

export { router as paymentReconciliationRouter };