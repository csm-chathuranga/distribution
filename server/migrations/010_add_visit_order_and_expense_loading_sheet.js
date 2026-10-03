module.exports = {
  async up(sequelize) {
    await sequelize.query(`SET SESSION sql_mode = ''`);

    // Route visit order on customers
    const [visitCol] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='customers' AND COLUMN_NAME='visit_order'`
    );
    if (!visitCol.length) {
      await sequelize.query(`ALTER TABLE customers ADD COLUMN visit_order INT NOT NULL DEFAULT 0`);
    }

    // Link expenses to loading sheets
    const [lsCol] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='expenses' AND COLUMN_NAME='loading_sheet_id'`
    );
    if (!lsCol.length) {
      await sequelize.query(`
        ALTER TABLE expenses
          ADD COLUMN loading_sheet_id INT NULL,
          ADD CONSTRAINT fk_expense_loading_sheet FOREIGN KEY (loading_sheet_id) REFERENCES loading_sheets(id) ON DELETE SET NULL
      `);
    }
  },
};
