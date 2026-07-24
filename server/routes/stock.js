const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Stock, StockMovement, sequelize } = require('../models');

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
