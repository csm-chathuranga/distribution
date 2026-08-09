module.exports = {
  async up(sequelize) {
    await sequelize.query(`
      ALTER TABLE journal_entries
        MODIFY COLUMN source_type ENUM(
          'MANUAL','INVOICE','RECEIPT','PAYMENT',
          'GRN','STOCK_ADJ','TRANSFER','EXPENSE',
          'SUPPLIER_RETURN'
        ) NOT NULL
    `);
  },
};
