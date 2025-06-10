import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { hash } from "../server/utils";

async function seed() {
  try {
    console.log("Starting database seeding...");

    // Seed account types (static data for chart of accounts)
    const existingAccountTypes = await db.query.accountTypes.findMany();
    
    if (existingAccountTypes.length === 0) {
      console.log("Seeding account types...");
      
      await db.insert(schema.accountTypes).values([
        { code: "ASSET", name: "Assets", balanceSheetSection: "assets", normalBalance: "debit" },
        { code: "LIABILITY", name: "Liabilities", balanceSheetSection: "liabilities", normalBalance: "credit" },
        { code: "EQUITY", name: "Equity", balanceSheetSection: "equity", normalBalance: "credit" },
        { code: "REVENUE", name: "Revenue", balanceSheetSection: "off-balance", normalBalance: "credit" },
        { code: "EXPENSE", name: "Expenses", balanceSheetSection: "off-balance", normalBalance: "debit" },
      ]);
    }
    
    // Create a demo tenant if it doesn't exist
    let tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.name, "Acme Corp")
    });
    
    if (!tenant) {
      console.log("Creating demo tenant...");
      const [newTenant] = await db.insert(schema.tenants)
        .values({
          name: "Acme Corp",
          subdomain: "acme",
          planType: "standard",
          isActive: true
        })
        .returning();
      
      tenant = newTenant;
    }
    
    // Create a demo admin user if it doesn't exist
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, "admin@example.com")
    });
    
    if (!existingUser && tenant) {
      console.log("Creating demo admin user...");
      const hashedPassword = await hash("password123");
      
      await db.insert(schema.users)
        .values({
          tenantId: tenant.id,
          name: "John Doe",
          email: "admin@example.com",
          password: hashedPassword,
          role: "admin",
          isActive: true
        });
    }
    
    // Create demo companies if they don't exist
    const existingCompanies = await db.query.companies.findMany({
      where: eq(schema.companies.tenantId, tenant?.id || 0)
    });
    
    if (existingCompanies.length === 0 && tenant) {
      console.log("Creating demo companies...");
      
      const companies = [
        {
          tenantId: tenant.id,
          name: "Acme Trading Ltd",
          code: "TRADE",
          taxId: "12345-6789",
          address: "123 Trade St, Trading City",
          phone: "555-1234",
          email: "trading@acme.com",
          industry: "Trading",
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "Acme Manufacturing Inc",
          code: "MANUF",
          taxId: "98765-4321",
          address: "456 Factory Blvd, Manufacturing Town",
          phone: "555-5678",
          email: "manufacturing@acme.com",
          industry: "Manufacturing",
          isActive: true
        },
        {
          tenantId: tenant.id,
          name: "Acme Services LLC",
          code: "SERV",
          taxId: "11111-2222",
          address: "789 Service Ave, Service City",
          phone: "555-9012",
          email: "services@acme.com",
          industry: "Services",
          isActive: true
        }
      ];
      
      for (const company of companies) {
        const [newCompany] = await db.insert(schema.companies)
          .values(company)
          .returning();
        
        // Create default chart of accounts for each company
        const accountTypes = await db.query.accountTypes.findMany();
        if (accountTypes.length > 0) {
          await createDefaultChartOfAccounts(newCompany.id, accountTypes);
        }
      }
    }
    
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

async function createDefaultChartOfAccounts(companyId: number, accountTypes: typeof schema.accountTypes.$inferSelect[]) {
  console.log(`Creating default chart of accounts for company ID: ${companyId}`);
  
  // Find account types by code
  const assetType = accountTypes.find(at => at.code === "ASSET");
  const liabilityType = accountTypes.find(at => at.code === "LIABILITY");
  const equityType = accountTypes.find(at => at.code === "EQUITY");
  const revenueType = accountTypes.find(at => at.code === "REVENUE");
  const expenseType = accountTypes.find(at => at.code === "EXPENSE");
  
  if (!assetType || !liabilityType || !equityType || !revenueType || !expenseType) {
    console.error("Not all required account types found");
    return;
  }
  
  // Create parent accounts
  const parents = [
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1000", 
      name: "Assets", 
      level: 1,
      parentId: null 
    },
    { 
      companyId, 
      accountTypeId: liabilityType.id, 
      code: "2000", 
      name: "Liabilities", 
      level: 1,
      parentId: null 
    },
    { 
      companyId, 
      accountTypeId: equityType.id, 
      code: "3000", 
      name: "Equity", 
      level: 1,
      parentId: null 
    },
    { 
      companyId, 
      accountTypeId: revenueType.id, 
      code: "4000", 
      name: "Revenue", 
      level: 1,
      parentId: null 
    },
    { 
      companyId, 
      accountTypeId: expenseType.id, 
      code: "5000", 
      name: "Expenses", 
      level: 1,
      parentId: null 
    }
  ];
  
  const parentAccounts: Record<string, typeof schema.accounts.$inferSelect> = {};
  
  for (const parent of parents) {
    const [account] = await db.insert(schema.accounts)
      .values(parent)
      .returning();
    
    parentAccounts[account.code] = account;
  }
  
  // Create child accounts
  const childAccounts = [
    // Assets
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1100", 
      name: "Current Assets", 
      level: 2,
      parentId: parentAccounts["1000"].id 
    },
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1200", 
      name: "Fixed Assets", 
      level: 2,
      parentId: parentAccounts["1000"].id 
    },
    
    // Liabilities
    { 
      companyId, 
      accountTypeId: liabilityType.id, 
      code: "2100", 
      name: "Current Liabilities", 
      level: 2,
      parentId: parentAccounts["2000"].id 
    },
    { 
      companyId, 
      accountTypeId: liabilityType.id, 
      code: "2200", 
      name: "Long-term Liabilities", 
      level: 2,
      parentId: parentAccounts["2000"].id 
    },
    
    // Equity
    { 
      companyId, 
      accountTypeId: equityType.id, 
      code: "3100", 
      name: "Capital", 
      level: 2,
      parentId: parentAccounts["3000"].id 
    },
    { 
      companyId, 
      accountTypeId: equityType.id, 
      code: "3200", 
      name: "Retained Earnings", 
      level: 2,
      parentId: parentAccounts["3000"].id 
    },
    
    // Revenue
    { 
      companyId, 
      accountTypeId: revenueType.id, 
      code: "4100", 
      name: "Sales Revenue", 
      level: 2,
      parentId: parentAccounts["4000"].id 
    },
    { 
      companyId, 
      accountTypeId: revenueType.id, 
      code: "4200", 
      name: "Other Revenue", 
      level: 2,
      parentId: parentAccounts["4000"].id 
    },
    
    // Expenses
    { 
      companyId, 
      accountTypeId: expenseType.id, 
      code: "5100", 
      name: "Cost of Goods Sold", 
      level: 2,
      parentId: parentAccounts["5000"].id 
    },
    { 
      companyId, 
      accountTypeId: expenseType.id, 
      code: "5200", 
      name: "Operating Expenses", 
      level: 2,
      parentId: parentAccounts["5000"].id 
    }
  ];
  
  const level2Accounts: Record<string, typeof schema.accounts.$inferSelect> = {};
  
  for (const child of childAccounts) {
    const [account] = await db.insert(schema.accounts)
      .values(child)
      .returning();
    
    level2Accounts[account.code] = account;
  }
  
  // Create level 3 accounts
  const level3Accounts = [
    // Current Assets
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1110", 
      name: "Cash", 
      level: 3,
      parentId: level2Accounts["1100"].id 
    },
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1120", 
      name: "Accounts Receivable", 
      level: 3,
      parentId: level2Accounts["1100"].id 
    },
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1130", 
      name: "Inventory", 
      level: 3,
      parentId: level2Accounts["1100"].id 
    },
    
    // Fixed Assets
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1210", 
      name: "Equipment", 
      level: 3,
      parentId: level2Accounts["1200"].id 
    },
    { 
      companyId, 
      accountTypeId: assetType.id, 
      code: "1220", 
      name: "Buildings", 
      level: 3,
      parentId: level2Accounts["1200"].id 
    },
    
    // Current Liabilities
    { 
      companyId, 
      accountTypeId: liabilityType.id, 
      code: "2110", 
      name: "Accounts Payable", 
      level: 3,
      parentId: level2Accounts["2100"].id 
    },
    { 
      companyId, 
      accountTypeId: liabilityType.id, 
      code: "2120", 
      name: "Salaries Payable", 
      level: 3,
      parentId: level2Accounts["2100"].id 
    },
    
    // Long-term Liabilities
    { 
      companyId, 
      accountTypeId: liabilityType.id, 
      code: "2210", 
      name: "Long-term Loans", 
      level: 3,
      parentId: level2Accounts["2200"].id 
    },
    
    // Sales Revenue
    { 
      companyId, 
      accountTypeId: revenueType.id, 
      code: "4110", 
      name: "Product Sales", 
      level: 3,
      parentId: level2Accounts["4100"].id 
    },
    { 
      companyId, 
      accountTypeId: revenueType.id, 
      code: "4120", 
      name: "Service Sales", 
      level: 3,
      parentId: level2Accounts["4100"].id 
    },
    
    // Operating Expenses
    { 
      companyId, 
      accountTypeId: expenseType.id, 
      code: "5210", 
      name: "Rent Expense", 
      level: 3,
      parentId: level2Accounts["5200"].id 
    },
    { 
      companyId, 
      accountTypeId: expenseType.id, 
      code: "5220", 
      name: "Utilities Expense", 
      level: 3,
      parentId: level2Accounts["5200"].id 
    },
    { 
      companyId, 
      accountTypeId: expenseType.id, 
      code: "5230", 
      name: "Salaries Expense", 
      level: 3,
      parentId: level2Accounts["5200"].id 
    },
    { 
      companyId, 
      accountTypeId: expenseType.id, 
      code: "5240", 
      name: "Office Supplies", 
      level: 3,
      parentId: level2Accounts["5200"].id 
    },
  ];
  
  for (const account of level3Accounts) {
    await db.insert(schema.accounts)
      .values(account);
  }
}

seed();
