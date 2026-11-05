module.exports = {
  up: async (sequelize) => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS driver_deductions (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        company_id      INT NOT NULL,
        driver_id       INT NOT NULL,
        loading_sheet_id INT NOT NULL,
        product_id      INT NOT NULL,
        quantity        DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit_cost       DECIMAL(10,2) NOT NULL DEFAULT 0,
        amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
        status          ENUM('PENDING','SETTLED','FOUND') NOT NULL DEFAULT 'PENDING',
        settled_date    DATE NULL,
        found_date      DATE NULL,
        notes           TEXT NULL,
        created_by      INT NULL,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES users(id),
        FOREIGN KEY (loading_sheet_id) REFERENCES loading_sheets(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
  },
  down: async (sequelize) => {
    await sequelize.query(`DROP TABLE IF EXISTS driver_deductions`);
  },
};
