const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    payment_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    payment_date: { type: DataTypes.DATEONLY, allowNull: false },
    payment_method: {
      type: DataTypes.ENUM('CASH', 'CHEQUE', 'BANK_TRANSFER'),
      allowNull: false,
    },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    reference: DataTypes.STRING(100),
    notes: DataTypes.TEXT,
    journal_id: DataTypes.INTEGER,
    status: { type: DataTypes.ENUM('DRAFT', 'POSTED', 'CANCELLED'), defaultValue: 'POSTED' },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'payments', updatedAt: false });
};
