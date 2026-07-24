const router = require('express').Router();
const authorize = require('../middleware/authorize');
const c = require('../controllers/roleController');

router.get('/permissions', authorize('settings.roles'), c.allPermissions);
router.get('/', authorize('settings.roles'), c.list);
router.get('/:id', authorize('settings.roles'), c.get);
router.post('/', authorize('settings.roles'), c.create);
router.put('/:id', authorize('settings.roles'), c.update);
router.put('/:id/permissions', authorize('settings.roles'), c.setPermissions);

module.exports = router;
