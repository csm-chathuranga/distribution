const router = require('express').Router();
const { Op, QueryTypes } = require('sequelize');
const authorize = require('../middleware/authorize');

const COMMISSION_RATE = 5.00;

function getInclude(db) {
  const { User, Branch } = db;
  return [
    { model: User, as: 'SalesRep', attributes: ['id', 'name', 'email'] },
    { model: Branch, attributes: ['id', 'name'] },
  ];
}

router.get('/', authorize.any('sales.view_all', 'finance.view'), async (req, res, next) => {
  try {
    const { SalesCommission } = req.db;
    const { sales_rep_id, status, year, month, page = 1, limit = 50 } = req.query;
    const where = {};
    if (sales_rep_id) where.sales_rep_id = sales_rep_id;
    if (status)       where.status       = status;
    if (year)         where.sale_year    = year;
    if (month)        where.sale_month   = month;

    const isSalesRep = req.permissions?.has('sales.view_own') && !req.permissions?.has('sales.view_all');
    if (isSalesRep) where.sales_rep_id = req.user.id;

    const { count, rows } = await SalesCommission.findAndCountAll({
      where,
      include: getInclude(req.db),
      order:   [['sale_year', 'DESC'], ['sale_month', 'DESC']],
      limit:   parseInt(limit),
      offset:  (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

router.get('/:id', authorize.any('sales.view_all', 'finance.view'), async (req, res, next) => {
  try {
    const { SalesCommission } = req.db;
    const rec = await SalesCommission.findByPk(req.params.id, { include: getInclude(req.db) });
    if (!rec) return res.status(404).json({ message: 'Commission record not found' });
    res.json(rec);
  } catch (err) { next(err); }
});

router.post('/generate', authorize('sales.approve'), async (req, res, next) => {
  const { sequelize } = req.db;
  const t = await sequelize.transaction();
  try {
    const { SalesCommission } = req.db;
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ message: 'year and month required' });

    const y = parseInt(year);
    const m = parseInt(month);
    const dueDate    = new Date(y, m, 1);
    const dueDateStr = dueDate.toISOString().slice(0, 10);

    const rows = await sequelize.query(`
      SELECT
        i.sales_rep_id,
        i.branch_id,
        ROUND(SUM(il.quantity * il.unit_price * (1 - COALESCE(il.discount_rate,0)/100)), 2)   AS cash_revenue,
        ROUND(SUM(il.quantity * COALESCE(il.cost_price, 0)), 2)                                 AS cogs,
        ROUND(SUM(il.quantity * (il.unit_price * (1 - COALESCE(il.discount_rate,0)/100) - COALESCE(il.cost_price,0))), 2) AS net_profit
      FROM invoices i
      JOIN invoice_lines il ON il.invoice_id = i.id
      WHERE i.invoice_type = 'CASH_INVOICE'
        AND i.status       = 'POSTED'
        AND i.sales_rep_id IS NOT NULL
        AND YEAR(i.invoice_date)  = :year
        AND MONTH(i.invoice_date) = :month
      GROUP BY i.sales_rep_id, i.branch_id
    `, { replacements: { year: y, month: m }, type: QueryTypes.SELECT, transaction: t });

    const created = [];
    for (const row of rows) {
      const netProfit     = Math.max(0, parseFloat(row.net_profit || 0));
      const commissionAmt = parseFloat((netProfit * COMMISSION_RATE / 100).toFixed(2));

      const existing = await SalesCommission.findOne({
        where: { sales_rep_id: row.sales_rep_id, sale_year: y, sale_month: m },
        transaction: t,
      });

      if (existing) {
        if (existing.status === 'PENDING') {
          await existing.update({
            cash_revenue:      row.cash_revenue,
            cogs:              row.cogs,
            net_profit:        netProfit,
            commission_amount: commissionAmt,
            due_date:          dueDateStr,
          }, { transaction: t });
          created.push(existing);
        }
      } else {
        const rec = await SalesCommission.create({
          sales_rep_id:      row.sales_rep_id,
          branch_id:         row.branch_id || req.user.branch_id,
          sale_year:         y,
          sale_month:        m,
          cash_revenue:      row.cash_revenue,
          cogs:              row.cogs,
          net_profit:        netProfit,
          commission_rate:   COMMISSION_RATE,
          commission_amount: commissionAmt,
          due_date:          dueDateStr,
          status:            'PENDING',
          created_by:        req.user.id,
        }, { transaction: t });
        created.push(rec);
      }
    }

    await t.commit();
    res.status(201).json({ generated: created.length, records: created });
  } catch (err) { await t.rollback(); next(err); }
});

router.put('/:id/approve', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { SalesCommission } = req.db;
    const rec = await SalesCommission.findByPk(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Not found' });
    if (rec.status !== 'PENDING') return res.status(400).json({ message: `Cannot approve a ${rec.status} commission` });
    await rec.update({ status: 'APPROVED', approved_by: req.user.id, approved_at: new Date() });
    res.json(await SalesCommission.findByPk(rec.id, { include: getInclude(req.db) }));
  } catch (err) { next(err); }
});

router.put('/:id/pay', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { SalesCommission } = req.db;
    const { paid_date, payment_notes } = req.body;
    const rec = await SalesCommission.findByPk(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Not found' });
    if (rec.status !== 'APPROVED') return res.status(400).json({ message: 'Commission must be APPROVED before paying' });
    await rec.update({
      status:        'PAID',
      paid_date:     paid_date || new Date().toISOString().slice(0, 10),
      payment_notes: payment_notes || null,
    });
    res.json(await SalesCommission.findByPk(rec.id, { include: getInclude(req.db) }));
  } catch (err) { next(err); }
});

router.put('/:id/cancel', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { SalesCommission } = req.db;
    const rec = await SalesCommission.findByPk(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Not found' });
    if (rec.status === 'PAID') return res.status(400).json({ message: 'Cannot cancel a paid commission' });
    await rec.update({ status: 'CANCELLED' });
    res.json(rec);
  } catch (err) { next(err); }
});

module.exports = router;
