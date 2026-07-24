const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Cheque, Receipt, Customer } = require('../models');
const crud = require('../controllers/crudFactory')(Cheque, {
  include: [{ model: Receipt, include: [{ model: Customer, attributes: ['id', 'name'] }] }],
  order: [['cheque_date', 'ASC']],
});

router.get('/', authorize('finance.receipts'), crud.list);
router.put('/:id/deposit', authorize('finance.receipts'), async (req, res, next) => {
  try {
    const cheque = await Cheque.findByPk(req.params.id);
    if (!cheque) return res.status(404).json({ message: 'Not found' });
    await cheque.update({ status: 'DEPOSITED', deposited_date: req.body.date || new Date() });
    res.json(cheque);
  } catch (err) { next(err); }
});
router.put('/:id/clear', authorize('finance.receipts'), async (req, res, next) => {
  try {
    const cheque = await Cheque.findByPk(req.params.id);
    if (!cheque) return res.status(404).json({ message: 'Not found' });
    await cheque.update({ status: 'CLEARED', cleared_date: req.body.date || new Date() });
    res.json(cheque);
  } catch (err) { next(err); }
});
router.put('/:id/bounce', authorize('finance.receipts'), async (req, res, next) => {
  try {
    const cheque = await Cheque.findByPk(req.params.id);
    if (!cheque) return res.status(404).json({ message: 'Not found' });
    await cheque.update({ status: 'BOUNCED', bounced_date: new Date(), bounce_reason: req.body.reason });
    res.json(cheque);
  } catch (err) { next(err); }
});

module.exports = router;
