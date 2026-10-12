module.exports = {
  up: async (sequelize) => {
    await sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.code = 'sales.create'
      WHERE r.name = 'delivery'
    `);
  },
};
