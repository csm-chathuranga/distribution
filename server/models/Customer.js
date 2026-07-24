const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Customer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: DataTypes.INTEGER,
    route_id: DataTypes.INTEGER,
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: DataTypes.STRING(50),
    customer_type: {
      type: DataTypes.ENUM('WHOLESALER', 'RETAILER', 'DIRECT', 'INSTITUTION'),
      defaultValue: 'RETAILER',
    },
    contact_person: DataTypes.STRING(100),
    phone: DataTypes.STRING(20),
    email: DataTypes.STRING(100),
    address: DataTypes.TEXT,
    tin_number: DataTypes.STRING(50),
    credit_days: { type: DataTypes.INTEGER, defaultValue: 0 },
    credit_limit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    outstanding_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    is_vat_registered: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    account_id: DataTypes.INTEGER,
  }, { tableName: 'customers' });
};
