const router = require('express').Router();
const authorize = require('../middleware/authorize');
const c = require('../controllers/userController');

router.get('/', authorize('settings.users'), c.list);
router.get('/:id', authorize('settings.users'), c.get);
router.post('/', authorize('settings.users'), c.create);
router.put('/:id', authorize('settings.users'), c.update);
router.delete('/:id', authorize('settings.users'), c.remove);
router.put('/:id/permissions', authorize('settings.roles'), c.setPermissions);

module.exports = router;
