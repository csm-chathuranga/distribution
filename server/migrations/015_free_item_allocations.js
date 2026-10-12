module.exports = {
  up: async (sequelize) => {
    const [t1] = await sequelize.query(`SHOW TABLES LIKE 'free_item_allocations'`);
    if (!t1.length) {
      await sequelize.query(`
        CREATE TABLE free_item_allocations (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          company_id    INT NOT NULL,
          branch_id     INT NOT NULL,
          sales_rep_id  INT NOT NULL,
          product_id    INT NOT NULL,
          warehouse_id  INT NOT NULL,
          allocated_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
          used_quantity      DECIMAL(10,2) NOT NULL DEFAULT 0,
          notes         TEXT,
          created_by    INT NOT NULL,
          created_at    DATETIME NOT NULL,
          updated_at    DATETIME NOT NULL,
          UNIQUE KEY uq_rep_product (sales_rep_id, product_id)
        )
      `);
    }

    const [t2] = await sequelize.query(`SHOW TABLES LIKE 'free_item_usages'`);
    if (!t2.length) {
      await sequelize.query(`
        CREATE TABLE free_item_usages (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          allocation_id INT NOT NULL,
          customer_id   INT,
          invoice_id    INT,
          quantity      DECIMAL(10,2) NOT NULL,
          notes         TEXT,
          given_by      INT NOT NULL,
          created_at    DATETIME NOT NULL,
          updated_at    DATETIME NOT NULL
        )
      `);
    }
  },
};
