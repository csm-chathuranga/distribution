const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Supplier, Account } = require('../models');
const crud = require('../controllers/crudFactory')(Supplier, {
  searchFields: ['name', 'code', 'phone'],
  include: [{ model: Account, attributes: ['id', 'code', 'name'] }],
  order: [['name', 'ASC']],
});

router.get('/', authorize('purchase.view'), crud.list);
router.get('/:id', authorize('purchase.view'), crud.get);
router.post('/', authorize('purchase.create'), crud.create);
router.put('/:id', authorize('purchase.create'), crud.update);

module.exports = router;
