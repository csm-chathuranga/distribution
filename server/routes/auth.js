const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/authController');

router.post('/login',           c.login);
router.post('/refresh',         c.refresh);
router.get('/me',       auth,   c.me);
router.put('/change-password', auth, c.changePassword);

router.put('/fcm-token', auth, async (req, res, next) => {
  try {
    const { User } = req.db;
    const { token } = req.body;
    await User.update({ fcm_token: token || null }, { where: { id: req.user.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
