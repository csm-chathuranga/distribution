const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { Expense, Account, AccountingPeriod, JournalEntry, JournalLine, sequelize } = require('../models');
const crud = require('../controllers/crudFactory')(Expense, {
  include: [{ model: Account, attributes: ['id', 'code', 'name'] }],
  order: [['expense_date', 'DESC']],
});

// Category → expense account code mapping
const CATEGORY_ACCOUNT = {
  SALARY:      '6001',
  TRANSPORT:   '6002',
  FUEL:        '6002',
  UTILITIES:   '6004',
  MAINTENANCE: '6099',
  OFFICE:      '6099',
  OTHER:       '6099',
};

// Payment method → asset account sub_type
const PAYMENT_ACCOUNT_SUBTYPE = {
  CASH:          ['PETTY_CASH', 'CASH_BANK'],
  CHEQUE:        ['CHEQUES_IN_HAND', 'MAIN_BANK', 'BANK'],
  BANK_TRANSFER: ['MAIN_BANK', 'BANK'],
};

async function generateExpenseNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const like = `EXP-${datePart}-%`;
  const last = await Expense.findOne({ where: { expense_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.expense_number.split('-').pop()) + 1 : 1;
  return `EXP-${datePart}-${String(seq).padStart(3, '0')}`;
}

router.get('/', authorize('finance.view'), crud.list);
router.get('/:id', authorize('finance.view'), crud.get);

router.post('/', authorize('finance.payments'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const data = { ...req.body };
    data.created_by = req.user.id;
    if (!data.company_id) data.company_id = req.user.Branch?.company_id ?? 1;
    if (!data.branch_id)  data.branch_id  = req.user.branch_id ?? 1;
    if (!data.expense_number) data.expense_number = await generateExpenseNumber();
    if (!data.payment_method) data.payment_method = 'CASH';

    // Resolve expense GL account from category if not provided
    if (!data.account_id) {
      const code = CATEGORY_ACCOUNT[data.category?.toUpperCase()] || '6099';
      const acc = await Account.findOne({ where: { code }, transaction: t })
        || await Account.findOne({ where: { type: 'EXPENSE' }, transaction: t });
      if (!acc) {
        await t.rollback();
        return res.status(400).json({ message: 'No expense account found in chart of accounts' });
      }
      data.account_id = acc.id;
    }

    // Resolve payment GL account (CR side)
    const subtypes = PAYMENT_ACCOUNT_SUBTYPE[data.payment_method] || ['PETTY_CASH'];
    let paymentAcc = null;
    for (const sub of subtypes) {
      paymentAcc = await Account.findOne({ where: { sub_type: sub, is_system: true }, transaction: t });
      if (paymentAcc) break;
    }
    if (!paymentAcc) {
      paymentAcc = await Account.findOne({ where: { type: 'ASSET', sub_type: { [Op.like]: '%CASH%' } }, transaction: t });
    }

    // Auto-create accounting period if needed
    const now = new Date();
    let period = await AccountingPeriod.findOne({
      where: { year: now.getFullYear(), month: now.getMonth() + 1, is_open: true },
      transaction: t,
    });
    if (!period) {
      try {
        period = await AccountingPeriod.create({
          company_id: data.company_id,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          is_open: true,
          name: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,
        }, { transaction: t });
      } catch { period = null; }
    }

    // Create expense record
    data.status = period && paymentAcc ? 'POSTED' : 'DRAFT';
    const expense = await Expense.create(data, { transaction: t });

    // Journal entry: DR Expense Account, CR Payment Account
    if (period && paymentAcc) {
      const journal = await JournalEntry.create({
        company_id:   data.company_id,
        branch_id:    data.branch_id,
        period_id:    period.id,
        entry_number: `EXP-JE-${data.expense_number}`,
        entry_date:   data.expense_date,
        source_type:  'EXPENSE',
        source_id:    expense.id,
        description:  `Expense: ${data.description}`,
        total_debit:  data.amount,
        total_credit: data.amount,
        is_posted:    true,
        created_by:   data.created_by,
      }, { transaction: t });

      await JournalLine.bulkCreate([
        { journal_id: journal.id, account_id: data.account_id,  debit_amount: data.amount, credit_amount: 0,           narration: data.description },
        { journal_id: journal.id, account_id: paymentAcc.id,    debit_amount: 0,           credit_amount: data.amount, narration: `${data.payment_method} payment` },
      ], { transaction: t });

      await expense.update({ journal_id: journal.id }, { transaction: t });
    }

    await t.commit();
    res.status(201).json(await Expense.findByPk(expense.id, {
      include: [{ model: Account, attributes: ['id', 'code', 'name'] }],
    }));
  } catch (err) { await t.rollback(); next(err); }
});

router.put('/:id', authorize('finance.payments'), crud.update);

module.exports = router;
