const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('InvoiceLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    order_line_id: DataTypes.INTEGER,
    quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    vat_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    line_subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    vat_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    line_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    cost_price: DataTypes.DECIMAL(12, 2),
  }, { tableName: 'invoice_lines', timestamps: false });
};
