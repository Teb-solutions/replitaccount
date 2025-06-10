const { sequelize } = require('../db');
const PaymentTerm = require('./PaymentTerm');
const CreditNote = require('./CreditNote');
const CreditNoteItem = require('./CreditNoteItem');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const JournalEntry = require('./JournalEntry');
const JournalEntryItem = require('./JournalEntryItem');
const SalesOrder = require('./SalesOrder');
const SalesOrderItem = require('./SalesOrderItem');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const Receipt = require('./Receipt');
const Company = require('./Company');
const IntercompanyTransaction = require('./IntercompanyTransaction');
const Product = require('./Product');
const ProductCategory = require('./ProductCategory');

// Define model relationships here
// PaymentTerm.belongsTo(Company, { foreignKey: 'companyId' });

// Credit Note relationships
CreditNote.hasMany(CreditNoteItem, { 
  foreignKey: 'creditNoteId', 
  as: 'items',
  onDelete: 'CASCADE' 
});
CreditNoteItem.belongsTo(CreditNote, { 
  foreignKey: 'creditNoteId' 
});

// Invoice relationships
Invoice.hasMany(InvoiceItem, {
  foreignKey: 'invoiceId',
  as: 'items',
  onDelete: 'CASCADE'
});
InvoiceItem.belongsTo(Invoice, {
  foreignKey: 'invoiceId'
});

// Payment Term to Invoice relationship
Invoice.belongsTo(PaymentTerm, {
  foreignKey: 'paymentTermId',
  as: 'paymentTerm'
});

// Credit Note to Invoice relationship (if the credit note is for a specific invoice)
CreditNote.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});

// Journal Entry relationships
JournalEntry.hasMany(JournalEntryItem, {
  foreignKey: 'journalEntryId',
  as: 'items',
  onDelete: 'CASCADE'
});
JournalEntryItem.belongsTo(JournalEntry, {
  foreignKey: 'journalEntryId'
});

// Sales Order relationships
SalesOrder.hasMany(SalesOrderItem, {
  foreignKey: 'salesOrderId',
  as: 'items',
  onDelete: 'CASCADE'
});
SalesOrderItem.belongsTo(SalesOrder, {
  foreignKey: 'salesOrderId'
});

// Sales Order to Payment Term relationship
SalesOrder.belongsTo(PaymentTerm, {
  foreignKey: 'paymentTermId',
  as: 'paymentTerm'
});

// Purchase Order relationships
PurchaseOrder.hasMany(PurchaseOrderItem, {
  foreignKey: 'purchaseOrderId',
  as: 'items',
  onDelete: 'CASCADE'
});
PurchaseOrderItem.belongsTo(PurchaseOrder, {
  foreignKey: 'purchaseOrderId'
});

// Purchase Order to Payment Term relationship
PurchaseOrder.belongsTo(PaymentTerm, {
  foreignKey: 'paymentTermId',
  as: 'paymentTerm'
});

// Product to ProductCategory relationship
Product.belongsTo(ProductCategory, {
  foreignKey: 'categoryId',
  as: 'category'
});
ProductCategory.hasMany(Product, {
  foreignKey: 'categoryId',
  as: 'products'
});

// Product to Company relationship
Product.belongsTo(Company, {
  foreignKey: 'companyId'
});
Company.hasMany(Product, {
  foreignKey: 'companyId',
  as: 'products'
});

// Sales Order to Invoice relationship (one sales order can have multiple invoices)
Invoice.belongsTo(SalesOrder, {
  foreignKey: 'salesOrderId',
  as: 'salesOrder'
});

// Receipt to Invoice relationship
Receipt.belongsTo(Invoice, {
  foreignKey: 'invoiceId',
  as: 'invoice'
});
Invoice.hasMany(Receipt, {
  foreignKey: 'invoiceId',
  as: 'receipts'
});

// Intercompany transaction relationships
IntercompanyTransaction.belongsTo(Company, {
  foreignKey: 'sourceCompanyId',
  as: 'sourceCompany'
});
IntercompanyTransaction.belongsTo(Company, {
  foreignKey: 'targetCompanyId',
  as: 'targetCompany'
});
IntercompanyTransaction.belongsTo(SalesOrder, {
  foreignKey: 'sourceDocumentId',
  as: 'salesOrder',
  constraints: false
});
IntercompanyTransaction.belongsTo(Invoice, {
  foreignKey: 'sourceDocumentId',
  as: 'invoice',
  constraints: false
});
IntercompanyTransaction.belongsTo(JournalEntry, {
  foreignKey: 'sourceJournalEntryId',
  as: 'sourceJournalEntry',
  constraints: false
});
IntercompanyTransaction.belongsTo(JournalEntry, {
  foreignKey: 'targetJournalEntryId',
  as: 'targetJournalEntry',
  constraints: false
});

const models = {
  PaymentTerm,
  CreditNote,
  CreditNoteItem,
  Invoice,
  InvoiceItem,
  JournalEntry,
  JournalEntryItem,
  SalesOrder,
  SalesOrderItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Receipt,
  Company,
  IntercompanyTransaction,
  Product,
  ProductCategory
};

module.exports = {
  sequelize,
  ...models
};