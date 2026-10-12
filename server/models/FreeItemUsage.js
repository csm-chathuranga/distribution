const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('FreeItemUsage', {
    id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    allocation_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id:   DataTypes.INTEGER,
    invoice_id:    DataTypes.INTEGER,
    quantity:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    notes:         DataTypes.TEXT,
    given_by:      { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'free_item_usages' });
};
