const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SupplierReturn', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    goods_received_id: DataTypes.INTEGER,
    return_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    return_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('DRAFT', 'POSTED'),
      defaultValue: 'DRAFT',
    },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    notes: DataTypes.TEXT,
    journal_entry_id: DataTypes.INTEGER,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'supplier_returns' });
};
