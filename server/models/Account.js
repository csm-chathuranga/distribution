const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Account', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    parent_id: DataTypes.INTEGER,
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    type: {
      type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS'),
      allowNull: false,
    },
    sub_type: DataTypes.STRING(50),
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    allow_manual_entry: { type: DataTypes.BOOLEAN, defaultValue: true },
    balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
  }, {
    tableName: 'accounts',
    indexes: [{ unique: true, fields: ['company_id', 'code'] }],
  });
};
