const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('LoadingSheetLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sheet_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    loaded_quantity: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    returned_quantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0 },
    sold_quantity: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0 },
    unit_cost: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0 },
  }, { tableName: 'loading_sheet_lines' });
};
