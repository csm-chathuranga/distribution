const router = require('express').Router();
const authorize = require('../middleware/authorize');
const c = require('../controllers/userController');
const { User, Role, Warehouse } = require('../models');

// GET /api/users/for-select?role=driver — lightweight user list for dropdowns (no settings.users needed)
router.get('/for-select', authorize('sales.create'), async (req, res, next) => {
  try {
    const where = { is_active: true };
    const include = [
      { model: Role, attributes: ['id', 'name', 'display_name'] },
      { model: Warehouse, as: 'AssignedWarehouses', attributes: ['id', 'name'], through: { attributes: [] } },
    ];
    if (req.query.role) {
      const role = await Role.findOne({ where: { name: req.query.role } });
      if (role) where.role_id = role.id;
    }
    const users = await User.findAll({
      where, include,
      attributes: ['id', 'name', 'email', 'role_id'],
      order: [['name', 'ASC']],
    });
    res.json(users);
  } catch (err) { next(err); }
});

router.get('/', authorize('settings.users'), c.list);
router.get('/:id', authorize('settings.users'), c.get);
router.post('/', authorize('settings.users'), c.create);
router.put('/:id', authorize('settings.users'), c.update);
router.delete('/:id', authorize('settings.users'), c.remove);
router.put('/:id/permissions', authorize('settings.roles'), c.setPermissions);

module.exports = router;
