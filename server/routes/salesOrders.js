const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { SalesOrder, SalesOrderLine, Customer, Product, Warehouse } = require('../models');
const crud = require('../controllers/crudFactory')(SalesOrder, {
  include: [{ model: Customer, attributes: ['id', 'name', 'code'] }, { model: Warehouse, attributes: ['id', 'name'] }],
  order: [['order_date', 'DESC']],
});

async function generateOrderNumber() {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const like = `SO-${datePart}-%`;
  const last = await SalesOrder.findOne({ where: { order_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.order_number.split('-').pop()) + 1 : 1;
  return `SO-${datePart}-${String(seq).padStart(3, '0')}`;
}

router.get('/', authorize('sales.view_own'), crud.list);
router.get('/:id', authorize('sales.view_own'), crud.get);
router.post('/', authorize('sales.create'), async (req, res, next) => {
  try {
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    if (!data.company_id) data.company_id = req.user.Branch?.company_id ?? 1;
    if (!data.branch_id)  data.branch_id  = req.user.branch_id ?? 1;
    if (!data.order_number) data.order_number = await generateOrderNumber();
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
