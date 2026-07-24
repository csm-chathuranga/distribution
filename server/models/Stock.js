const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Stock', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0.0000 },
    reserved_quantity: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0.0000 },
  }, {
    tableName: 'stock',
    updatedAt: true, createdAt: false,
    indexes: [{ unique: true, fields: ['warehouse_id', 'product_id'] }],
  });
};
