const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Product, Category, Unit, Stock } = require('../models');
const crud = require('../controllers/crudFactory')(Product, {
  searchFields: ['name', 'sku', 'barcode'],
  include: [
    { model: Category, attributes: ['id', 'name'] },
    { model: Unit, as: 'BaseUnit', attributes: ['id', 'name', 'abbreviation'] },
  ],
  order: [['name', 'ASC']],
});

// Units sub-resource (must be before /:id to avoid route collision)
router.get('/units', authorize('inventory.view'), async (req, res, next) => {
  try {
    const units = await Unit.findAll({ order: [['name', 'ASC']] });
    res.json(units);
  } catch (err) { next(err); }
});
router.post('/units', authorize('inventory.create'), async (req, res, next) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json(unit);
  } catch (err) { next(err); }
});
router.put('/units/:id', authorize('inventory.create'), async (req, res, next) => {
  try {
    const unit = await Unit.findByPk(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Not found' });
    await unit.update(req.body);
    res.json(unit);
  } catch (err) { next(err); }
});

router.get('/', authorize('inventory.view'), crud.list);
router.get('/:id', authorize('inventory.view'), crud.get);
router.post('/', authorize('inventory.create'), crud.create);
router.put('/:id', authorize('inventory.create'), crud.update);

module.exports = router;
