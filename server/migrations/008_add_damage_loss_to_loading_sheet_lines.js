module.exports = {
  async up(sequelize) {
    await sequelize.query(`SET SESSION sql_mode = ''`);

    const [cols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='loading_sheet_lines' AND COLUMN_NAME='damaged_quantity'`
    );
    if (!cols.length) {
      await sequelize.query(`
        ALTER TABLE loading_sheet_lines
          ADD COLUMN damaged_quantity DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
          ADD COLUMN lost_quantity    DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
          ADD COLUMN damage_notes     VARCHAR(255)  NULL
      `);
    }
  },
};
