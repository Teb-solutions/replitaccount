import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, asc, gte, lte, like, isNull, or, sql, InferInsertModel, inArray } from "drizzle-orm";
import { hash, verify, generateDocumentNumber } from "./utils";
import { Request as ExpressRequest } from "express";

// Auth
export async function createUser(userData: schema.UserInsert) {
  const hashedPassword = await hash(userData.password);
  
  const [user] = await db.insert(schema.users)
    .values({
      ...userData,
      password: hashedPassword
    })
    .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role });
  
  return user;
}

export async function registerUserWithTenant(
  data: schema.RegisterCredentials
): Promise<{ user: { id: number, email: string, name: string }; tenant: { id: number, name: string } }> {
  // Create tenant
  const [tenant] = await db.insert(schema.tenants)
    .values({
      name: data.tenantName,
      subdomain: data.subdomain,
      planType: "standard",
      isActive: true
    })
    .returning();
  
  // Create user with admin role
  const hashedPassword = await hash(data.password);
  
  const [user] = await db.insert(schema.users)
    .values({
      tenantId: tenant.id,
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "admin",
      isActive: true
    })
    .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email });
  
  return { user, tenant };
}

export async function authenticateUser(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
    with: {
      tenant: true
    }
  });
  
  if (!user) {
    return null;
  }
  
  const isPasswordValid = await verify(user.password, password);
  
  if (!isPasswordValid) {
    return null;
  }
  
  // Remove password from the returned user
  const { password: _, ...userWithoutPassword } = user;
  
  return userWithoutPassword;
}

export async function getUserById(id: number) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      isActive: true
    },
    with: {
      tenant: {
        columns: {
          id: true,
          name: true,
          subdomain: true,
          planType: true
        }
      }
    }
  });
  
  return user;
}

// Tenants
export async function getTenantById(id: number) {
  return db.query.tenants.findFirst({
    where: eq(schema.tenants.id, id)
  });
}

export async function updateTenant(id: number, data: Partial<schema.TenantInsert>) {
  const [updatedTenant] = await db.update(schema.tenants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.tenants.id, id))
    .returning();
  
  return updatedTenant;
}

// Companies
export async function getCompaniesByTenantId(tenantId: number) {
  return db.query.companies.findMany({
    where: eq(schema.companies.tenantId, tenantId),
    orderBy: asc(schema.companies.name)
  });
}

export async function getCompanyById(id: number) {
  return db.query.companies.findFirst({
    where: eq(schema.companies.id, id)
  });
}

export async function createCompany(companyData: schema.CompanyInsert) {
  const [company] = await db.insert(schema.companies)
    .values(companyData)
    .returning();
  
  // Create default chart of accounts for this company
  const accountTypes = await db.query.accountTypes.findMany();
  
  if (accountTypes.length > 0) {
    // Create root accounts
    const assetType = accountTypes.find(at => at.code === "ASSET");
    const liabilityType = accountTypes.find(at => at.code === "LIABILITY");
    const equityType = accountTypes.find(at => at.code === "EQUITY");
    const revenueType = accountTypes.find(at => at.code === "REVENUE");
    const expenseType = accountTypes.find(at => at.code === "EXPENSE");
    
    if (assetType && liabilityType && equityType && revenueType && expenseType) {
      // Create parent accounts
      const parents = [
        { 
          companyId: company.id, 
          accountTypeId: assetType.id, 
          code: "1000", 
          name: "Assets", 
          level: 1,
          parentId: null 
        },
        { 
          companyId: company.id, 
          accountTypeId: liabilityType.id, 
          code: "2000", 
          name: "Liabilities", 
          level: 1,
          parentId: null 
        },
        { 
          companyId: company.id, 
          accountTypeId: equityType.id, 
          code: "3000", 
          name: "Equity", 
          level: 1,
          parentId: null 
        },
        { 
          companyId: company.id, 
          accountTypeId: revenueType.id, 
          code: "4000", 
          name: "Revenue", 
          level: 1,
          parentId: null 
        },
        { 
          companyId: company.id, 
          accountTypeId: expenseType.id, 
          code: "5000", 
          name: "Expenses", 
          level: 1,
          parentId: null 
        }
      ];
      
      await db.insert(schema.accounts).values(parents);
    }
  }
  
  return company;
}

export async function updateCompany(id: number, data: Partial<schema.CompanyInsert>) {
  const [updatedCompany] = await db.update(schema.companies)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.companies.id, id))
    .returning();
  
  return updatedCompany;
}

// Account Types
export async function getAccountTypes() {
  return db.query.accountTypes.findMany({
    orderBy: asc(schema.accountTypes.id)
  });
}

// Chart of Accounts
export async function getAccountsByCompanyId(companyId: number) {
  return db.query.accounts.findMany({
    where: eq(schema.accounts.companyId, companyId),
    with: {
      accountType: true,
      parent: true
    },
    orderBy: asc(schema.accounts.code)
  });
}

export async function getAccountById(id: number) {
  return db.query.accounts.findFirst({
    where: eq(schema.accounts.id, id),
    with: {
      accountType: true,
      parent: true
    }
  });
}

export async function getAccountTransactions(accountId: number) {
  try {
    // Get all journal entry items for this account
    const items = await db.query.journalEntryItems.findMany({
      where: eq(schema.journalEntryItems.accountId, accountId),
      with: {
        journalEntry: true
      },
      orderBy: desc(schema.journalEntryItems.id)
    });
    
    // Transform into the format expected by the frontend
    let runningBalance = 0;
    const transactions = items.map(item => {
      // Calculate running balance based on normal balance of the account type
      if (item.debit > 0) {
        runningBalance += parseFloat(item.debit.toString());
      }
      if (item.credit > 0) {
        runningBalance -= parseFloat(item.credit.toString());
      }
      
      return {
        id: item.id,
        date: item.journalEntry.date,
        journalEntryId: item.journalEntryId,
        journalEntryNumber: item.journalEntry.entryNumber,
        description: item.description || item.journalEntry.description,
        reference: item.journalEntry.reference,
        debit: parseFloat(item.debit.toString()) || 0,
        credit: parseFloat(item.credit.toString()) || 0,
        balance: runningBalance
      };
    });
    
    return transactions;
  } catch (error) {
    console.error("Error getting account transactions:", error);
    throw error;
  }
}

export async function createAccount(accountData: schema.AccountInsert) {
  // If parent account is specified, set the level
  let level = 1;
  if (accountData.parentId) {
    const parentAccount = await getAccountById(accountData.parentId);
    if (parentAccount) {
      level = parentAccount.level + 1;
    }
  }
  
  const [account] = await db.insert(schema.accounts)
    .values({
      ...accountData,
      level
    })
    .returning();
  
  return account;
}

export async function updateAccount(id: number, data: Partial<schema.AccountInsert>) {
  const [updatedAccount] = await db.update(schema.accounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.accounts.id, id))
    .returning();
  
  return updatedAccount;
}

// Journal Entries
export async function createJournalEntry(
  companyId: number,
  description: string,
  entryDate: Date,
  items: { accountId: number, description?: string, debit: number, credit: number }[],
  sourceType?: string,
  sourceId?: number,
  createdBy?: number,
  req?: ExpressRequest
) {
  // Get the next entry number
  const result = await db.execute(
    sql`SELECT MAX(CAST(SUBSTRING(entry_number FROM 3) AS INTEGER)) as max_num FROM journal_entries WHERE company_id = ${companyId}`
  );
  
  const maxNum = result.rows[0]?.max_num || 0;
  const nextNum = maxNum + 1;
  const entryNumber = `JE${nextNum.toString().padStart(5, '0')}`;
  
  // Create the journal entry
  const [journalEntry] = await db.insert(schema.journalEntries)
    .values({
      companyId,
      entryNumber,
      description,
      entryDate,
      sourceType,
      sourceId,
      createdBy,
      isPosted: true,
      postedDate: new Date()
    })
    .returning();
  
  // Create the journal entry items
  await db.insert(schema.journalEntryItems)
    .values(
      items.map(item => ({
        journalEntryId: journalEntry.id,
        accountId: item.accountId,
        description: item.description,
        debit: item.debit,
        credit: item.credit
      }))
    );
    
  // Get the company to find tenant ID
  const company = await getCompanyById(companyId);
  
  // Log journal entry creation if we have a request object
  if (req) {
    try {
      const { logAuditEvent } = await import('./utils');
      
      // Get account names for better audit logging
      const accountIds = items.map(item => item.accountId);
      const accounts = await db.query.accounts.findMany({
        where: inArray(schema.accounts.id, accountIds),
        columns: {
          id: true,
          name: true,
          code: true
        }
      });
      
      const accountMap = accounts.reduce((acc, account) => {
        acc[account.id] = account;
        return acc;
      }, {} as Record<number, typeof schema.accounts.$inferSelect>);
      
      // Create detailed action details
      const itemDetails = items.map(item => ({
        account: accountMap[item.accountId] ? 
          `${accountMap[item.accountId].code} - ${accountMap[item.accountId].name}` : 
          `Account ID: ${item.accountId}`,
        debit: item.debit,
        credit: item.credit,
        description: item.description
      }));
      
      await logAuditEvent({
        req,
        tenantId: company?.tenantId as number,
        entityType: 'journal_entries',
        entityId: journalEntry.id,
        action: 'journal_entry_created',
        actionDetails: { 
          entryNumber: journalEntry.entryNumber,
          description: journalEntry.description,
          entryDate: journalEntry.entryDate.toISOString(),
          sourceType: journalEntry.sourceType,
          sourceId: journalEntry.sourceId,
          isPosted: journalEntry.isPosted,
          companyId: journalEntry.companyId,
          items: itemDetails,
          totalDebits: items.reduce((sum, item) => sum + (typeof item.debit === 'string' ? parseFloat(item.debit) : item.debit), 0),
          totalCredits: items.reduce((sum, item) => sum + (typeof item.credit === 'string' ? parseFloat(item.credit) : item.credit), 0)
        },
        performedBy: createdBy || (req.user as any)?.id,
        severity: 'info'
      });
    } catch (error) {
      console.error('Failed to log journal entry audit event:', error);
    }
  }
  
  // Update account balances
  for (const item of items) {
    const account = await getAccountById(item.accountId);
    if (account) {
      const accountType = account.accountType;
      let balanceChange = 0;
      
      if (accountType.normalBalance === "debit") {
        balanceChange = item.debit - item.credit;
      } else {
        balanceChange = item.credit - item.debit;
      }
      
      await db.update(schema.accounts)
        .set({ 
          balance: sql`${schema.accounts.balance} + ${balanceChange}`,
          updatedAt: new Date()
        })
        .where(eq(schema.accounts.id, item.accountId));
    }
  }
  
  return journalEntry;
}

export async function getJournalEntriesByCompanyId(companyId: number, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  const entries = await db.query.journalEntries.findMany({
    where: eq(schema.journalEntries.companyId, companyId),
    with: {
      items: {
        with: {
          account: true
        }
      },
      creator: {
        columns: {
          id: true,
          name: true
        }
      }
    },
    orderBy: desc(schema.journalEntries.entryDate),
    limit: pageSize,
    offset
  });
  
  const totalCountResult = await db.execute(
    sql`SELECT COUNT(*) FROM journal_entries WHERE company_id = ${companyId}`
  );
  
  const totalCount = parseInt(totalCountResult.rows[0]?.count?.toString() || "0");
  
  return {
    entries,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  };
}

// Generate financial reports
export async function getTrialBalance(companyId: number, asOfDate: Date) {
  const accounts = await db.query.accounts.findMany({
    where: eq(schema.accounts.companyId, companyId),
    with: {
      accountType: true
    },
    orderBy: asc(schema.accounts.code)
  });
  
  return accounts.map(account => {
    const normalBalance = account.accountType.normalBalance;
    return {
      ...account,
      debit: normalBalance === "debit" ? account.balance : 0,
      credit: normalBalance === "credit" ? account.balance : 0
    };
  });
}

export async function getBalanceSheet(companyId: number, asOfDate: Date) {
  // Get accounts for balance sheet (assets, liabilities, and equity)
  const accounts = await db.query.accounts.findMany({
    where: and(
      eq(schema.accounts.companyId, companyId),
      or(
        eq(sql`accounts.account_type_id`, sql`(SELECT id FROM account_types WHERE code = 'ASSET')`),
        eq(sql`accounts.account_type_id`, sql`(SELECT id FROM account_types WHERE code = 'LIABILITY')`),
        eq(sql`accounts.account_type_id`, sql`(SELECT id FROM account_types WHERE code = 'EQUITY')`)
      )
    ),
    with: {
      accountType: true
    },
    orderBy: asc(schema.accounts.code)
  });
  
  // Get revenue accounts for the current fiscal year to include in the balance sheet
  // Revenue accounts should be part of equity in the balance sheet as retained earnings
  const revenueAccounts = await db.query.accounts.findMany({
    where: and(
      eq(schema.accounts.companyId, companyId),
      eq(sql`accounts.account_type_id`, sql`(SELECT id FROM account_types WHERE code = 'REVENUE')`)
    ),
    with: {
      accountType: true
    }
  });
  
  // Get expense accounts for the current fiscal year to include in the balance sheet
  const expenseAccounts = await db.query.accounts.findMany({
    where: and(
      eq(schema.accounts.companyId, companyId),
      eq(sql`accounts.account_type_id`, sql`(SELECT id FROM account_types WHERE code = 'EXPENSE')`)
    ),
    with: {
      accountType: true
    }
  });
  
  // Calculate net income (revenue - expenses) to include in equity section
  const totalRevenue = revenueAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const totalExpenses = expenseAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const netIncome = totalRevenue - totalExpenses;
  
  // Calculate total assets
  const totalAssets = accounts
    .filter(a => a.accountType.code === "ASSET")
    .reduce((sum, account) => sum + Number(account.balance), 0);
  
  // Calculate total liabilities
  const totalLiabilities = accounts
    .filter(a => a.accountType.code === "LIABILITY")
    .reduce((sum, account) => sum + Number(account.balance), 0);
  
  // Calculate total equity (excluding net income)
  const totalEquity = accounts
    .filter(a => a.accountType.code === "EQUITY")
    .reduce((sum, account) => sum + Number(account.balance), 0);
  
  // Total equity with net income
  const totalEquityWithNetIncome = totalEquity + netIncome;
  
  // Total liabilities and equity
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquityWithNetIncome;
  
  return {
    assets: accounts.filter(a => a.accountType.code === "ASSET"),
    liabilities: accounts.filter(a => a.accountType.code === "LIABILITY"),
    equity: accounts.filter(a => a.accountType.code === "EQUITY"),
    revenue: revenueAccounts,
    expenses: expenseAccounts,
    netIncome: netIncome,
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      equityWithNetIncome: totalEquityWithNetIncome,
      liabilitiesAndEquity: totalLiabilitiesAndEquity
    },
    balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01, // Check if balance sheet balances (within rounding error)
    asOfDate
  };
}

export async function getIncomeStatement(companyId: number, startDate: Date, endDate: Date) {
  const accounts = await db.query.accounts.findMany({
    where: and(
      eq(schema.accounts.companyId, companyId),
      or(
        eq(sql`accounts.account_type_id`, sql`(SELECT id FROM account_types WHERE code = 'REVENUE')`),
        eq(sql`accounts.account_type_id`, sql`(SELECT id FROM account_types WHERE code = 'EXPENSE')`)
      )
    ),
    with: {
      accountType: true
    },
    orderBy: asc(schema.accounts.code)
  });
  
  return {
    revenue: accounts.filter(a => a.accountType.code === "REVENUE"),
    expenses: accounts.filter(a => a.accountType.code === "EXPENSE"),
    startDate,
    endDate
  };
}

// Dashboard
export async function getDashboardStats(companyId: number) {
  // Get current month revenue
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  const prevMonth = new Date(currentMonth);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  
  // Revenue (total invoice amounts for current month)
  const revenueResult = await db.execute(
    sql`SELECT COALESCE(SUM(total), 0) as revenue FROM invoices 
        WHERE company_id = ${companyId} AND invoice_date >= ${currentMonth}`
  );
  const revenue = parseFloat(revenueResult.rows[0]?.revenue || "0");
  
  // Previous month revenue for comparison
  const prevRevenueResult = await db.execute(
    sql`SELECT COALESCE(SUM(total), 0) as revenue FROM invoices 
        WHERE company_id = ${companyId} AND invoice_date >= ${prevMonth} AND invoice_date < ${currentMonth}`
  );
  const prevRevenue = parseFloat(prevRevenueResult.rows[0]?.revenue || "0");
  
  // Calculate revenue percentage change
  const revenueChange = prevRevenue === 0 
    ? 100 
    : ((revenue - prevRevenue) / prevRevenue) * 100;
  
  // Expenses (total bill amounts for current month)
  const expensesResult = await db.execute(
    sql`SELECT COALESCE(SUM(total), 0) as expenses FROM bills 
        WHERE company_id = ${companyId} AND bill_date >= ${currentMonth}`
  );
  const expenses = parseFloat(expensesResult.rows[0]?.expenses || "0");
  
  // Previous month expenses for comparison
  const prevExpensesResult = await db.execute(
    sql`SELECT COALESCE(SUM(total), 0) as expenses FROM bills 
        WHERE company_id = ${companyId} AND bill_date >= ${prevMonth} AND bill_date < ${currentMonth}`
  );
  const prevExpenses = parseFloat(prevExpensesResult.rows[0]?.expenses || "0");
  
  // Calculate expenses percentage change
  const expensesChange = prevExpenses === 0 
    ? 100 
    : ((expenses - prevExpenses) / prevExpenses) * 100;
  
  // Receivables (unpaid invoices)
  const receivablesResult = await db.execute(
    sql`SELECT COALESCE(SUM(total - amount_paid), 0) as receivables, COUNT(*) as count
        FROM invoices 
        WHERE company_id = ${companyId} AND status IN ('open', 'partial', 'overdue')`
  );
  const receivables = parseFloat(receivablesResult.rows[0]?.receivables || "0");
  const receivablesCount = parseInt(receivablesResult.rows[0]?.count || "0");
  
  // Payables (unpaid bills)
  const payablesResult = await db.execute(
    sql`SELECT COALESCE(SUM(total - amount_paid), 0) as payables, COUNT(*) as count
        FROM bills 
        WHERE company_id = ${companyId} AND status IN ('open', 'partial', 'overdue')`
  );
  const payables = parseFloat(payablesResult.rows[0]?.payables || "0");
  const payablesCount = parseInt(payablesResult.rows[0]?.count || "0");
  
  return {
    revenue: {
      amount: revenue,
      change: revenueChange,
      changeType: revenueChange >= 0 ? "increase" : "decrease"
    },
    expenses: {
      amount: expenses,
      change: expensesChange,
      changeType: expensesChange >= 0 ? "increase" : "decrease"
    },
    receivables: {
      amount: receivables,
      count: receivablesCount
    },
    payables: {
      amount: payables,
      count: payablesCount
    }
  };
}

export async function getRecentTransactions(companyId: number, limit = 5) {
  // Get recent journal entries
  const entries = await db.query.journalEntries.findMany({
    where: eq(schema.journalEntries.companyId, companyId),
    orderBy: desc(schema.journalEntries.entryDate),
    limit
  });
  
  // For each journal entry, determine the transaction type
  const transactions = await Promise.all(entries.map(async (entry) => {
    let type = "Journal Entry";
    let status = "Completed";
    let amount = 0;
    let description = entry.description || "";
    
    if (entry.sourceType) {
      // If it's from a source document, get more details
      if (entry.sourceType === "invoice") {
        const invoice = await db.query.invoices.findFirst({
          where: eq(schema.invoices.id, entry.sourceId || 0)
        });
        
        if (invoice) {
          type = "Invoice";
          status = invoice.status;
          amount = parseFloat(invoice.total.toString());
          description = `Invoice #${invoice.invoiceNumber}`;
        }
      } else if (entry.sourceType === "bill") {
        const bill = await db.query.bills.findFirst({
          where: eq(schema.bills.id, entry.sourceId || 0)
        });
        
        if (bill) {
          type = "Bill";
          status = bill.status;
          amount = parseFloat(bill.total.toString());
          description = `Bill #${bill.billNumber}`;
        }
      } else if (entry.sourceType === "payment_received") {
        type = "Payment";
        status = "Completed";
        // Get the amount from journal entry items
        const items = await db.query.journalEntryItems.findMany({
          where: eq(schema.journalEntryItems.journalEntryId, entry.id)
        });
        
        const debitTotal = items.reduce((sum, item) => sum + parseFloat(item.debit.toString()), 0);
        amount = debitTotal;
      } else if (entry.sourceType === "payment_made") {
        type = "Payment";
        status = "Completed";
        // Get the amount from journal entry items
        const items = await db.query.journalEntryItems.findMany({
          where: eq(schema.journalEntryItems.journalEntryId, entry.id)
        });
        
        const creditTotal = items.reduce((sum, item) => sum + parseFloat(item.credit.toString()), 0);
        amount = creditTotal;
      }
    } else {
      // For manual journal entries, calculate the amount from items
      const items = await db.query.journalEntryItems.findMany({
        where: eq(schema.journalEntryItems.journalEntryId, entry.id)
      });
      
      const debitTotal = items.reduce((sum, item) => sum + parseFloat(item.debit.toString()), 0);
      amount = debitTotal; // Just use the debit side total
    }
    
    return {
      id: entry.id,
      date: entry.entryDate,
      description,
      type,
      amount,
      status
    };
  }));
  
  return transactions;
}

export async function getPendingActions(companyId: number) {
  // Invoices to approve
  const invoicesToApproveResult = await db.execute(
    sql`SELECT COUNT(*) FROM invoices WHERE company_id = ${companyId} AND status = 'draft'`
  );
  const invoicesToApprove = parseInt(invoicesToApproveResult.rows[0]?.count || "0");
  
  // Overdue bills
  const overdueBillsResult = await db.execute(
    sql`SELECT COUNT(*) FROM bills WHERE company_id = ${companyId} AND status IN ('open', 'partial') AND due_date < CURRENT_DATE`
  );
  const overdueBills = parseInt(overdueBillsResult.rows[0]?.count || "0");
  
  // Unreconciled payments
  const unreconciledPaymentsResult = await db.execute(
    sql`SELECT COUNT(*) FROM journal_entries 
        WHERE company_id = ${companyId} 
        AND (source_type = 'payment_received' OR source_type = 'payment_made') 
        AND created_at > CURRENT_DATE - INTERVAL '30 days'`
  );
  const unreconciledPayments = parseInt(unreconciledPaymentsResult.rows[0]?.count || "0");
  
  return [
    {
      id: 1,
      title: "Invoices to Approve",
      count: invoicesToApprove,
      description: `${invoicesToApprove} invoices need approval`,
      icon: "ri-bill-line",
      iconBg: "amber-50",
      iconColor: "amber-500",
      link: "/invoices?status=draft"
    },
    {
      id: 2,
      title: "Overdue Bills",
      count: overdueBills,
      description: `${overdueBills} bills are overdue`,
      icon: "ri-time-line",
      iconBg: "red-50",
      iconColor: "red-500",
      link: "/bills?status=overdue"
    },
    {
      id: 3,
      title: "Payments to Reconcile",
      count: unreconciledPayments,
      description: `${unreconciledPayments} payments need reconciliation`,
      icon: "ri-bank-card-line",
      iconBg: "green-50",
      iconColor: "green-500",
      link: "/banking/reconciliation"
    }
  ];
}

export async function getMonthlyPLData(companyId: number, months = 6) {
  const result = [];
  const currentDate = new Date();
  
  // Generate data for the past X months
  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
    
    // Get revenue for this month
    const revenueResult = await db.execute(
      sql`SELECT COALESCE(SUM(total), 0) as revenue FROM invoices 
          WHERE company_id = ${companyId} 
          AND invoice_date >= ${startDate} 
          AND invoice_date <= ${endDate}`
    );
    const revenue = parseFloat(revenueResult.rows[0]?.revenue || "0");
    
    // Get expenses for this month
    const expensesResult = await db.execute(
      sql`SELECT COALESCE(SUM(total), 0) as expenses FROM bills 
          WHERE company_id = ${companyId} 
          AND bill_date >= ${startDate} 
          AND bill_date <= ${endDate}`
    );
    const expenses = parseFloat(expensesResult.rows[0]?.expenses || "0");
    
    // Calculate profit
    const profit = revenue - expenses;
    
    // Format the month name
    const monthName = startDate.toLocaleString('default', { month: 'short' });
    
    result.push({
      month: monthName,
      revenue,
      expenses,
      profit
    });
  }
  
  return result;
}

export async function getCashFlowData(companyId: number, days = 30) {
  const result = [];
  const currentDate = new Date();
  
  // Get cash account IDs
  const cashAccountsResult = await db.execute(
    sql`SELECT id FROM accounts 
        WHERE company_id = ${companyId} 
        AND code LIKE '11%' 
        AND (name LIKE '%Cash%' OR name LIKE '%Bank%')`
  );
  
  const cashAccountIds = cashAccountsResult.rows.map(row => row.id);
  
  if (cashAccountIds.length === 0) {
    return [];
  }
  
  // Generate data points
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - days);
  
  const datePoints = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    datePoints.push(date);
  }
  
  // For each date, calculate the cash balance
  for (const date of datePoints) {
    // Get all journal entry items affecting cash accounts up to this date
    const itemsResult = await db.execute(
      sql`SELECT 
            SUM(CASE WHEN a.normal_balance = 'debit' THEN ji.debit - ji.credit ELSE ji.credit - ji.debit END) as balance
          FROM 
            journal_entry_items ji
          JOIN 
            journal_entries je ON ji.journal_entry_id = je.id
          JOIN 
            accounts acc ON ji.account_id = acc.id
          JOIN 
            account_types a ON acc.account_type_id = a.id
          WHERE 
            je.company_id = ${companyId}
            AND je.entry_date <= ${date}
            AND ji.account_id IN (${sql.join(cashAccountIds)})`
    );
    
    const balance = parseFloat(itemsResult.rows[0]?.balance || "0");
    
    result.push({
      date: date.toISOString().split('T')[0],
      balance
    });
  }
  
  return result;
}

// User management
export async function getUsersByTenantId(tenantId: number) {
  return db.query.users.findMany({
    where: eq(schema.users.tenantId, tenantId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    },
    orderBy: asc(schema.users.name)
  });
}

export async function updateUser(id: number, data: Partial<Omit<schema.UserInsert, "password">>) {
  const [updatedUser] = await db.update(schema.users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
    .returning({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive
    });
  
  return updatedUser;
}

export async function updateUserPassword(id: number, newPassword: string) {
  const hashedPassword = await hash(newPassword);
  
  await db.update(schema.users)
    .set({ 
      password: hashedPassword,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, id));
  
  return true;
}

// Company access management
export async function getUserCompanyAccess(userId: number) {
  return db.query.userCompanies.findMany({
    where: eq(schema.userCompanies.userId, userId),
    with: {
      company: true
    }
  });
}

export async function grantUserCompanyAccess(userId: number, companyId: number, accessLevel: string) {
  const existing = await db.query.userCompanies.findFirst({
    where: and(
      eq(schema.userCompanies.userId, userId),
      eq(schema.userCompanies.companyId, companyId)
    )
  });
  
  if (existing) {
    const [updated] = await db.update(schema.userCompanies)
      .set({ accessLevel })
      .where(and(
        eq(schema.userCompanies.userId, userId),
        eq(schema.userCompanies.companyId, companyId)
      ))
      .returning();
    
    return updated;
  } else {
    const [newAccess] = await db.insert(schema.userCompanies)
      .values({
        userId,
        companyId,
        accessLevel
      })
      .returning();
    
    return newAccess;
  }
}

export async function revokeUserCompanyAccess(userId: number, companyId: number) {
  await db.delete(schema.userCompanies)
    .where(and(
      eq(schema.userCompanies.userId, userId),
      eq(schema.userCompanies.companyId, companyId)
    ));
  
  return true;
}

// Intercompany transactions
export async function getIntercompanyTransactions(companyId: number) {
  console.log(`Fetching intercompany transactions for company ID: ${companyId}`);
  
  // Fetch basic transaction data - include all related transactions whether as source or target
  const transactions = await db.query.intercompanyTransactions.findMany({
    where: or(
      eq(schema.intercompanyTransactions.sourceCompanyId, companyId),
      eq(schema.intercompanyTransactions.targetCompanyId, companyId)
    ),
    with: {
      sourceCompany: true,
      targetCompany: true,
      sourceJournalEntry: true,
      targetJournalEntry: true,
    },
    orderBy: [desc(schema.intercompanyTransactions.transactionDate)]
  });
  
  console.log(`Found ${transactions.length} basic transactions for company ${companyId}`);
  
  // Enhanced transactions with additional info about related entities
  const enhancedTransactions = await Promise.all(transactions.map(async (transaction) => {
    console.log(`Processing transaction ID: ${transaction.id}, sourceInvoiceId: ${transaction.sourceInvoiceId}, targetBillId: ${transaction.targetBillId}`);
    
    // Check for invoices related to this transaction
    const invoices = transaction.sourceInvoiceId 
      ? await db.query.invoices.findMany({
          where: eq(schema.invoices.id, transaction.sourceInvoiceId),
          columns: { id: true, status: true, invoiceNumber: true }
        })
      : [];
    
    // Check for bills related to this transaction
    const bills = transaction.targetBillId
      ? await db.query.bills.findMany({
          where: eq(schema.bills.id, transaction.targetBillId),
          columns: { id: true, status: true, billNumber: true }
        })
      : [];
    
    console.log(`Transaction ${transaction.id} has ${invoices.length} invoices and ${bills.length} bills`);
    
    // Determine flags for UI
    const hasInvoice = transaction.sourceInvoiceId !== null;
    const hasPayment = transaction.sourceReceiptId !== null || transaction.targetPaymentId !== null;
    const hasDelivery = transaction.sourceDeliveryId !== null;
    const hasGoodsReceipt = transaction.targetGoodsReceiptId !== null;
    
    return {
      ...transaction,
      invoices,
      bills,
      hasInvoice,
      hasPayment,
      hasDelivery,
      hasGoodsReceipt
    };
  }));
  
  console.log(`Returning ${enhancedTransactions.length} enhanced transactions for company ${companyId}`);
  return enhancedTransactions;
}

export async function getIntercompanyTransactionById(id: number) {
  const transaction = await db.query.intercompanyTransactions.findFirst({
    where: eq(schema.intercompanyTransactions.id, id),
    with: {
      sourceCompany: true,
      targetCompany: true,
      sourceJournalEntry: true,
      targetJournalEntry: true,
    }
  });
  
  return transaction;
}

export async function createIntercompanyTransaction(
  transactionData: schema.IntercompanyTransactionInsert, 
  userId: number
) {
  // Optimization: Fetch all needed accounts in a single query
  // Start a transaction
  return await db.transaction(async (tx) => {
    try {
      // 1. Create the intercompany transaction record
      const [transaction] = await tx.insert(schema.intercompanyTransactions)
        .values({
          ...transactionData,
          createdBy: userId,
          status: 'pending'
        })
        .returning();
      
      // 2. Get both companies in a single query
      const [sourceCompany, targetCompany] = await Promise.all([
        tx.query.companies.findFirst({ where: eq(schema.companies.id, transaction.sourceCompanyId) }),
        tx.query.companies.findFirst({ where: eq(schema.companies.id, transaction.targetCompanyId) })
      ]);
      
      if (!sourceCompany) throw new Error("Source company not found");
      if (!targetCompany) throw new Error("Target company not found");
      
      // 3. Get all required accounts in parallel with specific codes for exact matching
      const accountQueries = [
        // Source company accounts
        tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, transaction.sourceCompanyId),
            eq(schema.accounts.code, '2150') // Intercompany Payable
          )
        }),
        tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, transaction.sourceCompanyId),
            eq(schema.accounts.code, '5000') // Expense
          )
        }),
        // Target company accounts
        tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, transaction.targetCompanyId),
            eq(schema.accounts.code, '1150') // Intercompany Receivable
          )
        }),
        tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, transaction.targetCompanyId),
            eq(schema.accounts.code, '4000') // Revenue
          )
        })
      ];
      
      const [payableAccount, expenseAccount, receivableAccount, revenueAccount] = await Promise.all(accountQueries);
      
      // Verify accounts exist
      if (!payableAccount) throw new Error("Intercompany Payable account not found for source company");
      if (!expenseAccount) throw new Error("Expense account not found for source company");
      if (!receivableAccount) throw new Error("Intercompany Receivable account not found for target company");
      if (!revenueAccount) throw new Error("Revenue account not found for target company");
      
      // 4. Create journal entries for both companies
      const journalEntryPromises = [
        // Source company journal entry
        tx.insert(schema.journalEntries)
          .values({
            companyId: transaction.sourceCompanyId,
            entryNumber: generateDocumentNumber('JE', sourceCompany.code, Date.now()),
            description: `Intercompany transaction: ${transaction.description}`,
            entryDate: transaction.transactionDate,
            sourceType: 'intercompany',
            sourceId: transaction.id,
            isPosted: true,
            postedDate: new Date(),
            createdBy: userId
          })
          .returning(),
        
        // Target company journal entry
        tx.insert(schema.journalEntries)
          .values({
            companyId: transaction.targetCompanyId,
            entryNumber: generateDocumentNumber('JE', targetCompany.code, Date.now() + 1),
            description: `Intercompany transaction: ${transaction.description}`,
            entryDate: transaction.transactionDate,
            sourceType: 'intercompany',
            sourceId: transaction.id,
            isPosted: true,
            postedDate: new Date(),
            createdBy: userId
          })
          .returning()
      ];
      
      const journalEntries = await Promise.all(journalEntryPromises);
      const [sourceJournalEntry] = journalEntries[0];
      const [targetJournalEntry] = journalEntries[1];
      
      // 5. Create journal entry items for both companies
      await Promise.all([
        // Source company journal entry items
        tx.insert(schema.journalEntryItems)
          .values([
            {
              journalEntryId: sourceJournalEntry.id,
              accountId: expenseAccount.id,
              description: transaction.description,
              debit: transaction.amount.toString(),
              credit: '0'
            },
            {
              journalEntryId: sourceJournalEntry.id,
              accountId: payableAccount.id,
              description: transaction.description,
              debit: '0',
              credit: transaction.amount.toString()
            }
          ]),
        
        // Target company journal entry items
        tx.insert(schema.journalEntryItems)
          .values([
            {
              journalEntryId: targetJournalEntry.id,
              accountId: receivableAccount.id,
              description: transaction.description,
              debit: transaction.amount.toString(),
              credit: '0'
            },
            {
              journalEntryId: targetJournalEntry.id,
              accountId: revenueAccount.id,
              description: transaction.description,
              debit: '0',
              credit: transaction.amount.toString()
            }
          ])
      ]);
      
      // 6. Update the intercompany transaction with journal entry IDs
      const [updatedTransaction] = await tx.update(schema.intercompanyTransactions)
        .set({
          sourceJournalEntryId: sourceJournalEntry.id,
          targetJournalEntryId: targetJournalEntry.id,
          status: 'completed'
        })
        .where(eq(schema.intercompanyTransactions.id, transaction.id))
        .returning();
      
      return updatedTransaction;
    } catch (error) {
      console.error("Error in intercompany transaction creation:", error);
      throw error;
    }
  });
}

export async function updateIntercompanyTransactionStatus(id: number, status: string) {
  const [transaction] = await db.update(schema.intercompanyTransactions)
    .set({ status })
    .where(eq(schema.intercompanyTransactions.id, id))
    .returning();
  
  return transaction;
}

// Banking
export async function getBankAccountsByCompanyId(companyId: number) {
  return await db.query.bankAccounts.findMany({
    where: eq(schema.bankAccounts.companyId, companyId),
    with: {
      account: true
    },
    orderBy: [asc(schema.bankAccounts.name)]
  });
}

export async function getBankAccountById(id: number) {
  return await db.query.bankAccounts.findFirst({
    where: eq(schema.bankAccounts.id, id),
    with: {
      account: true
    }
  });
}

export async function createBankAccount(accountData: schema.BankAccountInsert) {
  const [newAccount] = await db.insert(schema.bankAccounts)
    .values(accountData)
    .returning();
  
  return newAccount;
}

export async function updateBankAccount(id: number, data: Partial<schema.BankAccountInsert>) {
  const [updatedAccount] = await db.update(schema.bankAccounts)
    .set(data)
    .where(eq(schema.bankAccounts.id, id))
    .returning();
  
  return updatedAccount;
}

export async function getBankTransactionsByAccountId(bankAccountId: number, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  const transactions = await db.query.bankTransactions.findMany({
    where: eq(schema.bankTransactions.bankAccountId, bankAccountId),
    orderBy: [desc(schema.bankTransactions.date)],
    limit: pageSize,
    offset
  });
  
  const totalCount = await db.select({ count: count() })
    .from(schema.bankTransactions)
    .where(eq(schema.bankTransactions.bankAccountId, bankAccountId));
  
  const totalPages = Math.ceil(totalCount[0].count / pageSize);
  
  return {
    transactions,
    pagination: {
      page,
      pageSize,
      totalCount: totalCount[0].count,
      totalPages
    }
  };
}

export async function createBankTransaction(transactionData: schema.BankTransactionInsert) {
  const [newTransaction] = await db.insert(schema.bankTransactions)
    .values(transactionData)
    .returning();
  
  // Update bank account balance
  const bankAccount = await getBankAccountById(newTransaction.bankAccountId);
  if (bankAccount) {
    const amountChange = newTransaction.type === 'credit' 
      ? parseFloat(newTransaction.amount.toString()) 
      : -parseFloat(newTransaction.amount.toString());
    
    const newBalance = parseFloat(bankAccount.balance.toString()) + amountChange;
    
    await updateBankAccount(bankAccount.id, { 
      balance: newBalance.toString(),
      updatedAt: new Date()
    });
  }
  
  return newTransaction;
}

export async function updateBankTransactionStatus(id: number, status: string) {
  const [updatedTransaction] = await db.update(schema.bankTransactions)
    .set({ 
      status, 
      updatedAt: new Date() 
    })
    .where(eq(schema.bankTransactions.id, id))
    .returning();
  
  return updatedTransaction;
}

// Purchase Orders
export async function getPurchaseOrdersByCompanyId(companyId: number, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  const purchaseOrders = await db.query.purchaseOrders.findMany({
    where: eq(schema.purchaseOrders.companyId, companyId),
    with: {
      vendor: {
        columns: {
          id: true,
          name: true
        }
      }
    },
    orderBy: desc(schema.purchaseOrders.orderDate),
    limit: pageSize,
    offset
  });
  
  const totalCountResult = await db.execute(
    sql`SELECT COUNT(*) FROM purchase_orders WHERE company_id = ${companyId}`
  );
  
  const totalCount = parseInt(totalCountResult.rows[0]?.count?.toString() || "0");
  
  return {
    purchaseOrders,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  };
}

export async function getPurchaseOrderById(id: number) {
  return db.query.purchaseOrders.findFirst({
    where: eq(schema.purchaseOrders.id, id),
    with: {
      vendor: true,
      items: {
        with: {
          product: true
        }
      }
    }
  });
}

export async function createPurchaseOrder(
  data: schema.PurchaseOrderInsert & { 
    items: { productId: number, quantity: number, unitPrice: number, description?: string }[],
    companyCode?: string
  }
) {
  // Start a transaction
  return await db.transaction(async (tx) => {
    // Insert purchase order
    const [purchaseOrder] = await tx.insert(schema.purchaseOrders)
      .values({
        companyId: data.companyId,
        vendorId: data.vendorId,
        orderNumber: generateDocumentNumber("PO", data.companyCode || "PO", Date.now()),
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        status: data.status || "draft",
        total: data.total || "0",
        notes: data.notes,
        createdBy: data.createdBy,
        createdAt: new Date()
      })
      .returning();
    
    // Calculate items amounts and total
    let total = 0;
    const items = data.items.map(item => {
      const amount = parseFloat(item.unitPrice.toString()) * parseFloat(item.quantity.toString());
      total += amount;
      
      return {
        purchaseOrderId: purchaseOrder.id,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: amount.toFixed(2)
      };
    });
    
    // Update total on purchase order
    await tx.update(schema.purchaseOrders)
      .set({ total: total.toFixed(2) })
      .where(eq(schema.purchaseOrders.id, purchaseOrder.id));
    
    // Insert purchase order items
    await tx.insert(schema.purchaseOrderItems)
      .values(items);
    
    return {
      ...purchaseOrder,
      total: total.toFixed(2),
      items
    };
  });
}

export async function updatePurchaseOrderStatus(id: number, status: string) {
  const allowedStatuses = ["draft", "sent", "approved", "processing", "received", "cancelled"];
  
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status. Allowed values are: ${allowedStatuses.join(", ")}`);
  }
  
  const [updatedOrder] = await db.update(schema.purchaseOrders)
    .set({ 
      status,
      createdAt: new Date() // update timestamp to mark the change
    })
    .where(eq(schema.purchaseOrders.id, id))
    .returning();
  
  return updatedOrder;
}

// Credit Notes Functions
export async function getCreditNotesByCompanyId(companyId: number, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  const creditNotes = await db.query.creditNotes.findMany({
    where: eq(schema.creditNotes.companyId, companyId),
    orderBy: [desc(schema.creditNotes.issueDate)],
    limit: pageSize,
    offset,
    with: {
      customer: true,
      invoice: true,
    },
  });

  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.creditNotes)
    .where(eq(schema.creditNotes.companyId, companyId));

  return {
    data: creditNotes,
    pagination: {
      page,
      pageSize,
      totalCount: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / pageSize),
    },
  };
}

export async function getCreditNoteById(id: number) {
  const creditNote = await db.query.creditNotes.findFirst({
    where: eq(schema.creditNotes.id, id),
    with: {
      customer: true,
      invoice: true,
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  return creditNote;
}

export async function createCreditNote(creditNoteData: schema.CreditNoteInsert, items: schema.CreditNoteItemInsert[]) {
  // Start a transaction
  return await db.transaction(async (tx) => {
    // Generate note number if not provided
    if (!creditNoteData.noteNumber) {
      const company = await tx.query.companies.findFirst({
        where: eq(schema.companies.id, creditNoteData.companyId),
      });
      
      if (!company) throw new Error("Company not found");
      
      const lastCreditNote = await tx.query.creditNotes.findFirst({
        where: eq(schema.creditNotes.companyId, creditNoteData.companyId),
        orderBy: [desc(schema.creditNotes.id)],
      });
      
      const nextId = lastCreditNote ? lastCreditNote.id + 1 : 1;
      creditNoteData.noteNumber = generateDocumentNumber("CN", company.code, nextId);
    }
    
    // Create credit note
    const [creditNote] = await tx.insert(schema.creditNotes)
      .values(creditNoteData)
      .returning();
    
    // Insert items
    if (items && items.length > 0) {
      const itemsWithCreditNoteId = items.map(item => ({
        ...item,
        creditNoteId: creditNote.id,
      }));
      
      await tx.insert(schema.creditNoteItems)
        .values(itemsWithCreditNoteId);
    }
    
    return creditNote;
  });
}

export async function updateCreditNoteStatus(id: number, status: string) {
  const allowedStatuses = ["draft", "issued", "partial", "applied", "cancelled"];
  
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status. Allowed values are: ${allowedStatuses.join(", ")}`);
  }
  
  // When changing from draft to issued, create journal entries
  if (status === "issued") {
    const creditNote = await getCreditNoteById(id);
    
    if (!creditNote) {
      throw new Error("Credit note not found");
    }
    
    if (creditNote.status === "draft") {
      // Process in transaction to ensure atomicity
      return await db.transaction(async (tx) => {
        // Update credit note status
        const [updatedCreditNote] = await tx.update(schema.creditNotes)
          .set({ status, updatedAt: new Date() })
          .where(eq(schema.creditNotes.id, id))
          .returning();
        
        // Find necessary accounts
        const accountReturnPromise = tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, creditNote.companyId),
            eq(schema.accounts.code, '4900') // Sales Returns and Allowances
          )
        });
        
        const accountReceivablePromise = tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, creditNote.companyId),
            eq(schema.accounts.code, '1120') // Accounts Receivable
          )
        });
        
        // Find necessary accounts
        let accountReturn = await accountReturnPromise;
        const accountReceivable = await accountReceivablePromise;
        
        if (!accountReturn) {
          // If account doesn't exist, create it
          const [newAccount] = await tx.insert(schema.accounts)
            .values({
              companyId: creditNote.companyId,
              accountTypeId: 4, // Revenue type
              name: "Sales Returns and Allowances",
              code: "4900",
              level: 3,
              parentId: null // This should be set properly in a real implementation
            })
            .returning();
          
          accountReturn = newAccount;
        }
        
        if (!accountReceivable) {
          throw new Error("Accounts Receivable account not found");
        }
        
        // Create journal entry
        const totalAmount = parseFloat(creditNote.total);
        
        await createJournalEntry(
          creditNote.companyId,
          `Credit Note ${creditNote.noteNumber} issued to ${creditNote.customer.name}`,
          new Date(creditNote.issueDate),
          [
            {
              accountId: accountReturn.id,
              description: "Sales return - Credit Note",
              debit: totalAmount, // Debit to Sales Returns (contra-revenue)
              credit: 0
            },
            {
              accountId: accountReceivable.id,
              description: "Customer credit note - Accounts Receivable reduction",
              debit: 0,
              credit: totalAmount // Credit to Accounts Receivable
            }
          ],
          'credit_note',
          creditNote.id
        );
        
        return [updatedCreditNote];
      });
    }
  }
  
  // For other status changes that don't need journal entries
  return await db.update(schema.creditNotes)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.creditNotes.id, id))
    .returning();
}

export async function deleteCreditNote(id: number) {
  const creditNote = await getCreditNoteById(id);
  
  if (!creditNote) {
    throw new Error("Credit note not found");
  }
  
  if (creditNote.status !== "draft") {
    throw new Error("Only draft credit notes can be deleted");
  }
  
  return await db.delete(schema.creditNotes)
    .where(eq(schema.creditNotes.id, id))
    .returning();
}

// Debit Notes Functions
export async function getDebitNotesByCompanyId(companyId: number, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  const debitNotes = await db.query.debitNotes.findMany({
    where: eq(schema.debitNotes.companyId, companyId),
    orderBy: [desc(schema.debitNotes.issueDate)],
    limit: pageSize,
    offset,
    with: {
      vendor: true,
      bill: true,
    },
  });

  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.debitNotes)
    .where(eq(schema.debitNotes.companyId, companyId));

  return {
    data: debitNotes,
    pagination: {
      page,
      pageSize,
      totalCount: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / pageSize),
    },
  };
}

export async function getDebitNoteById(id: number) {
  const debitNote = await db.query.debitNotes.findFirst({
    where: eq(schema.debitNotes.id, id),
    with: {
      vendor: true,
      bill: true,
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  return debitNote;
}

export async function createDebitNote(debitNoteData: schema.DebitNoteInsert, items: schema.DebitNoteItemInsert[]) {
  // Start a transaction
  return await db.transaction(async (tx) => {
    // Generate note number if not provided
    if (!debitNoteData.noteNumber) {
      const company = await tx.query.companies.findFirst({
        where: eq(schema.companies.id, debitNoteData.companyId),
      });
      
      if (!company) throw new Error("Company not found");
      
      const lastDebitNote = await tx.query.debitNotes.findFirst({
        where: eq(schema.debitNotes.companyId, debitNoteData.companyId),
        orderBy: [desc(schema.debitNotes.id)],
      });
      
      const nextId = lastDebitNote ? lastDebitNote.id + 1 : 1;
      debitNoteData.noteNumber = generateDocumentNumber("DN", company.code, nextId);
    }
    
    // Create debit note
    const [debitNote] = await tx.insert(schema.debitNotes)
      .values(debitNoteData)
      .returning();
    
    // Insert items
    if (items && items.length > 0) {
      const itemsWithDebitNoteId = items.map(item => ({
        ...item,
        debitNoteId: debitNote.id,
      }));
      
      await tx.insert(schema.debitNoteItems)
        .values(itemsWithDebitNoteId);
    }
    
    return debitNote;
  });
}

export async function updateDebitNoteStatus(id: number, status: string) {
  const allowedStatuses = ["draft", "issued", "partial", "applied", "cancelled"];
  
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status. Allowed values are: ${allowedStatuses.join(", ")}`);
  }
  
  // When changing from draft to issued, create journal entries
  if (status === "issued") {
    const debitNote = await getDebitNoteById(id);
    
    if (!debitNote) {
      throw new Error("Debit note not found");
    }
    
    if (debitNote.status === "draft") {
      // Process in transaction to ensure atomicity
      return await db.transaction(async (tx) => {
        // Update debit note status
        const [updatedDebitNote] = await tx.update(schema.debitNotes)
          .set({ status, updatedAt: new Date() })
          .where(eq(schema.debitNotes.id, id))
          .returning();
        
        // Find necessary accounts
        const accountPurchaseReturnsPromise = tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, debitNote.companyId),
            eq(schema.accounts.code, '5900') // Purchase Returns and Allowances
          )
        });
        
        const accountPayablePromise = tx.query.accounts.findFirst({
          where: and(
            eq(schema.accounts.companyId, debitNote.companyId),
            eq(schema.accounts.code, '2110') // Accounts Payable
          )
        });
        
        // Wait for account queries
        let accountPurchaseReturns = await accountPurchaseReturnsPromise;
        const accountPayable = await accountPayablePromise;
        
        // Create Purchase Returns account if it doesn't exist
        if (!accountPurchaseReturns) {
          const [newAccount] = await tx.insert(schema.accounts)
            .values({
              companyId: debitNote.companyId,
              accountTypeId: 5, // Expense type
              name: "Purchase Returns and Allowances",
              code: "5900",
              level: 3,
              parentId: null // This should be set properly in a real implementation
            })
            .returning();
          
          accountPurchaseReturns = newAccount;
        }
        
        if (!accountPayable) {
          throw new Error("Accounts Payable account not found");
        }
        
        // Create journal entry
        const totalAmount = parseFloat(debitNote.total);
        
        await createJournalEntry(
          debitNote.companyId,
          `Debit Note ${debitNote.noteNumber} issued to ${debitNote.vendor.name}`,
          new Date(debitNote.issueDate),
          [
            {
              accountId: accountPayable.id,
              description: "Vendor debit note - Accounts Payable reduction",
              debit: totalAmount, // Debit to Accounts Payable (reducing liability)
              credit: 0
            },
            {
              accountId: accountPurchaseReturns.id,
              description: "Purchase return - Debit Note",
              debit: 0,
              credit: totalAmount // Credit to Purchase Returns (contra-expense)
            }
          ],
          'debit_note',
          debitNote.id
        );
        
        return [updatedDebitNote];
      });
    }
  }
  
  // For other status changes that don't need journal entries
  return await db.update(schema.debitNotes)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.debitNotes.id, id))
    .returning();
}

export async function deleteDebitNote(id: number) {
  const debitNote = await getDebitNoteById(id);
  
  if (!debitNote) {
    throw new Error("Debit note not found");
  }
  
  if (debitNote.status !== "draft") {
    throw new Error("Only draft debit notes can be deleted");
  }
  
  return await db.delete(schema.debitNotes)
    .where(eq(schema.debitNotes.id, id))
    .returning();
}

// Tax Authority Functions
export async function getTaxAuthorities() {
  return await db.query.taxAuthorities.findMany({
    where: eq(schema.taxAuthorities.isActive, true),
    orderBy: [asc(schema.taxAuthorities.name)]
  });
}

export async function getTaxAuthorityById(id: number) {
  return await db.query.taxAuthorities.findFirst({
    where: eq(schema.taxAuthorities.id, id),
    with: {
      taxRates: {
        where: eq(schema.taxRates.isActive, true),
        orderBy: [asc(schema.taxRates.name)]
      }
    }
  });
}

export async function createTaxAuthority(data: schema.TaxAuthorityInsert) {
  const [newAuthority] = await db.insert(schema.taxAuthorities).values(data).returning();
  return newAuthority;
}

export async function updateTaxAuthority(id: number, data: Partial<schema.TaxAuthorityInsert>) {
  const [updatedAuthority] = await db.update(schema.taxAuthorities)
    .set(data)
    .where(eq(schema.taxAuthorities.id, id))
    .returning();
  return updatedAuthority;
}

export async function getTaxRates(authorityId?: number) {
  const query = authorityId 
    ? db.query.taxRates.findMany({
        where: and(
          eq(schema.taxRates.authorityId, authorityId),
          eq(schema.taxRates.isActive, true)
        ),
        orderBy: [asc(schema.taxRates.name)]
      })
    : db.query.taxRates.findMany({
        where: eq(schema.taxRates.isActive, true),
        orderBy: [asc(schema.taxRates.name)],
        with: {
          authority: true
        }
      });

  return await query;
}

export async function getTaxRateById(id: number) {
  return await db.query.taxRates.findFirst({
    where: eq(schema.taxRates.id, id),
    with: {
      authority: true
    }
  });
}

export async function createTaxRate(data: schema.TaxRateInsert) {
  // If this is set as default, unset any existing default rates for this authority
  if (data.isDefault) {
    await db.update(schema.taxRates)
      .set({ isDefault: false })
      .where(and(
        eq(schema.taxRates.authorityId, data.authorityId),
        eq(schema.taxRates.isDefault, true)
      ));
  }

  const [newRate] = await db.insert(schema.taxRates).values(data).returning();
  return newRate;
}

export async function updateTaxRate(id: number, data: Partial<schema.TaxRateInsert>) {
  // If this is set as default, unset any existing default rates for this authority
  if (data.isDefault) {
    const currentRate = await db.query.taxRates.findFirst({
      where: eq(schema.taxRates.id, id)
    });

    if (currentRate) {
      await db.update(schema.taxRates)
        .set({ isDefault: false })
        .where(and(
          eq(schema.taxRates.authorityId, currentRate.authorityId),
          eq(schema.taxRates.isDefault, true),
          ne(schema.taxRates.id, id)
        ));
    }
  }

  const [updatedRate] = await db.update(schema.taxRates)
    .set(data)
    .where(eq(schema.taxRates.id, id))
    .returning();
  return updatedRate;
}

// Company Tax Settings Functions
export async function getCompanyTaxSettings(companyId: number) {
  return await db.query.companyTaxSettings.findMany({
    where: and(
      eq(schema.companyTaxSettings.companyId, companyId),
      eq(schema.companyTaxSettings.isActive, true)
    ),
    with: {
      taxAuthority: true
    },
    orderBy: [asc(schema.companyTaxSettings.createdAt)]
  });
}

export async function getCompanyTaxSettingById(id: number) {
  return await db.query.companyTaxSettings.findFirst({
    where: eq(schema.companyTaxSettings.id, id),
    with: {
      taxAuthority: true,
      company: true
    }
  });
}

export async function createCompanyTaxSetting(data: schema.CompanyTaxSettingsInsert) {
  const [newSetting] = await db.insert(schema.companyTaxSettings).values(data).returning();
  return newSetting;
}

export async function updateCompanyTaxSetting(id: number, data: Partial<schema.CompanyTaxSettingsInsert>) {
  const [updatedSetting] = await db.update(schema.companyTaxSettings)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(schema.companyTaxSettings.id, id))
    .returning();
  return updatedSetting;
}

// Tax Filing Functions
export async function getTaxFilings(companyId: number, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  
  const filings = await db.query.taxFilings.findMany({
    where: eq(schema.taxFilings.companyId, companyId),
    limit: pageSize,
    offset,
    orderBy: [desc(schema.taxFilings.filingPeriodEnd)],
    with: {
      taxAuthority: true
    }
  });

  const countResult = await db.select({ count: count() })
    .from(schema.taxFilings)
    .where(eq(schema.taxFilings.companyId, companyId));
  
  const totalCount = countResult[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    taxFilings: filings,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages
    }
  };
}

export async function getTaxFilingById(id: number) {
  return await db.query.taxFilings.findFirst({
    where: eq(schema.taxFilings.id, id),
    with: {
      taxAuthority: true,
      company: true,
      items: true
    }
  });
}

export async function createTaxFiling(
  filingData: schema.TaxFilingInsert, 
  items: schema.TaxFilingItemInsert[]
) {
  // Transaction to ensure all operations succeed or fail together
  return await db.transaction(async (tx) => {
    // Insert the tax filing
    const [filing] = await tx.insert(schema.taxFilings)
      .values(filingData)
      .returning();
    
    // Insert all items
    if (items.length > 0) {
      const itemsWithFilingId = items.map(item => ({
        ...item,
        taxFilingId: filing.id
      }));
      
      await tx.insert(schema.taxFilingItems)
        .values(itemsWithFilingId);
    }
    
    // Return the filing with all items
    return filing;
  });
}

export async function updateTaxFilingStatus(id: number, status: string, submissionData?: {
  submissionDate?: Date;
  submissionReference?: string;
}) {
  const updateData: any = {
    status,
    updatedAt: new Date()
  };
  
  if (submissionData) {
    if (submissionData.submissionDate) {
      updateData.submissionDate = submissionData.submissionDate;
    }
    if (submissionData.submissionReference) {
      updateData.submissionReference = submissionData.submissionReference;
    }
  }
  
  const [updatedFiling] = await db.update(schema.taxFilings)
    .set(updateData)
    .where(eq(schema.taxFilings.id, id))
    .returning();
    
  // If status is submitted, also update the company tax settings with lastFilingDate
  if (status === 'submitted') {
    const companySettings = await db.query.companyTaxSettings.findFirst({
      where: and(
        eq(schema.companyTaxSettings.companyId, updatedFiling.companyId),
        eq(schema.companyTaxSettings.taxAuthorityId, updatedFiling.taxAuthorityId)
      )
    });
    
    if (companySettings) {
      await db.update(schema.companyTaxSettings)
        .set({
          lastFilingDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.companyTaxSettings.id, companySettings.id));
    }
  }
  
  return updatedFiling;
}

export async function updateTaxFilingPayment(id: number, paymentData: {
  paymentStatus: string;
  paymentAmount?: number;
  paymentDate?: Date;
  paymentReference?: string;
}) {
  const updateData: any = {
    paymentStatus: paymentData.paymentStatus,
    updatedAt: new Date()
  };
  
  if (paymentData.paymentAmount !== undefined) {
    updateData.paymentAmount = paymentData.paymentAmount;
  }
  
  if (paymentData.paymentDate) {
    updateData.paymentDate = paymentData.paymentDate;
  }
  
  if (paymentData.paymentReference) {
    updateData.paymentReference = paymentData.paymentReference;
  }
  
  const [updatedFiling] = await db.update(schema.taxFilings)
    .set(updateData)
    .where(eq(schema.taxFilings.id, id))
    .returning();
    
  return updatedFiling;
}

export async function getTaxFilingSummary(companyId: number) {
  const currentDate = new Date();
  
  // Get upcoming filings
  const upcomingFilings = await db.query.taxFilings.findMany({
    where: and(
      eq(schema.taxFilings.companyId, companyId),
      or(
        eq(schema.taxFilings.status, 'draft'),
        and(
          eq(schema.taxFilings.status, 'submitted'),
          eq(schema.taxFilings.paymentStatus, 'unpaid')
        )
      )
    ),
    orderBy: [asc(schema.taxFilings.dueDate)],
    limit: 5,
    with: {
      taxAuthority: true
    }
  });
  
  // Get filings due soon
  const dueFilings = await db.query.taxFilings.findMany({
    where: and(
      eq(schema.taxFilings.companyId, companyId),
      or(
        eq(schema.taxFilings.status, 'draft'),
        and(
          eq(schema.taxFilings.status, 'submitted'),
          eq(schema.taxFilings.paymentStatus, 'unpaid')
        )
      ),
      lt(schema.taxFilings.dueDate, new Date(currentDate.setDate(currentDate.getDate() + 30)))
    ),
    orderBy: [asc(schema.taxFilings.dueDate)],
    limit: 5,
    with: {
      taxAuthority: true
    }
  });
  
  // Get tax liability by authority
  const authorities = await db.query.taxAuthorities.findMany({
    where: inArray(
      schema.taxAuthorities.id,
      db.select({ id: schema.companyTaxSettings.taxAuthorityId })
        .from(schema.companyTaxSettings)
        .where(eq(schema.companyTaxSettings.companyId, companyId))
    )
  });
  
  const authorityLiability = await Promise.all(authorities.map(async (authority) => {
    // Get total tax liability for this authority
    const result = await db.select({
      totalLiability: sum(schema.taxFilings.taxAmount)
    })
    .from(schema.taxFilings)
    .where(and(
      eq(schema.taxFilings.companyId, companyId),
      eq(schema.taxFilings.taxAuthorityId, authority.id),
      or(
        eq(schema.taxFilings.paymentStatus, 'unpaid'),
        eq(schema.taxFilings.paymentStatus, 'partial')
      )
    ));
    
    return {
      authority,
      totalLiability: result[0]?.totalLiability || 0
    };
  }));
  
  return {
    upcomingFilings,
    dueFilings,
    authorityLiability
  };
}

// Generate a tax filing from transaction data
export async function generateTaxFiling(companyId: number, taxAuthorityId: number, startDate: Date, endDate: Date) {
  // Get the company tax settings for this authority
  const taxSettings = await db.query.companyTaxSettings.findFirst({
    where: and(
      eq(schema.companyTaxSettings.companyId, companyId),
      eq(schema.companyTaxSettings.taxAuthorityId, taxAuthorityId),
      eq(schema.companyTaxSettings.isActive, true)
    ),
    with: {
      taxAuthority: true
    }
  });
  
  if (!taxSettings) {
    throw new Error("Tax settings not found for this company and authority");
  }
  
  // Get all tax rates for this authority
  const taxRates = await getTaxRates(taxAuthorityId);
  const defaultTaxRate = taxRates.find(rate => rate.isDefault) || taxRates[0];
  
  if (!defaultTaxRate) {
    throw new Error("No tax rates found for this authority");
  }
  
  // Get sales invoices for the period
  const salesInvoices = await db.query.invoices.findMany({
    where: and(
      eq(schema.invoices.companyId, companyId),
      gte(schema.invoices.issueDate, startDate),
      lte(schema.invoices.issueDate, endDate),
      inArray(schema.invoices.status, ['issued', 'partial', 'paid'])
    ),
    with: {
      items: true
    }
  });
  
  // Get purchase bills for the period
  const purchaseBills = await db.query.bills.findMany({
    where: and(
      eq(schema.bills.companyId, companyId),
      gte(schema.bills.issueDate, startDate),
      lte(schema.bills.issueDate, endDate),
      inArray(schema.bills.status, ['received', 'partial', 'paid'])
    ),
    with: {
      items: true
    }
  });
  
  // Calculate tax amounts
  let totalSalesTaxableAmount = 0;
  let totalSalesTaxAmount = 0;
  let totalPurchaseTaxableAmount = 0;
  let totalPurchaseTaxAmount = 0;
  
  const filingItems: schema.TaxFilingItemInsert[] = [];
  
  // Process sales invoices
  salesInvoices.forEach(invoice => {
    const taxableAmount = Number(invoice.total) / (1 + (Number(defaultTaxRate.rate) / 100));
    const taxAmount = Number(invoice.total) - taxableAmount;
    
    totalSalesTaxableAmount += taxableAmount;
    totalSalesTaxAmount += taxAmount;
    
    filingItems.push({
      taxFilingId: 0, // Will be updated after filing creation
      category: 'sales',
      description: `Invoice ${invoice.invoiceNumber}`,
      taxableAmount,
      taxRate: Number(defaultTaxRate.rate),
      taxAmount,
      sourceType: 'invoice',
      sourceId: invoice.id
    });
  });
  
  // Process purchase bills
  purchaseBills.forEach(bill => {
    const taxableAmount = Number(bill.total) / (1 + (Number(defaultTaxRate.rate) / 100));
    const taxAmount = Number(bill.total) - taxableAmount;
    
    totalPurchaseTaxableAmount += taxableAmount;
    totalPurchaseTaxAmount += taxAmount;
    
    filingItems.push({
      taxFilingId: 0, // Will be updated after filing creation
      category: 'purchases',
      description: `Bill ${bill.billNumber}`,
      taxableAmount,
      taxRate: Number(defaultTaxRate.rate),
      taxAmount,
      sourceType: 'bill',
      sourceId: bill.id
    });
  });
  
  // Calculate net tax amount (sales tax - purchase tax)
  const netTaxAmount = totalSalesTaxAmount - totalPurchaseTaxAmount;
  
  // Determine due date (30 days from end of period by default)
  const dueDate = new Date(endDate);
  dueDate.setDate(dueDate.getDate() + 30);
  
  // Create the tax filing
  const filingData: schema.TaxFilingInsert = {
    companyId,
    taxAuthorityId,
    filingPeriodStart: startDate,
    filingPeriodEnd: endDate,
    dueDate,
    status: 'draft',
    taxableAmount: totalSalesTaxableAmount + totalPurchaseTaxableAmount,
    taxAmount: netTaxAmount,
    paymentStatus: 'unpaid',
    paymentDueDate: dueDate
  };
  
  // Create the filing with its items
  return await createTaxFiling(filingData, filingItems);
}

// Receipt functions
export async function createReceipt(
  data: Omit<schema.ReceiptInsert, 'receiptNumber'> & {
    userId?: number;
  }
) {
  try {
    // Validate input data
    if (!data) {
      console.error('[DB:ERROR] createReceipt: Missing receipt data');
      throw new Error('Receipt data is required');
    }

    // Validate required fields
    if (!data.companyId || isNaN(Number(data.companyId))) {
      console.error(`[DB:ERROR] createReceipt: Invalid companyId: ${data.companyId}`);
      throw new Error('Valid company ID is required');
    }

    if (!data.salesOrderId || isNaN(Number(data.salesOrderId))) {
      console.error(`[DB:ERROR] createReceipt: Invalid salesOrderId: ${data.salesOrderId}`);
      throw new Error('Valid sales order ID is required');
    }

    if (!data.customerId || isNaN(Number(data.customerId))) {
      console.error(`[DB:ERROR] createReceipt: Invalid customerId: ${data.customerId}`);
      throw new Error('Valid customer ID is required');
    }

    if (!data.debitAccountId || isNaN(Number(data.debitAccountId))) {
      console.error(`[DB:ERROR] createReceipt: Invalid debitAccountId: ${data.debitAccountId}`);
      throw new Error('Valid debit account ID is required');
    }

    if (!data.creditAccountId || isNaN(Number(data.creditAccountId))) {
      console.error(`[DB:ERROR] createReceipt: Invalid creditAccountId: ${data.creditAccountId}`);
      throw new Error('Valid credit account ID is required');
    }

    // Validate amount - ensure it's a number and positive
    const amount = parseFloat(data.amount.toString());
    if (isNaN(amount) || amount <= 0) {
      console.error(`[DB:ERROR] createReceipt: Invalid amount: ${data.amount}`);
      throw new Error('Valid positive amount is required');
    }

    console.log(`[DB:INFO] Creating receipt for salesOrderId ${data.salesOrderId} with amount ${amount}`);

    // Generate receipt number
    const result = await db.execute(
      sql`SELECT MAX(CAST(SUBSTRING(receipt_number FROM 3) AS INTEGER)) as max_num FROM receipts WHERE company_id = ${data.companyId}`
    );
    
    const maxNum = result.rows[0]?.max_num || 0;
    const nextNum = maxNum + 1;
    const receiptNumber = `RC${nextNum.toString().padStart(5, '0')}`;
    console.log(`[DB:INFO] Generated receipt number: ${receiptNumber}`);
    
    // Create a journal entry for the receipt
    const journalEntryDescription = `Payment receipt for Sales Order #${data.salesOrderId}`;
    console.log(`[DB:INFO] Creating journal entry for receipt: ${journalEntryDescription}`);
    
    const journalEntry = await createJournalEntry(
      data.companyId,
      journalEntryDescription,
      data.receiptDate,
      [
        {
          // Debit: Bank/Cash account
          accountId: data.debitAccountId,
          description: `Payment received for Sales Order`,
          debit: amount,
          credit: 0
        },
        {
          // Credit: Accounts Receivable
          accountId: data.creditAccountId,
          description: `Payment received for Sales Order`,
          debit: 0,
          credit: amount
        }
      ],
      'receipt',
      undefined,
      data.userId
    );
    
    console.log(`[DB:INFO] Journal entry created with ID: ${journalEntry.id}`);
    
    // Create the receipt
    console.log(`[DB:INFO] Inserting receipt record`);
    const [receipt] = await db.insert(schema.receipts)
      .values({
        ...data,
        amount: amount, // Use the validated amount
        receiptNumber,
        journalEntryId: journalEntry.id,
        createdBy: data.userId
      })
      .returning();
    
    console.log(`[DB:SUCCESS] Receipt created with ID: ${receipt.id}`);
    
    // Update the sales order payment status if needed
    await updateSalesOrderPaymentStatus(data.salesOrderId);
    console.log(`[DB:INFO] Updated payment status for sales order ID: ${data.salesOrderId}`);
    
    return receipt;
  } catch (error) {
    console.error(`[DB:ERROR] Failed to create receipt:`, error);
    throw error;
  }
}

export async function getReceiptById(receiptId: number) {
  try {
    // Validate receiptId to prevent NaN errors
    if (receiptId === undefined || receiptId === null || isNaN(receiptId) || receiptId <= 0) {
      console.error(`[DB:ERROR] Invalid receiptId in getReceiptById: ${receiptId} (type: ${typeof receiptId})`);
      return null;
    }
    
    // Ensure receiptId is a proper integer
    const safeReceiptId = typeof receiptId === 'string' ? parseInt(receiptId, 10) : Math.floor(Number(receiptId));
    
    if (isNaN(safeReceiptId)) {
      console.error(`[DB:ERROR] Failed to parse receiptId in getReceiptById: ${receiptId} -> ${safeReceiptId}`);
      return null;
    }
    
    console.log(`[DB:INFO] Getting receipt by ID: ${safeReceiptId}`);
    
    const receipt = await db.query.receipts.findFirst({
      where: eq(schema.receipts.id, safeReceiptId),
      with: {
        company: true,
        salesOrder: true,
        customer: true,
        debitAccount: true,
        creditAccount: true,
        journalEntry: true,
        creator: true
      }
    });
    
    if (receipt) {
      console.log(`[DB:SUCCESS] Retrieved receipt ID: ${safeReceiptId}`);
    } else {
      console.warn(`[DB:WARNING] Receipt not found: ID ${safeReceiptId}`);
    }
    
    return receipt;
  } catch (error) {
    console.error(`[DB:ERROR] Failed to get receipt ID: ${receiptId}`, error);
    return null;
  }
}

export async function getReceiptsBySalesOrderId(salesOrderId: number) {
  return await db.query.receipts.findMany({
    where: eq(schema.receipts.salesOrderId, salesOrderId),
    orderBy: [desc(schema.receipts.receiptDate)],
    with: {
      company: true,
      customer: true,
      debitAccount: true,
      creditAccount: true
    }
  });
}

export async function getReceiptsByCompanyId(companyId: number, options?: { 
  startDate?: Date, 
  endDate?: Date,
  customerId?: number
}) {
  let query = db.select().from(schema.receipts).where(eq(schema.receipts.companyId, companyId));
  
  if (options?.startDate && options?.endDate) {
    query = query.where(
      and(
        gte(schema.receipts.receiptDate, options.startDate),
        lte(schema.receipts.receiptDate, options.endDate)
      )
    );
  }
  
  if (options?.customerId) {
    query = query.where(eq(schema.receipts.customerId, options.customerId));
  }
  
  query = query.orderBy(desc(schema.receipts.receiptDate));
  
  return await query;
}

export async function updateSalesOrderPaymentStatus(salesOrderId: number) {
  // Get sales order
  const salesOrder = await db.query.salesOrders.findFirst({
    where: eq(schema.salesOrders.id, salesOrderId)
  });
  
  if (!salesOrder) {
    throw new Error('Sales order not found');
  }
  
  // Calculate total received payments
  const receiptsResult = await db.execute(
    sql`SELECT SUM(amount) as total_paid FROM receipts WHERE sales_order_id = ${salesOrderId}`
  );
  
  const totalPaid = parseFloat(receiptsResult.rows[0]?.total_paid || '0');
  
  // Update sales order status based on payments
  let status = salesOrder.status;
  
  // If the order is not in a terminal state already (canceled, closed, etc.)
  if (!['canceled', 'closed', 'returned'].includes(salesOrder.status)) {
    if (totalPaid >= parseFloat(salesOrder.total.toString())) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }
  }
  
  // Update the sales order
  await db.update(schema.salesOrders)
    .set({ 
      amountPaid: totalPaid.toString(),
      status: status
    })
    .where(eq(schema.salesOrders.id, salesOrderId));
    
  return { totalPaid, status };
}
