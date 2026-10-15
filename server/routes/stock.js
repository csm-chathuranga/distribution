const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { Stock, StockMovement, Product, Category, Unit, Warehouse, sequelize } = require('../models');

const SCOPED_ROLES = ['sales_rep', 'driver'];

router.get('/on-hand', authorize.any('inventory.view', 'sales.create'), async (req, res, next) => {
  try {
    const { warehouse_id, search } = req.query;
    const where = {};
    // Scoped roles are locked to their assigned warehouse regardless of query param
    if (SCOPED_ROLES.includes(req.user?.Role?.name) && req.user?.assigned_warehouse) {
      where.warehouse_id = req.user.assigned_warehouse.id;
    } else if (warehouse_id) {
      where.warehouse_id = warehouse_id;
    }

    const productWhere = {};
    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku:  { [Op.like]: `%${search}%` } },
      ];
    }

    const rows = await Stock.findAll({
      where,
      include: [
        {
          model: Product, attributes: ['id', 'name', 'sku', 'cost_price'],
          where: Object.keys(productWhere).length ? productWhere : undefined,
          include: [
            { model: Category, attributes: ['id', 'name'] },
            { model: Unit, as: 'BaseUnit', attributes: ['id', 'name', 'abbreviation'] },
          ],
        },
        { model: Warehouse, attributes: ['id', 'name'] },
      ],
      order: [
        [Product, 'name', 'ASC'],
        [Warehouse, 'name', 'ASC'],
      ],
    });

    const data = rows.map(s => ({
      id:            s.id,
      warehouse_id:  s.warehouse_id,
      warehouse:     s.Warehouse?.name,
      product_id:    s.product_id,
      sku:           s.Product?.sku,
      product:       s.Product?.name,
      category:      s.Product?.Category?.name,
      unit:          s.Product?.BaseUnit?.abbreviation || s.Product?.BaseUnit?.name,
      quantity:      parseFloat(s.quantity || 0),
      reserved:      parseFloat(s.reserved_quantity || 0),
      available:     parseFloat(s.quantity || 0) - parseFloat(s.reserved_quantity || 0),
      cost_price:    parseFloat(s.Product?.cost_price || 0),
      stock_value:   parseFloat(s.quantity || 0) * parseFloat(s.Product?.cost_price || 0),
      low_stock:     parseFloat(s.quantity || 0) === 0,
    }));

    const total_value = data.reduce((s, r) => s + r.stock_value, 0);
    const low_stock_count = data.filter(r => r.low_stock).length;

    res.json({ data, total: data.length, total_value, low_stock_count });
  } catch (err) { next(err); }
});

router.post('/opening', authorize('inventory.adjust'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { warehouse_id, items } = req.body;
    if (!warehouse_id || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'warehouse_id and items[] are required' });
    }

    for (const item of items) {
      const qty = parseFloat(item.quantity || 0);
      const cost = parseFloat(item.unit_cost || 0);
      if (qty < 0) continue;

      await Stock.upsert(
        { warehouse_id, product_id: item.product_id, quantity: qty, reserved_quantity: 0 },
        { transaction: t }
      );

      await StockMovement.create({
        warehouse_id,
        product_id: item.product_id,
        movement_type: 'ADJUSTMENT',
        source_type: 'OPENING',
        quantity: qty,
        balance_after: qty,
        unit_cost: cost,
        notes: 'Opening stock entry',
        created_by: req.user.id,
      }, { transaction: t });
    }

    await t.commit();
    res.json({ message: 'Opening stock set successfully', count: items.length });
  } catch (err) { await t.rollback(); next(err); }
});

// POST /stock/damage-report — sales rep records damaged/expired stock
// Directly deducts from stock and creates StockMovement records
router.post('/damage-report', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines } = req.body; // [{ product_id, quantity, reason, notes }]
    if (!Array.isArray(lines) || lines.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'lines[] required' });
    }

    const warehouseId = req.user.assigned_warehouse?.id || req.body.warehouse_id;
    if (!warehouseId) {
      await t.rollback();
      return res.status(422).json({ message: 'No warehouse assigned to your account' });
    }

    const movements = [];
    for (const line of lines) {
      const qty = parseFloat(line.quantity || 0);
      if (!line.product_id || qty <= 0) continue;

      const [stock] = await Stock.findOrCreate({
        where: { warehouse_id: warehouseId, product_id: line.product_id },
        defaults: { quantity: 0, reserved_quantity: 0 },
        transaction: t,
      });

      const newQty = Math.max(0, parseFloat(stock.quantity) - qty);
      await stock.update({ quantity: newQty }, { transaction: t });

      const mv = await StockMovement.create({
        warehouse_id:  warehouseId,
        product_id:    line.product_id,
        movement_type: 'OUT',
        source_type:   line.reason || 'DAMAGE',
        quantity:      qty,
        balance_after: newQty,
        unit_cost:     0,
        notes:         line.notes || null,
        created_by:    req.user.id,
      }, { transaction: t });
      movements.push(mv);
    }

    await t.commit();
    res.status(201).json({ message: 'Report submitted', count: movements.length });
  } catch (err) { await t.rollback(); next(err); }
});

// GET /stock/damage-report — list damage/expiry reports for the current user
router.get('/damage-report', authorize('sales.create'), async (req, res, next) => {
  try {
    const warehouseId = req.user.assigned_warehouse?.id;
    const where = {
      movement_type: 'OUT',
      source_type:   { [Op.in]: ['DAMAGE', 'EXPIRED', 'OTHER'] },
      created_by:    req.user.id,
    };
    if (warehouseId) where.warehouse_id = warehouseId;

    const rows = await StockMovement.findAll({
      where,
      include: [{ model: Product, attributes: ['id', 'name', 'sku'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
