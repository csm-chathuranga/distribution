const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('StockTransfer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    from_warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    to_warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    transfer_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    transfer_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('DRAFT', 'DISPATCHED', 'RECEIVED', 'CANCELLED'), defaultValue: 'DRAFT' },
    notes: DataTypes.TEXT,
    dispatched_by: DataTypes.INTEGER,
    dispatched_at: DataTypes.DATE,
    received_by: DataTypes.INTEGER,
    received_at: DataTypes.DATE,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'stock_transfers' });
};
