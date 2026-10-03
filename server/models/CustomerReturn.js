const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('CustomerReturn', {
    id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_number:  { type: DataTypes.STRING(50), allowNull: false, unique: true },
    company_id:     { type: DataTypes.INTEGER, allowNull: false },
    branch_id:      { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id:   { type: DataTypes.INTEGER, allowNull: false },
    customer_id:    { type: DataTypes.INTEGER, allowNull: false },
    invoice_id:     DataTypes.INTEGER,
    driver_id:      DataTypes.INTEGER,
    sales_rep_id:   DataTypes.INTEGER,
    route_id:       DataTypes.INTEGER,
    return_date:    { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('DRAFT', 'CONFIRMED', 'CREDITED', 'CANCELLED'),
      defaultValue: 'DRAFT',
    },
    notes:          DataTypes.TEXT,
    created_by:     { type: DataTypes.INTEGER, allowNull: false },
    confirmed_by:   DataTypes.INTEGER,
    confirmed_at:   DataTypes.DATE,
    credit_note_id: DataTypes.INTEGER,
  }, { tableName: 'customer_returns' });
};
