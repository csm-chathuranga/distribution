const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { SalesOrder, SalesOrderLine, Customer, Product, Warehouse } = require('../models');
const crud = require('../controllers/crudFactory')(SalesOrder, {
  include: [{ model: Customer, attributes: ['id', 'name', 'code'] }, { model: Warehouse, attributes: ['id', 'name'] }],
  order: [['order_date', 'DESC']],
});

router.get('/', authorize('sales.view_own'), crud.list);
router.get('/:id', authorize('sales.view_own'), crud.get);
router.post('/', authorize('sales.create'), async (req, res, next) => {
  try {
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    const { sequelize } = require('../models');
    const t = await sequelize.transaction();
    try {
      const order = await SalesOrder.create(data, { transaction: t });
      if (lines?.length) {
        await SalesOrderLine.bulkCreate(lines.map(l => ({ ...l, order_id: order.id })), { transaction: t });
      }
      await t.commit();
      res.status(201).json(order);
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
});
router.put('/:id', authorize('sales.approve'), crud.update);
router.put('/:id/confirm', authorize('sales.approve'), async (req, res, next) => {
  try {
    const order = await SalesOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await order.update({ status: 'CONFIRMED', approved_by: req.user.id, approved_at: new Date() });
    res.json(order);
  } catch (err) { next(err); }
});

module.exports = router;
