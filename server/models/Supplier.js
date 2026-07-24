const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Supplier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: DataTypes.STRING(50),
    contact_person: DataTypes.STRING(100),
    phone: DataTypes.STRING(20),
    email: DataTypes.STRING(100),
    address: DataTypes.TEXT,
    tin_number: DataTypes.STRING(50),
    vat_number: DataTypes.STRING(50),
    credit_days: { type: DataTypes.INTEGER, defaultValue: 30 },
    credit_limit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    payment_terms: DataTypes.TEXT,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    account_id: DataTypes.INTEGER,
  }, { tableName: 'suppliers' });
};
