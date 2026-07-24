const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Warehouse', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: DataTypes.STRING(50),
    address: DataTypes.TEXT,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'warehouses', timestamps: false });
};
