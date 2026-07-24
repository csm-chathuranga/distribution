const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Unit', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(50), allowNull: false },
    abbreviation: DataTypes.STRING(10),
  }, { tableName: 'units', timestamps: false });
};
