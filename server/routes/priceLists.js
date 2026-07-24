const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { PriceList, PriceListItem, Product, sequelize } = require('../models');

router.get('/', authorize('inventory.view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const offset = (page - 1) * limit;
    const where = { company_id: req.user.company_id };
    if (active !== undefined) where.is_active = active === 'true';
    const { rows, count } = await PriceList.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit: Number(limit),
      offset: Number(offset),
    });
    res.json({ data: rows, total: count });
  } catch (err) { next(err); }
});

router.get('/:id', authorize('inventory.view'), async (req, res, next) => {
  try {
    const pl = await PriceList.findByPk(req.params.id, {
      include: [{ model: PriceListItem, as: 'Items', include: [{ model: Product, attributes: ['id', 'sku', 'name', 'selling_price'] }] }],
    });
    if (!pl) return res.status(404).json({ message: 'Not found' });
    res.json(pl);
  } catch (err) { next(err); }
});

router.post('/', authorize('inventory.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { items, ...data } = req.body;
    data.company_id = req.user.company_id;
    const pl = await PriceList.create(data, { transaction: t });
    if (items?.length) {
      await PriceListItem.bulkCreate(items.map(i => ({ ...i, price_list_id: pl.id })), { transaction: t });
    }
    await t.commit();
    res.status(201).json(pl);
  } catch (err) { await t.rollback(); next(err); }
});

router.put('/:id', authorize('inventory.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const pl = await PriceList.findByPk(req.params.id, { transaction: t });
    if (!pl) return res.status(404).json({ message: 'Not found' });
    const { items, ...data } = req.body;
    await pl.update(data, { transaction: t });
    if (items !== undefined) {
      await PriceListItem.destroy({ where: { price_list_id: pl.id }, transaction: t });
      if (items.length) {
        await PriceListItem.bulkCreate(items.map(i => ({ ...i, price_list_id: pl.id })), { transaction: t });
      }
    }
    await t.commit();
    res.json(pl);
  } catch (err) { await t.rollback(); next(err); }
});

router.delete('/:id', authorize('inventory.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const pl = await PriceList.findByPk(req.params.id, { transaction: t });
    if (!pl) return res.status(404).json({ message: 'Not found' });
    await PriceListItem.destroy({ where: { price_list_id: pl.id }, transaction: t });
    await pl.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Deleted' });
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
