const router = require('express').Router();
const { Op, QueryTypes } = require('sequelize');
const authorize = require('../middleware/authorize');
const notify = require('../notify');
const {
  sequelize, Payment, PaymentAllocation, GoodsReceived,
  Supplier, Account, JournalEntry, JournalLine, AccountingPeriod,
} = require('../models');

const generatePaymentNumber = async () => {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const like = `PAY-${datePart}-%`;
  const last = await Payment.findOne({ where: { payment_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.payment_number.split('-').pop()) + 1 : 1;
  return `PAY-${datePart}-${String(seq).padStart(3, '0')}`;
};

// GET / — paginated list with supplier
router.get('/', authorize('finance.payments'), async (req, res, next) => {
  try {
    const { supplier_id, from, to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (supplier_id) where.supplier_id = supplier_id;
    if (from || to) {
      where.payment_date = {};
      if (from) where.payment_date[Op.gte] = from;
      if (to)   where.payment_date[Op.lte] = to;
    }
    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [{ model: Supplier, attributes: ['id', 'name', 'code'] }],
      order: [['payment_date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ data: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) { next(err); }
});

// GET /open-grns/:supplier_id — unpaid/partial GRNs for a supplier
router.get('/open-grns/:supplier_id', authorize('finance.payments'), async (req, res, next) => {
  try {
    const result = await sequelize.query(`
      SELECT g.id, g.grn_number, g.grn_date, g.supplier_invoice_number,
             g.total_amount,
             COALESCE(SUM(pa.allocated_amount), 0) AS amount_paid,
             (g.total_amount - COALESCE(SUM(pa.allocated_amount), 0)) AS balance_due
      FROM goods_received g
      LEFT JOIN payment_allocations pa ON pa.grn_id = g.id
      WHERE g.supplier_id = :supplier_id AND g.status = 'POSTED'
      GROUP BY g.id
      HAVING balance_due > 0.001
      ORDER BY g.grn_date ASC
    `, { type: QueryTypes.SELECT, replacements: { supplier_id: req.params.supplier_id } });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /:id — full detail with allocations
router.get('/:id', authorize('finance.payments'), async (req, res, next) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: Supplier, attributes: ['id', 'name', 'code'] },
        {
          model: GoodsReceived,
          through: { attributes: ['allocated_amount'] },
          attributes: ['id', 'grn_number', 'grn_date', 'total_amount', 'supplier_invoice_number'],
        },
      ],
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) { next(err); }
});

// POST / — create payment + allocations + journal entry
router.post('/', authorize('finance.payments'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { supplier_id, payment_date, payment_method, reference, notes, bank_account_id, allocations } = req.body;

    if (!allocations || allocations.length === 0) {
      await t.rollback();
      return res.status(422).json({ message: 'At least one GRN allocation is required' });
    }

    const totalAmount = allocations.reduce((s, a) => s + parseFloat(a.amount_allocated || 0), 0);
    if (totalAmount <= 0) {
      await t.rollback();
      return res.status(422).json({ message: 'Total payment amount must be greater than zero' });
    }

    const payment_number = await generatePaymentNumber();
    const supplier = await Supplier.findByPk(supplier_id, { transaction: t });

    // Journal entry when both accounts are supplied
    let journal_id = null;
    if (bank_account_id && supplier?.account_id) {
      const period = await AccountingPeriod.findOne({ where: { is_open: true }, transaction: t });
      const je = await JournalEntry.create({
        company_id: req.user?.Branch?.company_id,
        branch_id: req.user.branch_id,
        period_id: period?.id || null,
        entry_number: `JE-${payment_number}`,
        entry_date: payment_date,
        description: `Supplier payment ${payment_number} — ${supplier.name}`,
        reference: reference || payment_number,
        status: 'POSTED',
        created_by: req.user.id,
        posted_by: req.user.id,
        posted_at: new Date(),
      }, { transaction: t });

      await JournalLine.bulkCreate([
        {
          journal_id: je.id, account_id: supplier.account_id,
          description: `Payment to ${supplier.name}`,
          debit: totalAmount, credit: 0,
        },
        {
          journal_id: je.id, account_id: bank_account_id,
          description: `Payment to ${supplier.name}`,
          debit: 0, credit: totalAmount,
        },
      ], { transaction: t });

      journal_id = je.id;
    }

    const payment = await Payment.create({
      company_id: req.user?.Branch?.company_id,
      branch_id: req.user.branch_id,
      supplier_id,
      payment_number,
      payment_date,
      payment_method,
      amount: totalAmount,
      reference: reference || null,
      notes: notes || null,
      journal_id,
      status: 'POSTED',
      created_by: req.user.id,
    }, { transaction: t });

    await PaymentAllocation.bulkCreate(
      allocations.map(a => ({
        payment_id: payment.id,
        grn_id: a.grn_id,
        allocated_amount: parseFloat(a.amount_allocated),
      })),
      { transaction: t }
    );

    await t.commit();
    notify({ roleName: 'purchasing', type: 'PAYMENT_CREATED', title: 'Supplier Payment Recorded', body: `${payment_number} — ${supplier?.name || 'Supplier'}`, link: `/supplier-payments/${payment.id}` });
    res.status(201).json(payment);
  } catch (err) { await t.rollback(); next(err); }
});

// POST /:id/cancel — cancel (reverses allocations, marks CANCELLED)
router.post('/:id/cancel', authorize('finance.payments'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const payment = await Payment.findByPk(req.params.id, { transaction: t });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'CANCELLED') {
      await t.rollback();
      return res.status(422).json({ message: 'Already cancelled' });
    }
    await PaymentAllocation.destroy({ where: { payment_id: payment.id }, transaction: t });
    await payment.update({ status: 'CANCELLED' }, { transaction: t });
    await t.commit();
    res.json({ message: 'Payment cancelled successfully' });
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
