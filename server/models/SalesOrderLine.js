const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SalesOrderLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    delivered_quantity: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0.0000 },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    vat_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    line_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  }, { tableName: 'sales_order_lines', timestamps: false });
};
