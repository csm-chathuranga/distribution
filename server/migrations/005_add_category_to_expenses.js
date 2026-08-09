module.exports = {
  async up(sequelize) {
    await sequelize.query(`
      ALTER TABLE expenses
        ADD COLUMN category VARCHAR(50) NULL AFTER description,
        ADD COLUMN notes TEXT NULL AFTER reference
    `);
  },
};
