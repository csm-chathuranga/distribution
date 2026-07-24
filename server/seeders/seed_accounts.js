require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, Company, Account, AccountingPeriod } = require('../models');

const CHART_OF_ACCOUNTS = [
  // ── ASSETS ──────────────────────────────────────────────────────────────────
  { code: '1000', name: 'Assets',                        type: 'ASSET',     is_system: true },
  { code: '1100', name: 'Cash & Bank',                   type: 'ASSET',     parent: '1000', sub_type: 'CASH_BANK',        is_system: true },
  { code: '1101', name: 'Petty Cash',                    type: 'ASSET',     parent: '1100', sub_type: 'PETTY_CASH',       is_system: true },
  { code: '1102', name: 'Main Bank Account',             type: 'ASSET',     parent: '1100', sub_type: 'MAIN_BANK',        is_system: true },
  { code: '1103', name: 'Savings Account',               type: 'ASSET',     parent: '1100', sub_type: 'BANK',             is_system: false },
  { code: '1200', name: 'Accounts Receivable',           type: 'ASSET',     parent: '1000', is_system: true },
  { code: '1201', name: 'Trade Debtors',                 type: 'ASSET',     parent: '1200', sub_type: 'TRADE_DEBTORS',    is_system: true },
  { code: '1202', name: 'Cheques in Hand',               type: 'ASSET',     parent: '1200', sub_type: 'CHEQUES_IN_HAND',  is_system: true },
  { code: '1203', name: 'Deposits Receivable',           type: 'ASSET',     parent: '1200', is_system: false },
  { code: '1300', name: 'Inventory',                     type: 'ASSET',     parent: '1000', sub_type: 'INVENTORY',        is_system: true },
  { code: '1301', name: 'Finished Goods Stock',          type: 'ASSET',     parent: '1300', is_system: true },
  { code: '1302', name: 'Raw Materials',                 type: 'ASSET',     parent: '1300', is_system: false },
  { code: '1400', name: 'Prepaid & Other Current Assets',type: 'ASSET',     parent: '1000', is_system: false },
  { code: '1401', name: 'Prepaid Expenses',              type: 'ASSET',     parent: '1400', is_system: false },
  { code: '1402', name: 'VAT Receivable',                type: 'ASSET',     parent: '1400', is_system: true },
  { code: '1500', name: 'Fixed Assets',                  type: 'ASSET',     parent: '1000', is_system: false },
  { code: '1501', name: 'Vehicles',                      type: 'ASSET',     parent: '1500', is_system: false },
  { code: '1502', name: 'Office Equipment',              type: 'ASSET',     parent: '1500', is_system: false },
  { code: '1503', name: 'Accumulated Depreciation',      type: 'ASSET',     parent: '1500', is_system: false },

  // ── LIABILITIES ─────────────────────────────────────────────────────────────
  { code: '2000', name: 'Liabilities',                   type: 'LIABILITY', is_system: true },
  { code: '2100', name: 'Accounts Payable',              type: 'LIABILITY', parent: '2000', is_system: true },
  { code: '2101', name: 'Trade Creditors',               type: 'LIABILITY', parent: '2100', sub_type: 'TRADE_CREDITORS',  is_system: true },
  { code: '2102', name: 'Accrued Expenses',              type: 'LIABILITY', parent: '2100', is_system: false },
  { code: '2200', name: 'Tax Liabilities',               type: 'LIABILITY', parent: '2000', is_system: true },
  { code: '2201', name: 'VAT Payable',                   type: 'LIABILITY', parent: '2200', sub_type: 'VAT_PAYABLE',      is_system: true },
  { code: '2202', name: 'Income Tax Payable',            type: 'LIABILITY', parent: '2200', is_system: false },
  { code: '2300', name: 'Short-Term Loans',              type: 'LIABILITY', parent: '2000', is_system: false },
  { code: '2301', name: 'Bank Overdraft',                type: 'LIABILITY', parent: '2300', is_system: false },
  { code: '2400', name: 'Long-Term Liabilities',         type: 'LIABILITY', parent: '2000', is_system: false },
  { code: '2401', name: 'Long-Term Bank Loans',          type: 'LIABILITY', parent: '2400', is_system: false },
  { code: '2500', name: 'Other Current Liabilities',     type: 'LIABILITY', parent: '2000', is_system: false },
  { code: '2501', name: 'Advance Receipts',              type: 'LIABILITY', parent: '2500', is_system: false },
  { code: '2502', name: 'Deposits Held',                 type: 'LIABILITY', parent: '2500', is_system: false },

  // ── EQUITY ──────────────────────────────────────────────────────────────────
  { code: '3000', name: 'Equity',                        type: 'EQUITY',    is_system: true },
  { code: '3100', name: 'Share Capital',                 type: 'EQUITY',    parent: '3000', is_system: true },
  { code: '3101', name: 'Paid-up Capital',               type: 'EQUITY',    parent: '3100', is_system: true },
  { code: '3200', name: 'Retained Earnings',             type: 'EQUITY',    parent: '3000', sub_type: 'RETAINED_EARNINGS',is_system: true },
  { code: '3201', name: 'Current Year Profit/Loss',      type: 'EQUITY',    parent: '3200', is_system: true },
  { code: '3300', name: 'Reserves',                      type: 'EQUITY',    parent: '3000', is_system: false },

  // ── REVENUE ─────────────────────────────────────────────────────────────────
  { code: '4000', name: 'Revenue',                       type: 'REVENUE',   is_system: true },
  { code: '4100', name: 'Sales Revenue',                 type: 'REVENUE',   parent: '4000', sub_type: 'SALES',            is_system: true },
  { code: '4101', name: 'Wholesale Sales',               type: 'REVENUE',   parent: '4100', is_system: false },
  { code: '4102', name: 'Retail Sales',                  type: 'REVENUE',   parent: '4100', is_system: false },
  { code: '4103', name: 'Van Sales',                     type: 'REVENUE',   parent: '4100', is_system: false },
  { code: '4200', name: 'Other Income',                  type: 'REVENUE',   parent: '4000', is_system: false },
  { code: '4201', name: 'Discount Received',             type: 'REVENUE',   parent: '4200', is_system: false },
  { code: '4202', name: 'Interest Income',               type: 'REVENUE',   parent: '4200', is_system: false },
  { code: '4203', name: 'Delivery Income',               type: 'REVENUE',   parent: '4200', is_system: false },

  // ── COST OF GOODS SOLD ──────────────────────────────────────────────────────
  { code: '5000', name: 'Cost of Goods Sold',            type: 'EXPENSE',   is_system: true },
  { code: '5100', name: 'Purchases',                     type: 'EXPENSE',   parent: '5000', sub_type: 'PURCHASES',        is_system: true },
  { code: '5101', name: 'Goods Purchased',               type: 'EXPENSE',   parent: '5100', is_system: true },
  { code: '5102', name: 'Purchase Returns',              type: 'EXPENSE',   parent: '5100', is_system: false },
  { code: '5200', name: 'Direct Costs',                  type: 'EXPENSE',   parent: '5000', is_system: false },
  { code: '5201', name: 'Freight & Handling',            type: 'EXPENSE',   parent: '5200', is_system: false },
  { code: '5202', name: 'Import Duties',                 type: 'EXPENSE',   parent: '5200', is_system: false },

  // ── OPERATING EXPENSES ───────────────────────────────────────────────────────
  { code: '6000', name: 'Operating Expenses',            type: 'EXPENSE',   is_system: false },
  { code: '6100', name: 'Staff Costs',                   type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6101', name: 'Salaries & Wages',              type: 'EXPENSE',   parent: '6100', is_system: false },
  { code: '6102', name: 'EPF / ETF',                     type: 'EXPENSE',   parent: '6100', is_system: false },
  { code: '6103', name: 'Staff Allowances',              type: 'EXPENSE',   parent: '6100', is_system: false },
  { code: '6200', name: 'Distribution Costs',            type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6201', name: 'Transport & Fuel',              type: 'EXPENSE',   parent: '6200', is_system: false },
  { code: '6202', name: 'Vehicle Maintenance',           type: 'EXPENSE',   parent: '6200', is_system: false },
  { code: '6203', name: 'Delivery Charges',              type: 'EXPENSE',   parent: '6200', is_system: false },
  { code: '6300', name: 'Occupancy',                     type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6301', name: 'Rent',                          type: 'EXPENSE',   parent: '6300', is_system: false },
  { code: '6302', name: 'Utilities (Electricity/Water)', type: 'EXPENSE',   parent: '6300', is_system: false },
  { code: '6400', name: 'Administrative',                type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6401', name: 'Office Supplies',               type: 'EXPENSE',   parent: '6400', is_system: false },
  { code: '6402', name: 'Communication',                 type: 'EXPENSE',   parent: '6400', is_system: false },
  { code: '6403', name: 'Professional Fees',             type: 'EXPENSE',   parent: '6400', is_system: false },
  { code: '6500', name: 'Sales & Marketing',             type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6501', name: 'Marketing & Advertising',       type: 'EXPENSE',   parent: '6500', is_system: false },
  { code: '6502', name: 'Sales Commissions',             type: 'EXPENSE',   parent: '6500', is_system: false },
  { code: '6600', name: 'Finance Costs',                 type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6601', name: 'Bank Charges',                  type: 'EXPENSE',   parent: '6600', is_system: false },
  { code: '6602', name: 'Interest Expense',              type: 'EXPENSE',   parent: '6600', is_system: false },
  { code: '6700', name: 'Depreciation',                  type: 'EXPENSE',   parent: '6000', is_system: false },
  { code: '6701', name: 'Depreciation — Vehicles',       type: 'EXPENSE',   parent: '6700', is_system: false },
  { code: '6702', name: 'Depreciation — Equipment',      type: 'EXPENSE',   parent: '6700', is_system: false },
  { code: '6999', name: 'Miscellaneous Expenses',        type: 'EXPENSE',   parent: '6000', is_system: false },
];

async function seedAccounts() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const company = await Company.findOne({ where: { name: 'Lanka Distribution (Pvt) Ltd' } });
    if (!company) {
      console.error('Company not found. Run seed.js first (or it may have failed at sync).');
      process.exit(1);
    }
    console.log(`Company: ${company.name} (id=${company.id})`);

    // Two-pass: create all accounts, then set parent_id
    const accountMap = {};
    for (const acc of CHART_OF_ACCOUNTS) {
      const { parent, ...fields } = acc;
      const [account] = await Account.findOrCreate({
        where: { company_id: company.id, code: acc.code },
        defaults: { ...fields, company_id: company.id },
      });
      accountMap[acc.code] = account;
      process.stdout.write('.');
    }
    for (const acc of CHART_OF_ACCOUNTS) {
      if (acc.parent && accountMap[acc.parent]) {
        await accountMap[acc.code].update({ parent_id: accountMap[acc.parent].id });
      }
    }
    console.log(`\n✅ Chart of accounts seeded (${CHART_OF_ACCOUNTS.length} accounts).`);

    // Ensure current accounting period exists
    const now = new Date();
    const [period, created] = await AccountingPeriod.findOrCreate({
      where: { company_id: company.id, year: now.getFullYear(), month: now.getMonth() + 1 },
      defaults: { is_open: true },
    });
    console.log(`Accounting period ${now.getFullYear()}/${now.getMonth() + 1}: ${created ? 'created' : 'already exists'}.`);

    process.exit(0);
  } catch (err) {
    console.error('\nSeed failed:', err.message);
    process.exit(1);
  }
}

seedAccounts();
