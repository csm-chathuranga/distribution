const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('PurchaseOrder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    po_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    po_date: { type: DataTypes.DATEONLY, allowNull: false },
    expected_date: DataTypes.DATEONLY,
    status: {
      type: DataTypes.ENUM('DRAFT', 'APPROVED', 'PARTIAL', 'RECEIVED', 'CANCELLED'),
      defaultValue: 'DRAFT',
    },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    vat_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    notes: DataTypes.TEXT,
    approved_by: DataTypes.INTEGER,
    approved_at: DataTypes.DATE,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'purchase_orders' });
};
