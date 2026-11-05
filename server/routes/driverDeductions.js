const router = require('express').Router();
const { Op } = require('sequelize');

function include(db) {
  const { User, Product, LoadingSheet } = db;
  return [
    { model: User, as: 'Driver', attributes: ['id', 'name'] },
    { model: Product, attributes: ['id', 'name', 'sku', 'short_code'] },
    { model: LoadingSheet, attributes: ['id', 'sheet_number', 'sheet_date'] },
  ];
}

// GET /api/driver-deductions
router.get('/', async (req, res, next) => {
  try {
    const { DriverDeduction } = req.db;
    const { driver_id, status, from, to } = req.query;
    const where = {};
    if (driver_id) where.driver_id = driver_id;
    if (status)    where.status    = status;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to)   where.created_at[Op.lte] = new Date(to + 'T23:59:59');
    }
    const rows = await DriverDeduction.findAll({ where, include: include(req.db), order: [['created_at', 'DESC']] });
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// PUT /api/driver-deductions/:id/settle
router.put('/:id/settle', async (req, res, next) => {
  try {
    const { DriverDeduction } = req.db;
    const ded = await DriverDeduction.findByPk(req.params.id);
    if (!ded) return res.status(404).json({ message: 'Not found' });
    if (ded.status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING deductions can be settled' });
    await ded.update({
      status: 'SETTLED',
      settled_date: new Date().toISOString().slice(0, 10),
      notes: req.body.notes || ded.notes,
    });
    res.json(await DriverDeduction.findByPk(ded.id, { include: include(req.db) }));
  } catch (err) { next(err); }
});

// PUT /api/driver-deductions/:id/found
router.put('/:id/found', async (req, res, next) => {
  try {
    const { DriverDeduction } = req.db;
    const ded = await DriverDeduction.findByPk(req.params.id);
    if (!ded) return res.status(404).json({ message: 'Not found' });
    if (ded.status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING deductions can be marked as found' });
    if (!req.body.notes) return res.status(400).json({ message: 'A note is required when marking as found' });
    await ded.update({
      status: 'FOUND',
      found_date: new Date().toISOString().slice(0, 10),
      notes: req.body.notes,
    });
    res.json(await DriverDeduction.findByPk(ded.id, { include: include(req.db) }));
  } catch (err) { next(err); }
});

module.exports = router;
