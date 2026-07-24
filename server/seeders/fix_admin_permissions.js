const { sequelize, Role, Permission } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();

    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) { console.log('admin role not found'); process.exit(1); }

    const allPerms = await Permission.findAll();
    await adminRole.setPermissions(allPerms);
    console.log(`Admin role updated: ${allPerms.length} permissions assigned.`);

    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
