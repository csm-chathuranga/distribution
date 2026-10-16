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
router.put('/:id/deliver', authorize.any('sales.create', 'sales.view_own'), async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!['POSTED', 'PARTIAL', 'OVERDUE'].includes(invoice.status)) {
      return res.status(422).json({ message: 'Invoice cannot be marked as delivered in its current status' });
    }
    if (invoice.delivered_at) {
      return res.status(422).json({ message: 'Invoice already marked as delivered' });
    }
    await invoice.update({ status: 'DELIVERED', delivered_at: new Date(), delivered_by: req.user.id });
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

// PUT /api/invoices/:id/cancel — driver cancels delivery with a reason
router.put('/:id/cancel', authorize.any('sales.create', 'sales.view_own'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: 'Cancellation reason is required' });
    const { Customer } = require('../models');
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: Customer, attributes: ['name'] }],
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!['POSTED', 'PARTIAL', 'OVERDUE'].includes(invoice.status)) {
      return res.status(422).json({ message: 'Invoice cannot be cancelled in its current status' });
    }
    await invoice.update({ status: 'CANCELLED', notes: reason.trim() });
    res.json({ message: 'Invoice cancelled' });

    const cancelledBy = req.user.name || `User #${req.user.id}`;
    const customerName = invoice.Customer?.name || `Invoice #${invoice.invoice_number}`;
    const body = `${invoice.invoice_number} for ${customerName} cancelled by ${cancelledBy}. Reason: ${reason.trim()}`;
    const link = `/invoices/${invoice.id}`;
    if (invoice.sales_rep_id && invoice.sales_rep_id !== req.user.id) {
      notify({ userId: invoice.sales_rep_id, type: 'INVOICE_CANCELLED', title: 'Invoice Cancelled', body, link });
    }
    notify({ roleName: 'admin',       type: 'INVOICE_CANCELLED', title: 'Invoice Cancelled', body, link });
    notify({ roleName: 'manager',     type: 'INVOICE_CANCELLED', title: 'Invoice Cancelled', body, link });
    notify({ roleName: 'super_admin', type: 'INVOICE_CANCELLED', title: 'Invoice Cancelled', body, link });
  } catch (err) { next(err); }
});

module.exports = router;
