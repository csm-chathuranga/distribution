const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Product, Category, Unit, Stock, sequelize } = require('../models');
const { Op } = require('sequelize');
const crud = require('../controllers/crudFactory')(Product, {
  searchFields: ['name', 'sku', 'barcode'],
  include: [
    { model: Category, attributes: ['id', 'name'] },
    { model: Unit, as: 'BaseUnit', attributes: ['id', 'name', 'abbreviation'] },
  ],
  order: [['name', 'ASC']],
});

// Sort products by extracted size (250ml→250, 1L→1000, 1.5L→1500) then by name
const SIZE_ORDER = sequelize.literal(
  "CASE" +
  " WHEN `Product`.`name` LIKE '%1.5L%' OR `Product`.`name` LIKE '%1.5 L%' OR `Product`.`name` LIKE '%1500ml%' THEN 1500" +
  " WHEN `Product`.`name` LIKE '%1L%'   OR `Product`.`name` LIKE '%1 L%'   OR `Product`.`name` LIKE '%1000ml%' THEN 1000" +
  " WHEN `Product`.`name` LIKE '%750ml%'  OR `Product`.`name` LIKE '%750 ml%'  THEN 750" +
  " WHEN `Product`.`name` LIKE '%500ml%'  OR `Product`.`name` LIKE '%500 ml%'  THEN 500" +
  " WHEN `Product`.`name` LIKE '%350ml%'  OR `Product`.`name` LIKE '%350 ml%'  THEN 350" +
  " WHEN `Product`.`name` LIKE '%330ml%'  OR `Product`.`name` LIKE '%330 ml%'  THEN 330" +
  " WHEN `Product`.`name` LIKE '%300ml%'  OR `Product`.`name` LIKE '%300 ml%'  THEN 300" +
  " WHEN `Product`.`name` LIKE '%250ml%'  OR `Product`.`name` LIKE '%250 ml%'  THEN 250" +
  " WHEN `Product`.`name` LIKE '%200ml%'  OR `Product`.`name` LIKE '%200 ml%'  THEN 200" +
  " WHEN `Product`.`name` LIKE '%150ml%'  OR `Product`.`name` LIKE '%150 ml%'  THEN 150" +
  " WHEN `Product`.`name` LIKE '%100ml%'  OR `Product`.`name` LIKE '%100 ml%'  THEN 100" +
  " ELSE 9999 END ASC, `Product`.`name` ASC"
);

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

router.get('/', authorize('inventory.view'), async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, is_active } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } },
      { barcode: { [Op.like]: `%${search}%` } },
    ];
    if (is_active !== undefined) where.is_active = is_active === 'true';
    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, attributes: ['id', 'name'] },
        { model: Unit, as: 'BaseUnit', attributes: ['id', 'name', 'abbreviation'] },
      ],
      order: [[SIZE_ORDER]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});
router.get('/:id', authorize('inventory.view'), crud.get);
router.post('/', authorize('inventory.create'), crud.create);
router.put('/:id', authorize('inventory.create'), crud.update);

module.exports = router;
