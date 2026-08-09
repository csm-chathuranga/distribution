module.exports = {
  async up(sequelize) {
    await sequelize.query(`SET SESSION sql_mode = ''`);
    await sequelize.query(`
      ALTER TABLE invoices
        ADD COLUMN loading_sheet_id INT NULL,
        ADD CONSTRAINT fk_invoice_loading_sheet FOREIGN KEY (loading_sheet_id) REFERENCES loading_sheets(id) ON DELETE SET NULL
    `);
  },
};
