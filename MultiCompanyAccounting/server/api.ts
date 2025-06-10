/**
 * Direct API Handlers
 * 
 * This file contains special handlers that bypass Vite's middleware
 * by using a different URL prefix (/direct-api/).
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Get tenant summary showing account receivables and payables for all companies
 */
export const getTenantSummary = async (req: Request, res: Response) => {
  try {
    // Set content type explicitly - ensure it's set correctly
    res.setHeader('Content-Type', 'application/json');
    res.type('json');
    
    // Check if user is authenticated
    const session = (req as any).session;
    if (!session || !session.user) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }
    
    // Get the tenant ID from the authenticated user
    const user = session.user;
    if (!user || !user.tenantId) {
      return res.status(400).json({
        error: "User must be associated with a tenant"
      });
    }
    
    const tenantId = user.tenantId;
    console.log(`Fetching tenant summary for tenant ID: ${tenantId}`);
    
    // Get all companies for this tenant
    const { rows: companies } = await pool.query(`
      SELECT id, name, code 
      FROM companies 
      WHERE tenant_id = $1
      ORDER BY name
    `, [tenantId]);
    
    console.log(`Found ${companies.length} companies for tenant ${tenantId}`);
    
    // For each company, get the receivables and payables
    const companySummaries = await Promise.all(companies.map(async (company) => {
      // Get receivables account (1100)
      const { rows: receivablesRows } = await pool.query(`
        SELECT balance::numeric 
        FROM accounts 
        WHERE company_id = $1 AND code = '1100'
      `, [company.id]);
      
      // Get payables account (2000)
      const { rows: payablesRows } = await pool.query(`
        SELECT balance::numeric 
        FROM accounts 
        WHERE company_id = $1 AND code = '2000'
      `, [company.id]);
      
      // Get count of pending invoices
      const { rows: pendingInvoicesRows } = await pool.query(`
        SELECT COUNT(*) as count 
        FROM invoices 
        WHERE company_id = $1 AND (status = 'open' OR status = 'partial')
      `, [company.id]);
      
      // Get count of pending bills
      const { rows: pendingBillsRows } = await pool.query(`
        SELECT COUNT(*) as count 
        FROM bills 
        WHERE company_id = $1 AND (status = 'open' OR status = 'partial')
      `, [company.id]);
      
      // Extract values with fallbacks
      const receivablesBalance = receivablesRows.length > 0 ? parseFloat(receivablesRows[0].balance) : 0;
      const payablesBalance = payablesRows.length > 0 ? parseFloat(payablesRows[0].balance) : 0;
      const pendingInvoicesCount = pendingInvoicesRows.length > 0 ? parseInt(pendingInvoicesRows[0].count) : 0;
      const pendingBillsCount = pendingBillsRows.length > 0 ? parseInt(pendingBillsRows[0].count) : 0;
      
      return {
        id: company.id,
        name: company.name,
        code: company.code,
        receivables: {
          amount: receivablesBalance,
          count: pendingInvoicesCount
        },
        payables: {
          amount: payablesBalance,
          count: pendingBillsCount
        },
        netPosition: receivablesBalance - payablesBalance
      };
    }));
    
    // Calculate tenant totals
    const totalReceivables = companySummaries.reduce((sum, company) => sum + company.receivables.amount, 0);
    const totalPayables = companySummaries.reduce((sum, company) => sum + company.payables.amount, 0);
    const totalNetPosition = totalReceivables - totalPayables;
    
    const tenantSummary = {
      tenantId,
      tenantName: user.tenantName,
      companies: companySummaries,
      totals: {
        receivables: totalReceivables,
        payables: totalPayables,
        netPosition: totalNetPosition
      },
      asOfDate: new Date().toISOString()
    };
    
    res.json(tenantSummary);
  } catch (error) {
    console.error("Error generating tenant summary:", error);
    res.status(500).json({ error: "Failed to generate tenant summary" });
  }
};