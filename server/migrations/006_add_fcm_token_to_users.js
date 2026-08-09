module.exports = {
  async up(sequelize) {
    await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500) NULL
    `);
  },
};
