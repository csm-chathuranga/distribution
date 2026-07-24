const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Branch, Company } = require('../models');
const crud = require('../controllers/crudFactory')(Branch, {
  include: [{ model: Company, attributes: ['id', 'name'] }],
});

// Company settings (before /:id to avoid collision)
router.get('/company', authorize('settings.company'), async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.user.company_id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) { next(err); }
});
router.put('/company', authorize('settings.company'), async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.user.company_id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const { id, ...data } = req.body;
    await company.update(data);
    res.json(company);
  } catch (err) { next(err); }
});

router.get('/', authorize('settings.company'), crud.list);
router.get('/:id', authorize('settings.company'), crud.get);
router.post('/', authorize('settings.company'), crud.create);
router.put('/:id', authorize('settings.company'), crud.update);

module.exports = router;
