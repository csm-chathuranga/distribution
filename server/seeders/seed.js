require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Company, Branch, Role, Permission, RolePermission, User, Account, AccountingPeriod, Unit, Warehouse } = require('../models');
const bcrypt = require('bcryptjs');

const PERMISSIONS = [
  // Inventory
  { code: 'inventory.view', module: 'inventory', action: 'view', description: 'View inventory & stock' },
  { code: 'inventory.create', module: 'inventory', action: 'create', description: 'Create stock records & products' },
  { code: 'inventory.adjust', module: 'inventory', action: 'adjust', description: 'Adjust stock levels' },
  { code: 'inventory.transfer', module: 'inventory', action: 'transfer', description: 'Transfer stock between warehouses' },
  // Sales
  { code: 'sales.view_own', module: 'sales', action: 'view_own', description: 'View own sales orders' },
  { code: 'sales.view_all', module: 'sales', action: 'view_all', description: 'View all sales orders' },
  { code: 'sales.create', module: 'sales', action: 'create', description: 'Create sales orders & invoices' },
  { code: 'sales.approve', module: 'sales', action: 'approve', description: 'Approve sales orders' },
  { code: 'sales.cancel', module: 'sales', action: 'cancel', description: 'Cancel invoices & orders' },
  { code: 'sales.return', module: 'sales', action: 'return', description: 'Process sales returns' },
  // Purchasing
  { code: 'purchase.view', module: 'purchase', action: 'view', description: 'View purchase orders & GRNs' },
  { code: 'purchase.create', module: 'purchase', action: 'create', description: 'Create purchase orders' },
  { code: 'purchase.approve', module: 'purchase', action: 'approve', description: 'Approve purchase orders' },
  { code: 'purchase.receive', module: 'purchase', action: 'receive', description: 'Receive goods (GRN)' },
  // Finance
  { code: 'finance.view', module: 'finance', action: 'view', description: 'View financial records' },
  { code: 'finance.receipts', module: 'finance', action: 'receipts', description: 'Create customer receipts' },
  { code: 'finance.payments', module: 'finance', action: 'payments', description: 'Create supplier payments' },
  { code: 'finance.journals', module: 'finance', action: 'journals', description: 'Create journal entries' },
  { code: 'finance.close_period', module: 'finance', action: 'close_period', description: 'Close accounting periods' },
  // Reports
  { code: 'reports.sales', module: 'reports', action: 'sales', description: 'View sales reports' },
  { code: 'reports.finance', module: 'reports', action: 'finance', description: 'View financial reports' },
  { code: 'reports.inventory', module: 'reports', action: 'inventory', description: 'View inventory reports' },
  { code: 'reports.full', module: 'reports', action: 'full', description: 'View all reports' },
  // Settings
  { code: 'settings.users', module: 'settings', action: 'users', description: 'Manage users' },
  { code: 'settings.roles', module: 'settings', action: 'roles', description: 'Manage roles & permissions' },
  { code: 'settings.company', module: 'settings', action: 'company', description: 'Manage company & branches' },
];

const ROLE_PERMISSIONS = {
  super_admin: PERMISSIONS.map(p => p.code),
  admin: PERMISSIONS.map(p => p.code),
  manager: [
    'inventory.view', 'inventory.create', 'inventory.adjust', 'inventory.transfer',
    'sales.view_all', 'sales.create', 'sales.approve', 'sales.cancel', 'sales.return',
    'purchase.view', 'purchase.create', 'purchase.approve', 'purchase.receive',
    'finance.view', 'finance.receipts', 'finance.payments',
    'reports.sales', 'reports.finance', 'reports.inventory', 'reports.full',
  ],
  accountant: [
    'sales.view_all', 'purchase.view',
    'finance.view', 'finance.receipts', 'finance.payments', 'finance.journals',
    'reports.sales', 'reports.finance', 'reports.inventory', 'reports.full',
  ],
  sales_rep: [
    'sales.view_own', 'sales.create',
    'inventory.view',
    'reports.sales',
  ],
  warehouse: [
    'inventory.view', 'inventory.create', 'inventory.adjust', 'inventory.transfer',
    'purchase.view', 'purchase.receive',
    'reports.inventory',
  ],
  driver: ['sales.view_own'],
  cashier: ['sales.create', 'sales.view_own', 'finance.receipts'],
};

// parent: account code of the parent (resolved to parent_id after first-pass create)
const CHART_OF_ACCOUNTS = [
  // ── ASSETS ──────────────────────────────────────────────────────────────────
  { code: '1000', name: 'Assets',                   type: 'ASSET',     is_system: true },
  { code: '1100', name: 'Cash & Bank',               type: 'ASSET',     parent: '1000', sub_type: 'CASH_BANK',        is_system: true },
  { code: '1101', name: 'Petty Cash',                type: 'ASSET',     parent: '1100', sub_type: 'PETTY_CASH',       is_system: true },
  { code: '1102', name: 'Main Bank Account',         type: 'ASSET',     parent: '1100', sub_type: 'MAIN_BANK',        is_system: true },
  { code: '1103', name: 'Savings Account',           type: 'ASSET',     parent: '1100', sub_type: 'BANK',             is_system: false },
  { code: '1200', name: 'Accounts Receivable',       type: 'ASSET',     parent: '1000', is_system: true },
  { code: '1201', name: 'Trade Debtors',             type: 'ASSET',     parent: '1200', sub_type: 'TRADE_DEBTORS',    is_system: true },
  { code: '1202', name: 'Cheques in Hand',           type: 'ASSET',     parent: '1200', sub_type: 'CHEQUES_IN_HAND',  is_system: true },
  { code: '1203', name: 'Deposits Receivable',       type: 'ASSET',     parent: '1200', is_system: false },
  { code: '1300', name: 'Inventory',                 type: 'ASSET',     parent: '1000', is_system: true },
  { code: '1301', name: 'Stock on Hand',             type: 'ASSET',     parent: '1300', sub_type: 'STOCK',            is_system: true },
  { code: '1302', name: 'Goods in Transit',          type: 'ASSET',     parent: '1300', is_system: false },
  { code: '1400', name: 'Other Current Assets',      type: 'ASSET',     parent: '1000', is_system: false },
  { code: '1401', name: 'Prepaid Expenses',          type: 'ASSET',     parent: '1400', is_system: false },
  { code: '1402', name: 'Staff Advances',            type: 'ASSET',     parent: '1400', is_system: false },
  { code: '1500', name: 'Fixed Assets',              type: 'ASSET',     parent: '1000', is_system: false },
  { code: '1501', name: 'Motor Vehicles',            type: 'ASSET',     parent: '1500', is_system: false },
  { code: '1502', name: 'Office Equipment',          type: 'ASSET',     parent: '1500', is_system: false },
  { code: '1503', name: 'Accumulated Depreciation',  type: 'ASSET',     parent: '1500', is_system: false },
  // ── LIABILITIES ──────────────────────────────────────────────────────────────
  { code: '2000', name: 'Liabilities',               type: 'LIABILITY', is_system: true },
  { code: '2100', name: 'Accounts Payable',          type: 'LIABILITY', parent: '2000', is_system: true },
  { code: '2101', name: 'Trade Creditors',           type: 'LIABILITY', parent: '2100', sub_type: 'TRADE_CREDITORS',  is_system: true },
  { code: '2102', name: 'Accrued Expenses',          type: 'LIABILITY', parent: '2100', is_system: false },
  { code: '2200', name: 'Tax Liabilities',           type: 'LIABILITY', parent: '2000', is_system: true },
  { code: '2201', name: 'VAT Payable (18%)',         type: 'LIABILITY', parent: '2200', sub_type: 'VAT_PAYABLE',      is_system: true },
  { code: '2202', name: 'WHT Payable',               type: 'LIABILITY', parent: '2200', sub_type: 'WHT_PAYABLE',      is_system: false },
  { code: '2203', name: 'Income Tax Payable',        type: 'LIABILITY', parent: '2200', is_system: false },
  { code: '2300', name: 'Other Current Liabilities', type: 'LIABILITY', parent: '2000', is_system: false },
  { code: '2301', name: 'Customer Deposits',         type: 'LIABILITY', parent: '2300', is_system: false },
  { code: '2302', name: 'Salaries Payable',          type: 'LIABILITY', parent: '2300', is_system: false },
  { code: '2400', name: 'Long-term Liabilities',     type: 'LIABILITY', parent: '2000', is_system: false },
  { code: '2401', name: 'Bank Loan',                 type: 'LIABILITY', parent: '2400', is_system: false },
  // ── EQUITY ───────────────────────────────────────────────────────────────────
  { code: '3000', name: 'Equity',                    type: 'EQUITY',    is_system: true },
  { code: '3001', name: 'Owner Capital',             type: 'EQUITY',    parent: '3000', is_system: true },
  { code: '3002', name: 'Retained Earnings',         type: 'EQUITY',    parent: '3000', is_system: true },
  { code: '3003', name: 'Current Year Earnings',     type: 'EQUITY',    parent: '3000', is_system: true },
  // ── REVENUE ──────────────────────────────────────────────────────────────────
  { code: '4000', name: 'Revenue',                   type: 'REVENUE',   is_system: true },
  { code: '4001', name: 'Sales Revenue',             type: 'REVENUE',   parent: '4000', sub_type: 'SALES_REVENUE',   is_system: true },
  { code: '4002', name: 'Sales Returns & Allowances', type: 'REVENUE',  parent: '4000', is_system: false },
  { code: '4003', name: 'Sales Discounts',           type: 'REVENUE',   parent: '4000', is_system: false },
  { code: '4100', name: 'Other Income',              type: 'REVENUE',   parent: '4000', is_system: false },
  { code: '4101', name: 'Interest Income',           type: 'REVENUE',   parent: '4100', is_system: false },
  { code: '4102', name: 'Freight Income',            type: 'REVENUE',   parent: '4100', is_system: false },
  // ── COGS ─────────────────────────────────────────────────────────────────────
  { code: '5000', name: 'Cost of Goods Sold',        type: 'COGS',      is_system: true },
  { code: '5001', name: 'Cost of Sales',             type: 'COGS',      parent: '5000', sub_type: 'COGS',            is_system: true },
  { code: '5002', name: 'Purchase Discounts',        type: 'COGS',      parent: '5000', is_system: false },
  { code: '5003', name: 'Freight & Carriage Inward', type: 'COGS',      parent: '5000', is_system: false },
  // ── EXPENSES ─────────────────────────────────────────────────────────────────
  { code: '6000', name: 'Expenses',                  type: 'EXPENSE',   is_system: true },
  { code: '6100', name: 'Staff Costs',               type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6101', name: 'Salaries & Wages',          type: 'EXPENSE',   parent: '6100', is_system: false },
  { code: '6102', name: 'EPF / ETF Contributions',  type: 'EXPENSE',   parent: '6100', is_system: false },
  { code: '6103', name: 'Staff Training',            type: 'EXPENSE',   parent: '6100', is_system: false },
  { code: '6200', name: 'Logistics & Vehicle',       type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6201', name: 'Transport & Fuel',          type: 'EXPENSE',   parent: '6200', is_system: false },
  { code: '6202', name: 'Vehicle Maintenance',       type: 'EXPENSE',   parent: '6200', is_system: false },
  { code: '6203', name: 'Delivery Charges',          type: 'EXPENSE',   parent: '6200', is_system: false },
  { code: '6300', name: 'Occupancy',                 type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6301', name: 'Rent',                      type: 'EXPENSE',   parent: '6300', is_system: false },
  { code: '6302', name: 'Utilities (Electricity/Water)', type: 'EXPENSE', parent: '6300', is_system: false },
  { code: '6400', name: 'Administrative',            type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6401', name: 'Office Supplies',           type: 'EXPENSE',   parent: '6400', is_system: false },
  { code: '6402', name: 'Communication',             type: 'EXPENSE',   parent: '6400', is_system: false },
  { code: '6403', name: 'Professional Fees',         type: 'EXPENSE',   parent: '6400', is_system: false },
  { code: '6500', name: 'Sales & Marketing',         type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6501', name: 'Marketing & Advertising',   type: 'EXPENSE',   parent: '6500', is_system: false },
  { code: '6502', name: 'Sales Commissions',         type: 'EXPENSE',   parent: '6500', is_system: false },
  { code: '6600', name: 'Finance Costs',             type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6601', name: 'Bank Charges',              type: 'EXPENSE',   parent: '6600', is_system: false },
  { code: '6602', name: 'Interest Expense',          type: 'EXPENSE',   parent: '6600', is_system: false },
  { code: '6700', name: 'Depreciation',              type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6701', name: 'Depreciation — Vehicles',   type: 'EXPENSE',   parent: '6700', is_system: false },
  { code: '6702', name: 'Depreciation — Equipment',  type: 'EXPENSE',   parent: '6700', is_system: false },
  { code: '6999', name: 'Miscellaneous Expenses',    type: 'EXPENSE',   parent: '6000', is_system: false },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    await sequelize.sync({ force: false, alter: true });
    console.log('Schema synced.');

    // Company
    const [company] = await Company.findOrCreate({
      where: { name: 'Lanka Distribution (Pvt) Ltd' },
      defaults: {
        address: 'No. 1, Galle Road, Colombo 03, Sri Lanka',
        phone: '+94 11 234 5678',
        email: 'info@lankadist.lk',
        tin_number: 'TIN123456789',
        vat_number: 'VAT123456789',
        currency: 'LKR',
      },
    });
    console.log(`Company: ${company.name}`);

    // Branch
    const [branch] = await Branch.findOrCreate({
      where: { code: 'HO' },
      defaults: {
        company_id: company.id,
        name: 'Head Office - Colombo',
        address: 'No. 1, Galle Road, Colombo 03',
        phone: '+94 11 234 5678',
        is_head_office: true,
        is_active: true,
      },
    });
    console.log(`Branch: ${branch.name}`);

    // Warehouse
    const [warehouse] = await Warehouse.findOrCreate({
      where: { code: 'WH-COL' },
      defaults: {
        branch_id: branch.id,
        name: 'Main Warehouse - Colombo',
        address: 'No. 1, Galle Road, Colombo 03',
        is_active: true,
      },
    });
    console.log(`Warehouse: ${warehouse.name}`);

    // Roles
    const roles = {};
    const roleData = [
      { name: 'super_admin', display_name: 'Super Admin', is_system: true },
      { name: 'admin', display_name: 'Administrator', is_system: true },
      { name: 'manager', display_name: 'Manager', is_system: true },
      { name: 'accountant', display_name: 'Accountant', is_system: true },
      { name: 'sales_rep', display_name: 'Sales Representative', is_system: true },
      { name: 'warehouse', display_name: 'Warehouse Staff', is_system: true },
      { name: 'driver', display_name: 'Driver', is_system: true },
      { name: 'cashier', display_name: 'Cashier', is_system: true },
    ];
    for (const r of roleData) {
      const [role] = await Role.findOrCreate({ where: { name: r.name }, defaults: r });
      roles[r.name] = role;
    }
    console.log('Roles created.');

    // Permissions
    const permMap = {};
    for (const p of PERMISSIONS) {
      const [perm] = await Permission.findOrCreate({ where: { code: p.code }, defaults: p });
      permMap[p.code] = perm;
    }
    console.log('Permissions created.');

    // Assign permissions to roles
    for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const role = roles[roleName];
      const perms = permCodes.map(c => permMap[c]).filter(Boolean);
      await role.setPermissions(perms);
    }
    console.log('Role permissions assigned.');

    // Admin user
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@lankadist.lk' },
      defaults: {
        branch_id: branch.id,
        role_id: roles['admin'].id,
        name: 'System Administrator',
        password_hash: adminHash,
        phone: '+94 77 000 0000',
        employee_id: 'EMP001',
        is_active: true,
      },
    });
    console.log(`Admin user: ${adminUser.email}`);

    // Chart of Accounts — two-pass: create all first, then wire parent_id
    const accountMap = {};
    for (const acc of CHART_OF_ACCOUNTS) {
      const { parent, ...fields } = acc;
      const [account] = await Account.findOrCreate({
        where: { company_id: company.id, code: acc.code },
        defaults: { ...fields, company_id: company.id },
      });
      accountMap[acc.code] = account;
    }
    for (const acc of CHART_OF_ACCOUNTS) {
      if (acc.parent && accountMap[acc.parent]) {
        await accountMap[acc.code].update({ parent_id: accountMap[acc.parent].id });
      }
    }
    console.log(`Chart of accounts created (${CHART_OF_ACCOUNTS.length} accounts).`);

    // Accounting period (current month)
    const now = new Date();
    await AccountingPeriod.findOrCreate({
      where: { company_id: company.id, year: now.getFullYear(), month: now.getMonth() + 1 },
      defaults: { is_open: true },
    });
    console.log(`Accounting period: ${now.getFullYear()}/${now.getMonth() + 1} opened.`);

    // Units
    const unitData = [
      { name: 'Piece', abbreviation: 'Pcs' },
      { name: 'Dozen', abbreviation: 'Doz' },
      { name: 'Case', abbreviation: 'Cs' },
      { name: 'Kilogram', abbreviation: 'Kg' },
      { name: 'Litre', abbreviation: 'Ltr' },
      { name: 'Packet', abbreviation: 'Pkt' },
      { name: 'Bottle', abbreviation: 'Btl' },
      { name: 'Box', abbreviation: 'Box' },
    ];
    for (const u of unitData) {
      await Unit.findOrCreate({
        where: { company_id: company.id, name: u.name },
        defaults: { ...u, company_id: company.id },
      });
    }
    console.log('Units created.');

    console.log('\n✅ Seed complete!');
    console.log('   Login: admin@lankadist.lk');
    console.log('   Password: Admin@123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
