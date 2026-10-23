module.exports = {
  async up(sequelize) {
    const [columns] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sales_orders' AND COLUMN_NAME='client_request_id'`
    );
    if (!columns.length) {
      await sequelize.query(`ALTER TABLE sales_orders ADD COLUMN client_request_id VARCHAR(64) NULL`);
    }

    const [indexes] = await sequelize.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sales_orders' AND INDEX_NAME='uq_sales_orders_client_request_id'`
    );
    if (!indexes.length) {
      await sequelize.query(
        `CREATE UNIQUE INDEX uq_sales_orders_client_request_id ON sales_orders (client_request_id)`
      );
    }
  },
};
