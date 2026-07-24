const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('JournalEntry', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: DataTypes.INTEGER,
    period_id: { type: DataTypes.INTEGER, allowNull: false },
    entry_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    entry_date: { type: DataTypes.DATEONLY, allowNull: false },
    source_type: {
      type: DataTypes.ENUM('MANUAL', 'INVOICE', 'RECEIPT', 'PAYMENT', 'GRN', 'STOCK_ADJ', 'TRANSFER', 'EXPENSE'),
      allowNull: false,
    },
    source_id: DataTypes.INTEGER,
    reference: DataTypes.STRING(100),
    description: DataTypes.TEXT,
    total_debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    total_credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    is_posted: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'journal_entries' });
};
