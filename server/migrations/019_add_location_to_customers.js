module.exports = {
  up: async (sequelize) => {
    const [lat] = await sequelize.query(`SHOW COLUMNS FROM customers LIKE 'last_latitude'`);
    if (!lat.length) {
      await sequelize.query(`ALTER TABLE customers ADD COLUMN last_latitude DECIMAL(10,7) NULL AFTER visit_order`);
    }
    const [lng] = await sequelize.query(`SHOW COLUMNS FROM customers LIKE 'last_longitude'`);
    if (!lng.length) {
      await sequelize.query(`ALTER TABLE customers ADD COLUMN last_longitude DECIMAL(10,7) NULL AFTER last_latitude`);
    }
  },
};
