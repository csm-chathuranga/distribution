const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('LoadingSheet', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    route_id: DataTypes.INTEGER,
    sales_rep_id: DataTypes.INTEGER,
    driver_id: DataTypes.INTEGER,
    vehicle_number: DataTypes.STRING(50),
    sheet_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    sheet_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('DRAFT', 'LOADED', 'RETURNED', 'CLOSED'),
      defaultValue: 'DRAFT',
    },
    total_loaded_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    total_sales_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: DataTypes.TEXT,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'loading_sheets' });
};
