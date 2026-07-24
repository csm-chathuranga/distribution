const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('StockAdjustment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    adjustment_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    adjustment_date: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.ENUM('DAMAGE', 'EXPIRY', 'COUNT', 'OTHER'), allowNull: false },
    notes: DataTypes.TEXT,
    status: { type: DataTypes.ENUM('DRAFT', 'APPROVED', 'CANCELLED'), defaultValue: 'DRAFT' },
    approved_by: DataTypes.INTEGER,
    approved_at: DataTypes.DATE,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'stock_adjustments' });
};
