const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const IntercompanyTransaction = sequelize.define('IntercompanyTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'transaction_number'
  },
  sourceCompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'source_company_id'
  },
  targetCompanyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'target_company_id'
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id'
  },
  type: {
    type: DataTypes.ENUM('sales_order', 'invoice', 'payment', 'receipt', 'transfer'),
    allowNull: false
  },
  sourceDocumentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'source_document_id'
  },
  targetDocumentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'target_document_id'
  },
  sourceJournalEntryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'source_journal_entry_id'
  },
  targetJournalEntryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'target_journal_entry_id'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'matched', 'reconciled', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'intercompany_transactions',
  timestamps: true,
  underscored: true
});

module.exports = IntercompanyTransaction;