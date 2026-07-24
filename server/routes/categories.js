const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Category } = require('../models');
const crud = require('../controllers/crudFactory')(Category, { order: [['name', 'ASC']] });

router.get('/', authorize('inventory.view'), crud.list);
router.get('/:id', authorize('inventory.view'), crud.get);
router.post('/', authorize('inventory.create'), crud.create);
router.put('/:id', authorize('inventory.create'), crud.update);

module.exports = router;
