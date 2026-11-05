module.exports = {
  up: async (sequelize) => {
    await sequelize.query(`
      ALTER TABLE products ADD COLUMN short_code VARCHAR(10) NULL AFTER sku
    `);
  },
  down: async (sequelize) => {
    await sequelize.query(`ALTER TABLE products DROP COLUMN short_code`);
  },
};
