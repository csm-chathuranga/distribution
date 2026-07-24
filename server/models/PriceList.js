const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PriceList', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.ENUM('RETAIL', 'WHOLESALE', 'SPECIAL'), allowNull: false, defaultValue: 'RETAIL' },
    valid_from: DataTypes.DATEONLY,
    valid_to: DataTypes.DATEONLY,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'price_lists' });
};
