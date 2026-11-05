const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('DriverDeduction', {
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id:       { type: DataTypes.INTEGER, allowNull: false },
  driver_id:        { type: DataTypes.INTEGER, allowNull: false },
  loading_sheet_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id:       { type: DataTypes.INTEGER, allowNull: false },
  quantity:         { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  unit_cost:        { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  amount:           { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  status:           { type: DataTypes.ENUM('PENDING', 'SETTLED', 'FOUND'), defaultValue: 'PENDING' },
  settled_date:     { type: DataTypes.DATEONLY, allowNull: true },
  found_date:       { type: DataTypes.DATEONLY, allowNull: true },
  notes:            { type: DataTypes.TEXT, allowNull: true },
  created_by:       { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'driver_deductions', timestamps: true, underscored: true });
