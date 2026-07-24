const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('StockAdjustmentLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    adjustment_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    system_quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
    actual_quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    unit_cost: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0 },
    notes: DataTypes.TEXT,
  }, { tableName: 'stock_adjustment_lines', timestamps: false });
};
