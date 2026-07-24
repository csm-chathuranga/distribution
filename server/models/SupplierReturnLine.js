const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SupplierReturnLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    unit_cost: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    line_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  }, { tableName: 'supplier_return_lines' });
};
