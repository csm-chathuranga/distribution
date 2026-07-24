const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Route, Branch, User } = require('../models');
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

module.exports = router;
