module.exports = {
  up: async (sequelize) => {
    await sequelize.query(`
      ALTER TABLE customers
        ADD COLUMN secondary_route_id INT NULL AFTER route_id,
        ADD CONSTRAINT fk_customer_secondary_route
          FOREIGN KEY (secondary_route_id) REFERENCES routes(id) ON DELETE SET NULL
    `);
  },
  down: async (sequelize) => {
    await sequelize.query(`
      ALTER TABLE customers
        DROP FOREIGN KEY fk_customer_secondary_route,
        DROP COLUMN secondary_route_id
    `);
  },
};
