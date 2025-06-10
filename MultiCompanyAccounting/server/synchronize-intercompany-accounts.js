/**
 * Intercompany Account Synchronization
 * 
 * This module provides functions to ensure that intercompany accounts
 * remain in balance between related companies.
 */

import pg from 'pg';

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  host: '135.235.154.222',
  port: 5432,
  database: 'account_replit_staging',
  user: 'pguser',
  password: 'StrongP@ss123'
});

/**
 * Synchronize accounts receivable and accounts payable between two companies
 * 
 * @param {number} sourceCompanyId - The ID of the source company (with AR)
 * @param {number} targetCompanyId - The ID of the target company (with AP)
 * @param {number} amount - The amount of the transaction
 * @param {string} referenceNumber - The reference number for the transaction
 * @returns {Promise<boolean>} - True if successful
 */
export async function synchronizeARandAP(sourceCompanyId, targetCompanyId, amount, referenceNumber) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get AR account for source company
    const arQuery = 'SELECT id FROM accounts WHERE company_id = $1 AND code = $2';
    const arResult = await client.query(arQuery, [sourceCompanyId, '1100']);
    
    if (arResult.rows.length === 0) {
      throw new Error(`Accounts Receivable account not found for company ${sourceCompanyId}`);
    }
    
    const arAccountId = arResult.rows[0].id;
    
    // 2. Get AP account for target company
    const apQuery = 'SELECT id FROM accounts WHERE company_id = $1 AND code = $2';
    const apResult = await client.query(apQuery, [targetCompanyId, '2000']);
    
    if (apResult.rows.length === 0) {
      throw new Error(`Accounts Payable account not found for company ${targetCompanyId}`);
    }
    
    const apAccountId = apResult.rows[0].id;
    
    // 3. Create journal entry for source company (debit AR, credit Revenue)
    const sourceJEQuery = `
      INSERT INTO journal_entries (company_id, entry_date, reference_number, description)
      VALUES ($1, CURRENT_DATE, $2, $3)
      RETURNING id
    `;
    
    const sourceJEResult = await client.query(sourceJEQuery, [
      sourceCompanyId,
      referenceNumber,
      `Intercompany sale to company ${targetCompanyId}`
    ]);
    
    const sourceJEId = sourceJEResult.rows[0].id;
    
    // 4. Get revenue account for source company
    const revenueQuery = 'SELECT id FROM accounts WHERE company_id = $1 AND code = $2';
    const revenueResult = await client.query(revenueQuery, [sourceCompanyId, '4000']);
    
    if (revenueResult.rows.length === 0) {
      throw new Error(`Revenue account not found for company ${sourceCompanyId}`);
    }
    
    const revenueAccountId = revenueResult.rows[0].id;
    
    // 5. Create journal entry items for source company
    await client.query(`
      INSERT INTO journal_entry_items (id, journal_entry_id, account_id, debit_amount, credit_amount, description)
      VALUES 
        (nextval('journal_entry_items_id_seq'), $1, $2, $3, 0, $4),
        (nextval('journal_entry_items_id_seq'), $1, $5, 0, $6, $7)
    `, [
      sourceJEId,
      arAccountId,
      amount,
      `AR from company ${targetCompanyId}`,
      revenueAccountId,
      amount,
      `Revenue from intercompany sale to ${targetCompanyId}`
    ]);
    
    // 6. Create journal entry for target company (debit Inventory, credit AP)
    const targetJEQuery = `
      INSERT INTO journal_entries (company_id, entry_date, reference_number, description)
      VALUES ($1, CURRENT_DATE, $2, $3)
      RETURNING id
    `;
    
    const targetJEResult = await client.query(targetJEQuery, [
      targetCompanyId,
      referenceNumber,
      `Intercompany purchase from company ${sourceCompanyId}`
    ]);
    
    const targetJEId = targetJEResult.rows[0].id;
    
    // 7. Get inventory account for target company
    const inventoryQuery = 'SELECT id FROM accounts WHERE company_id = $1 AND code = $2';
    const inventoryResult = await client.query(inventoryQuery, [targetCompanyId, '1200']);
    
    if (inventoryResult.rows.length === 0) {
      throw new Error(`Inventory account not found for company ${targetCompanyId}`);
    }
    
    const inventoryAccountId = inventoryResult.rows[0].id;
    
    // 8. Create journal entry items for target company
    await client.query(`
      INSERT INTO journal_entry_items (id, journal_entry_id, account_id, debit_amount, credit_amount, description)
      VALUES 
        (nextval('journal_entry_items_id_seq'), $1, $2, $3, 0, $4),
        (nextval('journal_entry_items_id_seq'), $1, $5, 0, $6, $7)
    `, [
      targetJEId,
      inventoryAccountId,
      amount,
      `Inventory from company ${sourceCompanyId}`,
      apAccountId,
      amount,
      `AP to company ${sourceCompanyId}`
    ]);
    
    // 9. Update account balances
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, arAccountId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, apAccountId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, revenueAccountId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, inventoryAccountId]);
    
    await client.query('COMMIT');
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error synchronizing AR/AP accounts:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Fix the AR/AP mismatch between Gas Manufacturing and Gas Distributor companies
 * 
 * @returns {Promise<boolean>} - True if successful
 */
export async function fixGasCompaniesAccountingMismatch() {
  const GAS_MANUFACTURING_ID = 7;
  const GAS_DISTRIBUTOR_ID = 8;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get AR balance for Gas Manufacturing
    const arQuery = 'SELECT id, balance FROM accounts WHERE company_id = $1 AND code = $2';
    const arResult = await client.query(arQuery, [GAS_MANUFACTURING_ID, '1100']);
    
    if (arResult.rows.length === 0) {
      throw new Error(`Accounts Receivable account not found for Gas Manufacturing (ID: ${GAS_MANUFACTURING_ID})`);
    }
    
    const arAccountId = arResult.rows[0].id;
    const arBalance = parseFloat(arResult.rows[0].balance);
    
    // 2. Get AP account for Gas Distributor
    const apQuery = 'SELECT id, balance FROM accounts WHERE company_id = $1 AND code = $2';
    const apResult = await client.query(apQuery, [GAS_DISTRIBUTOR_ID, '2000']);
    
    if (apResult.rows.length === 0) {
      throw new Error(`Accounts Payable account not found for Gas Distributor (ID: ${GAS_DISTRIBUTOR_ID})`);
    }
    
    const apAccountId = apResult.rows[0].id;
    const apBalance = parseFloat(apResult.rows[0].balance);
    
    // Calculate the difference
    const difference = arBalance - apBalance;
    
    if (Math.abs(difference) < 0.01) {
      console.log('No significant difference found, accounts are already balanced.');
      await client.query('COMMIT');
      return true;
    }
    
    console.log(`Found difference of $${difference.toFixed(2)} between AR and AP accounts.`);
    
    // 3. Get inventory account for Gas Distributor
    const inventoryQuery = 'SELECT id FROM accounts WHERE company_id = $1 AND code = $2';
    const inventoryResult = await client.query(inventoryQuery, [GAS_DISTRIBUTOR_ID, '1200']);
    
    if (inventoryResult.rows.length === 0) {
      throw new Error(`Inventory account not found for Gas Distributor (ID: ${GAS_DISTRIBUTOR_ID})`);
    }
    
    const inventoryAccountId = inventoryResult.rows[0].id;
    
    // 4. Create adjustment journal entry for Gas Distributor
    const refNumber = `SYNC-AP-${Date.now()}`;
    const jeQuery = `
      INSERT INTO journal_entries (company_id, entry_date, reference_number, description)
      VALUES ($1, CURRENT_DATE, $2, $3)
      RETURNING id
    `;
    
    const jeResult = await client.query(jeQuery, [
      GAS_DISTRIBUTOR_ID,
      refNumber,
      'Adjustment to synchronize intercompany AP with AR'
    ]);
    
    const journalEntryId = jeResult.rows[0].id;
    
    // 5. Create journal entry items
    await client.query(`
      INSERT INTO journal_entry_items (id, journal_entry_id, account_id, debit_amount, credit_amount, description)
      VALUES 
        (nextval('journal_entry_items_id_seq'), $1, $2, $3, 0, $4),
        (nextval('journal_entry_items_id_seq'), $1, $5, 0, $6, $7)
    `, [
      journalEntryId,
      inventoryAccountId,
      difference,
      'Adjustment to inventory for balance synchronization',
      apAccountId, 
      difference,
      'Adjustment to AP for intercompany balance synchronization'
    ]);
    
    // 6. Update AP balance to match AR balance
    await client.query('UPDATE accounts SET balance = $1 WHERE id = $2', [arBalance, apAccountId]);
    
    // 7. Update inventory balance
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [difference, inventoryAccountId]);
    
    console.log(`Successfully adjusted Gas Distributor AP balance to $${arBalance.toFixed(2)}`);
    
    await client.query('COMMIT');
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing Gas companies accounting mismatch:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default {
  synchronizeARandAP,
  fixGasCompaniesAccountingMismatch
};