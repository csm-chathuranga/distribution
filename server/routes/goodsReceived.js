const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { GoodsReceived, GoodsReceivedLine, Supplier, Product, Stock, StockMovement, JournalEntry, JournalLine, Account, AccountingPeriod, sequelize } = require('../models');

router.get('/', authorize('purchase.view'), async (req, res, next) => {
  try {
    const { count, rows } = await GoodsReceived.findAndCountAll({
      include: [{ model: Supplier, attributes: ['id', 'name'] }],
      order: [['grn_date', 'DESC']],
      limit: 20,
    });
    res.json({ data: rows, total: count });
  } catch (err) { next(err); }
});

router.get('/:id', authorize('purchase.view'), async (req, res, next) => {
  try {
    const grn = await GoodsReceived.findByPk(req.params.id, {
      include: [{ model: Supplier }, { model: GoodsReceivedLine, as: 'Lines', include: [{ model: Product }] }],
    });
    if (!grn) return res.status(404).json({ message: 'Not found' });
    res.json(grn);
  } catch (err) { next(err); }
});

router.post('/', authorize('purchase.receive'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    if (!data.grn_number) {
      const count = await GoodsReceived.count({ transaction: t });
      const yr = new Date().getFullYear();
      data.grn_number = `GRN-${yr}-${String(count + 1).padStart(5, '0')}`;
    }
    const mappedLines = (lines || []).map(l => ({
      product_id: l.product_id,
      quantity: l.quantity_received ?? l.quantity,
      unit_cost: l.unit_cost,
      discount_rate: l.discount_rate ?? 0,
      vat_rate: l.vat_rate ?? 0,
      line_total: (l.quantity_received ?? l.quantity ?? 0) * (l.unit_cost ?? 0),
    }));
    data.total_amount = mappedLines.reduce((s, l) => s + l.line_total, 0);
    const grn = await GoodsReceived.create(data, { transaction: t });
    if (mappedLines.length) await GoodsReceivedLine.bulkCreate(mappedLines.map(l => ({ ...l, grn_id: grn.id })), { transaction: t });
    await t.commit();
    res.status(201).json(grn);
  } catch (err) { await t.rollback(); next(err); }
});

router.delete('/:id', authorize('purchase.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const grn = await GoodsReceived.findByPk(req.params.id, { transaction: t });
    if (!grn) return res.status(404).json({ message: 'Not found' });
    if (grn.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT GRNs can be deleted' });
    await GoodsReceivedLine.destroy({ where: { grn_id: grn.id }, transaction: t });
    await grn.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Deleted' });
  } catch (err) { await t.rollback(); next(err); }
});

router.post('/:id/post', authorize('purchase.approve'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const grn = await GoodsReceived.findByPk(req.params.id, {
      include: [{ model: GoodsReceivedLine, as: 'Lines' }], transaction: t,
    });
    if (!grn || grn.status !== 'DRAFT') return res.status(400).json({ message: 'Invalid GRN' });

    for (const line of grn.Lines) {
      const [stock] = await Stock.findOrCreate({
        where: { warehouse_id: grn.warehouse_id, product_id: line.product_id },
        defaults: { quantity: 0, reserved_quantity: 0 }, transaction: t,
      });
      const newQty = parseFloat(stock.quantity) + parseFloat(line.quantity);
      await stock.update({ quantity: newQty }, { transaction: t });
      await StockMovement.create({
        warehouse_id: grn.warehouse_id, product_id: line.product_id,
        movement_type: 'IN', source_type: 'GRN', source_id: grn.id,
        quantity: line.quantity, balance_after: newQty, unit_cost: line.unit_cost,
        created_by: req.user.id,
      }, { transaction: t });
    }

    await grn.update({ status: 'POSTED', posted_by: req.user.id, posted_at: new Date() }, { transaction: t });
    await t.commit();
    res.json(grn);
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
