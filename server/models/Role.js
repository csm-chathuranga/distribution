const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    display_name: { type: DataTypes.STRING(100), allowNull: false },
    description: DataTypes.TEXT,
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'roles' });
};
