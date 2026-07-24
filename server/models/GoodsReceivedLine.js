const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('GoodsReceivedLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    grn_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    po_line_id: DataTypes.INTEGER,
    quantity: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    unit_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    vat_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    line_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  }, { tableName: 'goods_received_lines', timestamps: false });
};
