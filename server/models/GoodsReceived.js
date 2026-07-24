const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('GoodsReceived', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    supplier_id: { type: DataTypes.INTEGER, allowNull: false },
    po_id: DataTypes.INTEGER,
    grn_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    grn_date: { type: DataTypes.DATEONLY, allowNull: false },
    supplier_invoice_number: DataTypes.STRING(100),
    supplier_invoice_date: DataTypes.DATEONLY,
    status: { type: DataTypes.ENUM('DRAFT', 'POSTED', 'CANCELLED'), defaultValue: 'DRAFT' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    vat_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    journal_id: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
    posted_by: DataTypes.INTEGER,
    posted_at: DataTypes.DATE,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'goods_received' });
};
