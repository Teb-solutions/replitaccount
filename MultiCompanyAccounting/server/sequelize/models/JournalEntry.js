const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const JournalEntry = sequelize.define('JournalEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entryNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'entry_number'
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id'
  },
  entryDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'entry_date'
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  entryType: {
    type: DataTypes.ENUM('manual', 'system_generated', 'imported'),
    allowNull: false,
    field: 'entry_type',
    defaultValue: 'manual'
  },
  status: {
    type: DataTypes.ENUM('draft', 'posted', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
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
  },
  postedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'posted_by'
  },
  postedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'posted_at'
  }
}, {
  tableName: 'journal_entries',
  timestamps: true,
  underscored: true
});

module.exports = JournalEntry;