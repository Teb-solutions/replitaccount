const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const CreditNote = sequelize.define('CreditNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  noteNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'note_number'
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'customer_id'
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'invoice_id'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id'
  },
  issueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'issue_date'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'partial', 'applied', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'credit_notes',
  timestamps: true,
  underscored: true
});

module.exports = CreditNote;