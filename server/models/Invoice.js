const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Invoice', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    customer_id: { type: DataTypes.INTEGER, allowNull: false },
    sales_rep_id: DataTypes.INTEGER,
    order_id: DataTypes.INTEGER,
    invoice_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    invoice_date: { type: DataTypes.DATEONLY, allowNull: false },
    due_date: DataTypes.DATEONLY,
    invoice_type: {
      type: DataTypes.ENUM('TAX_INVOICE', 'CASH_INVOICE', 'CREDIT_NOTE', 'PROFORMA'),
      defaultValue: 'TAX_INVOICE',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'POSTED', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'),
      defaultValue: 'DRAFT',
    },
    subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    vat_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    balance_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    journal_id: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
    posted_by: DataTypes.INTEGER,
    posted_at: DataTypes.DATE,
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  }, { tableName: 'invoices' });
};
