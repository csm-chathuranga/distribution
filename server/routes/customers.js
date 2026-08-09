const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { Customer, Route, Branch, Account, Invoice, Receipt, SalesOrder, sequelize } = require('../models');
const { Op } = require('sequelize');
const crud = require('../controllers/crudFactory')(Customer, {
  searchFields: ['name', 'code', 'phone'],
  include: [
    { model: Route, attributes: ['id', 'name'] },
    { model: Branch, attributes: ['id', 'name'] },
    { model: Account, attributes: ['id', 'code', 'name'] },
  ],
  order: [['name', 'ASC']],
});

router.get('/:id/profile', authorize.any('sales.view_own', 'sales.view_all'), async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [
        { model: Route, attributes: ['id', 'name'] },
        { model: Branch, attributes: ['id', 'name'] },
        { model: Account, attributes: ['id', 'code', 'name'] },
      ],
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const [invoiceStats] = await sequelize.query(`
      SELECT
        COUNT(*)                                AS total_count,
        COALESCE(SUM(total_amount), 0)          AS total_invoiced,
        COALESCE(SUM(paid_amount),  0)          AS total_paid,
        COALESCE(SUM(balance_due),  0)          AS total_outstanding,
        SUM(CASE WHEN status='OVERDUE'  THEN 1 ELSE 0 END) AS overdue_count,
        SUM(CASE WHEN status='PAID'     THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN status='PENDING'  THEN 1 ELSE 0 END) AS pending_count
      FROM invoices WHERE customer_id = :cid
    `, { replacements: { cid: req.params.id }, type: sequelize.QueryTypes.SELECT });

    const recentInvoices = await Invoice.findAll({
      where: { customer_id: req.params.id },
      order: [['invoice_date', 'DESC']],
      limit: 15,
      attributes: ['id', 'invoice_number', 'invoice_date', 'due_date', 'status', 'total_amount', 'paid_amount', 'balance_due'],
    });

    const recentReceipts = await Receipt.findAll({
      where: { customer_id: req.params.id },
      order: [['receipt_date', 'DESC']],
      limit: 15,
      attributes: ['id', 'receipt_number', 'receipt_date', 'payment_method', 'amount', 'status'],
    });

    const recentOrders = await SalesOrder.findAll({
      where: { customer_id: req.params.id },
      order: [['order_date', 'DESC']],
      limit: 15,
      attributes: ['id', 'order_number', 'order_date', 'status', 'total_amount'],
    });

    res.json({
      customer,
      stats: invoiceStats,
      recentInvoices,
      recentReceipts,
      recentOrders,
    });
  } catch (err) { next(err); }
});

router.get('/', authorize.any('sales.view_own', 'sales.view_all'), crud.list);
router.get('/:id', authorize.any('sales.view_own', 'sales.view_all'), crud.get);
router.post('/', authorize('sales.create'), crud.create);
router.put('/:id', authorize('sales.create'), crud.update);

module.exports = router;
