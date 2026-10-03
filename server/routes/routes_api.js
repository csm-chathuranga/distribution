const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Route, Branch, User, Customer } = require('../models');
const crud = require('../controllers/crudFactory')(Route, {
  include: [
    { model: Branch, attributes: ['id', 'name'] },
    { model: User, as: 'SalesRep', attributes: ['id', 'name'] },
    { model: User, as: 'Driver', attributes: ['id', 'name'] },
  ],
  order: [['name', 'ASC']],
});

router.get('/', authorize('sales.view_all'), crud.list);
router.get('/:id', authorize('sales.view_all'), crud.get);
router.post('/', authorize('sales.approve'), crud.create);
router.put('/:id', authorize('sales.approve'), crud.update);

// GET /api/routes/:id/customers — customers on this route sorted by visit_order
router.get('/:id/customers', authorize.any('sales.view_own', 'sales.view_all'), async (req, res, next) => {
  try {
    const customers = await Customer.findAll({
      where: { route_id: req.params.id, is_active: true },
      order: [['visit_order', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'code', 'phone', 'address', 'visit_order', 'credit_limit', 'outstanding_balance', 'customer_type'],
    });
    res.json(customers);
  } catch (err) { next(err); }
});

// PUT /api/routes/:id/visit-order — bulk update visit_order for customers on this route
router.put('/:id/visit-order', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { order } = req.body;  // [{ customer_id, visit_order }]
    if (!Array.isArray(order)) return res.status(400).json({ message: 'order array required' });
    await Promise.all(order.map(({ customer_id, visit_order }) =>
      Customer.update({ visit_order }, { where: { id: customer_id, route_id: req.params.id } })
    ));
    res.json({ updated: order.length });
  } catch (err) { next(err); }
});

module.exports = router;
