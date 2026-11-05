/**
 * Tenant-aware CRUD factory.
 * Pass a model-name string (key in req.db) so each request uses the correct tenant DB.
 * Legacy: passing a Model object directly still works (falls back to that object).
 */
const { Op } = require('sequelize');

module.exports = (modelName, options = {}) => {
  const {
    searchFields = ['name'],
    defaultWhere = {},
    includeFn    = null,   // (db) => [{ model: db.X, ... }]  — preferred for tenant isolation
    include      = [],     // static include array — legacy, models already resolved
    order        = [['id', 'DESC']],
  } = options;

  const isString = typeof modelName === 'string';

  function getModel(req) {
    return isString ? req.db[modelName] : modelName;
  }

  function getInclude(req) {
    return includeFn ? includeFn(req.db) : include;
  }

  return {
    list: async (req, res, next) => {
      try {
        const Model   = getModel(req);
        const inc     = getInclude(req);
        const { search, page = 1, limit = 20, is_active, ...filters } = req.query;
        const where = { ...defaultWhere };

        const hasBranchScope = req.user.branch_id && Model.rawAttributes?.branch_id;
        const isScopedRole   = !req.permissions?.has('sales.view_all') && !req.permissions?.has('settings.users');
        if (hasBranchScope && isScopedRole) where.branch_id = req.user.branch_id;

        if (search && searchFields.length) {
          where[Op.or] = searchFields.map((f) => ({ [f]: { [Op.like]: `%${search}%` } }));
        }
        if (is_active !== undefined) where.is_active = is_active === 'true';
        Object.keys(filters).forEach((k) => {
          if (Model.rawAttributes?.[k] && filters[k] !== '') where[k] = filters[k];
        });

        const { count, rows } = await Model.findAndCountAll({
          where, include: inc,
          limit:  parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order,
        });
        res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
      } catch (err) { next(err); }
    },

    get: async (req, res, next) => {
      try {
        const Model = getModel(req);
        const record = await Model.findByPk(req.params.id, { include: getInclude(req) });
        if (!record) return res.status(404).json({ message: 'Not found' });
        res.json(record);
      } catch (err) { next(err); }
    },

    create: async (req, res, next) => {
      try {
        const Model = getModel(req);
        const data = { ...req.body };
        if (Model.rawAttributes?.branch_id && req.user?.branch_id && !data.branch_id) {
          data.branch_id = req.user.branch_id;
        }
        if (Model.rawAttributes?.company_id && !data.company_id) {
          data.company_id = req.user?.Branch?.company_id || req.body.company_id;
        }
        const record = await Model.create(data);
        res.status(201).json(record);
      } catch (err) { next(err); }
    },

    update: async (req, res, next) => {
      try {
        const Model = getModel(req);
        const record = await Model.findByPk(req.params.id);
        if (!record) return res.status(404).json({ message: 'Not found' });
        await record.update(req.body);
        res.json(record);
      } catch (err) { next(err); }
    },

    remove: async (req, res, next) => {
      try {
        const Model = getModel(req);
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
