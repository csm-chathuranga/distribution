const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('CustomerReturnLine', {
    id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_id:  { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity:   { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
    reason:     DataTypes.STRING(255),
  }, { tableName: 'customer_return_lines', timestamps: false });
};
