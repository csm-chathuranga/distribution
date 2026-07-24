const router = require('express').Router();
const { Notification } = require('../models');
const { Op } = require('sequelize');

// GET /api/notifications — latest 50 for the current user (direct + role)
router.get('/', async (req, res, next) => {
  try {
    const { id: userId, Role } = req.user;
    const roleName = Role?.name;

    const where = {
      [Op.or]: [
        { user_id: userId },
        ...(roleName ? [{ role_name: roleName }] : []),
      ],
    };

    const rows = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all — must be before /:id/read to avoid param capture
router.put('/read-all', async (req, res, next) => {
  try {
    const { id: userId, Role } = req.user;
    const roleName = Role?.name;
    await Notification.update({ is_read: true }, {
      where: {
        is_read: false,
        [Op.or]: [
          { user_id: userId },
          ...(roleName ? [{ role_name: roleName }] : []),
        ],
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const notif = await Notification.findByPk(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Not found' });
    await notif.update({ is_read: true });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
