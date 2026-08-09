const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Vehicle } = require('../models');
const crud = require('../controllers/crudFactory')(Vehicle, {
  order: [['registration_number', 'ASC']],
});

router.get('/',     authorize('inventory.view'),   crud.list);
router.get('/:id',  authorize('inventory.view'),   crud.get);
router.post('/',    authorize('settings.company'), crud.create);
router.put('/:id',  authorize('settings.company'), crud.update);

module.exports = router;
