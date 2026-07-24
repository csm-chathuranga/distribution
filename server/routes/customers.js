const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Customer, Route, Branch, Account } = require('../models');
const crud = require('../controllers/crudFactory')(Customer, {
  searchFields: ['name', 'code', 'phone'],
  include: [
    { model: Route, attributes: ['id', 'name'] },
    { model: Branch, attributes: ['id', 'name'] },
    { model: Account, attributes: ['id', 'code', 'name'] },
  ],
  order: [['name', 'ASC']],
});

router.get('/', authorize.any('sales.view_own', 'sales.view_all'), crud.list);
router.get('/:id', authorize.any('sales.view_own', 'sales.view_all'), crud.get);
router.post('/', authorize('sales.create'), crud.create);
router.put('/:id', authorize('sales.create'), crud.update);

module.exports = router;
