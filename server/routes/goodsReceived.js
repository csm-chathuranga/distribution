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
    const grn = await GoodsReceived.create(data, { transaction: t });
    if (lines?.length) await GoodsReceivedLine.bulkCreate(lines.map(l => ({ ...l, grn_id: grn.id })), { transaction: t });
    await t.commit();
    res.status(201).json(grn);
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
