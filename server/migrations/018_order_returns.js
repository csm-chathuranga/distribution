module.exports = {
  async up(sequelize) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS order_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(10,4) NOT NULL DEFAULT 0,
        unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        reason ENUM('EXPIRED','DAMAGED','WRONG_ITEM','OTHER') NOT NULL DEFAULT 'OTHER',
        action ENUM('REPLACE','DEDUCT') NOT NULL DEFAULT 'DEDUCT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
  },
  async down(sequelize) {
    await sequelize.query(`DROP TABLE IF EXISTS order_returns`);
  },
};
