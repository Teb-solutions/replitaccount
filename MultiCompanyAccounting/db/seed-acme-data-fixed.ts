import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateDocumentNumber } from "../server/utils";

const ACME_COMPANY_ID = 2; // Acme Manufacturing Inc
const USER_ID = 1; // Default admin user

async function seedAcmeData() {
  console.log("Starting to seed Acme Manufacturing Inc. data...");
  
  try {
    // Check if data already exists for Acme
    const existingVendors = await db.query.vendors.findMany({
      where: eq(schema.vendors.companyId, ACME_COMPANY_ID)
    });
    
    if (existingVendors.length > 0) {
      console.log("Acme data already exists. Skipping seed process.");
      return;
    }
    
    // 1. Add Vendors
    console.log("Adding vendors...");
    const vendors = await addVendors();
    
    // 2. Add Products
    console.log("Adding products...");
    const products = await addProducts();
    
    // 3. Add Purchase Orders
    console.log("Adding purchase orders...");
    const purchaseOrders = await addPurchaseOrders(vendors, products);
    
    // 4. Add Bills
    console.log("Adding bills...");
    await addBills(vendors, purchaseOrders, products);
    
    // 5. Add Customers 
    console.log("Adding customers...");
    const customers = await addCustomers();
    
    // 6. Add Sales Orders and Invoices
    console.log("Adding sales orders and invoices...");
    await addSalesAndInvoices(customers, products);
    
    console.log("Acme Manufacturing Inc. data seeded successfully!");
  } catch (error) {
    console.error("Error seeding Acme data:", error);
  }
}

async function addVendors() {
  const vendorsData = [
    {
      companyId: ACME_COMPANY_ID,
      name: "Global Raw Materials Inc.",
      code: "GRM",
      contactName: "Sarah Johnson",
      email: "sarah@grm.example.com",
      phone: "555-123-4567",
      address: "123 Supplier Ave, Chicago, IL",
      taxId: "EIN-1234567",
      paymentTerms: "Net 30",
      accountNumber: "V10001",
      status: "active",
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      name: "FastShip Logistics",
      code: "FSL",
      contactName: "Mike Peterson",
      email: "mike@fastship.example.com",
      phone: "555-987-6543",
      address: "456 Delivery Blvd, Atlanta, GA",
      taxId: "EIN-7654321",
      paymentTerms: "Net 15",
      accountNumber: "V10002",
      status: "active",
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      name: "Industrial Equipment Co.",
      code: "IEC",
      contactName: "Robert Chen",
      email: "robert@iec.example.com",
      phone: "555-333-4444",
      address: "789 Machinery Rd, Detroit, MI",
      taxId: "EIN-3334444",
      paymentTerms: "Net 45",
      accountNumber: "V10003",
      status: "active",
      createdAt: new Date()
    }
  ];
  
  const insertedVendors = await db.insert(schema.vendors).values(vendorsData).returning();
  return insertedVendors;
}

async function addProducts() {
  const productsData = [
    {
      companyId: ACME_COMPANY_ID,
      name: "Steel Sheet 1mm",
      code: "RAW-SS01",
      description: "1mm thickness steel sheet for manufacturing",
      type: "raw_material",
      unitOfMeasure: "sheet",
      unitPrice: "35.75",
      taxRate: "0",
      isActive: true,
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      name: "Aluminum Rod 10mm",
      code: "RAW-AR10",
      description: "10mm diameter aluminum rods",
      type: "raw_material",
      unitOfMeasure: "meter",
      unitPrice: "12.50",
      taxRate: "0",
      isActive: true,
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      name: "Electric Motor 250W",
      code: "COM-EM250",
      description: "250 Watt electric motor component",
      type: "component",
      unitOfMeasure: "unit",
      unitPrice: "85.20",
      taxRate: "0",
      isActive: true,
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      name: "Steel Frame Assembly",
      code: "FIN-SFA1",
      description: "Completed steel frame assembly",
      type: "finished_good",
      unitOfMeasure: "unit",
      unitPrice: "325.00",
      taxRate: "7.5",
      isActive: true,
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      name: "Industrial Pump Model A",
      code: "FIN-IPMA",
      description: "Complete industrial pump assembly",
      type: "finished_good",
      unitOfMeasure: "unit",
      unitPrice: "1250.00",
      taxRate: "7.5",
      isActive: true,
      createdAt: new Date()
    }
  ];
  
  const insertedProducts = await db.insert(schema.products).values(productsData).returning();
  return insertedProducts;
}

async function addPurchaseOrders(vendors: typeof schema.vendors.$inferSelect[], products: typeof schema.products.$inferSelect[]) {
  // Create purchase orders
  const purchaseOrdersData = [
    {
      companyId: ACME_COMPANY_ID,
      orderNumber: generateDocumentNumber("PO", "ACM", 1),
      vendorId: vendors[0].id,
      orderDate: new Date(2025, 3, 15), // April 15, 2025
      expectedDate: new Date(2025, 3, 30), // April 30, 2025
      status: "open",
      total: "3575.00",
      notes: "Monthly raw materials order",
      createdBy: USER_ID,
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      orderNumber: generateDocumentNumber("PO", "ACM", 2),
      vendorId: vendors[2].id,
      orderDate: new Date(2025, 4, 1), // May 1, 2025
      expectedDate: new Date(2025, 4, 15), // May 15, 2025
      status: "open",
      total: "2556.00",
      notes: "Quarterly equipment order",
      createdBy: USER_ID,
      createdAt: new Date()
    }
  ];
  
  const insertedPOs = await db.insert(schema.purchaseOrders).values(purchaseOrdersData).returning();
  
  // Create purchase order items
  const poItemsData = [
    // Items for first PO
    {
      purchaseOrderId: insertedPOs[0].id,
      productId: products[0].id,
      description: products[0].description,
      quantity: "100",
      unitPrice: "35.75",
      amount: "3575.00"
    },
    // Items for second PO
    {
      purchaseOrderId: insertedPOs[1].id,
      productId: products[2].id,
      description: products[2].description,
      quantity: "30",
      unitPrice: "85.20",
      amount: "2556.00"
    }
  ];
  
  await db.insert(schema.purchaseOrderItems).values(poItemsData);
  
  return insertedPOs;
}

async function addBills(
  vendors: typeof schema.vendors.$inferSelect[],
  purchaseOrders: typeof schema.purchaseOrders.$inferSelect[],
  products: typeof schema.products.$inferSelect[]
) {
  // Find accounts for journal entries
  const apAccount = await db.query.accounts.findFirst({
    where: eq(schema.accounts.code, "2110"),
    columns: { id: true }
  });
  
  const inventoryAccount = await db.query.accounts.findFirst({
    where: eq(schema.accounts.code, "1130"),
    columns: { id: true }
  });
  
  if (!apAccount || !inventoryAccount) {
    throw new Error("Required accounts not found");
  }
  
  // Create journal entry for the first bill
  const journalEntry = await db.insert(schema.journalEntries).values({
    companyId: ACME_COMPANY_ID,
    entryNumber: generateDocumentNumber("JE", "ACM", 1),
    description: "Bill from Global Raw Materials Inc.",
    reference: "BILL-ACM0001",
    entryDate: new Date(2025, 3, 20), // April 20, 2025
    sourceType: "bill",
    isPosted: true,
    postedDate: new Date(),
    createdBy: USER_ID,
    createdAt: new Date()
  }).returning();
  
  // Create journal entry items
  await db.insert(schema.journalEntryItems).values([
    {
      journalEntryId: journalEntry[0].id,
      accountId: inventoryAccount.id,
      description: "Raw materials inventory",
      debit: "3575.00",
      credit: "0"
    },
    {
      journalEntryId: journalEntry[0].id,
      accountId: apAccount.id,
      description: "Accounts payable to Global Raw Materials Inc.",
      debit: "0",
      credit: "3575.00"
    }
  ]);
  
  // Create bills
  const billsData = [
    {
      companyId: ACME_COMPANY_ID,
      billNumber: generateDocumentNumber("BILL", "ACM", 1),
      vendorId: vendors[0].id,
      purchaseOrderId: purchaseOrders[0].id,
      billDate: new Date(2025, 3, 20), // April 20, 2025
      dueDate: new Date(2025, 4, 20), // May 20, 2025
      status: "open",
      subtotal: "3575.00",
      taxAmount: "0",
      total: "3575.00",
      amountPaid: "0",
      notes: "Raw materials delivery",
      journalEntryId: journalEntry[0].id,
      createdBy: USER_ID,
      createdAt: new Date()
    }
  ];
  
  const insertedBills = await db.insert(schema.bills).values(billsData).returning();
  
  // Create bill items
  const billItemsData = [
    {
      billId: insertedBills[0].id,
      productId: products[0].id,
      description: products[0].description,
      quantity: "100",
      unitPrice: "35.75",
      taxRate: "0",
      taxAmount: "0",
      amount: "3575.00"
    }
  ];
  
  await db.insert(schema.billItems).values(billItemsData);
  
  return insertedBills;
}

async function addCustomers() {
  const customersData = [
    {
      companyId: ACME_COMPANY_ID,
      name: "City Construction Corp",
      code: "CCC",
      contactName: "Jessica Williams",
      email: "jessica@cityconstruction.example.com",
      phone: "555-222-3333",
      address: "789 Builder St, Boston, MA",
      taxId: "EIN-2223333",
      paymentTerms: "Net 30",
      accountNumber: "C10001",
      status: "active",
      createdAt: new Date()
    },
    {
      companyId: ACME_COMPANY_ID,
      name: "TechMakers Industries",
      code: "TMI",
      contactName: "Daniel Park",
      email: "daniel@techmakers.example.com",
      phone: "555-444-5555",
      address: "456 Innovation Way, San Jose, CA",
      taxId: "EIN-4445555",
      paymentTerms: "Net 45",
      accountNumber: "C10002",
      status: "active",
      createdAt: new Date()
    }
  ];
  
  const insertedCustomers = await db.insert(schema.customers).values(customersData).returning();
  return insertedCustomers;
}

async function addSalesAndInvoices(
  customers: typeof schema.customers.$inferSelect[],
  products: typeof schema.products.$inferSelect[]
) {
  // Create sales orders
  const salesOrdersData = [
    {
      companyId: ACME_COMPANY_ID,
      orderNumber: generateDocumentNumber("SO", "ACM", 1),
      customerId: customers[0].id,
      orderDate: new Date(2025, 4, 5), // May 5, 2025
      expectedDate: new Date(2025, 4, 20), // May 20, 2025
      status: "open",
      subtotal: "3250.00",
      taxAmount: "243.75",
      total: "3493.75",
      notes: "Construction project order",
      createdBy: USER_ID,
      createdAt: new Date()
    }
  ];
  
  const insertedSOs = await db.insert(schema.salesOrders).values(salesOrdersData).returning();
  
  // Create sales order items
  const soItemsData = [
    {
      salesOrderId: insertedSOs[0].id,
      productId: products[3].id,
      description: products[3].description,
      quantity: "10",
      unitPrice: "325.00",
      taxRate: "7.5",
      taxAmount: "243.75",
      amount: "3493.75"
    }
  ];
  
  await db.insert(schema.salesOrderItems).values(soItemsData);
  
  // Find accounts for journal entries
  const arAccount = await db.query.accounts.findFirst({
    where: eq(schema.accounts.code, "1120"),
    columns: { id: true }
  });
  
  const revenueAccount = await db.query.accounts.findFirst({
    where: eq(schema.accounts.code, "4100"),
    columns: { id: true }
  });
  
  const taxLiabilityAccount = await db.query.accounts.findFirst({
    where: eq(schema.accounts.code, "2110"),
    columns: { id: true }
  });
  
  if (!arAccount || !revenueAccount || !taxLiabilityAccount) {
    throw new Error("Required accounts not found");
  }
  
  // Create journal entry for the invoice
  const journalEntry = await db.insert(schema.journalEntries).values({
    companyId: ACME_COMPANY_ID,
    entryNumber: generateDocumentNumber("JE", "ACM", 2),
    description: "Invoice to City Construction Corp",
    reference: "INV-ACM0001",
    entryDate: new Date(2025, 4, 10), // May 10, 2025
    sourceType: "invoice",
    isPosted: true,
    postedDate: new Date(),
    createdBy: USER_ID,
    createdAt: new Date()
  }).returning();
  
  // Create journal entry items
  await db.insert(schema.journalEntryItems).values([
    {
      journalEntryId: journalEntry[0].id,
      accountId: arAccount.id,
      description: "Accounts receivable from City Construction Corp",
      debit: "3493.75",
      credit: "0"
    },
    {
      journalEntryId: journalEntry[0].id,
      accountId: revenueAccount.id,
      description: "Revenue from sales",
      debit: "0",
      credit: "3250.00"
    },
    {
      journalEntryId: journalEntry[0].id,
      accountId: taxLiabilityAccount.id,
      description: "Sales tax liability",
      debit: "0",
      credit: "243.75"
    }
  ]);
  
  // Create invoices
  const invoicesData = [
    {
      companyId: ACME_COMPANY_ID,
      invoiceNumber: generateDocumentNumber("INV", "ACM", 1),
      customerId: customers[0].id,
      salesOrderId: insertedSOs[0].id,
      invoiceDate: new Date(2025, 4, 10), // May 10, 2025
      dueDate: new Date(2025, 5, 10), // June 10, 2025
      status: "open",
      subtotal: "3250.00",
      taxAmount: "243.75",
      total: "3493.75",
      amountPaid: "0",
      notes: "Steel frames for construction project",
      journalEntryId: journalEntry[0].id,
      createdBy: USER_ID,
      createdAt: new Date()
    }
  ];
  
  const insertedInvoices = await db.insert(schema.invoices).values(invoicesData).returning();
  
  // Create invoice items
  const invoiceItemsData = [
    {
      invoiceId: insertedInvoices[0].id,
      productId: products[3].id,
      description: products[3].description,
      quantity: "10",
      unitPrice: "325.00",
      taxRate: "7.5",
      taxAmount: "243.75",
      amount: "3493.75"
    }
  ];
  
  await db.insert(schema.invoiceItems).values(invoiceItemsData);
  
  return insertedInvoices;
}

// Run the seed function
seedAcmeData()
  .then(() => {
    console.log("Acme data seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding Acme data:", error);
    process.exit(1);
  });