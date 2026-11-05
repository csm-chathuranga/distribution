const router = require('express').Router();
const authorize = require('../middleware/authorize');
const crud = require('../controllers/crudFactory')('Cheque', {
  includeFn: (db) => [{ model: db.Receipt, include: [{ model: db.Customer, attributes: ['id', 'name'] }] }],
  order: [['cheque_date', 'ASC']],
});

router.get('/', authorize('finance.receipts'), crud.list);

router.put('/:id/deposit', authorize('finance.receipts'), async (req, res, next) => {
  try {
    const { Cheque } = req.db;
    const cheque = await Cheque.findByPk(req.params.id);
    if (!cheque) return res.status(404).json({ message: 'Not found' });
    await cheque.update({ status: 'DEPOSITED', deposited_date: req.body.date || new Date() });
    res.json(cheque);
  } catch (err) { next(err); }
});

router.put('/:id/clear', authorize('finance.receipts'), async (req, res, next) => {
  try {
    const { Cheque } = req.db;
    const cheque = await Cheque.findByPk(req.params.id);
    if (!cheque) return res.status(404).json({ message: 'Not found' });
    await cheque.update({ status: 'CLEARED', cleared_date: req.body.date || new Date() });
    res.json(cheque);
  } catch (err) { next(err); }
});

router.put('/:id/bounce', authorize('finance.receipts'), async (req, res, next) => {
  try {
    const { Cheque } = req.db;
    const cheque = await Cheque.findByPk(req.params.id);
    if (!cheque) return res.status(404).json({ message: 'Not found' });
    await cheque.update({ status: 'BOUNCED', bounced_date: new Date(), bounce_reason: req.body.reason });
    res.json(cheque);
  } catch (err) { next(err); }
});

router.put('/:id/receive', authorize('finance.receipts'), async (req, res, next) => {
  const { sequelize } = req.db;
  const t = await sequelize.transaction();
  try {
    const { Cheque, Receipt, Customer, AccountingPeriod, Account, JournalEntry, JournalLine } = req.db;
    const cheque = await Cheque.findByPk(req.params.id, {
      include: [{ model: Receipt, include: [{ model: Customer, attributes: ['id', 'name'] }] }],
      transaction: t,
    });
    if (!cheque) { await t.rollback(); return res.status(404).json({ message: 'Not found' }); }
    if (!['RECEIVED', 'DEPOSITED'].includes(cheque.status)) {
      await t.rollback(); return res.status(400).json({ message: 'Cheque is not in a receivable state' });
    }

    await cheque.update({ status: 'CLEARED', cleared_date: new Date() }, { transaction: t });

    const now = new Date();
    const period = await AccountingPeriod.findOne({
      where: { year: now.getFullYear(), month: now.getMonth() + 1, is_open: true },
      transaction: t,
    });
    if (period) {
      const bankAcc   = await Account.findOne({ where: { is_system: true, sub_type: 'MAIN_BANK' },        transaction: t });
      const chequeAcc = await Account.findOne({ where: { is_system: true, sub_type: 'CHEQUES_IN_HAND' }, transaction: t });
      if (bankAcc && chequeAcc) {
        const receipt   = cheque.Receipt;
        const companyId = receipt?.company_id || cheque.company_id;
        const branchId  = receipt?.branch_id;
        const je = await JournalEntry.create({
          company_id: companyId, branch_id: branchId, period_id: period.id,
          entry_number: `CHQ-CLR-${cheque.cheque_number}`,
          entry_date:   now.toISOString().slice(0, 10),
          source_type:  'CHEQUE', source_id: cheque.id,
          description:  `Cheque ${cheque.cheque_number} cleared — converted to cash`,
          total_debit: cheque.amount, total_credit: cheque.amount,
          is_posted: true, created_by: req.user.id,
        }, { transaction: t });
        await JournalLine.bulkCreate([
          { journal_id: je.id, account_id: bankAcc.id,   debit: cheque.amount, credit: 0 },
          { journal_id: je.id, account_id: chequeAcc.id, debit: 0, credit: cheque.amount },
        ], { transaction: t });
      }
    }

    await t.commit();
    res.json(cheque);
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
