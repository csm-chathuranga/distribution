require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Role, Branch } = require('../models');

const USERS = [
  { role: 'super_admin',    name: 'Super Admin',       email: 'superadmin@lankadist.lk',  password: 'Super@123',   employee_id: 'EMP000', phone: '+94 77 000 0001' },
  { role: 'admin',          name: 'System Administrator', email: 'admin@lankadist.lk',    password: 'Admin@123',   employee_id: 'EMP001', phone: '+94 77 000 0000' },
  { role: 'manager',        name: 'Nimal Perera',       email: 'manager@lankadist.lk',    password: 'Manager@123', employee_id: 'EMP002', phone: '+94 77 100 0002' },
  { role: 'accountant',     name: 'Kamala Fernando',    email: 'accountant@lankadist.lk', password: 'Acct@1234',   employee_id: 'EMP003', phone: '+94 77 100 0003' },
  { role: 'sales_rep',      name: 'Sunil Rathnayake',   email: 'sales1@lankadist.lk',     password: 'Sales@123',   employee_id: 'EMP004', phone: '+94 77 100 0004' },
  { role: 'sales_rep',      name: 'Amara Bandara',      email: 'sales2@lankadist.lk',     password: 'Sales@123',   employee_id: 'EMP005', phone: '+94 77 100 0005' },
  { role: 'delivery',       name: 'Ruwan Jayasinghe',   email: 'driver1@lankadist.lk',    password: 'Driver@123',  employee_id: 'EMP006', phone: '+94 77 100 0006' },
  { role: 'delivery',       name: 'Chaminda Silva',     email: 'driver2@lankadist.lk',    password: 'Driver@123',  employee_id: 'EMP007', phone: '+94 77 100 0007' },
  { role: 'cashier',        name: 'Dilani Wickrama',    email: 'cashier@lankadist.lk',    password: 'Cash@1234',   employee_id: 'EMP008', phone: '+94 77 100 0008' },
];

(async () => {
  try {
    await sequelize.authenticate();

    const branch = await Branch.findOne();
    if (!branch) { console.error('No branch found. Run main seed first.'); process.exit(1); }

    const roles = {};
    const allRoles = await Role.findAll();
    allRoles.forEach(r => { roles[r.name] = r; });

    for (const u of USERS) {
      const role = roles[u.role];
      if (!role) { console.warn(`Role "${u.role}" not found, skipping ${u.email}`); continue; }

      const hash = await bcrypt.hash(u.password, 10);
      const [user, created] = await User.findOrCreate({
        where: { email: u.email },
        defaults: {
          branch_id: branch.id,
          role_id: role.id,
          name: u.name,
          password_hash: hash,
          phone: u.phone,
          employee_id: u.employee_id,
          is_active: true,
        },
      });

      if (!created) {
        // Update password and role in case they changed
        await user.update({ password_hash: hash, role_id: role.id, is_active: true });
      }

      console.log(`${created ? 'Created' : 'Updated'}: ${u.email} (${u.role}) — password: ${u.password}`);
    }

    console.log('\n✓ All users seeded.');
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
