module.exports = {
  async up(sequelize) {
    await sequelize.query(`SET SESSION sql_mode = ''`);
    await sequelize.query(`
      ALTER TABLE loading_sheets
        ADD COLUMN vehicle_id INT NULL,
        ADD CONSTRAINT fk_ls_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    `);
  },
};
