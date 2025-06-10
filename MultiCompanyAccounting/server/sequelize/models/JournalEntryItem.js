const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const JournalEntryItem = sequelize.define('JournalEntryItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  journalEntryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'journal_entry_id'
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'account_id'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  debit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  credit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  memo: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'journal_entry_items',
  timestamps: false,
  underscored: true
});

module.exports = JournalEntryItem;