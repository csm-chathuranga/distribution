const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Expense', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    account_id: { type: DataTypes.INTEGER, allowNull: false },
    expense_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    expense_date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM('CASH', 'CHEQUE', 'BANK_TRANSFER'), allowNull: false },
    reference: DataTypes.STRING(100),
    journal_id: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED'),
      defaultValue: 'DRAFT',
    },
    approved_by: DataTypes.INTEGER,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'expenses', updatedAt: false });
};
