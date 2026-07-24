/**
 * Generic CRUD factory for simple models.
 * Usage: const c = require('./crudFactory')(Model, { searchFields, include })
 */
const { Op } = require('sequelize');

module.exports = (Model, options = {}) => {
  const { searchFields = ['name'], defaultWhere = {}, include = [], order = [['id', 'DESC']] } = options;

  return {
    list: async (req, res, next) => {
      try {
        const { search, page = 1, limit = 20, is_active, ...filters } = req.query;
        const where = { ...defaultWhere };

        if (req.user.branch_id && Model.rawAttributes.branch_id) where.branch_id = req.user.branch_id;
        if (req.user.Role?.name !== 'super_admin' && Model.rawAttributes.company_id) {
          // scope by company via branch — simplified
        }

        if (search && searchFields.length) {
          where[Op.or] = searchFields.map((f) => ({ [f]: { [Op.like]: `%${search}%` } }));
        }
        if (is_active !== undefined) where.is_active = is_active === 'true';
        Object.keys(filters).forEach((k) => {
          if (Model.rawAttributes[k] && filters[k] !== '') where[k] = filters[k];
        });

        const { count, rows } = await Model.findAndCountAll({
          where, include,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order,
        });
        res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
      } catch (err) { next(err); }
    },

    get: async (req, res, next) => {
      try {
        const record = await Model.findByPk(req.params.id, { include });
        if (!record) return res.status(404).json({ message: 'Not found' });
        res.json(record);
      } catch (err) { next(err); }
    },

    create: async (req, res, next) => {
      try {
        const data = { ...req.body };
        if (Model.rawAttributes.branch_id && req.user?.branch_id && !data.branch_id) {
          data.branch_id = req.user.branch_id;
        }
        if (Model.rawAttributes.company_id && !data.company_id) {
          data.company_id = req.user?.Branch?.company_id || req.body.company_id;
        }
        const record = await Model.create(data);
        res.status(201).json(record);
      } catch (err) { next(err); }
    },

    update: async (req, res, next) => {
      try {
        const record = await Model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ message: 'Not found' });
        await record.update(req.body);
        res.json(record);
      } catch (err) { next(err); }
    },

    remove: async (req, res, next) => {
      try {
        const record = await Model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ message: 'Not found' });
        if (record.is_system) return res.status(400).json({ message: 'Cannot delete system record' });
        if (typeof record.is_active !== 'undefined') {
          await record.update({ is_active: false });
          return res.json({ message: 'Deactivated' });
        }
        await record.destroy();
        res.json({ message: 'Deleted' });
      } catch (err) { next(err); }
    },
  };
};
