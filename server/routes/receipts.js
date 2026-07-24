const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Receipt, Customer, Invoice, Cheque, ReceiptAllocation, JournalEntry, JournalLine, Account, AccountingPeriod, sequelize } = require('../models');
const crud = require('../controllers/crudFactory')(Receipt, {
  include: [{ model: Customer, attributes: ['id', 'name'] }],
  order: [['receipt_date', 'DESC']],
});

router.get('/', authorize('finance.receipts'), crud.list);
router.get('/:id', authorize('finance.receipts'), async (req, res, next) => {
  try {
    const r = await Receipt.findByPk(req.params.id, {
      include: [{ model: Customer }, { model: Invoice, through: { model: ReceiptAllocation } }, { model: Cheque }],
    });
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (err) { next(err); }
});

router.post('/', authorize('finance.receipts'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { allocations, cheque, ...data } = req.body;
    data.created_by = req.user.id;

    const receipt = await Receipt.create(data, { transaction: t });

    if (cheque && data.payment_method === 'CHEQUE') {
      await Cheque.create({ ...cheque, receipt_id: receipt.id, company_id: data.company_id }, { transaction: t });
    }

    if (allocations?.length) {
      await ReceiptAllocation.bulkCreate(
        allocations.map(a => ({ receipt_id: receipt.id, invoice_id: a.invoice_id, allocated_amount: a.amount })),
        { transaction: t }
      );
      for (const a of allocations) {
        await Invoice.increment('paid_amount', { by: a.amount, where: { id: a.invoice_id }, transaction: t });
        await Invoice.decrement('balance_due', { by: a.amount, where: { id: a.invoice_id }, transaction: t });
      }
    }

    await Customer.decrement('outstanding_balance', { by: data.amount, where: { id: data.customer_id }, transaction: t });

    // Journal entry
    const now = new Date();
    const period = await AccountingPeriod.findOne({ where: { year: now.getFullYear(), month: now.getMonth() + 1, is_open: true }, transaction: t });
    if (period) {
      const cashAcc = await Account.findOne({ where: { is_system: true, sub_type: data.payment_method === 'CHEQUE' ? 'CHEQUES_IN_HAND' : 'MAIN_BANK' }, transaction: t });
      const debtorAcc = await Account.findOne({ where: { is_system: true, sub_type: 'TRADE_DEBTORS' }, transaction: t });
      if (cashAcc && debtorAcc) {
        const je = await JournalEntry.create({
          company_id: data.company_id, branch_id: data.branch_id, period_id: period.id,
          entry_number: `RCT-JE-${receipt.receipt_number}`,
          entry_date: data.receipt_date, source_type: 'RECEIPT', source_id: receipt.id,
          description: `Receipt ${receipt.receipt_number}`,
          total_debit: data.amount, total_credit: data.amount, is_posted: true, created_by: req.user.id,
        }, { transaction: t });
        await JournalLine.bulkCreate([
          { journal_id: je.id, account_id: cashAcc.id, debit: data.amount, credit: 0 },
          { journal_id: je.id, account_id: debtorAcc.id, debit: 0, credit: data.amount },
        ], { transaction: t });
        await receipt.update({ journal_id: je.id }, { transaction: t });
      }
    }

    await t.commit();
    res.status(201).json(receipt);
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
