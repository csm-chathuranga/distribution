module.exports = {
  async up(sequelize) {
    await sequelize.query(`SET SESSION sql_mode = ''`);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sales_commissions (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        sales_rep_id      INT            NOT NULL,
        branch_id         INT            NOT NULL,
        sale_year         INT            NOT NULL,
        sale_month        TINYINT        NOT NULL,
        cash_revenue      DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
        cogs              DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
        net_profit        DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
        commission_rate   DECIMAL(5,2)   NOT NULL DEFAULT 5.00,
        commission_amount DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
        due_date          DATE           NOT NULL,
        status            ENUM('PENDING','APPROVED','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
        approved_by       INT            NULL,
        approved_at       DATETIME       NULL,
        paid_date         DATE           NULL,
        payment_notes     TEXT           NULL,
        created_by        INT            NOT NULL,
        createdAt         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_rep_month (sales_rep_id, sale_year, sale_month),
        CONSTRAINT fk_sc_rep    FOREIGN KEY (sales_rep_id) REFERENCES users(id),
        CONSTRAINT fk_sc_branch FOREIGN KEY (branch_id)    REFERENCES branches(id)
      )
    `);
  },
};
