const router = require('express').Router();
const authorize = require('../middleware/authorize');
const c = require('../controllers/invoiceController');
const { Invoice } = require('../models');
const notify = require('../notify');

router.get('/', authorize.any('sales.view_own', 'sales.view_all'), c.list);
router.get('/:id', authorize.any('sales.view_own', 'sales.view_all'), c.get);
router.post('/', authorize('sales.create'), c.create);
router.post('/:id/post', authorize('sales.approve'), c.post);

// PUT /api/invoices/:id/deliver — driver marks goods as physically delivered
router.put('/:id/deliver', authorize('sales.create'), async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!['POSTED', 'PARTIAL', 'OVERDUE'].includes(invoice.status)) {
      return res.status(422).json({ message: 'Invoice cannot be marked as delivered in its current status' });
    }
    if (invoice.delivered_at) {
      return res.status(422).json({ message: 'Invoice already marked as delivered' });
    }
    await invoice.update({ delivered_at: new Date(), delivered_by: req.user.id });
    res.json({ message: 'Marked as delivered', delivered_at: invoice.delivered_at });
    const deliveredBy = req.user.name || `User #${req.user.id}`;
    const deliveryBody = `${invoice.invoice_number} marked delivered by ${deliveredBy}`;
    notify({ roleName: 'admin',       type: 'INVOICE_DELIVERED', title: 'Invoice Delivered', body: deliveryBody, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'manager',     type: 'INVOICE_DELIVERED', title: 'Invoice Delivered', body: deliveryBody, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'super_admin', type: 'INVOICE_DELIVERED', title: 'Invoice Delivered', body: deliveryBody, link: `/invoices/${invoice.id}` });
    if (invoice.sales_rep_id && invoice.sales_rep_id !== req.user.id) {
      notify({ userId: invoice.sales_rep_id, type: 'INVOICE_DELIVERED', title: 'Invoice Delivered', body: `${invoice.invoice_number} has been delivered to the customer`, link: `/invoices/${invoice.id}` });
    }
  } catch (err) { next(err); }
});

module.exports = router;
