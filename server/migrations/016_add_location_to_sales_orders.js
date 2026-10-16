module.exports = {
  up: async (sequelize) => {
    const [lat] = await sequelize.query(`SHOW COLUMNS FROM sales_orders LIKE 'latitude'`);
    if (!lat.length) {
      await sequelize.query(`ALTER TABLE sales_orders ADD COLUMN latitude DECIMAL(10,7) NULL AFTER notes`);
    }
    const [lng] = await sequelize.query(`SHOW COLUMNS FROM sales_orders LIKE 'longitude'`);
    if (!lng.length) {
      await sequelize.query(`ALTER TABLE sales_orders ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude`);
    }
  },
};
