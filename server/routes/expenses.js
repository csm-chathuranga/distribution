const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Expense, Account } = require('../models');
const crud = require('../controllers/crudFactory')(Expense, {
  include: [{ model: Account, attributes: ['id', 'code', 'name'] }],
  order: [['expense_date', 'DESC']],
});

router.get('/', authorize('finance.view'), crud.list);
router.get('/:id', authorize('finance.view'), crud.get);
router.post('/', authorize('finance.payments'), async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, created_by: req.user.id });
    res.status(201).json(expense);
  } catch (err) { next(err); }
});
router.put('/:id', authorize('finance.payments'), crud.update);

module.exports = router;
