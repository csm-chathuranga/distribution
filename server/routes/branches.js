const router = require('express').Router();
const authorize = require('../middleware/authorize');
const crud = require('../controllers/crudFactory')('Branch', {
  includeFn: (db) => [{ model: db.Company, attributes: ['id', 'name'] }],
});

router.get('/company', async (req, res, next) => {
  try {
    const { Company } = req.db;
    const companyId = req.user.Branch?.company_id ?? req.user.company_id;
    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) { next(err); }
});

router.put('/company', authorize('settings.company'), async (req, res, next) => {
  try {
    const { Company } = req.db;
    const companyId = req.user.Branch?.company_id ?? req.user.company_id;
    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const { id, ...data } = req.body;
    await company.update(data);
    res.json(company);
  } catch (err) { next(err); }
});

router.get('/',    authorize('settings.company'), crud.list);
router.get('/:id', authorize('settings.company'), crud.get);
router.post('/',   authorize('settings.company'), crud.create);
router.put('/:id', authorize('settings.company'), crud.update);

module.exports = router;
