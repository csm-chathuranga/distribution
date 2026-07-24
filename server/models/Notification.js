const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Notification', {
  id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:   { type: DataTypes.INTEGER, allowNull: true },
  role_name: { type: DataTypes.STRING(50), allowNull: true },
  type:      { type: DataTypes.STRING(60), allowNull: false },
  title:     { type: DataTypes.STRING(200), allowNull: false },
  body:      { type: DataTypes.TEXT, allowNull: true },
  link:      { type: DataTypes.STRING(300), allowNull: true },
  data:      { type: DataTypes.TEXT, allowNull: true },   // JSON string
  is_read:   { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'notifications', timestamps: true, updatedAt: false });
