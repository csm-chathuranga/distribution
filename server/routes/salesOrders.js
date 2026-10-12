const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { SalesOrder, SalesOrderLine, Customer, Product, Warehouse, sequelize: db } = require('../models');
const notify = require('../notify');
const crud = require('../controllers/crudFactory')(SalesOrder, {
  include: [{ model: Customer, attributes: ['id', 'name', 'code'] }, { model: Warehouse, attributes: ['id', 'name'] }],
  order: [['order_date', 'DESC'], ['id', 'DESC']],
});

async function generateOrderNumber() {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const like = `SO-${datePart}-%`;
  const last = await SalesOrder.findOne({ where: { order_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.order_number.split('-').pop()) + 1 : 1;
  return `SO-${datePart}-${String(seq).padStart(3, '0')}`;
}

router.get('/', authorize('sales.view_own'), crud.list);
router.get('/:id', authorize('sales.view_own'), async (req, res, next) => {
  try {
    const { User, Product, SalesOrderLine } = require('../models');
    const order = await SalesOrder.findByPk(req.params.id, {
      include: [
        { model: Customer,       attributes: ['id', 'name', 'code', 'phone'] },
        { model: Warehouse,      attributes: ['id', 'name'] },
        { model: User, as: 'SalesRep', attributes: ['id', 'name'] },
        { model: SalesOrderLine, as: 'Lines',
          include: [{ model: Product, attributes: ['id', 'sku', 'name'] }] },
      ],
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { next(err); }
});
router.post('/', authorize('sales.create'), async (req, res, next) => {
  try {
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    if (!data.company_id) data.company_id = req.user.Branch?.company_id ?? 1;
    if (!data.branch_id)  data.branch_id  = req.user.branch_id ?? 1;
    if (!data.order_number) data.order_number = await generateOrderNumber();

    // Credit limit check — block order if customer is over their credit limit
    if (data.customer_id) {
      const customer = await Customer.findByPk(data.customer_id, { attributes: ['credit_limit', 'outstanding_balance', 'name'] });
      if (customer && parseFloat(customer.credit_limit) > 0) {
        if (parseFloat(customer.outstanding_balance) >= parseFloat(customer.credit_limit)) {
          return res.status(422).json({
            message: `Credit limit exceeded for ${customer.name}. Outstanding: ${parseFloat(customer.outstanding_balance).toFixed(2)}, Limit: ${parseFloat(customer.credit_limit).toFixed(2)}`,
            code: 'CREDIT_LIMIT_EXCEEDED',
          });
        }
      }
    }

    const t = await db.transaction();
    try {
      const order = await SalesOrder.create(data, { transaction: t });
      if (lines?.length) {
        await SalesOrderLine.bulkCreate(lines.map(l => ({ ...l, order_id: order.id })), { transaction: t });
      }
      await t.commit();
      res.status(201).json(order);
      const orderBody = `${req.user.name} created order ${order.order_number}`;
      notify({ roleName: 'admin',       type: 'NEW_ORDER', title: 'New Sales Order', body: orderBody, link: `/sales-orders/${order.id}` });
      notify({ roleName: 'manager',     type: 'NEW_ORDER', title: 'New Sales Order', body: orderBody, link: `/sales-orders/${order.id}` });
      notify({ roleName: 'super_admin', type: 'NEW_ORDER', title: 'New Sales Order', body: orderBody, link: `/sales-orders/${order.id}` });
    } catch (e) { await t.rollback(); throw e; }

  } catch (err) { next(err); }
});
// Convert confirmed order → draft invoice
router.post('/:id/invoice', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { Invoice, InvoiceLine, SalesOrderLine, User } = require('../models');
    const { Op } = require('sequelize');

    const order = await SalesOrder.findByPk(req.params.id, {
      include: [{ model: SalesOrderLine, as: 'Lines' }],
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'CONFIRMED') return res.status(422).json({ message: 'Only confirmed orders can be invoiced' });

    // Check if invoice already created for this order
    const existing = await Invoice.findOne({ where: { order_id: order.id } });
    if (existing) return res.status(422).json({ message: 'Invoice already exists for this order', invoice_id: existing.id });

    // Generate invoice number
    const today = new Date();
    const dp = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const like = `INV-${dp}-%`;
    const last = await Invoice.findOne({ where: { invoice_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
    const seq  = last ? parseInt(last.invoice_number.split('-').pop()) + 1 : 1;
    const invoiceNumber = `INV-${dp}-${String(seq).padStart(3,'0')}`;

    // Customer credit days → due date
    const customer = await Customer.findByPk(order.customer_id, { attributes: ['credit_days'] });
    const dueDate  = customer?.credit_days > 0
      ? new Date(today.getTime() + customer.credit_days * 86400000).toISOString().slice(0,10)
      : null;

    const t = await db.transaction();
    try {
      const invoice = await Invoice.create({
        company_id:     order.company_id,
        branch_id:      order.branch_id,
        warehouse_id:   order.warehouse_id,
        customer_id:    order.customer_id,
        sales_rep_id:   order.sales_rep_id,
        order_id:       order.id,
        invoice_number: invoiceNumber,
        invoice_date:   today.toISOString().slice(0,10),
        due_date:       dueDate,
        invoice_type:   'TAX_INVOICE',
        status:         'DRAFT',
        subtotal:       order.total_amount,
        total_amount:   order.total_amount,
        balance_due:    order.total_amount,
        notes:          order.notes,
        created_by:     req.user.id,
      }, { transaction: t });

      const lines = (order.Lines || []).map(l => ({
        invoice_id:    invoice.id,
        product_id:    l.product_id,
        order_line_id: l.id,
        quantity:      l.quantity,
        unit_price:    l.unit_price,
        discount_rate: l.discount_rate || 0,
        vat_rate:      0,
        free_quantity:  l.free_quantity || 0,
        line_subtotal: l.line_total,
        vat_amount:    0,
        line_total:    l.line_total,
      }));
      if (lines.length) await InvoiceLine.bulkCreate(lines, { transaction: t });

      await order.update({ status: 'INVOICED' }, { transaction: t });
      await t.commit();
      res.status(201).json({ invoice_id: invoice.id, invoice_number: invoiceNumber });
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
});

router.put('/:id', authorize('sales.approve'), crud.update);
router.put('/:id/confirm', authorize('sales.approve'), async (req, res, next) => {
  try {
    const order = await SalesOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await order.update({ status: 'CONFIRMED', approved_by: req.user.id, approved_at: new Date() });
    res.json(order);
    if (order.created_by) {
      notify({
        userId: order.created_by,
        type: 'ORDER_APPROVED',
        title: 'Order Approved',
        body: `Your order ${order.order_number} has been approved`,
        link: `/sales-orders/${order.id}`,
      });
    }
  } catch (err) { next(err); }
});

module.exports = router;
