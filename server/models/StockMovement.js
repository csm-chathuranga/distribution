const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('StockMovement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    movement_type: {
      type: DataTypes.ENUM('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'),
      allowNull: false,
    },
    source_type: DataTypes.STRING(50),
    source_id: DataTypes.INTEGER,
    quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    balance_after: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    unit_cost: DataTypes.DECIMAL(12, 2),
    notes: DataTypes.TEXT,
    created_by: DataTypes.INTEGER,
  }, { tableName: 'stock_movements', updatedAt: false });
};
