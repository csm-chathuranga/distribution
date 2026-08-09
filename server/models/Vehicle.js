const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Vehicle', {
  id:                  { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_id:          { type: DataTypes.INTEGER, allowNull: false },
  registration_number: { type: DataTypes.STRING(20), allowNull: false },
  make:                { type: DataTypes.STRING(100) },
  model:               { type: DataTypes.STRING(100) },
  year:                { type: DataTypes.INTEGER },
  capacity_kg:         { type: DataTypes.DECIMAL(10, 2) },
  status:              { type: DataTypes.ENUM('active', 'maintenance', 'retired'), defaultValue: 'active' },
  notes:               { type: DataTypes.TEXT },
}, { tableName: 'vehicles', underscored: true });
