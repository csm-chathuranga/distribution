const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/authController');

router.post('/login', c.login);
router.post('/refresh', c.refresh);
router.get('/me', auth, c.me);
router.put('/change-password', auth, c.changePassword);

// Store FCM push token for the authenticated user
router.put('/fcm-token', auth, async (req, res, next) => {
  try {
    const { token } = req.body;
    const { User } = require('../models');
    await User.update({ fcm_token: token || null }, { where: { id: req.user.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
