module.exports = {
  up: async (sequelize) => {
    await sequelize.query(`
      ALTER TABLE companies
      ADD COLUMN website VARCHAR(255) NULL AFTER email
    `);
  },
};
