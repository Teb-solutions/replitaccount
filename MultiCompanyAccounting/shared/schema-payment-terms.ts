// Payment Terms schema to be added to schema.ts
import { pgTable, text, serial, integer, boolean, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { companies } from "./schema";

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