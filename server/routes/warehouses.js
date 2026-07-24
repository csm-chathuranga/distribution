const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Warehouse, Branch, Stock, Product } = require('../models');
const crud = require('../controllers/crudFactory')(Warehouse, {
  include: [{ model: Branch, attributes: ['id', 'name'] }],
});

router.get('/', authorize('inventory.view'), crud.list);
router.get('/:id', authorize('inventory.view'), crud.get);
router.post('/', authorize('inventory.create'), crud.create);
router.put('/:id', authorize('inventory.create'), crud.update);

router.get('/:id/stock', authorize('inventory.view'), async (req, res, next) => {
  try {
    const stock = await Stock.findAll({
      where: { warehouse_id: req.params.id },
      include: [{ model: Product, attributes: ['id', 'sku', 'name', 'reorder_point'] }],
      order: [[Product, 'name', 'ASC']],
    });
    res.json(stock);
  } catch (err) { next(err); }
});

module.exports = router;
