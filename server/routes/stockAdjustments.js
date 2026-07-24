const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { StockAdjustment, StockAdjustmentLine, Warehouse, Product, Stock, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');

function pad(n) { return String(n).padStart(3, '0'); }

async function nextAdjNumber(t) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await StockAdjustment.count({
    where: sequelize.where(sequelize.fn('DATE', sequelize.col('created_at')), new Date().toISOString().slice(0, 10)),
    transaction: t,
  });
  return `ADJ-${today}-${pad(count + 1)}`;
}

router.get('/', authorize('inventory.view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const where = search ? { adjustment_number: { [Op.like]: `%${search}%` } } : {};
    const { rows, count } = await StockAdjustment.findAndCountAll({
      where,
      include: [{ model: Warehouse, attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: Number(offset),
    });
    res.json({ data: rows, total: count });
  } catch (err) { next(err); }
});

router.get('/:id', authorize('inventory.view'), async (req, res, next) => {
  try {
    const adj = await StockAdjustment.findByPk(req.params.id, {
      include: [
        { model: Warehouse, attributes: ['id', 'name'] },
        { model: StockAdjustmentLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'sku', 'name', 'cost_price'] }] },
      ],
    });
    if (!adj) return res.status(404).json({ message: 'Not found' });
    res.json(adj);
  } catch (err) { next(err); }
});

router.post('/', authorize('inventory.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    data.company_id = req.user.company_id;
    data.branch_id = req.user.branch_id;
    data.adjustment_number = await nextAdjNumber(t);
    const adj = await StockAdjustment.create(data, { transaction: t });
    if (lines?.length) {
      await StockAdjustmentLine.bulkCreate(lines.map(l => ({ ...l, adjustment_id: adj.id })), { transaction: t });
    }
    await t.commit();
    res.status(201).json(adj);
  } catch (err) { await t.rollback(); next(err); }
});

router.post('/:id/approve', authorize('inventory.adjust'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const adj = await StockAdjustment.findByPk(req.params.id, {
      include: [{ model: StockAdjustmentLine, as: 'Lines' }],
      transaction: t,
    });
    if (!adj) return res.status(404).json({ message: 'Not found' });
    if (adj.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT adjustments can be approved' });

    for (const line of adj.Lines) {
      const [stock] = await Stock.findOrCreate({
        where: { warehouse_id: adj.warehouse_id, product_id: line.product_id },
        defaults: { quantity: 0, reserved_quantity: 0 },
        transaction: t,
      });
      const variance = parseFloat(line.actual_quantity) - parseFloat(line.system_quantity);
      const newQty = parseFloat(stock.quantity) + variance;
      await stock.update({ quantity: newQty }, { transaction: t });
      await StockMovement.create({
        warehouse_id: adj.warehouse_id,
        product_id: line.product_id,
        movement_type: 'ADJUSTMENT',
        source_type: 'STOCK_ADJUSTMENT',
        source_id: adj.id,
        quantity: variance,
        balance_after: newQty,
        unit_cost: line.unit_cost || 0,
        created_by: req.user.id,
      }, { transaction: t });
    }

    await adj.update({ status: 'APPROVED', approved_by: req.user.id, approved_at: new Date() }, { transaction: t });
    await t.commit();
    res.json(adj);
  } catch (err) { await t.rollback(); next(err); }
});

router.post('/:id/cancel', authorize('inventory.adjust'), async (req, res, next) => {
  try {
    const adj = await StockAdjustment.findByPk(req.params.id);
    if (!adj) return res.status(404).json({ message: 'Not found' });
    if (adj.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT adjustments can be cancelled' });
    await adj.update({ status: 'CANCELLED' });
    res.json(adj);
  } catch (err) { next(err); }
});

module.exports = router;
