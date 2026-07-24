const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Cheque', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    receipt_id: DataTypes.INTEGER,
    cheque_number: { type: DataTypes.STRING(100), allowNull: false },
    bank_name: DataTypes.STRING(100),
    branch_name: DataTypes.STRING(100),
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    cheque_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('RECEIVED', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED'),
      defaultValue: 'RECEIVED',
    },
    deposited_date: DataTypes.DATEONLY,
    cleared_date: DataTypes.DATEONLY,
    bounced_date: DataTypes.DATEONLY,
    bounce_reason: DataTypes.TEXT,
    bank_account_id: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
  }, { tableName: 'cheques' });
};
