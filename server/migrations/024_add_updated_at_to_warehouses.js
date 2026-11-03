module.exports = {
  async up(sequelize) {
    const [rows] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'updated_at'
    `);
    if (rows.length === 0) {
      await sequelize.query(`ALTER TABLE warehouses ADD COLUMN updated_at DATETIME NULL`);
      await sequelize.query(`UPDATE warehouses SET updated_at = NOW() WHERE updated_at IS NULL`);
    }
  },
  async down(sequelize) {
    const [rows] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'updated_at'
    `);
    if (rows.length > 0) {
      await sequelize.query(`ALTER TABLE warehouses DROP COLUMN updated_at`);
    }
  }
};
