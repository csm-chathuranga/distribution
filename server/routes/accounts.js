const router = require('express').Router();
const authorize = require('../middleware/authorize');
const c = require('../controllers/accountController');

router.get('/trial-balance', authorize('finance.view'), c.trialBalance);
router.post('/opening-balance', authorize('finance.journals'), c.openingBalance);
router.get('/', authorize('finance.view'), c.list);
router.get('/:id', authorize('finance.view'), c.get);
router.get('/:id/ledger', authorize('finance.view'), c.ledger);
router.post('/', authorize('finance.journals'), c.create);
router.put('/:id', authorize('finance.journals'), c.update);

module.exports = router;
