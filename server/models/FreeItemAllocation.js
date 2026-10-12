const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('FreeItemAllocation', {
    id:                 { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id:         { type: DataTypes.INTEGER, allowNull: false },
    branch_id:          { type: DataTypes.INTEGER, allowNull: false },
    sales_rep_id:       { type: DataTypes.INTEGER, allowNull: false },
    product_id:         { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id:       { type: DataTypes.INTEGER, allowNull: false },
    allocated_quantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    used_quantity:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    notes:              DataTypes.TEXT,
    created_by:         { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'free_item_allocations' });
};
