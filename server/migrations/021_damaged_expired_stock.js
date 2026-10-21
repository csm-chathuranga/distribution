module.exports = {
  up: async (sequelize) => {
    const [dmgCol] = await sequelize.query(`SHOW COLUMNS FROM stock LIKE 'damaged_quantity'`);
    if (!dmgCol.length) {
      await sequelize.query(`ALTER TABLE stock ADD COLUMN damaged_quantity DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER reserved_quantity`);
    }
    const [expCol] = await sequelize.query(`SHOW COLUMNS FROM stock LIKE 'expired_quantity'`);
    if (!expCol.length) {
      await sequelize.query(`ALTER TABLE stock ADD COLUMN expired_quantity DECIMAL(12,4) NOT NULL DEFAULT 0 AFTER damaged_quantity`);
    }
  },
};
