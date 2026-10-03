const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('SalesCommission', {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sales_rep_id:      { type: DataTypes.INTEGER, allowNull: false },
    branch_id:         { type: DataTypes.INTEGER, allowNull: false },
    sale_year:         { type: DataTypes.INTEGER, allowNull: false },
    sale_month:        { type: DataTypes.INTEGER, allowNull: false },   // 1-12
    cash_revenue:      { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    cogs:              { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    net_profit:        { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    commission_rate:   { type: DataTypes.DECIMAL(5, 2),  defaultValue: 5.00 },  // %
    commission_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    due_date:          { type: DataTypes.DATEONLY, allowNull: false },           // sale_month + 1
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'PAID', 'CANCELLED'),
      defaultValue: 'PENDING',
    },
    approved_by:   DataTypes.INTEGER,
    approved_at:   DataTypes.DATE,
    paid_date:     DataTypes.DATEONLY,
    payment_notes: DataTypes.TEXT,
    created_by:    { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'sales_commissions',
    indexes: [{ unique: true, fields: ['sales_rep_id', 'sale_year', 'sale_month'] }],
  });
};
