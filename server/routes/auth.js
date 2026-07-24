const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/authController');

router.post('/login', c.login);
router.post('/refresh', c.refresh);
router.get('/me', auth, c.me);
router.put('/change-password', auth, c.changePassword);

module.exports = router;
