const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { Receipt, Customer, Invoice, Cheque, ReceiptAllocation, JournalEntry, JournalLine, Account, AccountingPeriod, User, sequelize } = require('../models');

// GET /api/receipts/advance/:customerId — total unallocated (advance) balance for a customer
router.get('/advance/:customerId', authorize.any('finance.receipts', 'sales.create'), async (req, res, next) => {
  try {
    const receipts = await Receipt.findAll({
      where: { customer_id: req.params.customerId, status: 'POSTED' },
      include: [{ model: ReceiptAllocation, attributes: ['allocated_amount'] }],
    });
    const rows = receipts.map(r => {
      const allocated = r.ReceiptAllocations.reduce((s, a) => s + parseFloat(a.allocated_amount), 0);
      const unallocated = Math.max(0, parseFloat(r.amount) - allocated);
      return { id: r.id, receipt_number: r.receipt_number, receipt_date: r.receipt_date, amount: parseFloat(r.amount), allocated, unallocated };
    }).filter(r => r.unallocated > 0);
    const total = rows.reduce((s, r) => s + r.unallocated, 0);
    res.json({ total, receipts: rows });
  } catch (err) { next(err); }
});
const crud = require('../controllers/crudFactory')(Receipt, {
  include: [
    { model: Customer, attributes: ['id', 'name'] },
    { model: User, as: 'CreatedBy', attributes: ['id', 'name'] },
  ],
  order: [['receipt_date', 'DESC']],
});

const generateReceiptNumber = async () => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const last = await Receipt.findOne({ where: { receipt_number: { [Op.like]: `RCT-${datePart}-%` } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.receipt_number.split('-').pop()) + 1 : 1;
  return `RCT-${datePart}-${String(seq).padStart(3, '0')}`;
};

router.get('/', authorize.any('finance.receipts', 'sales.view_own'), crud.list);
// GET /api/receipts/my — receipts created by the logged-in user, optionally filtered by date
router.get('/my', authorize.any('finance.receipts', 'sales.create', 'sales.view_own'), async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const where = { created_by: req.user.id };
    if (date_from || date_to) {
      where.receipt_date = {};
      if (date_from) where.receipt_date[Op.gte] = date_from;
      if (date_to)   where.receipt_date[Op.lte] = date_to;
    } else {
      // Default: today
      const today = new Date().toISOString().slice(0, 10);
      where.receipt_date = { [Op.gte]: today, [Op.lte]: today };
    }
    const receipts = await Receipt.findAll({
      where,
      include: [{ model: Customer, attributes: ['id', 'name'] }],
      order: [['receipt_date', 'DESC'], ['id', 'DESC']],
    });
    const totals = { CASH: 0, CHEQUE: 0, BANK_TRANSFER: 0, total: 0 };
    for (const r of receipts) {
      const amt = parseFloat(r.amount) || 0;
      totals[r.payment_method] = (totals[r.payment_method] || 0) + amt;
      totals.total += amt;
    }
    res.json({ receipts, totals });
  } catch (err) { next(err); }
});

router.get('/:id', authorize.any('finance.receipts', 'sales.view_own'), async (req, res, next) => {
  try {
    const r = await Receipt.findByPk(req.params.id, {
      include: [{ model: Customer }, { model: Invoice, through: { model: ReceiptAllocation } }, { model: Cheque }],
    });
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (err) { next(err); }
});

router.post('/', authorize.any('finance.receipts', 'sales.create', 'sales.view_own'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { allocations, cheque, ...data } = req.body;
    data.created_by = req.user.id;
    data.branch_id  = data.branch_id  || req.user.branch_id;
    data.company_id = data.company_id || req.user.Branch?.company_id;
    // Fall back to linked invoice's company/branch when user record lacks them
    if ((!data.company_id || !data.branch_id) && allocations?.length) {
      const refInv = await Invoice.findByPk(allocations[0].invoice_id, { attributes: ['company_id', 'branch_id'] });
      if (refInv) {
        data.company_id = data.company_id || refInv.company_id;
        data.branch_id  = data.branch_id  || refInv.branch_id;
      }
    }
    // Last resort: look up from the customer's most recent invoice
    if ((!data.company_id || !data.branch_id) && data.customer_id) {
      const custInv = await Invoice.findOne({
        where: { customer_id: data.customer_id },
        attributes: ['company_id', 'branch_id'],
        order: [['id', 'DESC']],
      });
      if (custInv) {
        data.company_id = data.company_id || custInv.company_id;
        data.branch_id  = data.branch_id  || custInv.branch_id;
      }
    }
    if (!data.receipt_number) data.receipt_number = await generateReceiptNumber();

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
        // Update invoice status based on new balance
        const inv = await Invoice.findByPk(a.invoice_id, { transaction: t });
        if (inv) {
          const newBalance = parseFloat(inv.balance_due);
          const newPaid   = parseFloat(inv.paid_amount);
          const newStatus = newBalance <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : inv.status;
          await inv.update({ status: newStatus }, { transaction: t });
        }
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

// POST /api/receipts/:id/allocate — apply unallocated receipt amount to an invoice
router.post('/:id/allocate', authorize.any('finance.receipts', 'sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { invoice_id, amount } = req.body;
    const receipt = await Receipt.findByPk(req.params.id, {
      include: [{ model: ReceiptAllocation, attributes: ['allocated_amount'] }],
      transaction: t,
    });
    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

    const allocated  = receipt.ReceiptAllocations.reduce((s, a) => s + parseFloat(a.allocated_amount), 0);
    const unallocated = parseFloat(receipt.amount) - allocated;
    if (amount > unallocated + 0.001) {
      await t.rollback();
      return res.status(400).json({ message: `Only ${unallocated.toFixed(2)} available to allocate` });
    }

    const invoice = await Invoice.findByPk(invoice_id, { transaction: t });
    if (!invoice) { await t.rollback(); return res.status(404).json({ message: 'Invoice not found' }); }
    if (invoice.customer_id !== receipt.customer_id) {
      await t.rollback(); return res.status(400).json({ message: 'Invoice does not belong to this customer' });
    }

    await ReceiptAllocation.create({ receipt_id: receipt.id, invoice_id, allocated_amount: amount }, { transaction: t });
    await invoice.increment('paid_amount', { by: amount, transaction: t });
    await invoice.decrement('balance_due', { by: amount, transaction: t });
    await invoice.reload({ transaction: t });
    const newBalance = parseFloat(invoice.balance_due);
    const newStatus  = newBalance <= 0 ? 'PAID' : parseFloat(invoice.paid_amount) > 0 ? 'PARTIAL' : invoice.status;
    await invoice.update({ status: newStatus }, { transaction: t });

    await t.commit();
    res.json({ message: 'Allocated', invoice_id, amount, new_status: newStatus });
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
