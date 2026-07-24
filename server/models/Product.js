const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    category_id: DataTypes.INTEGER,
    base_unit_id: DataTypes.INTEGER,
    sku: { type: DataTypes.STRING(100), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: DataTypes.TEXT,
    barcode: DataTypes.STRING(100),
    cost_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.00 },
    selling_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.00 },
    wholesale_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.00 },
    vat_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
    reorder_point: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: 'products',
    indexes: [{ unique: true, fields: ['company_id', 'sku'] }],
  });
};
