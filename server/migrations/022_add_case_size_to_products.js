module.exports = {
  async up(sequelize) {
    const [cols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='case_size'`
    );
    if (cols.length === 0) {
      await sequelize.query(
        `ALTER TABLE products ADD COLUMN case_size INT NOT NULL DEFAULT 12 COMMENT 'Units per case'`
      );
    }
  },
  async down(sequelize) {
    await sequelize.query(`ALTER TABLE products DROP COLUMN IF EXISTS case_size`);
  },
};
