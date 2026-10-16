module.exports = {
  async up(sequelize) {
    await sequelize.query(`
      ALTER TABLE sales_orders
        MODIFY COLUMN status ENUM('DRAFT','CONFIRMED','PARTIAL','DELIVERED','INVOICED','CANCELLED') NOT NULL DEFAULT 'DRAFT'
    `);
    await sequelize.query(`
      ALTER TABLE invoices
        MODIFY COLUMN status ENUM('DRAFT','POSTED','PAID','PARTIAL','OVERDUE','DELIVERED','CANCELLED') NOT NULL DEFAULT 'POSTED'
    `);
  },
  async down(sequelize) {
    await sequelize.query(`
      ALTER TABLE sales_orders
        MODIFY COLUMN status ENUM('DRAFT','CONFIRMED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'DRAFT'
    `);
    await sequelize.query(`
      ALTER TABLE invoices
        MODIFY COLUMN status ENUM('POSTED','PAID','PARTIAL','OVERDUE','DELIVERED','CANCELLED') NOT NULL DEFAULT 'POSTED'
    `);
  },
};
