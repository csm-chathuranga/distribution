// Run: node server/seeders/seedDemoData.js
// Prerequisite: run seed.js first (company/roles/accounts/units must exist)
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const log = (...args) => console.log(...args);

const sel = (sql, rp = {}) => sequelize.query(sql, { type: QueryTypes.SELECT, replacements: rp });

async function rawIns(sql, rp = {}) {
  const [result] = await sequelize.query(sql, { replacements: rp });
  return result; // insertId for INSERT statements
}

async function ensure(table, uniqueField, uniqueVal, data) {
  const rows = await sel(`SELECT id FROM \`${table}\` WHERE \`${uniqueField}\` = :v LIMIT 1`, { v: uniqueVal });
  if (rows.length) return rows[0].id;
  const keys = Object.keys(data);
  const cols = keys.map(k => `\`${k}\``).join(', ');
  const pls = keys.map(k => `:${k}`).join(', ');
  return rawIns(`INSERT INTO \`${table}\` (${cols}) VALUES (${pls})`, data);
}

let _jeN = 0;
function nextJE() { return `JE-SEED-${String(++_jeN).padStart(4, '0')}`; }

async function createJE({ companyId, branchId, periodId, date, sourceType, sourceId, ref, desc, lines, userId }) {
  const num = nextJE();
  const total = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const [jeId] = await sequelize.query(
    `INSERT INTO journal_entries (company_id, branch_id, period_id, entry_number, entry_date, source_type, source_id, reference, description, total_debit, total_credit, is_posted, created_by)
     VALUES (:c, :b, :p, :n, :d, :st, :si, :r, :desc, :td, :tc, 1, :u)`,
    { replacements: { c: companyId, b: branchId, p: periodId, n: num, d: date, st: sourceType, si: sourceId, r: ref, desc, td: total, tc: total, u: userId } }
  );
  for (const l of lines) {
    await rawIns(
      `INSERT INTO journal_lines (journal_id, account_id, debit, credit, description) VALUES (:j, :a, :d, :c, :desc)`,
      { j: jeId, a: l.account_id, d: l.debit || 0, c: l.credit || 0, desc: l.desc || null }
    );
  }
  return jeId;
}

async function seed() {
  await sequelize.authenticate();
  // Disable strict mode so raw inserts don't fail on auto-timestamp columns added by Sequelize sync
  await sequelize.query("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");
  log('Connected to database.');

  // Check if already seeded
  const already = await sel('SELECT COUNT(*) as cnt FROM products WHERE sku LIKE :s', { s: 'BEV-LION-%' });
  if (already[0].cnt > 0) {
    log('Demo data already seeded. Delete products/invoices and re-run to reseed.');
    process.exit(0);
  }

  // ── Base lookups ────────────────────────────────────────────
  const company = (await sel('SELECT id FROM companies LIMIT 1'))[0];
  if (!company) throw new Error('Run seed.js first.');
  const cid = company.id;

  const hoBranch = (await sel('SELECT id FROM branches WHERE is_head_office = 1 LIMIT 1'))[0];
  const bid = hoBranch.id;

  const mainWH = (await sel('SELECT id FROM warehouses LIMIT 1'))[0];
  const wid = mainWH.id;

  const admin = (await sel('SELECT id FROM users WHERE email = :e', { e: 'admin@lankadist.lk' }))[0];
  const adminId = admin.id;

  const roles = {};
  for (const n of ['manager', 'accountant', 'sales_rep', 'warehouse', 'driver', 'cashier']) {
    const r = (await sel('SELECT id FROM roles WHERE name = :n', { n }))[0];
    if (r) roles[n] = r.id;
  }

  const getAcc = async (code) => (await sel('SELECT id FROM accounts WHERE company_id = :c AND code = :code', { c: cid, code }))[0]?.id;
  const acc = {
    bank:      await getAcc('1102'),
    debtors:   await getAcc('1201'),
    stock:     await getAcc('1301'),
    creditors: await getAcc('2101'),
    vat:       await getAcc('2201'),
    revenue:   await getAcc('4001'),
    cogs:      await getAcc('5001'),
    salaries:  await getAcc('6001'),
    fuel:      await getAcc('6002'),
    rent:      await getAcc('6003'),
    misc:      await getAcc('6099'),
  };

  log('Base data loaded.');

  // ── Accounting periods ───────────────────────────────────────
  for (const [y, m] of [[2026, 5], [2026, 6], [2026, 7]]) {
    const ex = await sel('SELECT id FROM accounting_periods WHERE company_id = :c AND year = :y AND month = :m', { c: cid, y, m });
    if (!ex.length) await rawIns('INSERT INTO accounting_periods (company_id, year, month, is_open, opened_at, created_at) VALUES (:c, :y, :m, 1, NOW(), NOW())', { c: cid, y, m });
  }
  const per = {};
  for (const m of [5, 6, 7]) {
    const r = (await sel('SELECT id FROM accounting_periods WHERE company_id = :c AND year = 2026 AND month = :m', { c: cid, m }))[0];
    if (r) per[m] = r.id;
  }
  log('Periods ready.');

  // ── Extra branches & warehouses ─────────────────────────────
  const bKandy = await ensure('branches', 'code', 'KDY', {
    company_id: cid, name: 'Kandy Branch', code: 'KDY',
    address: 'No. 42, Peradeniya Road, Kandy', phone: '+94 81 222 3456',
    is_head_office: 0, is_active: 1,
  });
  const bGalle = await ensure('branches', 'code', 'GLE', {
    company_id: cid, name: 'Galle Branch', code: 'GLE',
    address: 'No. 15, Matara Road, Galle', phone: '+94 91 222 4567',
    is_head_office: 0, is_active: 1,
  });
  const wKandy = await ensure('warehouses', 'code', 'WH-KDY', {
    branch_id: bKandy, name: 'Kandy Warehouse', code: 'WH-KDY',
    address: 'No. 42, Peradeniya Road, Kandy', is_active: 1,
  });
  const wGalle = await ensure('warehouses', 'code', 'WH-GLE', {
    branch_id: bGalle, name: 'Galle Warehouse', code: 'WH-GLE',
    address: 'No. 15, Matara Road, Galle', is_active: 1,
  });
  log('Branches & warehouses ready.');

  // ── Users ────────────────────────────────────────────────────
  const staffHash = await bcrypt.hash('Staff@123', 10);
  const managerId    = await ensure('users', 'email', 'manager@lankadist.lk',  { branch_id: bid, role_id: roles.manager,    name: 'Nimal Perera',        email: 'manager@lankadist.lk',  password_hash: staffHash, phone: '+94 77 111 2222', employee_id: 'EMP002', is_active: 1 });
  const accountantId = await ensure('users', 'email', 'accounts@lankadist.lk', { branch_id: bid, role_id: roles.accountant, name: 'Sunethra Fernando',    email: 'accounts@lankadist.lk', password_hash: staffHash, phone: '+94 77 333 4444', employee_id: 'EMP003', is_active: 1 });
  const salesRep1Id  = await ensure('users', 'email', 'sales1@lankadist.lk',   { branch_id: bid, role_id: roles.sales_rep,  name: 'Kasun Rajapaksa',     email: 'sales1@lankadist.lk',   password_hash: staffHash, phone: '+94 77 555 6666', employee_id: 'EMP004', is_active: 1 });
  const salesRep2Id  = await ensure('users', 'email', 'sales2@lankadist.lk',   { branch_id: bid, role_id: roles.sales_rep,  name: 'Chamindi Wijesinghe', email: 'sales2@lankadist.lk',   password_hash: staffHash, phone: '+94 77 777 8888', employee_id: 'EMP005', is_active: 1 });
  const driver1Id    = await ensure('users', 'email', 'driver1@lankadist.lk',  { branch_id: bid, role_id: roles.driver,     name: 'Bandula Gunasekara',  email: 'driver1@lankadist.lk',  password_hash: staffHash, phone: '+94 71 111 2222', employee_id: 'EMP006', is_active: 1 });
  const driver2Id    = await ensure('users', 'email', 'driver2@lankadist.lk',  { branch_id: bid, role_id: roles.driver,     name: 'Saman Dissanayake',   email: 'driver2@lankadist.lk',  password_hash: staffHash, phone: '+94 71 333 4444', employee_id: 'EMP007', is_active: 1 });
  log('Users ready.');

  // ── Categories ───────────────────────────────────────────────
  const cBev  = await ensure('categories', 'code', 'BEV',      { company_id: cid, name: 'Beverages',         code: 'BEV',      is_active: 1 });
  const cFood = await ensure('categories', 'code', 'FOOD',     { company_id: cid, name: 'Food',               code: 'FOOD',     is_active: 1 });
  const cCare = await ensure('categories', 'code', 'CARE',     { company_id: cid, name: 'Personal Care',      code: 'CARE',     is_active: 1 });
  const cHH   = await ensure('categories', 'code', 'HH',       { company_id: cid, name: 'Household',          code: 'HH',       is_active: 1 });
  const cDrk  = await ensure('categories', 'code', 'BEV-DRK',  { company_id: cid, parent_id: cBev,  name: 'Carbonated Drinks', code: 'BEV-DRK',  is_active: 1 });
  const cDry  = await ensure('categories', 'code', 'BEV-DRY',  { company_id: cid, parent_id: cBev,  name: 'Dairy',             code: 'BEV-DRY',  is_active: 1 });
  const cSnk  = await ensure('categories', 'code', 'FOOD-SNK', { company_id: cid, parent_id: cFood, name: 'Snacks & Biscuits', code: 'FOOD-SNK', is_active: 1 });
  const cRce  = await ensure('categories', 'code', 'FOOD-RCE', { company_id: cid, parent_id: cFood, name: 'Rice & Grains',     code: 'FOOD-RCE', is_active: 1 });
  const cIns  = await ensure('categories', 'code', 'FOOD-INS', { company_id: cid, parent_id: cFood, name: 'Instant Foods',     code: 'FOOD-INS', is_active: 1 });
  log('Categories ready.');

  // ── Units lookup ─────────────────────────────────────────────
  const getUnit = async (name) => (await sel('SELECT id FROM units WHERE company_id = :c AND name = :n', { c: cid, n: name }))[0]?.id;
  const uPcs = await getUnit('Piece');
  const uCs  = await getUnit('Case');
  const uKg  = await getUnit('Kilogram');
  const uPkt = await getUnit('Packet');
  const uBtl = await getUnit('Bottle');

  // ── Products ─────────────────────────────────────────────────
  // { sku, name, cat, unit, cost, sell, whl, reorder, stock }
  const PRODUCTS = [
    { sku: 'BEV-LION-330',      name: 'Lion Lager Beer 330ml (24-pack)',    cat: cDrk, unit: uCs,  cost: 2400, sell: 2880, whl: 2640, reorder: 50,  qty: 200 },
    { sku: 'BEV-GINGER-400',    name: 'Elephant House Ginger Beer 400ml',   cat: cDrk, unit: uBtl, cost: 60,   sell: 85,   whl: 75,   reorder: 100, qty: 500 },
    { sku: 'DAI-MILK-1L',       name: 'Highland Fresh Milk 1L',              cat: cDry, unit: uBtl, cost: 180,  sell: 230,  whl: 210,  reorder: 200, qty: 320 },
    { sku: 'DAI-BUTTER-200G',   name: 'Anchor Butter 200g',                  cat: cDry, unit: uPcs, cost: 360,  sell: 440,  whl: 400,  reorder: 80,  qty: 160 },
    { sku: 'FOOD-MILO-200G',    name: 'Milo Energy Drink 200g',              cat: cFood,unit: uPkt, cost: 320,  sell: 395,  whl: 360,  reorder: 100, qty: 220 },
    { sku: 'FOOD-NESTOMALT-400G',name:'Nestomalt 400g',                       cat: cFood,unit: uPkt, cost: 580,  sell: 720,  whl: 660,  reorder: 60,  qty: 90  },
    { sku: 'FOOD-CRACKERS-200G','name': 'Prima Crackers 200g',               cat: cSnk, unit: uPkt, cost: 55,   sell: 75,   whl: 65,   reorder: 200, qty: 650 },
    { sku: 'FOOD-MUNCHEE-200G', name: 'Munchee Chocolate Biscuit 200g',      cat: cSnk, unit: uPkt, cost: 70,   sell: 95,   whl: 85,   reorder: 150, qty: 280 },
    { sku: 'FOOD-MALIBAN-200G', name: 'Maliban Cream Cracker 200g',          cat: cSnk, unit: uPkt, cost: 60,   sell: 80,   whl: 72,   reorder: 150, qty: 190 },
    { sku: 'FOOD-RICE-5KG',     name: 'Kodiveli Samba Rice 5kg',             cat: cRce, unit: uPkt, cost: 950,  sell: 1150, whl: 1050, reorder: 100, qty: 130 },
    { sku: 'FOOD-KOTTU-400G',   name: 'Prima Kottu Noodles 400g',            cat: cIns, unit: uPkt, cost: 135,  sell: 175,  whl: 155,  reorder: 120, qty: 90  }, // LOW STOCK
    { sku: 'FOOD-SAUSAGE-250G', name: 'Keells Chicken Sausages 250g',        cat: cFood,unit: uPkt, cost: 385,  sell: 480,  whl: 440,  reorder: 80,  qty: 65  }, // LOW STOCK
    { sku: 'CARE-DETTOL-100G',  name: 'Dettol Soap 100g',                    cat: cCare,unit: uPcs, cost: 90,   sell: 125,  whl: 112,  reorder: 200, qty: 380 },
    { sku: 'CARE-LIFEBUOY-90G', name: 'Lifebuoy Soap 90g',                   cat: cCare,unit: uPcs, cost: 75,   sell: 105,  whl: 95,   reorder: 200, qty: 420 },
    { sku: 'HH-SUNLIGHT-900G',  name: 'Sunlight Washing Powder 900g',        cat: cHH,  unit: uPkt, cost: 320,  sell: 410,  whl: 375,  reorder: 80,  qty: 55  }, // LOW STOCK
    { sku: 'HH-SURF-1KG',       name: 'Surf Excel 1kg',                      cat: cHH,  unit: uPkt, cost: 380,  sell: 490,  whl: 445,  reorder: 80,  qty: 95  },
  ];

  const pMap = {}; // sku -> { id, cost, sell }
  for (const p of PRODUCTS) {
    const pid = await ensure('products', 'sku', p.sku, {
      company_id: cid, category_id: p.cat, base_unit_id: p.unit,
      sku: p.sku, name: p.name, cost_price: p.cost,
      selling_price: p.sell, wholesale_price: p.whl, vat_rate: 0,
      reorder_point: p.reorder, is_active: 1,
    });
    pMap[p.sku] = { id: pid, cost: p.cost, sell: p.sell, whl: p.whl };

    // Stock in main warehouse
    const existStock = await sel('SELECT id FROM stock WHERE warehouse_id = :w AND product_id = :p', { w: wid, p: pid });
    if (!existStock.length) {
      await rawIns('INSERT INTO stock (warehouse_id, product_id, quantity, reserved_quantity) VALUES (:w, :p, :q, 0)', { w: wid, p: pid, q: p.qty });
      await rawIns(`INSERT INTO stock_movements (warehouse_id, product_id, movement_type, source_type, quantity, balance_after, unit_cost, notes, created_by)
        VALUES (:w, :p, 'IN', 'GRN', :q, :q, :c, 'Initial stock load', :u)`,
        { w: wid, p: pid, q: p.qty, c: p.cost, u: adminId });
    }
  }
  log('Products & stock ready.');

  // ── Suppliers ────────────────────────────────────────────────
  const SUPPLIERS = [
    { code: 'SUP001', name: 'Lion Brewery (Ceylon) PLC',    contact: 'Roshan Weerasinghe', phone: '+94 11 240 5000', email: 'orders@lion.lk',    address: 'PO Box 20, Biyagama EPZ, Colombo',      credit_days: 30, credit_limit: 5000000 },
    { code: 'SUP002', name: 'Ceylon Cold Stores PLC',        contact: 'Amara Jayaratne',    phone: '+94 11 249 9000', email: 'sales@ccs.lk',       address: 'PO Box 03, Colombo 03',                 credit_days: 30, credit_limit: 3000000 },
    { code: 'SUP003', name: 'Nestle Lanka PLC',              contact: 'Priya Silva',         phone: '+94 11 242 3000', email: 'supply@nestle.lk',   address: '480 Galle Road, Colombo 03',             credit_days: 45, credit_limit: 4000000 },
    { code: 'SUP004', name: 'Prima Ceylon (Pvt) Ltd',        contact: 'Malik Fernando',      phone: '+94 11 267 5000', email: 'trade@prima.lk',     address: 'No. 04, Kelani Valley Road, Peliyagoda', credit_days: 30, credit_limit: 2000000 },
    { code: 'SUP005', name: 'Hemas Consumer Brands',         contact: 'Dilini Kumari',       phone: '+94 11 258 9000', email: 'orders@hemas.lk',    address: '75 Braybrooke Place, Colombo 02',        credit_days: 30, credit_limit: 2500000 },
    { code: 'SUP006', name: 'Maliban Biscuit Manufactories', contact: 'Pradeep Kodagoda',    phone: '+94 11 264 3000', email: 'sales@maliban.lk',   address: 'Ratmalana, Colombo',                     credit_days: 30, credit_limit: 1500000 },
    { code: 'SUP007', name: 'Keells Food Products PLC',      contact: 'Shanika Bandara',     phone: '+94 11 231 4000', email: 'orders@keells.lk',   address: 'No. 10 Dharmapala Mawatha, Colombo 03', credit_days: 30, credit_limit: 2000000 },
  ];
  const sMap = {};
  for (const s of SUPPLIERS) {
    const sid = await ensure('suppliers', 'code', s.code, {
      company_id: cid, name: s.name, code: s.code, contact_person: s.contact,
      phone: s.phone, email: s.email, address: s.address,
      credit_days: s.credit_days, credit_limit: s.credit_limit, is_active: 1,
    });
    sMap[s.code] = sid;
  }
  log('Suppliers ready.');

  // ── Customers ────────────────────────────────────────────────
  const CUSTOMERS = [
    { code: 'CUS001', name: 'Laugfs Supermarkets (Pvt) Ltd',  type: 'WHOLESALER',  contact: 'Rohan Abeywickrama', phone: '+94 11 557 8900', email: 'procurement@laugfs.lk',  address: 'No. 1, Sri Saugathajothipala Mw, Colombo 10', credit_days: 45, credit_limit: 2000000, balance: 485600 },
    { code: 'CUS002', name: 'Cargills Food City - Colombo 3', type: 'RETAILER',    contact: 'Malsha Jayawardena', phone: '+94 11 234 5678', email: 'orders@cargills.lk',    address: '40 York Street, Colombo 01',                  credit_days: 30, credit_limit: 1000000, balance: 320400 },
    { code: 'CUS003', name: 'Keells Super - Nugegoda',        type: 'RETAILER',    contact: 'Asanka Bandara',     phone: '+94 11 281 1234', email: 'keells.nug@jkh.lk',     address: 'High Level Road, Nugegoda',                   credit_days: 30, credit_limit: 800000,  balance: 215800 },
    { code: 'CUS004', name: 'Arpico Super Centre - Kandy',    type: 'WHOLESALER',  contact: 'Dinusha Perera',     phone: '+94 81 222 7777', email: 'kandy@arpico.lk',       address: 'No. 54, Kandy Road, Kandy',                   credit_days: 30, credit_limit: 1500000, balance: 560200 },
    { code: 'CUS005', name: 'Lanka Sathosa - Kalutara',       type: 'INSTITUTION', contact: 'Prasad Wijeratne',   phone: '+94 34 222 3456', email: 'kalutara@sathosa.lk',   address: 'Kalutara Town, Kalutara',                     credit_days: 60, credit_limit: 500000,  balance: 182400 },
    { code: 'CUS006', name: 'Perera & Sons (Pvt) Ltd',        type: 'WHOLESALER',  contact: 'Susil Perera',       phone: '+94 33 222 5678', email: 'orders@pererasons.lk',  address: 'Gampaha Town, Gampaha',                       credit_days: 30, credit_limit: 1200000, balance: 394000 },
    { code: 'CUS007', name: 'Green Cabin Restaurant',         type: 'DIRECT',      contact: 'Thilini Samaraweera',phone: '+94 11 269 7777', email: 'supply@greencabin.lk',  address: '453 Galle Road, Colombo 03',                  credit_days: 0,  credit_limit: 200000,  balance: 45600  },
    { code: 'CUS008', name: 'Wellawatte Grocers',             type: 'RETAILER',    contact: 'R.M. Karunarathne',  phone: '+94 11 257 4321', email: null,                    address: 'Wellawatte Junction, Colombo 06',             credit_days: 15, credit_limit: 300000,  balance: 128700 },
    { code: 'CUS009', name: 'Borella Supermarket',            type: 'RETAILER',    contact: 'Pradeep Nilantha',   phone: '+94 11 269 1234', email: null,                    address: 'Borella, Colombo 08',                         credit_days: 15, credit_limit: 300000,  balance: 76500  },
    { code: 'CUS010', name: 'Kandy Grocers',                  type: 'RETAILER',    contact: 'Lalith Karunarathne',phone: '+94 81 222 8888', email: null,                    address: 'Kandy Central Market, Kandy',                 credit_days: 30, credit_limit: 400000,  balance: 154300 },
    { code: 'CUS011', name: 'Galle Mart (Pvt) Ltd',           type: 'WHOLESALER',  contact: 'Ruwanka de Silva',   phone: '+94 91 222 9999', email: 'galle@gallemart.lk',    address: 'Galle Fort Area, Galle',                      credit_days: 30, credit_limit: 600000,  balance: 238900 },
    { code: 'CUS012', name: 'Mirihana Mini Mart',             type: 'RETAILER',    contact: 'Anoma Fernando',     phone: '+94 11 278 5432', email: null,                    address: 'Mirihana Junction, Nugegoda',                 credit_days: 15, credit_limit: 200000,  balance: 62400  },
  ];
  const cMap = {};
  for (const c of CUSTOMERS) {
    const cid2 = await ensure('customers', 'code', c.code, {
      company_id: cid, name: c.name, code: c.code, customer_type: c.type,
      contact_person: c.contact, phone: c.phone, email: c.email || null, address: c.address,
      credit_days: c.credit_days, credit_limit: c.credit_limit,
      outstanding_balance: c.balance, is_vat_registered: 0, is_active: 1,
    });
    cMap[c.code] = cid2;
  }
  log('Customers ready.');

  // ── Routes ───────────────────────────────────────────────────
  const r1 = await ensure('routes', 'code', 'RT-COL-N', { branch_id: bid, name: 'Colombo North Route', code: 'RT-COL-N', sales_rep_id: salesRep1Id, driver_id: driver1Id, is_active: 1 });
  const r2 = await ensure('routes', 'code', 'RT-COL-S', { branch_id: bid, name: 'Colombo South Route', code: 'RT-COL-S', sales_rep_id: salesRep2Id, driver_id: driver2Id, is_active: 1 });
  const r3 = await ensure('routes', 'code', 'RT-KANDY', { branch_id: bKandy, name: 'Kandy Route', code: 'RT-KANDY', is_active: 1 });
  const r4 = await ensure('routes', 'code', 'RT-GALLE', { branch_id: bGalle, name: 'Galle Route', code: 'RT-GALLE', is_active: 1 });
  log('Routes ready.');

  // ── Purchase Orders & GRNs ───────────────────────────────────
  const grnDefs = [
    {
      num: 'GRN-2026-001', poNum: 'PO-2026-001', date: '2026-05-10', supCode: 'SUP001',
      lines: [
        { sku: 'BEV-LION-330', qty: 300, cost: 2400 },
      ],
    },
    {
      num: 'GRN-2026-002', poNum: 'PO-2026-002', date: '2026-05-15', supCode: 'SUP002',
      lines: [
        { sku: 'BEV-GINGER-400', qty: 600, cost: 60 },
        { sku: 'DAI-MILK-1L',    qty: 400, cost: 180 },
      ],
    },
    {
      num: 'GRN-2026-003', poNum: 'PO-2026-003', date: '2026-05-22', supCode: 'SUP003',
      lines: [
        { sku: 'FOOD-MILO-200G',      qty: 300, cost: 320 },
        { sku: 'FOOD-NESTOMALT-400G', qty: 150, cost: 580 },
        { sku: 'DAI-BUTTER-200G',     qty: 200, cost: 360 },
      ],
    },
    {
      num: 'GRN-2026-004', poNum: 'PO-2026-004', date: '2026-06-05', supCode: 'SUP004',
      lines: [
        { sku: 'FOOD-CRACKERS-200G', qty: 800, cost: 55 },
        { sku: 'FOOD-KOTTU-400G',   qty: 200, cost: 135 },
        { sku: 'FOOD-RICE-5KG',     qty: 200, cost: 950 },
      ],
    },
    {
      num: 'GRN-2026-005', poNum: 'PO-2026-005', date: '2026-06-18', supCode: 'SUP005',
      lines: [
        { sku: 'CARE-DETTOL-100G',  qty: 500, cost: 90 },
        { sku: 'CARE-LIFEBUOY-90G', qty: 500, cost: 75 },
        { sku: 'HH-SUNLIGHT-900G',  qty: 200, cost: 320 },
        { sku: 'HH-SURF-1KG',       qty: 200, cost: 380 },
      ],
    },
    {
      num: 'GRN-2026-006', poNum: 'PO-2026-006', date: '2026-06-25', supCode: 'SUP006',
      lines: [
        { sku: 'FOOD-MUNCHEE-200G', qty: 400, cost: 70 },
        { sku: 'FOOD-MALIBAN-200G', qty: 400, cost: 60 },
      ],
    },
    {
      num: 'GRN-2026-007', poNum: 'PO-2026-007', date: '2026-07-08', supCode: 'SUP007',
      lines: [
        { sku: 'FOOD-SAUSAGE-250G', qty: 200, cost: 385 },
      ],
    },
  ];

  for (const g of grnDefs) {
    const existGRN = await sel('SELECT id FROM goods_received WHERE grn_number = :n', { n: g.num });
    if (existGRN.length) continue;

    const month = parseInt(g.date.split('-')[1]);
    const periodId = per[month] || per[7];

    let subtotal = 0;
    for (const l of g.lines) subtotal += l.qty * l.cost;

    // PO first
    const exPO = await sel('SELECT id FROM purchase_orders WHERE po_number = :n', { n: g.poNum });
    let poId;
    if (exPO.length) {
      poId = exPO[0].id;
    } else {
      poId = await rawIns(
        `INSERT INTO purchase_orders (company_id, branch_id, warehouse_id, supplier_id, po_number, po_date, expected_date, status, subtotal, total_amount, created_by)
         VALUES (:c, :b, :w, :s, :n, :d, :ed, 'RECEIVED', :sub, :tot, :u)`,
        { c: cid, b: bid, w: wid, s: sMap[g.supCode], n: g.poNum, d: g.date, ed: g.date, sub: subtotal, tot: subtotal, u: adminId }
      );
      for (const l of g.lines) {
        await rawIns(
          `INSERT INTO purchase_order_lines (po_id, product_id, quantity, received_quantity, unit_cost, line_total)
           VALUES (:po, :p, :q, :q, :c, :lt)`,
          { po: poId, p: pMap[l.sku].id, q: l.qty, c: l.cost, lt: l.qty * l.cost }
        );
      }
    }

    // GRN journal entry (DR Stock / CR Creditors)
    const jeId = await createJE({
      companyId: cid, branchId: bid, periodId, date: g.date,
      sourceType: 'GRN', sourceId: 0, ref: g.num,
      desc: `Goods received from ${SUPPLIERS.find(s => s.code === g.supCode)?.name}`,
      userId: adminId,
      lines: [
        { account_id: acc.stock,     debit: subtotal,  credit: 0,        desc: 'Stock received' },
        { account_id: acc.creditors, debit: 0,         credit: subtotal, desc: 'Supplier payable' },
      ],
    });

    const grnId = await rawIns(
      `INSERT INTO goods_received (company_id, branch_id, warehouse_id, supplier_id, po_id, grn_number, grn_date, status, subtotal, total_amount, journal_id, posted_by, posted_at, created_by)
       VALUES (:c, :b, :w, :s, :po, :n, :d, 'POSTED', :sub, :tot, :j, :u, NOW(), :u)`,
      { c: cid, b: bid, w: wid, s: sMap[g.supCode], po: poId, n: g.num, d: g.date, sub: subtotal, tot: subtotal, j: jeId, u: adminId }
    );
    await rawIns(`UPDATE journal_entries SET source_id = :s WHERE id = :j`, { s: grnId, j: jeId });

    for (const l of g.lines) {
      await rawIns(
        `INSERT INTO goods_received_lines (grn_id, product_id, quantity, unit_cost, line_total)
         VALUES (:grn, :p, :q, :c, :lt)`,
        { grn: grnId, p: pMap[l.sku].id, q: l.qty, c: l.cost, lt: l.qty * l.cost }
      );
    }
  }
  log('GRNs ready.');

  // ── Invoices ─────────────────────────────────────────────────
  // 30 invoices over last 30 days (June 23 – July 23, 2026)
  const INVOICES = [
    // June 23
    { num: 'INV-2026-001', date: '2026-06-23', cusCode: 'CUS001', status: 'POSTED',  due: '2026-08-07', lines: [{ sku: 'BEV-LION-330', qty: 20 }, { sku: 'BEV-GINGER-400', qty: 100 }, { sku: 'DAI-MILK-1L', qty: 80 }] },
    { num: 'INV-2026-002', date: '2026-06-23', cusCode: 'CUS006', status: 'PARTIAL', due: '2026-07-23', lines: [{ sku: 'FOOD-CRACKERS-200G', qty: 120 }, { sku: 'FOOD-MUNCHEE-200G', qty: 80 }, { sku: 'HH-SUNLIGHT-900G', qty: 40 }] },
    // June 24
    { num: 'INV-2026-003', date: '2026-06-24', cusCode: 'CUS002', status: 'POSTED',  due: '2026-07-24', lines: [{ sku: 'DAI-MILK-1L', qty: 60 }, { sku: 'FOOD-MILO-200G', qty: 50 }, { sku: 'CARE-DETTOL-100G', qty: 80 }] },
    { num: 'INV-2026-004', date: '2026-06-24', cusCode: 'CUS008', status: 'PAID',    due: '2026-07-09', lines: [{ sku: 'FOOD-MALIBAN-200G', qty: 60 }, { sku: 'FOOD-CRACKERS-200G', qty: 60 }, { sku: 'CARE-LIFEBUOY-90G', qty: 60 }] },
    // June 26
    { num: 'INV-2026-005', date: '2026-06-26', cusCode: 'CUS004', status: 'OVERDUE', due: '2026-07-26', lines: [{ sku: 'FOOD-RICE-5KG', qty: 50 }, { sku: 'FOOD-MILO-200G', qty: 60 }, { sku: 'FOOD-NESTOMALT-400G', qty: 30 }] },
    // June 27
    { num: 'INV-2026-006', date: '2026-06-27', cusCode: 'CUS003', status: 'POSTED',  due: '2026-07-27', lines: [{ sku: 'HH-SURF-1KG', qty: 50 }, { sku: 'HH-SUNLIGHT-900G', qty: 50 }, { sku: 'CARE-DETTOL-100G', qty: 100 }] },
    // June 28
    { num: 'INV-2026-007', date: '2026-06-28', cusCode: 'CUS001', status: 'POSTED',  due: '2026-08-12', lines: [{ sku: 'BEV-LION-330', qty: 15 }, { sku: 'FOOD-SAUSAGE-250G', qty: 40 }, { sku: 'DAI-BUTTER-200G', qty: 40 }] },
    { num: 'INV-2026-008', date: '2026-06-28', cusCode: 'CUS011', status: 'POSTED',  due: '2026-07-28', lines: [{ sku: 'FOOD-CRACKERS-200G', qty: 200 }, { sku: 'FOOD-MUNCHEE-200G', qty: 100 }, { sku: 'FOOD-MALIBAN-200G', qty: 100 }] },
    // June 30
    { num: 'INV-2026-009', date: '2026-06-30', cusCode: 'CUS005', status: 'OVERDUE', due: '2026-06-30', lines: [{ sku: 'FOOD-RICE-5KG', qty: 40 }, { sku: 'FOOD-KOTTU-400G', qty: 60 }, { sku: 'FOOD-CRACKERS-200G', qty: 80 }] },
    { num: 'INV-2026-010', date: '2026-06-30', cusCode: 'CUS009', status: 'PAID',    due: '2026-07-15', lines: [{ sku: 'CARE-DETTOL-100G', qty: 40 }, { sku: 'CARE-LIFEBUOY-90G', qty: 40 }, { sku: 'HH-SUNLIGHT-900G', qty: 20 }] },
    // July 1
    { num: 'INV-2026-011', date: '2026-07-01', cusCode: 'CUS002', status: 'PARTIAL', due: '2026-07-31', lines: [{ sku: 'DAI-MILK-1L', qty: 80 }, { sku: 'DAI-BUTTER-200G', qty: 40 }, { sku: 'FOOD-MILO-200G', qty: 40 }] },
    { num: 'INV-2026-012', date: '2026-07-01', cusCode: 'CUS006', status: 'POSTED',  due: '2026-07-31', lines: [{ sku: 'FOOD-RICE-5KG', qty: 30 }, { sku: 'FOOD-SAUSAGE-250G', qty: 30 }, { sku: 'FOOD-KOTTU-400G', qty: 40 }] },
    // July 3
    { num: 'INV-2026-013', date: '2026-07-03', cusCode: 'CUS001', status: 'POSTED',  due: '2026-08-17', lines: [{ sku: 'BEV-GINGER-400', qty: 200 }, { sku: 'BEV-LION-330', qty: 10 }] },
    { num: 'INV-2026-014', date: '2026-07-03', cusCode: 'CUS004', status: 'PARTIAL', due: '2026-08-02', lines: [{ sku: 'FOOD-CRACKERS-200G', qty: 150 }, { sku: 'FOOD-MUNCHEE-200G', qty: 100 }, { sku: 'HH-SURF-1KG', qty: 30 }] },
    // July 5
    { num: 'INV-2026-015', date: '2026-07-05', cusCode: 'CUS007', status: 'POSTED',  due: '2026-07-05', lines: [{ sku: 'FOOD-SAUSAGE-250G', qty: 20 }, { sku: 'BEV-GINGER-400', qty: 50 }, { sku: 'DAI-MILK-1L', qty: 30 }] },
    // July 7
    { num: 'INV-2026-016', date: '2026-07-07', cusCode: 'CUS010', status: 'POSTED',  due: '2026-08-06', lines: [{ sku: 'FOOD-RICE-5KG', qty: 25 }, { sku: 'FOOD-KOTTU-400G', qty: 30 }, { sku: 'FOOD-CRACKERS-200G', qty: 80 }] },
    { num: 'INV-2026-017', date: '2026-07-07', cusCode: 'CUS003', status: 'POSTED',  due: '2026-08-06', lines: [{ sku: 'HH-SURF-1KG', qty: 40 }, { sku: 'CARE-DETTOL-100G', qty: 80 }, { sku: 'CARE-LIFEBUOY-90G', qty: 80 }] },
    // July 9
    { num: 'INV-2026-018', date: '2026-07-09', cusCode: 'CUS012', status: 'PAID',    due: '2026-07-24', lines: [{ sku: 'FOOD-MALIBAN-200G', qty: 30 }, { sku: 'FOOD-CRACKERS-200G', qty: 30 }, { sku: 'FOOD-MUNCHEE-200G', qty: 30 }] },
    { num: 'INV-2026-019', date: '2026-07-09', cusCode: 'CUS008', status: 'POSTED',  due: '2026-07-24', lines: [{ sku: 'FOOD-NESTOMALT-400G', qty: 20 }, { sku: 'FOOD-MILO-200G', qty: 40 }, { sku: 'DAI-MILK-1L', qty: 40 }] },
    // July 11
    { num: 'INV-2026-020', date: '2026-07-11', cusCode: 'CUS006', status: 'POSTED',  due: '2026-08-10', lines: [{ sku: 'BEV-LION-330', qty: 12 }, { sku: 'FOOD-SAUSAGE-250G', qty: 25 }, { sku: 'DAI-BUTTER-200G', qty: 30 }] },
    // July 14
    { num: 'INV-2026-021', date: '2026-07-14', cusCode: 'CUS001', status: 'POSTED',  due: '2026-08-28', lines: [{ sku: 'BEV-GINGER-400', qty: 150 }, { sku: 'BEV-LION-330', qty: 20 }, { sku: 'DAI-MILK-1L', qty: 60 }] },
    { num: 'INV-2026-022', date: '2026-07-14', cusCode: 'CUS011', status: 'PARTIAL', due: '2026-08-13', lines: [{ sku: 'FOOD-RICE-5KG', qty: 30 }, { sku: 'FOOD-KOTTU-400G', qty: 25 }, { sku: 'FOOD-CRACKERS-200G', qty: 100 }] },
    // July 16
    { num: 'INV-2026-023', date: '2026-07-16', cusCode: 'CUS002', status: 'POSTED',  due: '2026-08-15', lines: [{ sku: 'DAI-MILK-1L', qty: 80 }, { sku: 'FOOD-MILO-200G', qty: 50 }, { sku: 'CARE-DETTOL-100G', qty: 100 }] },
    // July 18
    { num: 'INV-2026-024', date: '2026-07-18', cusCode: 'CUS004', status: 'POSTED',  due: '2026-08-17', lines: [{ sku: 'HH-SURF-1KG', qty: 60 }, { sku: 'HH-SUNLIGHT-900G', qty: 40 }, { sku: 'FOOD-MALIBAN-200G', qty: 80 }] },
    { num: 'INV-2026-025', date: '2026-07-18', cusCode: 'CUS005', status: 'POSTED',  due: '2026-09-16', lines: [{ sku: 'FOOD-RICE-5KG', qty: 30 }, { sku: 'FOOD-CRACKERS-200G', qty: 100 }] },
    // July 21
    { num: 'INV-2026-026', date: '2026-07-21', cusCode: 'CUS003', status: 'POSTED',  due: '2026-08-20', lines: [{ sku: 'CARE-LIFEBUOY-90G', qty: 100 }, { sku: 'CARE-DETTOL-100G', qty: 80 }, { sku: 'HH-SURF-1KG', qty: 30 }] },
    { num: 'INV-2026-027', date: '2026-07-21', cusCode: 'CUS009', status: 'DRAFT',   due: '2026-08-20', lines: [{ sku: 'FOOD-MALIBAN-200G', qty: 40 }, { sku: 'FOOD-MUNCHEE-200G', qty: 40 }] },
    // July 22
    { num: 'INV-2026-028', date: '2026-07-22', cusCode: 'CUS006', status: 'POSTED',  due: '2026-08-21', lines: [{ sku: 'BEV-GINGER-400', qty: 100 }, { sku: 'DAI-MILK-1L', qty: 60 }, { sku: 'FOOD-SAUSAGE-250G', qty: 20 }] },
    // July 23 (today)
    { num: 'INV-2026-029', date: '2026-07-23', cusCode: 'CUS001', status: 'POSTED',  due: '2026-09-06', lines: [{ sku: 'BEV-LION-330', qty: 25 }, { sku: 'BEV-GINGER-400', qty: 120 }, { sku: 'DAI-BUTTER-200G', qty: 50 }] },
    { num: 'INV-2026-030', date: '2026-07-23', cusCode: 'CUS002', status: 'POSTED',  due: '2026-08-22', lines: [{ sku: 'FOOD-MILO-200G', qty: 60 }, { sku: 'FOOD-NESTOMALT-400G', qty: 25 }, { sku: 'CARE-DETTOL-100G', qty: 80 }] },
  ];

  const invMap = {}; // num -> { id, total, cusId, status }
  for (const inv of INVOICES) {
    const existInv = await sel('SELECT id FROM invoices WHERE invoice_number = :n', { n: inv.num });
    if (existInv.length) { invMap[inv.num] = { id: existInv[0].id }; continue; }

    const month = parseInt(inv.date.split('-')[1]);
    const periodId = per[month] || per[7];
    const cusId = cMap[inv.cusCode];

    // Compute totals from lines
    let subtotal = 0;
    const resolvedLines = inv.lines.map(l => {
      const p = pMap[l.sku];
      const lineSubtotal = l.qty * p.sell;
      subtotal += lineSubtotal;
      return { ...l, product_id: p.id, unit_price: p.sell, cost: p.cost, line_subtotal: lineSubtotal };
    });
    const total = subtotal; // no VAT for FMCG
    const paid = inv.status === 'PAID' ? total : inv.status === 'PARTIAL' ? Math.floor(total * 0.5) : 0;
    const balance = total - paid;

    // Journal for posted invoices
    let jeId = null;
    if (inv.status !== 'DRAFT') {
      jeId = await createJE({
        companyId: cid, branchId: bid, periodId, date: inv.date,
        sourceType: 'INVOICE', sourceId: 0, ref: inv.num,
        desc: `Invoice ${inv.num}`,
        userId: adminId,
        lines: [
          { account_id: acc.debtors, debit: total,    credit: 0,        desc: 'Trade debtor' },
          { account_id: acc.revenue, debit: 0,         credit: subtotal, desc: 'Sales revenue' },
        ],
      });
    }

    const invId = await rawIns(
      `INSERT INTO invoices (company_id, branch_id, warehouse_id, customer_id, sales_rep_id, invoice_number, invoice_date, due_date, invoice_type, status, subtotal, vat_amount, total_amount, paid_amount, balance_due, journal_id, posted_by, posted_at, created_by)
       VALUES (:c, :b, :w, :cu, :sr, :n, :d, :dd, 'TAX_INVOICE', :st, :sub, 0, :tot, :paid, :bal, :j, :u, :at, :u)`,
      {
        c: cid, b: bid, w: wid, cu: cusId, sr: salesRep1Id,
        n: inv.num, d: inv.date, dd: inv.due,
        st: inv.status, sub: subtotal, tot: total, paid, bal: balance,
        j: jeId, u: adminId,
        at: inv.status !== 'DRAFT' ? inv.date + ' 09:00:00' : null,
      }
    );
    if (jeId) await rawIns('UPDATE journal_entries SET source_id = :s WHERE id = :j', { s: invId, j: jeId });

    for (const l of resolvedLines) {
      await rawIns(
        `INSERT INTO invoice_lines (invoice_id, product_id, quantity, unit_price, discount_rate, vat_rate, line_subtotal, vat_amount, line_total, cost_price)
         VALUES (:inv, :p, :q, :up, 0, 0, :ls, 0, :ls, :cp)`,
        { inv: invId, p: l.product_id, q: l.qty, up: l.unit_price, ls: l.line_subtotal, cp: l.cost }
      );
    }

    invMap[inv.num] = { id: invId, total, cusId, status: inv.status, paid };
  }
  log('Invoices ready.');

  // ── Receipts ─────────────────────────────────────────────────
  const RECEIPTS = [
    { num: 'RCP-2026-001', date: '2026-06-26', invNum: 'INV-2026-004', amount: null, method: 'CASH',          ref: null },
    { num: 'RCP-2026-002', date: '2026-06-30', invNum: 'INV-2026-010', amount: null, method: 'BANK_TRANSFER',  ref: 'BOC-TF-34521' },
    { num: 'RCP-2026-003', date: '2026-07-05', invNum: 'INV-2026-002', amount: null, method: 'CHEQUE',         ref: 'CHQ-56789' },
    { num: 'RCP-2026-004', date: '2026-07-10', invNum: 'INV-2026-018', amount: null, method: 'CASH',           ref: null },
    { num: 'RCP-2026-005', date: '2026-07-12', invNum: 'INV-2026-011', amount: null, method: 'BANK_TRANSFER',  ref: 'BOC-TF-41233' },
    { num: 'RCP-2026-006', date: '2026-07-15', invNum: 'INV-2026-014', amount: null, method: 'CHEQUE',         ref: 'CHQ-61234' },
    { num: 'RCP-2026-007', date: '2026-07-18', invNum: 'INV-2026-022', amount: null, method: 'CASH',           ref: null },
  ];

  for (const r of RECEIPTS) {
    const ex = await sel('SELECT id FROM receipts WHERE receipt_number = :n', { n: r.num });
    if (ex.length) continue;

    const invData = invMap[r.invNum];
    if (!invData?.id) continue;
    const inv = INVOICES.find(i => i.num === r.invNum);
    const month = parseInt(r.date.split('-')[1]);
    const periodId = per[month] || per[7];

    const amount = r.amount ?? invData.paid ?? (invData.total * 0.5);

    const jeId = await createJE({
      companyId: cid, branchId: bid, periodId, date: r.date,
      sourceType: 'RECEIPT', sourceId: 0, ref: r.num,
      desc: `Receipt from customer - ${r.num}`,
      userId: adminId,
      lines: [
        { account_id: acc.bank,    debit: amount,  credit: 0,      desc: 'Cash/bank receipt' },
        { account_id: acc.debtors, debit: 0,       credit: amount, desc: 'Customer payment' },
      ],
    });

    const [rcpId] = await sequelize.query(
      `INSERT INTO receipts (company_id, branch_id, customer_id, collected_by, receipt_number, receipt_date, payment_method, amount, reference, journal_id, status, created_by)
       VALUES (:c, :b, :cu, :col, :n, :d, :m, :a, :r, :j, 'POSTED', :u)`,
      { replacements: { c: cid, b: bid, cu: invData.cusId, col: salesRep1Id, n: r.num, d: r.date, m: r.method, a: amount, r: r.ref, j: jeId, u: adminId } }
    );
    await rawIns('UPDATE journal_entries SET source_id = :s WHERE id = :j', { s: rcpId, j: jeId });
    await rawIns('INSERT INTO receipt_allocations (receipt_id, invoice_id, allocated_amount) VALUES (:r, :i, :a)', { r: rcpId, i: invData.id, a: amount });
  }
  log('Receipts ready.');

  // ── Delivery Notes ────────────────────────────────────────────
  const DN_DEFS = [
    { num: 'DN-2026-001', date: '2026-06-24', invNum: 'INV-2026-001', status: 'DELIVERED', driverId: driver1Id, routeId: r1 },
    { num: 'DN-2026-002', date: '2026-06-28', invNum: 'INV-2026-003', status: 'DELIVERED', driverId: driver2Id, routeId: r2 },
    { num: 'DN-2026-003', date: '2026-07-02', invNum: 'INV-2026-007', status: 'DISPATCHED', driverId: driver1Id, routeId: r1 },
    { num: 'DN-2026-004', date: '2026-07-08', invNum: 'INV-2026-013', status: 'PENDING',    driverId: driver2Id, routeId: r2 },
    { num: 'DN-2026-005', date: '2026-07-20', invNum: 'INV-2026-021', status: 'DELIVERED', driverId: driver1Id, routeId: r1 },
  ];

  for (const dn of DN_DEFS) {
    const ex = await sel('SELECT id FROM delivery_notes WHERE dn_number = :n', { n: dn.num });
    if (ex.length) continue;
    const invData = invMap[dn.invNum];
    if (!invData?.id) continue;
    const cusId = invData.cusId;
    await rawIns(
      `INSERT INTO delivery_notes (company_id, branch_id, invoice_id, customer_id, driver_id, route_id, dn_number, dn_date, status, delivery_address, created_by, dispatched_at, delivered_at)
       VALUES (:c, :b, :inv, :cu, :drv, :rt, :n, :d, :st, :addr, :u, :disp, :delv)`,
      {
        c: cid, b: bid, inv: invData.id, cu: cusId, drv: dn.driverId, rt: dn.routeId,
        n: dn.num, d: dn.date, st: dn.status, addr: 'Customer address, Sri Lanka', u: adminId,
        disp: dn.status !== 'PENDING' ? dn.date + ' 08:00:00' : null,
        delv: dn.status === 'DELIVERED' ? dn.date + ' 14:00:00' : null,
      }
    );
  }
  log('Delivery notes ready.');

  // ── Loading Sheets ────────────────────────────────────────────
  const LS_DEFS = [
    {
      num: 'LS-2026-001', date: '2026-07-10', status: 'CLOSED', routeId: r1, salesRepId: salesRep1Id, driverId: driver1Id, vehicle: 'CBB-1234',
      lines: [{ sku: 'BEV-GINGER-400', loaded: 200, returned: 20 }, { sku: 'FOOD-CRACKERS-200G', loaded: 150, returned: 10 }, { sku: 'FOOD-MUNCHEE-200G', loaded: 100, returned: 5 }],
    },
    {
      num: 'LS-2026-002', date: '2026-07-22', status: 'LOADED', routeId: r2, salesRepId: salesRep2Id, driverId: driver2Id, vehicle: 'WP-5678',
      lines: [{ sku: 'DAI-MILK-1L', loaded: 80, returned: 0 }, { sku: 'FOOD-RICE-5KG', loaded: 30, returned: 0 }, { sku: 'CARE-DETTOL-100G', loaded: 60, returned: 0 }],
    },
  ];

  for (const ls of LS_DEFS) {
    const ex = await sel('SELECT id FROM loading_sheets WHERE sheet_number = :n', { n: ls.num });
    if (ex.length) continue;
    const lsId = await rawIns(
      `INSERT INTO loading_sheets (branch_id, warehouse_id, route_id, sales_rep_id, driver_id, vehicle_number, sheet_number, sheet_date, status, created_by)
       VALUES (:b, :w, :rt, :sr, :drv, :veh, :n, :d, :st, :u)`,
      { b: bid, w: wid, rt: ls.routeId, sr: ls.salesRepId, drv: ls.driverId, veh: ls.vehicle, n: ls.num, d: ls.date, st: ls.status, u: adminId }
    );
    for (const l of ls.lines) {
      await rawIns(
        `INSERT INTO loading_sheet_lines (sheet_id, product_id, loaded_quantity, returned_quantity) VALUES (:s, :p, :lq, :rq)`,
        { s: lsId, p: pMap[l.sku].id, lq: l.loaded, rq: l.returned }
      );
    }
  }
  log('Loading sheets ready.');

  // ── Expenses ─────────────────────────────────────────────────
  const EXPENSES = [
    { num: 'EXP-2026-001', date: '2026-06-28', accId: acc.rent,     desc: 'Warehouse rent — June 2026',        amount: 85000,  method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-002', date: '2026-06-28', accId: acc.salaries, desc: 'Staff salaries — June 2026',         amount: 320000, method: 'BANK_TRANSFER' },
    { num: 'EXP-2026-003', date: '2026-07-05', accId: acc.fuel,     desc: 'Fuel & transport — July week 1',     amount: 28500,  method: 'CASH' },
    { num: 'EXP-2026-004', date: '2026-07-10', accId: acc.misc,     desc: 'Office stationery & supplies',       amount: 4500,   method: 'CASH' },
    { num: 'EXP-2026-005', date: '2026-07-15', accId: acc.fuel,     desc: 'Fuel & vehicle maintenance',         amount: 32000,  method: 'CASH' },
    { num: 'EXP-2026-006', date: '2026-07-20', accId: acc.salaries, desc: 'Driver allowances — July 2026',      amount: 45000,  method: 'BANK_TRANSFER' },
  ];

  for (const e of EXPENSES) {
    const ex = await sel('SELECT id FROM expenses WHERE expense_number = :n', { n: e.num });
    if (ex.length) continue;
    const month = parseInt(e.date.split('-')[1]);
    const periodId = per[month] || per[7];

    const jeId = await createJE({
      companyId: cid, branchId: bid, periodId, date: e.date,
      sourceType: 'EXPENSE', sourceId: 0, ref: e.num, desc: e.desc,
      userId: adminId,
      lines: [
        { account_id: e.accId,    debit: e.amount,  credit: 0,        desc: e.desc },
        { account_id: acc.bank,   debit: 0,         credit: e.amount, desc: 'Payment' },
      ],
    });

    const [expId] = await sequelize.query(
      `INSERT INTO expenses (company_id, branch_id, account_id, expense_number, expense_date, description, amount, payment_method, journal_id, status, created_by)
       VALUES (:c, :b, :a, :n, :d, :desc, :amt, :m, :j, 'POSTED', :u)`,
      { replacements: { c: cid, b: bid, a: e.accId, n: e.num, d: e.date, desc: e.desc, amt: e.amount, m: e.method, j: jeId, u: adminId } }
    );
    await rawIns('UPDATE journal_entries SET source_id = :s WHERE id = :j', { s: expId, j: jeId });
  }
  log('Expenses ready.');

  log('\n✅  Demo data seed complete!');
  log('   Extra users: manager@lankadist.lk / accounts@lankadist.lk / sales1@lankadist.lk');
  log('   Password for all: Staff@123');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
