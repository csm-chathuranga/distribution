const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Route', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    code: DataTypes.STRING(50),
    sales_rep_id: DataTypes.INTEGER,
    driver_id: DataTypes.INTEGER,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'routes', timestamps: false });
};
