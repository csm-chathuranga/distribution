const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('OrderReturn', {
    order_id:   { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity:   { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
    unit_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    reason:     { type: DataTypes.ENUM('EXPIRED', 'DAMAGED', 'WRONG_ITEM', 'OTHER'), defaultValue: 'OTHER' },
    action:     { type: DataTypes.ENUM('REPLACE', 'DEDUCT'), defaultValue: 'DEDUCT' },
  }, { tableName: 'order_returns', timestamps: true, updatedAt: false });
};
