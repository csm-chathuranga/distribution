const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('StockTransferLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transfer_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    requested_quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    dispatched_quantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0 },
    received_quantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0 },
  }, { tableName: 'stock_transfer_lines', timestamps: false });
};
