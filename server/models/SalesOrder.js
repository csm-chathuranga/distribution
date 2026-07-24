const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SalesOrder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    sales_rep_id: DataTypes.INTEGER,
    route_id: DataTypes.INTEGER,
    order_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    order_date: { type: DataTypes.DATEONLY, allowNull: false },
    delivery_date: DataTypes.DATEONLY,
    status: {
      type: DataTypes.ENUM('DRAFT', 'CONFIRMED', 'PARTIAL', 'DELIVERED', 'CANCELLED'),
      defaultValue: 'DRAFT',
    },
    order_type: { type: DataTypes.ENUM('CREDIT', 'CASH'), defaultValue: 'CREDIT' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    vat_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    notes: DataTypes.TEXT,
    approved_by: DataTypes.INTEGER,
    approved_at: DataTypes.DATE,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'sales_orders' });
};
