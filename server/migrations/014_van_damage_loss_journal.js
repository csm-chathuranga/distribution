module.exports = {
  up: async (sequelize) => {
    // 1. Extend source_type ENUM on journal_entries to include VAN_CLOSE
    await sequelize.query(`
      ALTER TABLE journal_entries
      MODIFY COLUMN source_type ENUM(
        'MANUAL','INVOICE','RECEIPT','PAYMENT',
        'GRN','STOCK_ADJ','TRANSFER','EXPENSE',
        'SUPPLIER_RETURN','VAN_CLOSE'
      ) NOT NULL
    `);

    // 2. Add Van Damage & Loss expense account (idempotent)
    const [existing] = await sequelize.query(`SELECT id FROM accounts WHERE code = '6800' LIMIT 1`);
    if (!existing.length) {
      // Find parent 6000 Expenses
      const [parent] = await sequelize.query(`SELECT id FROM accounts WHERE code = '6000' LIMIT 1`);
      const parentId = parent[0]?.id || null;
      const [company] = await sequelize.query(`SELECT id, currency FROM companies LIMIT 1`);
      const companyId = company[0]?.id || 1;

      await sequelize.query(`
        INSERT INTO accounts (company_id, code, name, type, parent_id, sub_type, is_system, is_active, created_at, updated_at)
        VALUES (${companyId}, '6800', 'Van Damage & Loss', 'EXPENSE', ${parentId || 'NULL'}, 'VAN_LOSS', 1, 1, NOW(), NOW())
      `);
    }
  },
};
