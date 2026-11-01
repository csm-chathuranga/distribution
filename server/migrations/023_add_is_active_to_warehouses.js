module.exports = {
  async up(sequelize) {
    const [cols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='warehouses' AND COLUMN_NAME='is_active'`
    );
    if (cols.length === 0) {
      await sequelize.query(
        `ALTER TABLE warehouses ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`
      );
    }
  },
  async down(sequelize) {
    await sequelize.query(`ALTER TABLE warehouses DROP COLUMN IF EXISTS is_active`);
  },
};
