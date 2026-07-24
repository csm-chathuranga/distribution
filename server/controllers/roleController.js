const { Role, Permission, RolePermission } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, through: { attributes: [] } }],
      order: [['name', 'ASC']],
    });
    res.json(roles);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [{ model: Permission, through: { attributes: [] } }],
    });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.json(role);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { permissions, ...data } = req.body;
    const role = await Role.create(data);
    if (permissions?.length) await role.setPermissions(permissions);
    res.status(201).json(role);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (role.is_system) return res.status(400).json({ message: 'Cannot modify system role' });
    const { permissions, ...data } = req.body;
    await role.update(data);
    if (permissions) await role.setPermissions(permissions);
    res.json(role);
  } catch (err) { next(err); }
};

exports.setPermissions = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    await role.setPermissions(req.body.permission_ids || []);
    res.json({ message: 'Permissions updated' });
  } catch (err) { next(err); }
};

exports.allPermissions = async (req, res, next) => {
  try {
    const perms = await Permission.findAll({ order: [['module', 'ASC'], ['action', 'ASC']] });
    res.json(perms);
  } catch (err) { next(err); }
};
