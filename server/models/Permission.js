const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Permission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    module: { type: DataTypes.STRING(50), allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    description: DataTypes.TEXT,
  }, { tableName: 'permissions', updatedAt: false });
};
