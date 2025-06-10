import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, uniqueIndex, foreignKey, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Audit logs for system activity tracking
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(), // users, companies, invoices, etc.
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // create, update, delete, login, etc.
  actionDetails: jsonb("action_details").default({}).notNull(), // Details about what was changed
  performedBy: integer("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: text("severity").default("info").notNull(), // info, warning, error, critical
  metadata: jsonb("metadata").default({}).notNull(), // Additional metadata
}, (table) => {
  return {
    tenantIdIdx: index("audit_logs_tenant_id_idx").on(table.tenantId),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    performedAtIdx: index("audit_logs_performed_at_idx").on(table.performedAt),
  };
});

// Tenants (High-level clients of the SaaS)
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  planType: text("plan_type").default("standard").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  companies: many(companies),
  users: many(users),
  roles: many(roles),
}));

// Roles for RBAC
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isSystemRole: boolean("is_system_role").default(false).notNull(), // True for built-in roles that cannot be deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantRoleIdx: uniqueIndex("tenant_role_idx").on(table.tenantId, table.name),
  };
});

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
  permissions: many(rolePermissions),
  users: many(userRoles),
}));

// Permission definitions
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., "invoice.create", "report.view"
  name: text("name").notNull(),
  description: text("description"),
  module: text("module").notNull(), // e.g., "invoices", "reports", "settings"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

// Role-Permission assignments
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    rolePermissionIdx: uniqueIndex("role_permission_idx").on(table.roleId, table.permissionId),
  };
});

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// Users (People who can access the system)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    tenantIdIdx: index("users_tenant_id_idx").on(table.tenantId),
  };
});

// User-Role assignments
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userRoleIdx: uniqueIndex("user_role_idx").on(table.userId, table.roleId),
  };
});

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  roles: many(userRoles),
  userCompanies: many(userCompanies),
}));

// Companies (Business entities under a tenant)
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  companyType: text("company_type").notNull(), // manufacturer, plant, distributor
  taxId: text("tax_id"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  fiscalYear: text("fiscal_year").default("calendar").notNull(), // calendar, custom
  baseCurrency: text("base_currency").default("USD").notNull(),
  industry: text("industry"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    tenantIdIdx: index("companies_tenant_id_idx").on(table.tenantId),
  };
});

export const companiesRelations = relations(companies, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [companies.tenantId],
    references: [tenants.id],
  }),
  accounts: many(accounts),
  userCompanies: many(userCompanies),
  journalEntries: many(journalEntries),
  salesOrders: many(salesOrders),
  purchaseOrders: many(purchaseOrders),
  invoices: many(invoices),
  bills: many(bills),
  sourceIntercompanyTransactions: many(intercompanyTransactions, { relationName: 'sourceCompany' }),
  targetIntercompanyTransactions: many(intercompanyTransactions, { relationName: 'targetCompany' }),
}));

// UserCompany (Junction table for users and companies)
export const userCompanies = pgTable("user_companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  // Enhanced permission model using specific permission grants
  canView: boolean("can_view").default(true).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  canCreateTransactions: boolean("can_create_transactions").default(false).notNull(),
  canApproveTransactions: boolean("can_approve_transactions").default(false).notNull(),
  canViewReports: boolean("can_view_reports").default(true).notNull(),
  canManageUsers: boolean("can_manage_users").default(false).notNull(),
  canAccessSettings: boolean("can_access_settings").default(false).notNull(),
  restrictions: jsonb("restrictions").default({}).notNull(), // For storing complex permission rules
  isDefault: boolean("is_default").default(false).notNull(), // Whether this is the user's default company
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userCompanyIdx: uniqueIndex("user_company_idx").on(table.userId, table.companyId),
  };
});

export const userCompaniesRelations = relations(userCompanies, ({ one, many }) => ({
  user: one(users, {
    fields: [userCompanies.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [userCompanies.companyId],
    references: [companies.id],
  }),
  permissions: many(userCompanyPermissions),
}));

// More granular permissions model for company-specific function access
export const userCompanyPermissions = pgTable("user_company_permissions", {
  id: serial("id").primaryKey(),
  userCompanyId: integer("user_company_id").references(() => userCompanies.id, { onDelete: "cascade" }).notNull(),
  module: text("module").notNull(), // e.g., "invoices", "reports", "banking"
  action: text("action").notNull(), // e.g., "view", "create", "approve"
  isAllowed: boolean("is_allowed").default(true).notNull(),
  conditions: jsonb("conditions").default({}).notNull(), // E.g., limit by amount, date range, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    moduleActionIdx: uniqueIndex("module_action_idx").on(table.userCompanyId, table.module, table.action),
  };
});

export const userCompanyPermissionsRelations = relations(userCompanyPermissions, ({ one }) => ({
  userCompany: one(userCompanies, {
    fields: [userCompanyPermissions.userCompanyId],
    references: [userCompanies.id],
  }),
}));

// Account Types (For Chart of Accounts classification)
export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  balanceSheetSection: text("balance_sheet_section").notNull(), // assets, liabilities, equity, off-balance
  normalBalance: text("normal_balance").notNull(), // debit, credit
  isActive: boolean("is_active").default(true).notNull(),
});

export const accountTypesRelations = relations(accountTypes, ({ many }) => ({
  accounts: many(accounts),
}));

// Accounts (Chart of Accounts)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  accountTypeId: integer("account_type_id").references(() => accountTypes.id).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id").references(() => accounts.id),
  level: integer("level").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("accounts_company_id_idx").on(table.companyId),
    companyCodeIdx: uniqueIndex("accounts_company_code_idx").on(table.companyId, table.code),
  };
});

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  company: one(companies, {
    fields: [accounts.companyId],
    references: [companies.id],
  }),
  accountType: one(accountTypes, {
    fields: [accounts.accountTypeId],
    references: [accountTypes.id],
  }),
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
  }),
  children: many(accounts, { relationName: 'parentChild' }),
  journalEntryItems: many(journalEntryItems),
}));

// Fiscal Periods
export const fiscalPeriods = pgTable("fiscal_periods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fiscalPeriodsRelations = relations(fiscalPeriods, ({ one }) => ({
  company: one(companies, {
    fields: [fiscalPeriods.companyId],
    references: [companies.id],
  }),
}));

// Journal Entries
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  entryNumber: text("entry_number"),
  reference: text("reference"),
  sourceType: text("source_type"), // manual, sales, purchase, etc.
  sourceId: integer("source_id"), // ID of the source document
  description: text("description"),
  entryDate: timestamp("entry_date").notNull(),
  postedDate: timestamp("posted_date"),
  isPosted: boolean("is_posted").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("journal_entries_company_id_idx").on(table.companyId),
  };
});

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  company: one(companies, {
    fields: [journalEntries.companyId],
    references: [companies.id],
  }),
  creator: one(users, {
    fields: [journalEntries.createdBy],
    references: [users.id],
  }),
  items: many(journalEntryItems),
}));

// Journal Entry Items
export const journalEntryItems = pgTable("journal_entry_items", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id, { onDelete: "cascade" }).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  description: text("description"),
  debit: numeric("debit", { precision: 15, scale: 2 }).default("0").notNull(),
  credit: numeric("credit", { precision: 15, scale: 2 }).default("0").notNull(),
}, (table) => {
  return {
    journalEntryIdIdx: index("journal_entry_items_journal_entry_id_idx").on(table.journalEntryId),
    accountIdIdx: index("journal_entry_items_account_id_idx").on(table.accountId),
  };
});

export const journalEntryItemsRelations = relations(journalEntryItems, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryItems.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryItems.accountId],
    references: [accounts.id],
  }),
}));

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("customers_company_id_idx").on(table.companyId),
  };
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  salesOrders: many(salesOrders),
  invoices: many(invoices),
}));

// Vendors
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("vendors_company_id_idx").on(table.companyId),
  };
});

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  company: one(companies, {
    fields: [vendors.companyId],
    references: [companies.id],
  }),
  purchaseOrders: many(purchaseOrders),
  bills: many(bills),
}));

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  salesPrice: numeric("sales_price", { precision: 15, scale: 2 }).default("0").notNull(),
  purchasePrice: numeric("purchase_price", { precision: 15, scale: 2 }).default("0").notNull(),
  salesAccountId: integer("sales_account_id").references(() => accounts.id),
  purchaseAccountId: integer("purchase_account_id").references(() => accounts.id),
  inventoryAccountId: integer("inventory_account_id").references(() => accounts.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("products_company_id_idx").on(table.companyId),
    companyCodeIdx: uniqueIndex("products_company_code_idx").on(table.companyId, table.code),
  };
});

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  salesAccount: one(accounts, {
    fields: [products.salesAccountId],
    references: [accounts.id],
  }),
  purchaseAccount: one(accounts, {
    fields: [products.purchaseAccountId],
    references: [accounts.id],
  }),
  inventoryAccount: one(accounts, {
    fields: [products.inventoryAccountId],
    references: [accounts.id],
  }),
}));

// Sales Orders
export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  orderNumber: text("order_number").notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  orderDate: timestamp("order_date").notNull(),
  expectedDate: timestamp("expected_date"),
  status: text("status").default("draft").notNull(), // draft, open, delivered, invoiced, closed, cancelled
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("sales_orders_company_id_idx").on(table.companyId),
    customerIdIdx: index("sales_orders_customer_id_idx").on(table.customerId),
    companyOrderNumberIdx: uniqueIndex("sales_orders_company_order_number_idx").on(table.companyId, table.orderNumber),
  };
});

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  company: one(companies, {
    fields: [salesOrders.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [salesOrders.createdBy],
    references: [users.id],
  }),
  items: many(salesOrderItems),
  invoices: many(invoices),
  receipts: many(receipts),
}));

// Sales Order Items
export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").references(() => salesOrders.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  description: text("description"),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("0").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
  invoicedQuantity: numeric("invoiced_quantity", { precision: 15, scale: 2 }).default("0").notNull(),
  fullyInvoiced: boolean("fully_invoiced").default(false).notNull(),
}, (table) => {
  return {
    salesOrderIdIdx: index("sales_order_items_sales_order_id_idx").on(table.salesOrderId),
  };
});

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one, many }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  product: one(products, {
    fields: [salesOrderItems.productId],
    references: [products.id],
  }),
  invoiceItems: many(invoiceItems),
}));

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  salesOrderId: integer("sales_order_id").references(() => salesOrders.id),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").default("open").notNull(), // draft, open, paid, partial, overdue, void
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  amountPaid: numeric("amount_paid", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceDue: numeric("balance_due", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("invoices_company_id_idx").on(table.companyId),
    customerIdIdx: index("invoices_customer_id_idx").on(table.customerId),
    salesOrderIdIdx: index("invoices_sales_order_id_idx").on(table.salesOrderId),
    companyInvoiceNumberIdx: uniqueIndex("invoices_company_invoice_number_idx").on(table.companyId, table.invoiceNumber),
  };
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [invoices.salesOrderId],
    references: [salesOrders.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [invoices.journalEntryId],
    references: [journalEntries.id],
  }),
  creator: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  items: many(invoiceItems),
}));

// Invoice Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  description: text("description"),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("0").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
  paidQuantity: numeric("paid_quantity", { precision: 15, scale: 2 }).default("0").notNull(),
  fullyPaid: boolean("fully_paid").default(false).notNull(),
  soItemId: integer("so_item_id").references(() => salesOrderItems.id),
}, (table) => {
  return {
    invoiceIdIdx: index("invoice_items_invoice_id_idx").on(table.invoiceId),
  };
});

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
  salesOrderItem: one(salesOrderItems, {
    fields: [invoiceItems.soItemId],
    references: [salesOrderItems.id],
  }),
}));

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  orderNumber: text("order_number").notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  orderDate: timestamp("order_date").notNull(),
  expectedDate: timestamp("expected_date"),
  status: text("status").default("draft").notNull(), // draft, open, received, billed, closed, cancelled
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("purchase_orders_company_id_idx").on(table.companyId),
    vendorIdIdx: index("purchase_orders_vendor_id_idx").on(table.vendorId),
    companyOrderNumberIdx: uniqueIndex("purchase_orders_company_order_number_idx").on(table.companyId, table.orderNumber),
  };
});

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  company: one(companies, {
    fields: [purchaseOrders.companyId],
    references: [companies.id],
  }),
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  creator: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
  bills: many(bills),
}));

// Purchase Order Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  description: text("description"),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("0").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
}, (table) => {
  return {
    purchaseOrderIdIdx: index("purchase_order_items_purchase_order_id_idx").on(table.purchaseOrderId),
  };
});

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
}));

// Bills (Purchase Invoices)
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  billNumber: text("bill_number").notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  billDate: timestamp("bill_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").default("open").notNull(), // draft, open, paid, partial, overdue, void
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  amountPaid: numeric("amount_paid", { precision: 15, scale: 2 }).default("0").notNull(),
  balanceDue: numeric("balance_due", { precision: 15, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("bills_company_id_idx").on(table.companyId),
    vendorIdIdx: index("bills_vendor_id_idx").on(table.vendorId),
    purchaseOrderIdIdx: index("bills_purchase_order_id_idx").on(table.purchaseOrderId),
    companyBillNumberIdx: uniqueIndex("bills_company_bill_number_idx").on(table.companyId, table.billNumber),
  };
});

export const billsRelations = relations(bills, ({ one, many }) => ({
  company: one(companies, {
    fields: [bills.companyId],
    references: [companies.id],
  }),
  vendor: one(vendors, {
    fields: [bills.vendorId],
    references: [vendors.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [bills.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [bills.journalEntryId],
    references: [journalEntries.id],
  }),
  creator: one(users, {
    fields: [bills.createdBy],
    references: [users.id],
  }),
  items: many(billItems),
}));

// Bill Items
export const billItems = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").references(() => bills.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  description: text("description"),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("0").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
}, (table) => {
  return {
    billIdIdx: index("bill_items_bill_id_idx").on(table.billId),
  };
});

export const billItemsRelations = relations(billItems, ({ one }) => ({
  bill: one(bills, {
    fields: [billItems.billId],
    references: [bills.id],
  }),
  product: one(products, {
    fields: [billItems.productId],
    references: [products.id],
  }),
}));

// Receipts (for Sales Order Payments)
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  salesOrderId: integer("sales_order_id").references(() => salesOrders.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  receiptNumber: text("receipt_number").notNull(),
  receiptDate: timestamp("receipt_date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
  paymentMethod: text("payment_method").notNull(), // bank_transfer, cash, check, credit_card, etc.
  reference: text("reference"), // Check #, Transaction ID, etc.
  isPartialPayment: boolean("is_partial_payment").default(false).notNull(),
  debitAccountId: integer("debit_account_id").references(() => accounts.id).notNull(),
  creditAccountId: integer("credit_account_id").references(() => accounts.id).notNull(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("receipts_company_id_idx").on(table.companyId),
    salesOrderIdIdx: index("receipts_sales_order_id_idx").on(table.salesOrderId),
    customerIdIdx: index("receipts_customer_id_idx").on(table.customerId),
    invoiceIdIdx: index("receipts_invoice_id_idx").on(table.invoiceId),
    receiptNumberIdx: uniqueIndex("receipts_receipt_number_idx").on(table.receiptNumber),
  };
});

export const receiptsRelations = relations(receipts, ({ one }) => ({
  company: one(companies, {
    fields: [receipts.companyId],
    references: [companies.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [receipts.salesOrderId],
    references: [salesOrders.id],
  }),
  customer: one(customers, {
    fields: [receipts.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [receipts.invoiceId],
    references: [invoices.id],
  }),
  debitAccount: one(accounts, {
    fields: [receipts.debitAccountId],
    references: [accounts.id],
  }),
  creditAccount: one(accounts, {
    fields: [receipts.creditAccountId],
    references: [accounts.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [receipts.journalEntryId],
    references: [journalEntries.id],
  }),
  creator: one(users, {
    fields: [receipts.createdBy],
    references: [users.id],
  }),
}));

// Payments (for Bills)
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  billId: integer("bill_id").references(() => bills.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  paymentNumber: text("payment_number").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
  paymentMethod: text("payment_method").notNull(), // bank_transfer, cash, check, credit_card, etc.
  reference: text("reference"), // Check #, Transaction ID, etc.
  isPartialPayment: boolean("is_partial_payment").default(false).notNull(),
  debitAccountId: integer("debit_account_id").references(() => accounts.id).notNull(),
  creditAccountId: integer("credit_account_id").references(() => accounts.id).notNull(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("payments_company_id_idx").on(table.companyId),
    billIdIdx: index("payments_bill_id_idx").on(table.billId),
    vendorIdIdx: index("payments_vendor_id_idx").on(table.vendorId),
    paymentNumberIdx: uniqueIndex("payments_payment_number_idx").on(table.paymentNumber),
  };
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  company: one(companies, {
    fields: [payments.companyId],
    references: [companies.id],
  }),
  bill: one(bills, {
    fields: [payments.billId],
    references: [bills.id],
  }),
  vendor: one(vendors, {
    fields: [payments.vendorId],
    references: [vendors.id],
  }),
  debitAccount: one(accounts, {
    fields: [payments.debitAccountId],
    references: [accounts.id],
  }),
  creditAccount: one(accounts, {
    fields: [payments.creditAccountId],
    references: [accounts.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [payments.journalEntryId],
    references: [journalEntries.id],
  }),
  creator: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));

// Credit Notes (for Sales/Invoices)
export const creditNotes = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  noteNumber: text("note_number").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date"),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  status: text("status").default("draft").notNull(), // draft, issued, partial, applied, cancelled
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("credit_notes_company_id_idx").on(table.companyId),
    customerIdIdx: index("credit_notes_customer_id_idx").on(table.customerId),
    invoiceIdIdx: index("credit_notes_invoice_id_idx").on(table.invoiceId),
    noteNumberIdx: uniqueIndex("credit_notes_note_number_idx").on(table.noteNumber),
  };
});

export const creditNoteItems = pgTable("credit_note_items", {
  id: serial("id").primaryKey(),
  creditNoteId: integer("credit_note_id").references(() => creditNotes.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale:
 2 }),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
});

export const creditNotesRelations = relations(creditNotes, ({ one, many }) => ({
  company: one(companies, {
    fields: [creditNotes.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [creditNotes.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [creditNotes.invoiceId],
    references: [invoices.id],
  }),
  items: many(creditNoteItems),
  journalEntry: one(journalEntries, {
    fields: [creditNotes.journalEntryId],
    references: [journalEntries.id],
  }),
}));

export const creditNoteItemsRelations = relations(creditNoteItems, ({ one }) => ({
  creditNote: one(creditNotes, {
    fields: [creditNoteItems.creditNoteId],
    references: [creditNotes.id],
  }),
  product: one(products, {
    fields: [creditNoteItems.productId],
    references: [products.id],
  }),
}));

// Debit Notes (for Purchases/Bills)
export const debitNotes = pgTable("debit_notes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  billId: integer("bill_id").references(() => bills.id),
  noteNumber: text("note_number").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date"),
  total: numeric("total", { precision: 15, scale: 2 }).default("0").notNull(),
  status: text("status").default("draft").notNull(), // draft, issued, partial, applied, cancelled
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("debit_notes_company_id_idx").on(table.companyId),
    vendorIdIdx: index("debit_notes_vendor_id_idx").on(table.vendorId),
    billIdIdx: index("debit_notes_bill_id_idx").on(table.billId),
    noteNumberIdx: uniqueIndex("debit_notes_note_number_idx").on(table.noteNumber),
  };
});

export const debitNoteItems = pgTable("debit_note_items", {
  id: serial("id").primaryKey(),
  debitNoteId: integer("debit_note_id").references(() => debitNotes.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }),
  amount: numeric("amount", { precision: 15, scale: 2 }).default("0").notNull(),
});

export const debitNotesRelations = relations(debitNotes, ({ one, many }) => ({
  company: one(companies, {
    fields: [debitNotes.companyId],
    references: [companies.id],
  }),
  vendor: one(vendors, {
    fields: [debitNotes.vendorId],
    references: [vendors.id],
  }),
  bill: one(bills, {
    fields: [debitNotes.billId],
    references: [bills.id],
  }),
  items: many(debitNoteItems),
  journalEntry: one(journalEntries, {
    fields: [debitNotes.journalEntryId],
    references: [journalEntries.id],
  }),
}));

export const debitNoteItemsRelations = relations(debitNoteItems, ({ one }) => ({
  debitNote: one(debitNotes, {
    fields: [debitNoteItems.debitNoteId],
    references: [debitNotes.id],
  }),
  product: one(products, {
    fields: [debitNoteItems.productId],
    references: [products.id],
  }),
}));

// Intercompany Transactions
export const intercompanyTransactions = pgTable("intercompany_transactions", {
  id: serial("id").primaryKey(),
  sourceCompanyId: integer("source_company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  targetCompanyId: integer("target_company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  sourceJournalEntryId: integer("source_journal_entry_id").references(() => journalEntries.id),
  targetJournalEntryId: integer("target_journal_entry_id").references(() => journalEntries.id),
  sourceOrderId: integer("source_order_id").references(() => salesOrders.id),
  targetOrderId: integer("target_order_id").references(() => purchaseOrders.id),
  sourceInvoiceId: integer("source_invoice_id").references(() => invoices.id),
  targetBillId: integer("target_bill_id").references(() => bills.id),
  sourceReceiptId: integer("source_receipt_id").references(() => receipts.id),
  targetPaymentId: integer("target_payment_id").references(() => payments.id),
  sourceDeliveryId: integer("source_delivery_id"),
  targetGoodsReceiptId: integer("target_goods_receipt_id"),
  isPartialInvoice: boolean("is_partial_invoice").default(false),
  paymentStatus: text("payment_status").default("pending").notNull(), // pending, partial, paid
  status: text("status").default("pending").notNull(), // pending, completed, cancelled
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    sourceCompanyIdIdx: index("intercompany_transactions_source_company_id_idx").on(table.sourceCompanyId),
    targetCompanyIdIdx: index("intercompany_transactions_target_company_id_idx").on(table.targetCompanyId),
  };
});

export const intercompanyTransactionsRelations = relations(intercompanyTransactions, ({ one }) => ({
  sourceCompany: one(companies, {
    fields: [intercompanyTransactions.sourceCompanyId],
    references: [companies.id],
    relationName: 'sourceCompany',
  }),
  targetCompany: one(companies, {
    fields: [intercompanyTransactions.targetCompanyId],
    references: [companies.id],
    relationName: 'targetCompany',
  }),
  sourceJournalEntry: one(journalEntries, {
    fields: [intercompanyTransactions.sourceJournalEntryId],
    references: [journalEntries.id],
    relationName: 'sourceJournalEntry',
  }),
  targetJournalEntry: one(journalEntries, {
    fields: [intercompanyTransactions.targetJournalEntryId],
    references: [journalEntries.id],
    relationName: 'targetJournalEntry',
  }),
  creator: one(users, {
    fields: [intercompanyTransactions.createdBy],
    references: [users.id],
  }),
}));

// Create Zod schemas for CRUD operations
export const insertTenantSchema = createInsertSchema(tenants, {
  name: (schema) => schema.min(3, "Tenant name must be at least 3 characters"),
  subdomain: (schema) => schema.min(3, "Subdomain must be at least 3 characters"),
});
export type TenantInsert = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export const insertUserSchema = createInsertSchema(users, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  password: (schema) => schema.min(8, "Password must be at least 8 characters"),
});
export type UserInsert = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertCompanySchema = createInsertSchema(companies, {
  name: (schema) => schema.min(2, "Company name must be at least 2 characters"),
  code: (schema) => schema.min(2, "Company code must be at least 2 characters"),
  companyType: (schema) => schema.refine(
    val => ['manufacturer', 'plant', 'distributor'].includes(val),
    { message: "Company type must be 'manufacturer', 'plant', or 'distributor'" }
  ),
});
export type CompanyInsert = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export const insertAccountSchema = createInsertSchema(accounts, {
  name: (schema) => schema.min(2, "Account name must be at least 2 characters"),
  code: (schema) => schema.min(2, "Account code must be at least 2 characters"),
});
export type AccountInsert = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginCredentials = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  tenantName: z.string().min(3, "Tenant name must be at least 3 characters"),
  subdomain: z.string().min(3, "Subdomain must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
export type RegisterCredentials = z.infer<typeof registerSchema>;

export const insertIntercompanyTransactionSchema = createInsertSchema(intercompanyTransactions, {
  description: (schema) => schema.min(3, "Description must be at least 3 characters"),
  amount: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Amount must be greater than or equal to 0"),
  transactionDate: () => z.coerce.date(),
  type: (schema) => schema.optional(),
});
export type IntercompanyTransactionInsert = z.infer<typeof insertIntercompanyTransactionSchema>;
export type IntercompanyTransaction = typeof intercompanyTransactions.$inferSelect;

// Purchase Orders
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders, {
  orderNumber: (schema) => schema.min(1, "Order number is required"),
  total: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Total must be greater than or equal to 0"),
});
export type PurchaseOrderInsert = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Bank Accounts
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  routingNumber: text("routing_number"),
  currency: text("currency").default("USD").notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(), // link to chart of accounts
  isActive: boolean("is_active").default(true).notNull(),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("bank_accounts_company_id_idx").on(table.companyId),
  };
});

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  company: one(companies, {
    fields: [bankAccounts.companyId],
    references: [companies.id],
  }),
  account: one(accounts, {
    fields: [bankAccounts.accountId],
    references: [accounts.id],
  }),
  transactions: many(bankTransactions),
}));

// Payment Terms
export const paymentTerms = pgTable("payment_terms", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  daysUntilDue: integer("days_until_due").default(30).notNull(),
  billingFrequency: text("billing_frequency").default("one_time").notNull(), // one_time, monthly, quarterly, annually
  discountDays: integer("discount_days").default(0),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    companyIdIdx: index("payment_terms_company_id_idx").on(table.companyId),
  };
});

export const paymentTermsRelations = relations(paymentTerms, ({ one, many }) => ({
  company: one(companies, {
    fields: [paymentTerms.companyId],
    references: [companies.id],
  }),
  invoices: many(invoices),
  bills: many(bills),
}));

// Bank Transactions
export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: text("type").notNull(), // debit, credit
  reference: text("reference"),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id),
  status: text("status").default("unreconciled").notNull(), // reconciled, pending, unreconciled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    bankAccountIdIdx: index("bank_transactions_bank_account_id_idx").on(table.bankAccountId),
  };
});

export const bankTransactionsRelations = relations(bankTransactions, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankTransactions.bankAccountId],
    references: [bankAccounts.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [bankTransactions.journalEntryId],
    references: [journalEntries.id],
  }),
}));

// Type definitions for the bank accounts
export const insertBankAccountSchema = createInsertSchema(bankAccounts, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  accountNumber: (schema) => schema.min(4, "Account number must be at least 4 characters"),
  bankName: (schema) => schema.min(2, "Bank name must be at least 2 characters"),
});
export type BankAccountInsert = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;

// Type definitions for the bank transactions
export const insertBankTransactionSchema = createInsertSchema(bankTransactions, {
  description: (schema) => schema.min(2, "Description must be at least 2 characters"),
  type: (schema) => schema.refine(val => ['debit', 'credit'].includes(val), {
    message: "Type must be 'debit' or 'credit'",
  }),
  status: (schema) => schema.refine(val => ['reconciled', 'pending', 'unreconciled'].includes(val), {
    message: "Status must be 'reconciled', 'pending', or 'unreconciled'",
  }),
});
export type BankTransactionInsert = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;

// Credit Notes Schema and Types
export const insertCreditNoteSchema = createInsertSchema(creditNotes, {
  noteNumber: (schema) => schema.min(1, "Note number is required"),
  total: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Total must be greater than or equal to 0"),
  issueDate: () => z.coerce.date(),
  dueDate: () => z.coerce.date().optional(),
  status: (schema) => schema.refine(val => ['draft', 'issued', 'partial', 'applied', 'cancelled'].includes(val), {
    message: "Status must be one of: draft, issued, partial, applied, cancelled",
  }),
});
export type CreditNoteInsert = z.infer<typeof insertCreditNoteSchema>;
export type CreditNote = typeof creditNotes.$inferSelect;

export const insertCreditNoteItemSchema = createInsertSchema(creditNoteItems, {
  description: (schema) => schema.min(2, "Description must be at least 2 characters"),
  quantity: (schema) => schema.refine((val) => parseFloat(val.toString()) > 0, "Quantity must be greater than 0"),
  unitPrice: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Unit price must be greater than or equal to 0"),
  amount: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Amount must be greater than or equal to 0"),
});
export type CreditNoteItemInsert = z.infer<typeof insertCreditNoteItemSchema>;
export type CreditNoteItem = typeof creditNoteItems.$inferSelect;

// Debit Notes Schema and Types
export const insertDebitNoteSchema = createInsertSchema(debitNotes, {
  noteNumber: (schema) => schema.min(1, "Note number is required"),
  total: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Total must be greater than or equal to 0"),
  issueDate: () => z.coerce.date(),
  dueDate: () => z.coerce.date().optional(),
  status: (schema) => schema.refine(val => ['draft', 'issued', 'partial', 'applied', 'cancelled'].includes(val), {
    message: "Status must be one of: draft, issued, partial, applied, cancelled",
  }),
});
export type DebitNoteInsert = z.infer<typeof insertDebitNoteSchema>;
export type DebitNote = typeof debitNotes.$inferSelect;

export const insertDebitNoteItemSchema = createInsertSchema(debitNoteItems, {
  description: (schema) => schema.min(2, "Description must be at least 2 characters"),
  quantity: (schema) => schema.refine((val) => parseFloat(val.toString()) > 0, "Quantity must be greater than 0"),
  unitPrice: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Unit price must be greater than or equal to 0"),
  amount: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Amount must be greater than or equal to 0"),
});
export type DebitNoteItemInsert = z.infer<typeof insertDebitNoteItemSchema>;
export type DebitNoteItem = typeof debitNoteItems.$inferSelect;

// Receipt Schema
export const insertReceiptSchema = createInsertSchema(receipts, {
  receiptNumber: (schema) => schema.min(3, "Receipt number must be at least 3 characters"),
  receiptDate: () => z.coerce.date(),
  amount: (schema) => schema.refine((val) => parseFloat(val.toString()) > 0, "Amount must be greater than 0"),
  paymentMethod: (schema) => schema.refine(val => 
    ['bank_transfer', 'cash', 'check', 'credit_card', 'debit_card', 'wire_transfer', 'other'].includes(val), 
    { message: "Invalid payment method" }
  ),
});
export type ReceiptInsert = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

// Payment schema for bills
export const insertPaymentSchema = createInsertSchema(payments, {
  paymentNumber: (schema) => schema.min(3, "Payment number must be at least 3 characters"),
  paymentDate: () => z.coerce.date(),
  amount: (schema) => schema.refine((val) => parseFloat(val.toString()) > 0, "Amount must be greater than 0"),
  paymentMethod: (schema) => schema.refine(val => 
    ['bank_transfer', 'cash', 'check', 'credit_card', 'debit_card', 'wire_transfer', 'other'].includes(val), 
    { message: "Invalid payment method" }
  ),
});
export type PaymentInsert = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Tax Authority Tables
export const taxAuthorities = pgTable("tax_authorities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  code: text("code").notNull().unique(),
  apiEndpoint: text("api_endpoint"),
  apiDocumentation: text("api_documentation"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  authorityId: integer("authority_id").references(() => taxAuthorities.id).notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  rate: numeric("rate", { precision: 6, scale: 2 }).notNull(),
  isDefault: boolean("is_default").default(false),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const companyTaxSettings = pgTable("company_tax_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  taxAuthorityId: integer("tax_authority_id").references(() => taxAuthorities.id).notNull(),
  taxRegistrationNumber: text("tax_registration_number").notNull(),
  taxPeriodType: text("tax_period_type").notNull(), // monthly, quarterly, annually
  filingFrequency: text("filing_frequency").notNull(), // monthly, quarterly, annually
  nextFilingDueDate: timestamp("next_filing_due_date"),
  lastFilingDate: timestamp("last_filing_date"),
  apiCredentials: jsonb("api_credentials"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const taxFilings = pgTable("tax_filings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  taxAuthorityId: integer("tax_authority_id").references(() => taxAuthorities.id).notNull(),
  filingPeriodStart: timestamp("filing_period_start").notNull(),
  filingPeriodEnd: timestamp("filing_period_end").notNull(),
  dueDate: timestamp("due_date").notNull(),
  submissionDate: timestamp("submission_date"),
  status: text("status").notNull().default("draft"), // draft, submitted, accepted, rejected
  submissionReference: text("submission_reference"),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid, partial, paid
  paymentDueDate: timestamp("payment_due_date").notNull(),
  paymentAmount: numeric("payment_amount", { precision: 12, scale: 2 }),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const taxFilingItems = pgTable("tax_filing_items", {
  id: serial("id").primaryKey(),
  taxFilingId: integer("tax_filing_id").references(() => taxFilings.id).notNull(),
  category: text("category").notNull(), // sales, purchases, etc.
  description: text("description").notNull(),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 6, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull(),
  sourceType: text("source_type"), // invoice, bill, etc.
  sourceId: integer("source_id"), // reference to the source document
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relations for tax tables
export const taxAuthoritiesRelations = relations(taxAuthorities, ({ many }) => ({
  taxRates: many(taxRates),
  companyTaxSettings: many(companyTaxSettings),
  taxFilings: many(taxFilings)
}));

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  authority: one(taxAuthorities, {
    fields: [taxRates.authorityId],
    references: [taxAuthorities.id]
  })
}));

export const companyTaxSettingsRelations = relations(companyTaxSettings, ({ one }) => ({
  company: one(companies, {
    fields: [companyTaxSettings.companyId],
    references: [companies.id]
  }),
  taxAuthority: one(taxAuthorities, {
    fields: [companyTaxSettings.taxAuthorityId],
    references: [taxAuthorities.id]
  })
}));

export const taxFilingsRelations = relations(taxFilings, ({ one, many }) => ({
  company: one(companies, {
    fields: [taxFilings.companyId],
    references: [companies.id]
  }),
  taxAuthority: one(taxAuthorities, {
    fields: [taxFilings.taxAuthorityId],
    references: [taxAuthorities.id]
  }),
  items: many(taxFilingItems)
}));

export const taxFilingItemsRelations = relations(taxFilingItems, ({ one }) => ({
  taxFiling: one(taxFilings, {
    fields: [taxFilingItems.taxFilingId],
    references: [taxFilings.id]
  })
}));

// Tax Schema Types
export const insertTaxAuthoritySchema = createInsertSchema(taxAuthorities, {
  name: (schema) => schema.min(2, "Tax authority name must be at least 2 characters"),
  country: (schema) => schema.min(2, "Country name must be at least 2 characters"),
  code: (schema) => schema.min(2, "Code must be at least 2 characters")
});
export type TaxAuthorityInsert = z.infer<typeof insertTaxAuthoritySchema>;
export type TaxAuthority = typeof taxAuthorities.$inferSelect;

export const insertTaxRateSchema = createInsertSchema(taxRates, {
  name: (schema) => schema.min(2, "Tax rate name must be at least 2 characters"),
  code: (schema) => schema.min(1, "Code is required"),
  rate: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Rate must be greater than or equal to 0"),
  startDate: () => z.coerce.date()
});
export type TaxRateInsert = z.infer<typeof insertTaxRateSchema>;
export type TaxRate = typeof taxRates.$inferSelect;

export const insertCompanyTaxSettingsSchema = createInsertSchema(companyTaxSettings, {
  taxRegistrationNumber: (schema) => schema.min(5, "Tax registration number must be at least 5 characters"),
  taxPeriodType: (schema) => schema.refine(val => ['monthly', 'quarterly', 'annually'].includes(val), {
    message: "Tax period type must be one of: monthly, quarterly, annually",
  }),
  filingFrequency: (schema) => schema.refine(val => ['monthly', 'quarterly', 'annually'].includes(val), {
    message: "Filing frequency must be one of: monthly, quarterly, annually",
  })
});
export type CompanyTaxSettingsInsert = z.infer<typeof insertCompanyTaxSettingsSchema>;
export type CompanyTaxSettings = typeof companyTaxSettings.$inferSelect;

export const insertTaxFilingSchema = createInsertSchema(taxFilings, {
  filingPeriodStart: () => z.coerce.date(),
  filingPeriodEnd: () => z.coerce.date(),
  dueDate: () => z.coerce.date(),
  submissionDate: () => z.coerce.date().optional(),
  status: (schema) => schema.refine(val => ['draft', 'submitted', 'accepted', 'rejected'].includes(val), {
    message: "Status must be one of: draft, submitted, accepted, rejected",
  }),
  taxableAmount: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Taxable amount must be greater than or equal to 0"),
  taxAmount: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Tax amount must be greater than or equal to 0"),
  paymentStatus: (schema) => schema.refine(val => ['unpaid', 'partial', 'paid'].includes(val), {
    message: "Payment status must be one of: unpaid, partial, paid",
  }),
  paymentDueDate: () => z.coerce.date(),
  paymentDate: () => z.coerce.date().optional()
});
export type TaxFilingInsert = z.infer<typeof insertTaxFilingSchema>;
export type TaxFiling = typeof taxFilings.$inferSelect;

export const insertTaxFilingItemSchema = createInsertSchema(taxFilingItems, {
  category: (schema) => schema.min(2, "Category must be at least 2 characters"),
  description: (schema) => schema.min(2, "Description must be at least 2 characters"),
  taxableAmount: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Taxable amount must be greater than or equal to 0"),
  taxRate: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Tax rate must be greater than or equal to 0"),
  taxAmount: (schema) => schema.refine((val) => parseFloat(val.toString()) >= 0, "Tax amount must be greater than or equal to 0")
});
export type TaxFilingItemInsert = z.infer<typeof insertTaxFilingItemSchema>;
export type TaxFilingItem = typeof taxFilingItems.$inferSelect;
