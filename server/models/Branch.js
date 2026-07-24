const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Branch', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    address: DataTypes.TEXT,
    phone: DataTypes.STRING(20),
    email: DataTypes.STRING(100),
    is_head_office: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'branches' });
};
