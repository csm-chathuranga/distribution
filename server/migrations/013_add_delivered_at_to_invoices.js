module.exports = {
  up: async (sequelize) => {
    const [cols] = await sequelize.query(`SHOW COLUMNS FROM invoices LIKE 'delivered_at'`);
    if (!cols.length) {
      await sequelize.query(`ALTER TABLE invoices ADD COLUMN delivered_at DATETIME NULL AFTER loading_sheet_id`);
    }
    const [cols2] = await sequelize.query(`SHOW COLUMNS FROM invoices LIKE 'delivered_by'`);
    if (!cols2.length) {
      await sequelize.query(`ALTER TABLE invoices ADD COLUMN delivered_by INT NULL AFTER delivered_at`);
    }
  },
};
