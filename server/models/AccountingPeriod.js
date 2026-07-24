const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('AccountingPeriod', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.TINYINT, allowNull: false },
    is_open: { type: DataTypes.BOOLEAN, defaultValue: true },
    opened_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    closed_at: DataTypes.DATE,
    closed_by: DataTypes.INTEGER,
  }, {
    tableName: 'accounting_periods',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['company_id', 'year', 'month'] }],
  });
};
