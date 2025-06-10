const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const PaymentTerm = sequelize.define('PaymentTerm', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  daysUntilDue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30
  },
  billingFrequency: {
    type: DataTypes.ENUM('one_time', 'monthly', 'quarterly', 'annually'),
    allowNull: false,
    defaultValue: 'one_time'
  },
  discountDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payment_terms',
  timestamps: true
});

module.exports = PaymentTerm;