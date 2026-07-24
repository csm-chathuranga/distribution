const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('DeliveryNote', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    invoice_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    driver_id: DataTypes.INTEGER,
    route_id: DataTypes.INTEGER,
    dn_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    dn_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('PENDING', 'DISPATCHED', 'DELIVERED', 'RETURNED'),
      defaultValue: 'PENDING',
    },
    delivery_address: DataTypes.TEXT,
    notes: DataTypes.TEXT,
    dispatched_at: DataTypes.DATE,
    delivered_at: DataTypes.DATE,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'delivery_notes' });
};
