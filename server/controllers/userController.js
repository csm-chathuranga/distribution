const { Op } = require('sequelize');

exports.list = async (req, res, next) => {
  try {
    const { User, Role, Branch } = req.db;
    const { search, role_id, branch_id, is_active, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search)     where.name      = { [Op.like]: `%${search}%` };
    if (role_id)    where.role_id   = role_id;
    if (branch_id)  where.branch_id = branch_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [
        { model: Role,   attributes: ['id', 'name', 'display_name'] },
        { model: Branch, attributes: ['id', 'name', 'code'] },
      ],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order:  [['name', 'ASC']],
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const { User, Role, Branch } = req.db;
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role,   attributes: ['id', 'name', 'display_name'] },
        { model: Branch, attributes: ['id', 'name', 'code'] },
      ],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { User, Role, Branch } = req.db;
    const user = await User.create({ ...req.body, password_hash: req.body.password });
    const result = await User.findByPk(user.id, {
      include: [
        { model: Role,   attributes: ['id', 'name', 'display_name'] },
        { model: Branch, attributes: ['id', 'name', 'code'] },
      ],
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { User, Role, Branch } = req.db;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...data } = req.body;
    if (password) data.password_hash = password;
    await user.update(data);
    res.json(await User.findByPk(user.id, {
      include: [
        { model: Role,   attributes: ['id', 'name', 'display_name'] },
        { model: Branch, attributes: ['id', 'name', 'code'] },
      ],
    }));
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { User } = req.db;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    await user.update({ is_active: false });
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
};

exports.setPermissions = async (req, res, next) => {
  try {
    const { UserPermission } = req.db;
    const { permissions } = req.body;
    await UserPermission.destroy({ where: { user_id: req.params.id } });
    if (permissions?.length) {
      await UserPermission.bulkCreate(
        permissions.map((p) => ({ user_id: req.params.id, ...p }))
      );
    }
    res.json({ message: 'Permissions updated' });
  } catch (err) { next(err); }
};
