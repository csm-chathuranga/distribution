const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { StockTransfer, StockTransferLine, Warehouse, Product, Stock, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');

function pad(n) { return String(n).padStart(3, '0'); }

async function nextTrfNumber(t) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await StockTransfer.count({
    where: sequelize.where(sequelize.fn('DATE', sequelize.col('created_at')), new Date().toISOString().slice(0, 10)),
    transaction: t,
  });
  return `TRF-${today}-${pad(count + 1)}`;
}

router.get('/', authorize('inventory.view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const where = search ? { transfer_number: { [Op.like]: `%${search}%` } } : {};
    const { rows, count } = await StockTransfer.findAndCountAll({
      where,
      include: [
        { model: Warehouse, as: 'FromWarehouse', attributes: ['id', 'name'] },
        { model: Warehouse, as: 'ToWarehouse', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: Number(offset),
    });
    res.json({ data: rows, total: count });
  } catch (err) { next(err); }
});

router.get('/:id', authorize('inventory.view'), async (req, res, next) => {
  try {
    const trf = await StockTransfer.findByPk(req.params.id, {
      include: [
        { model: Warehouse, as: 'FromWarehouse', attributes: ['id', 'name'] },
        { model: Warehouse, as: 'ToWarehouse', attributes: ['id', 'name'] },
        { model: StockTransferLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'sku', 'name'] }] },
      ],
    });
    if (!trf) return res.status(404).json({ message: 'Not found' });
    res.json(trf);
  } catch (err) { next(err); }
});

router.post('/', authorize('inventory.view'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...data } = req.body;
    if (data.from_warehouse_id === data.to_warehouse_id) {
      return res.status(400).json({ message: 'Source and destination warehouses must be different' });
    }
    data.created_by = req.user.id;
    data.company_id = req.user.company_id;
    data.branch_id = req.user.branch_id;
    data.transfer_number = await nextTrfNumber(t);
    const trf = await StockTransfer.create(data, { transaction: t });
    if (lines?.length) {
      await StockTransferLine.bulkCreate(lines.map(l => ({ ...l, transfer_id: trf.id })), { transaction: t });
    }
    await t.commit();
    res.status(201).json(trf);
  } catch (err) { await t.rollback(); next(err); }
});

router.put('/:id/dispatch', authorize('inventory.transfer'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const trf = await StockTransfer.findByPk(req.params.id, {
      include: [{ model: StockTransferLine, as: 'Lines' }],
      transaction: t,
    });
    if (!trf) return res.status(404).json({ message: 'Not found' });
    if (trf.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT transfers can be dispatched' });

    for (const line of trf.Lines) {
      const stock = await Stock.findOne({ where: { warehouse_id: trf.from_warehouse_id, product_id: line.product_id }, transaction: t });
      if (!stock || parseFloat(stock.quantity) < parseFloat(line.requested_quantity)) {
        await t.rollback();
        return res.status(400).json({ message: `Insufficient stock for product id ${line.product_id}` });
      }
      const newQty = parseFloat(stock.quantity) - parseFloat(line.requested_quantity);
      await stock.update({ quantity: newQty }, { transaction: t });
      await line.update({ dispatched_quantity: line.requested_quantity }, { transaction: t });
      await StockMovement.create({
        warehouse_id: trf.from_warehouse_id,
        product_id: line.product_id,
        movement_type: 'TRANSFER_OUT',
        source_type: 'STOCK_TRANSFER',
        source_id: trf.id,
        quantity: line.requested_quantity,
        balance_after: newQty,
        unit_cost: 0,
        created_by: req.user.id,
      }, { transaction: t });
    }

    await trf.update({ status: 'DISPATCHED', dispatched_by: req.user.id, dispatched_at: new Date() }, { transaction: t });
    await t.commit();
    res.json(trf);
  } catch (err) { await t.rollback(); next(err); }
});

router.put('/:id/receive', authorize('inventory.transfer'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const trf = await StockTransfer.findByPk(req.params.id, {
      include: [{ model: StockTransferLine, as: 'Lines' }],
      transaction: t,
    });
    if (!trf) return res.status(404).json({ message: 'Not found' });
    if (trf.status !== 'DISPATCHED') return res.status(400).json({ message: 'Only DISPATCHED transfers can be received' });

    for (const line of trf.Lines) {
      const [stock] = await Stock.findOrCreate({
        where: { warehouse_id: trf.to_warehouse_id, product_id: line.product_id },
        defaults: { quantity: 0, reserved_quantity: 0 },
        transaction: t,
      });
      const newQty = parseFloat(stock.quantity) + parseFloat(line.dispatched_quantity);
      await stock.update({ quantity: newQty }, { transaction: t });
      await line.update({ received_quantity: line.dispatched_quantity }, { transaction: t });
      await StockMovement.create({
        warehouse_id: trf.to_warehouse_id,
        product_id: line.product_id,
        movement_type: 'TRANSFER_IN',
        source_type: 'STOCK_TRANSFER',
        source_id: trf.id,
        quantity: line.dispatched_quantity,
        balance_after: newQty,
        unit_cost: 0,
        created_by: req.user.id,
      }, { transaction: t });
    }

    await trf.update({ status: 'RECEIVED', received_by: req.user.id, received_at: new Date() }, { transaction: t });
    await t.commit();
    res.json(trf);
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
