const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    parent_id: DataTypes.INTEGER,
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: DataTypes.STRING(50),
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'categories', updatedAt: false });
};
