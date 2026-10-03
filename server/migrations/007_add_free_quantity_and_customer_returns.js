module.exports = {
  async up(sequelize) {
    await sequelize.query(`SET SESSION sql_mode = ''`);

    // FOC quantity on sales order lines (skip if already added)
    const [solCols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sales_order_lines' AND COLUMN_NAME='free_quantity'`
    );
    if (!solCols.length) {
      await sequelize.query(`ALTER TABLE sales_order_lines ADD COLUMN free_quantity DECIMAL(12,4) NOT NULL DEFAULT 0.0000`);
    }

    // FOC quantity on invoice lines (skip if already added)
    const [ilCols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='invoice_lines' AND COLUMN_NAME='free_quantity'`
    );
    if (!ilCols.length) {
      await sequelize.query(`ALTER TABLE invoice_lines ADD COLUMN free_quantity DECIMAL(12,4) NOT NULL DEFAULT 0.0000`);
    }

    // Customer return notes (operational document, driver carries)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS customer_returns (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        return_number VARCHAR(50)  NOT NULL UNIQUE,
        company_id    INT          NOT NULL,
        branch_id     INT          NOT NULL,
        warehouse_id  INT          NOT NULL,
        customer_id   INT          NOT NULL,
        invoice_id    INT          NULL,
        driver_id     INT          NULL,
        sales_rep_id  INT          NULL,
        route_id      INT          NULL,
        return_date   DATE         NOT NULL,
        status        ENUM('DRAFT','CONFIRMED','CREDITED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
        notes         TEXT         NULL,
        created_by    INT          NOT NULL,
        confirmed_by  INT          NULL,
        confirmed_at  DATETIME     NULL,
        credit_note_id INT         NULL,
        createdAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_cr_customer  FOREIGN KEY (customer_id)  REFERENCES customers(id),
        CONSTRAINT fk_cr_invoice   FOREIGN KEY (invoice_id)   REFERENCES invoices(id)  ON DELETE SET NULL,
        CONSTRAINT fk_cr_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        CONSTRAINT fk_cr_branch    FOREIGN KEY (branch_id)    REFERENCES branches(id),
        CONSTRAINT fk_cr_credit    FOREIGN KEY (credit_note_id) REFERENCES invoices(id) ON DELETE SET NULL
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS customer_return_lines (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        return_id   INT             NOT NULL,
        product_id  INT             NOT NULL,
        quantity    DECIMAL(12,4)   NOT NULL,
        unit_price  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
        reason      VARCHAR(255)    NULL,
        CONSTRAINT fk_crl_return  FOREIGN KEY (return_id)  REFERENCES customer_returns(id) ON DELETE CASCADE,
        CONSTRAINT fk_crl_product FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
  },
};
