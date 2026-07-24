const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PurchaseOrderLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    po_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    received_quantity: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0.0000 },
    unit_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    vat_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    line_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  }, { tableName: 'purchase_order_lines', timestamps: false });
};
