/**
 * Bill Journal Entry Helper
 * 
 * This module provides functions to create and update journal entries
 * for bills to ensure they're properly reflected in the chart of accounts
 */

const { models } = require('../models');
const { JournalEntry, JournalEntryItem } = models;

/**
 * Create journal entries for a bill
 * @param {Object} bill - The bill object
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<Object>} - Created journal entry
 */
async function createBillJournalEntries(bill, transaction) {
  try {
    console.log(`Creating journal entries for bill ${bill.billNumber}`);
    
    // Get account IDs for AP and expense
    const apAccountId = await getAccountIdByCode(bill.companyId, '2000'); // Accounts Payable
    const expenseAccountId = await getAccountIdByCode(bill.companyId, '5000'); // Expense Account
    
    if (!apAccountId || !expenseAccountId) {
      console.error('Missing required accounts for bill journaling');
      return null;
    }
    
    // Create the journal entry
    const journalEntry = await JournalEntry.create({
      companyId: bill.companyId,
      entryNumber: `JE-BILL-${bill.id}`,
      entryDate: bill.billDate,
      reference: bill.billNumber,
      description: `Bill for ${bill.description || 'goods/services'}`,
      amount: bill.total,
      entryType: 'system_generated',
      status: 'posted',
      postedAt: new Date()
    }, { transaction });
    
    // Create the journal entry items
    const journalItems = await Promise.all([
      // Debit Expense (increase expense)
      JournalEntryItem.create({
        journalEntryId: journalEntry.id,
        accountId: expenseAccountId,
        description: `Expense for bill ${bill.billNumber}`,
        debit: parseFloat(bill.total),
        credit: 0,
        reference: bill.billNumber
      }, { transaction }),
      
      // Credit Accounts Payable (increase liability)
      JournalEntryItem.create({
        journalEntryId: journalEntry.id,
        accountId: apAccountId,
        description: `Payable for bill ${bill.billNumber}`,
        debit: 0,
        credit: parseFloat(bill.total),
        reference: bill.billNumber
      }, { transaction })
    ]);
    
    console.log(`Successfully created journal entry ID ${journalEntry.id} for bill ${bill.billNumber}`);
    
    // Update the bill with the journal entry ID
    await bill.update({
      journalEntryId: journalEntry.id
    }, { transaction });
    
    return journalEntry;
  } catch (error) {
    console.error('Error creating bill journal entries:', error);
    throw error;
  }
}

/**
 * Create journal entries for bill payment
 * @param {Object} payment - The payment object
 * @param {Object} bill - The bill being paid
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<Object>} - Created journal entry
 */
async function createBillPaymentJournalEntries(payment, bill, transaction) {
  try {
    console.log(`Creating journal entries for bill payment ${payment.id}`);
    
    // Get account IDs for Cash and AP
    const cashAccountId = await getAccountIdByCode(bill.companyId, '1000'); // Cash
    const apAccountId = await getAccountIdByCode(bill.companyId, '2000'); // Accounts Payable
    
    if (!cashAccountId || !apAccountId) {
      console.error('Missing required accounts for bill payment journaling');
      return null;
    }
    
    // Create the journal entry
    const journalEntry = await JournalEntry.create({
      companyId: bill.companyId,
      entryNumber: `JE-BILLPAY-${payment.id}`,
      entryDate: payment.paymentDate,
      reference: bill.billNumber,
      description: `Payment for bill ${bill.billNumber}`,
      amount: payment.amount,
      entryType: 'system_generated',
      status: 'posted',
      postedAt: new Date()
    }, { transaction });
    
    // Create the journal entry items
    const journalItems = await Promise.all([
      // Debit Accounts Payable (decrease liability)
      JournalEntryItem.create({
        journalEntryId: journalEntry.id,
        accountId: apAccountId,
        description: `Payable reduction for bill ${bill.billNumber}`,
        debit: parseFloat(payment.amount),
        credit: 0,
        reference: bill.billNumber
      }, { transaction }),
      
      // Credit Cash (decrease asset)
      JournalEntryItem.create({
        journalEntryId: journalEntry.id,
        accountId: cashAccountId,
        description: `Cash payment for bill ${bill.billNumber}`,
        debit: 0,
        credit: parseFloat(payment.amount),
        reference: bill.billNumber
      }, { transaction })
    ]);
    
    console.log(`Successfully created payment journal entry ID ${journalEntry.id} for bill ${bill.billNumber}`);
    
    // Update the payment with the journal entry ID
    await payment.update({
      journalEntryId: journalEntry.id
    }, { transaction });
    
    return journalEntry;
  } catch (error) {
    console.error('Error creating bill payment journal entries:', error);
    throw error;
  }
}

/**
 * Helper function to get account ID by code
 * @param {number} companyId - Company ID
 * @param {string} accountCode - Account code
 * @returns {Promise<number|null>} - Account ID or null if not found
 */
async function getAccountIdByCode(companyId, accountCode) {
  try {
    const { Account } = models;
    const account = await Account.findOne({
      where: {
        companyId,
        code: accountCode
      }
    });
    
    return account ? account.id : null;
  } catch (error) {
    console.error(`Error finding account with code ${accountCode} for company ${companyId}:`, error);
    return null;
  }
}

module.exports = {
  createBillJournalEntries,
  createBillPaymentJournalEntries
};