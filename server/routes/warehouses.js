const router = require('express').Router();
const authorize = require('../middleware/authorize');
const crud = require('../controllers/crudFactory')('Warehouse', {
  includeFn: (db) => [{ model: db.Branch, attributes: ['id', 'name'] }],
});

const SCOPED_ROLES = ['sales_rep', 'driver'];
const isScoped = (req) => SCOPED_ROLES.includes(req.user?.Role?.name);

router.get('/', authorize.any('inventory.view', 'sales.view_own', 'sales.create'), async (req, res, next) => {
  try {
    const { Warehouse, Branch, User } = req.db;
    if (isScoped(req)) {
      const rows = await Warehouse.findAll({
        where: { is_active: true },
        include: [
          { model: Branch, attributes: ['id', 'name'] },
          { model: User, as: 'AssignedUsers', where: { id: req.user.id }, attributes: [], through: { attributes: [] } },
        ],
      });
      return res.json({ data: rows });
    }
    if (req.query.all !== '1') {
      const rows = await Warehouse.findAll({
        where: { is_active: true },
        include: [{ model: Branch, attributes: ['id', 'name'] }],
        order: [['name', 'ASC']],
      });
      return res.json({ data: rows });
    }
    return crud.list(req, res, next);
  } catch (err) { next(err); }
});

router.get('/:id', authorize.any('inventory.view', 'sales.view_own', 'sales.create'), crud.get);
router.post('/',   authorize('inventory.create'), crud.create);
router.put('/:id', authorize('inventory.create'), crud.update);

router.patch('/:id/toggle-active', authorize('inventory.create'), async (req, res, next) => {
  try {
    const { Warehouse } = req.db;
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
    await warehouse.update({ is_active: !warehouse.is_active });
    res.json(warehouse);
  } catch (err) { next(err); }
});

router.get('/:id/stock', authorize('inventory.view'), async (req, res, next) => {
  try {
    const { Stock, Product } = req.db;
    const stock = await Stock.findAll({
      where: { warehouse_id: req.params.id },
      include: [{ model: Product, attributes: ['id', 'sku', 'name', 'reorder_point'] }],
      order: [[Product, 'name', 'ASC']],
    });
    res.json(stock);
  } catch (err) { next(err); }
});

router.get('/:id/users', authorize('inventory.view'), async (req, res, next) => {
  try {
    const { Warehouse, User, Role } = req.db;
    const warehouse = await Warehouse.findByPk(req.params.id, {
      include: [{
        model: User, as: 'AssignedUsers', attributes: ['id', 'name', 'email'],
        through: { attributes: [] },
        include: [{ model: Role, attributes: ['id', 'name', 'display_name'] }],
      }],
    });
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
    res.json(warehouse.AssignedUsers);
  } catch (err) { next(err); }
});

router.post('/:id/users', authorize('inventory.create'), async (req, res, next) => {
  try {
    const { User, Role, WarehouseUser } = req.db;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: 'user_id is required' });
    const user = await User.findByPk(user_id, { include: [{ model: Role }] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!SCOPED_ROLES.includes(user.Role?.name)) {
      return res.status(422).json({ message: 'Only sales reps and drivers can be assigned to a warehouse' });
    }
    await WarehouseUser.destroy({ where: { user_id } });
    await WarehouseUser.create({ warehouse_id: req.params.id, user_id });
    res.status(201).json({ message: 'User assigned to warehouse' });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('inventory.create'), async (req, res, next) => {
  try {
    const { Warehouse, Stock, WarehouseUser } = req.db;
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

router.delete('/:id/users/:userId', authorize('inventory.create'), async (req, res, next) => {
  try {
    const { WarehouseUser } = req.db;
    const deleted = await WarehouseUser.destroy({
      where: { warehouse_id: req.params.id, user_id: req.params.userId },
    });
    if (!deleted) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment removed' });
  } catch (err) { next(err); }
});

module.exports = router;
