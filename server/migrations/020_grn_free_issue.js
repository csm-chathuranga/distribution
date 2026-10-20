module.exports = {
  up: async (sequelize) => {
    const [repCol] = await sequelize.query(`SHOW COLUMNS FROM goods_received LIKE 'free_sales_rep_id'`);
    if (!repCol.length) {
      await sequelize.query(`ALTER TABLE goods_received ADD COLUMN free_sales_rep_id INT NULL AFTER notes`);
    }
    const [fiqCol] = await sequelize.query(`SHOW COLUMNS FROM goods_received_lines LIKE 'free_issue_qty'`);
    if (!fiqCol.length) {
      await sequelize.query(`ALTER TABLE goods_received_lines ADD COLUMN free_issue_qty DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER quantity`);
    }
  },
};
