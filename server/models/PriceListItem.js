const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PriceListItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    price_list_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
  }, { tableName: 'price_list_items', timestamps: false });
};
