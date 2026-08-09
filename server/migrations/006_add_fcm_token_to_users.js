module.exports = {
  async up(sequelize) {
    const [rows] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'fcm_token'
    `);
    if (rows.length === 0) {
      await sequelize.query(`ALTER TABLE users ADD COLUMN fcm_token VARCHAR(500) NULL`);
    }
  },
};
