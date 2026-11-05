const router = require('express').Router();
const { Op } = require('sequelize');

router.get('/', async (req, res, next) => {
  try {
    const { Notification } = req.db;
    const { id: userId, Role } = req.user;
    const roleName = Role?.name;
    const where = {
      [Op.or]: [
        { user_id: userId },
        ...(roleName ? [{ role_name: roleName }] : []),
      ],
    };
    const rows = await Notification.findAll({ where, order: [['createdAt', 'DESC']], limit: 50 });
    res.json(rows);
  } catch (err) { next(err); }
});

router.put('/read-all', async (req, res, next) => {
  try {
    const { Notification } = req.db;
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

router.put('/:id/read', async (req, res, next) => {
  try {
    const { Notification } = req.db;
    const notif = await Notification.findByPk(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Not found' });
    await notif.update({ is_read: true });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
