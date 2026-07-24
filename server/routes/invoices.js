const router = require('express').Router();
const authorize = require('../middleware/authorize');
const c = require('../controllers/invoiceController');

router.get('/', authorize.any('sales.view_own', 'sales.view_all'), c.list);
router.get('/:id', authorize.any('sales.view_own', 'sales.view_all'), c.get);
router.post('/', authorize('sales.create'), c.create);
router.post('/:id/post', authorize('sales.approve'), c.post);

module.exports = router;
