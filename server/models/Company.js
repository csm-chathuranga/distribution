const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Company', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    address: DataTypes.TEXT,
    phone: DataTypes.STRING(20),
    email: DataTypes.STRING(100),
    tin_number: DataTypes.STRING(50),
    vat_number: DataTypes.STRING(50),
    logo_url: DataTypes.STRING(500),
    currency: { type: DataTypes.CHAR(3), defaultValue: 'LKR' },
  }, { tableName: 'companies' });
};
