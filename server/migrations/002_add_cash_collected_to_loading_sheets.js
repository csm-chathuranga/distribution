module.exports = {
  async up(sequelize) {
    await sequelize.query(`SET SESSION sql_mode = ''`);
    await sequelize.query(`
      ALTER TABLE loading_sheets
        ADD COLUMN cash_collected DECIMAL(15,2) DEFAULT 0
    `);
  },
};
