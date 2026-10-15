const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('WarehouseUser', {
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    user_id:      { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  }, { tableName: 'warehouse_users', timestamps: false });
};
