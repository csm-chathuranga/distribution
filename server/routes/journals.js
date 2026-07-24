const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { JournalEntry, JournalLine, Account, AccountingPeriod, sequelize } = require('../models');
const { Op } = require('sequelize');

router.get('/', authorize('finance.view'), async (req, res, next) => {
  try {
    const { from, to, source_type, page = 1, limit = 20 } = req.query;
    const where = {};
    if (source_type) where.source_type = source_type;
    if (from || to) {
      where.entry_date = {};
      if (from) where.entry_date[Op.gte] = from;
      if (to) where.entry_date[Op.lte] = to;
    }
    const { count, rows } = await JournalEntry.findAndCountAll({
      where, limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['entry_date', 'DESC']],
    });
    res.json({ data: rows, total: count });
  } catch (err) { next(err); }
});

router.get('/:id', authorize('finance.view'), async (req, res, next) => {
  try {
    const je = await JournalEntry.findByPk(req.params.id, {
      include: [{ model: JournalLine, as: 'Lines', include: [{ model: Account, attributes: ['id', 'code', 'name'] }] }],
    });
    if (!je) return res.status(404).json({ message: 'Not found' });
    res.json(je);
  } catch (err) { next(err); }
});

router.post('/', authorize('finance.journals'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    data.source_type = 'MANUAL';

    const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: 'Journal must balance (debit = credit)' });
    }

    data.total_debit = totalDebit;
    data.total_credit = totalCredit;

    const je = await JournalEntry.create(data, { transaction: t });
    await JournalLine.bulkCreate(lines.map(l => ({ ...l, journal_id: je.id })), { transaction: t });
    await t.commit();
    res.status(201).json(je);
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
