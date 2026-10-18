const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Warehouse, Branch, Stock, Product, User, Role, WarehouseUser } = require('../models');
const crud = require('../controllers/crudFactory')(Warehouse, {
  include: [{ model: Branch, attributes: ['id', 'name'] }],
});

const SCOPED_ROLES = ['sales_rep', 'driver'];

const isScoped = (req) => SCOPED_ROLES.includes(req.user?.Role?.name);

// GET /warehouses — scoped roles see only their assigned warehouse
router.get('/', authorize.any('inventory.view', 'sales.view_own', 'sales.create'), async (req, res, next) => {
  try {
    if (isScoped(req)) {
      const rows = await Warehouse.findAll({
        include: [
          { model: Branch, attributes: ['id', 'name'] },
          { model: User, as: 'AssignedUsers', where: { id: req.user.id }, attributes: [], through: { attributes: [] } },
        ],
      });
      return res.json({ data: rows });
    }
    return crud.list(req, res, next);
  } catch (err) { next(err); }
});

router.get('/:id', authorize.any('inventory.view', 'sales.view_own', 'sales.create'), crud.get);
router.post('/', authorize('inventory.create'), crud.create);
router.put('/:id', authorize('inventory.create'), crud.update);

router.get('/:id/stock', authorize('inventory.view'), async (req, res, next) => {
  try {
    const stock = await Stock.findAll({
      where: { warehouse_id: req.params.id },
      include: [{ model: Product, attributes: ['id', 'sku', 'name', 'reorder_point'] }],
      order: [[Product, 'name', 'ASC']],
    });
    res.json(stock);
  } catch (err) { next(err); }
});

// GET /warehouses/:id/users — list assigned sales reps & drivers
router.get('/:id/users', authorize('inventory.view'), async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'AssignedUsers',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] },
        include: [{ model: Role, attributes: ['id', 'name', 'display_name'] }],
      }],
    });
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
    res.json(warehouse.AssignedUsers);
  } catch (err) { next(err); }
});

// POST /warehouses/:id/users — assign a user (sales_rep or driver only, one warehouse per user)
router.post('/:id/users', authorize('inventory.create'), async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: 'user_id is required' });

    const user = await User.findByPk(user_id, { include: [{ model: Role }] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!SCOPED_ROLES.includes(user.Role?.name)) {
      return res.status(422).json({ message: 'Only sales reps and drivers can be assigned to a warehouse' });
    }

    // Enforce one warehouse per user — remove existing assignment first
    await WarehouseUser.destroy({ where: { user_id } });

    await WarehouseUser.create({ warehouse_id: req.params.id, user_id });
    res.status(201).json({ message: 'User assigned to warehouse' });
  } catch (err) { next(err); }
});

// DELETE /warehouses/:id — delete warehouse (blocked if it has stock)
router.delete('/:id', authorize('inventory.create'), async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
    const stockCount = await Stock.count({ where: { warehouse_id: req.params.id } });
    if (stockCount > 0) {
      return res.status(422).json({ message: 'Cannot delete warehouse with existing stock. Transfer or clear stock first.' });
    }
    await WarehouseUser.destroy({ where: { warehouse_id: req.params.id } });
    await warehouse.destroy();
    res.json({ message: 'Warehouse deleted' });
  } catch (err) { next(err); }
});

// DELETE /warehouses/:id/users/:userId — remove assignment
router.delete('/:id/users/:userId', authorize('inventory.create'), async (req, res, next) => {
  try {
    const deleted = await WarehouseUser.destroy({
      where: { warehouse_id: req.params.id, user_id: req.params.userId },
    });
    if (!deleted) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment removed' });
  } catch (err) { next(err); }
});

module.exports = router;
