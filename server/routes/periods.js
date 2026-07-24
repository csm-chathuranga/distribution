const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { AccountingPeriod } = require('../models');

router.get('/', authorize('finance.view'), async (req, res, next) => {
  try {
    const periods = await AccountingPeriod.findAll({
      where: { company_id: req.user.company_id },
      order: [['year', 'DESC'], ['month', 'DESC']],
    });
    res.json({ data: periods, total: periods.length });
  } catch (err) { next(err); }
});

router.post('/', authorize('finance.close_period'), async (req, res, next) => {
  try {
    const { year, month } = req.body;
    const existing = await AccountingPeriod.findOne({ where: { company_id: req.user.company_id, year, month } });
    if (existing) return res.status(400).json({ message: 'Period already exists' });
    const period = await AccountingPeriod.create({
      company_id: req.user.company_id,
      year,
      month,
      is_open: true,
      opened_at: new Date(),
    });
    res.status(201).json(period);
  } catch (err) { next(err); }
});

router.put('/:id/close', authorize('finance.close_period'), async (req, res, next) => {
  try {
    const period = await AccountingPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ message: 'Not found' });
    if (!period.is_open) return res.status(400).json({ message: 'Period is already closed' });
    await period.update({ is_open: false, closed_at: new Date() });
    res.json(period);
  } catch (err) { next(err); }
});

router.put('/:id/reopen', authorize('finance.close_period'), async (req, res, next) => {
  try {
    const period = await AccountingPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ message: 'Not found' });
    if (period.is_open) return res.status(400).json({ message: 'Period is already open' });
    await period.update({ is_open: true, opened_at: new Date(), closed_at: null });
    res.json(period);
  } catch (err) { next(err); }
});

module.exports = router;
