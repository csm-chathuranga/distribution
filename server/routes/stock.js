const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { Stock, StockMovement, Product, Category, Unit, Warehouse, sequelize } = require('../models');

router.get('/on-hand', authorize('inventory.view'), async (req, res, next) => {
  try {
    const { warehouse_id, search } = req.query;
    const where = {};
    if (warehouse_id) where.warehouse_id = warehouse_id;

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

module.exports = router;
