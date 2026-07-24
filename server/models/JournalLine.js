const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('JournalLine', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    journal_id: { type: DataTypes.INTEGER, allowNull: false },
    account_id: { type: DataTypes.INTEGER, allowNull: false },
    debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    description: DataTypes.STRING(255),
  }, { tableName: 'journal_lines', timestamps: false });
};
