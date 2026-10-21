const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const { SalesOrder, SalesOrderLine, Customer, Product, Warehouse, FreeItemAllocation, FreeItemUsage, Stock, StockMovement, OrderReturn, sequelize: db } = require('../models');
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

router.get('/', authorize('sales.view_own'), async (req, res, next) => {
  try {
    const canViewAll = req.permissions?.has('sales.view_all') || req.permissions?.has('sales.approve');
    const { search, page = 1, limit = 20, date_from, date_to, status, sales_rep_id, ...filters } = req.query;

    const where = {};
    if (!canViewAll) where.created_by = req.user.id;
    if (filters.created_by) where.created_by = filters.created_by;
    if (sales_rep_id) where.sales_rep_id = sales_rep_id;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { order_number: { [Op.like]: `%${search}%` } },
        { '$Customer.name$': { [Op.like]: `%${search}%` } },
      ];
    }
    if (date_from || date_to) {
      where.order_date = {};
      if (date_from) where.order_date[Op.gte] = date_from;
      if (date_to)   where.order_date[Op.lte] = date_to;
    }

    const { count, rows } = await SalesOrder.findAndCountAll({
      where,
      include: [{ model: Customer, attributes: ['id', 'name', 'code'] }, { model: Warehouse, attributes: ['id', 'name'] }],
      order: [['order_date', 'DESC'], ['id', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      subQuery: false,
    });
    return res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});
router.get('/:id', authorize('sales.view_own'), async (req, res, next) => {
  try {
    const { User, Product, SalesOrderLine, Route } = require('../models');
    const order = await SalesOrder.findByPk(req.params.id, {
      include: [
        { model: Customer,       attributes: ['id', 'name', 'code', 'phone'] },
        { model: Warehouse,      attributes: ['id', 'name'] },
        { model: User, as: 'SalesRep', attributes: ['id', 'name'] },
        { model: Route,          attributes: ['id', 'name'], required: false },
        { model: SalesOrderLine, as: 'Lines',
          include: [{ model: Product, attributes: ['id', 'sku', 'name'] }] },
        { model: OrderReturn, as: 'Returns',
          include: [{ model: Product, attributes: ['id', 'sku', 'name'] }] },
      ],
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { next(err); }
});
router.post('/', authorize('sales.create'), async (req, res, next) => {
  try {
    const { lines, returns = [], ...data } = req.body;
    data.created_by = req.user.id;
    if (!data.company_id) data.company_id = req.user.Branch?.company_id ?? 1;
    if (!data.branch_id)  data.branch_id  = req.user.branch_id ?? 1;
    if (!data.order_number) data.order_number = await generateOrderNumber();
    // Auto-confirm — no manual approval step needed
    data.status      = 'CONFIRMED';
    data.approved_by = req.user.id;
    data.approved_at = new Date();

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

        // Deduct free quantities from the sales rep's allocation balance
        const salesRepId = data.sales_rep_id || req.user.id;
        for (const line of lines) {
          const freeQty = parseFloat(line.free_quantity || 0);
          if (freeQty <= 0) continue;

          const alloc = await FreeItemAllocation.findOne({
            where: { sales_rep_id: salesRepId, product_id: line.product_id },
            transaction: t,
            lock: true,
          });
          if (!alloc) continue; // no allocation — free qty recorded on line but no quota to deduct

          const remaining = parseFloat(alloc.allocated_quantity) - parseFloat(alloc.used_quantity);
          if (freeQty > remaining) {
            await t.rollback();
            return res.status(422).json({ message: `Free item quota exceeded for product ID ${line.product_id}. Only ${remaining} units remaining.` });
          }

          // Deduct from warehouse stock
          const stock = await Stock.findOne({
            where: { warehouse_id: order.warehouse_id, product_id: line.product_id },
            transaction: t, lock: true,
          });
          if (!stock || parseFloat(stock.quantity) < freeQty) {
            await t.rollback();
            return res.status(422).json({ message: `Insufficient stock for free items on product ID ${line.product_id}` });
          }
          const newQty = parseFloat(stock.quantity) - freeQty;
          await stock.update({ quantity: newQty }, { transaction: t });
          await StockMovement.create({
            warehouse_id: order.warehouse_id, product_id: line.product_id,
            movement_type: 'OUT', source_type: 'FREE_DIST', source_id: alloc.id,
            quantity: freeQty, balance_after: newQty, unit_cost: 0,
            created_by: req.user.id,
          }, { transaction: t });

          // Record usage and update allocation balance
          await FreeItemUsage.create({
            allocation_id: alloc.id,
            customer_id: data.customer_id,
            quantity: freeQty,
            notes: `Sales order ${order.order_number}`,
            given_by: req.user.id,
          }, { transaction: t });
          await alloc.increment('used_quantity', { by: freeQty, transaction: t });
        }

        // Reserve billed quantities so free stock drops immediately on order creation
        for (const line of lines) {
          const billedQty = parseFloat(line.quantity || 0);
          if (billedQty <= 0) continue;
          const stock = await Stock.findOne({
            where: { warehouse_id: order.warehouse_id, product_id: line.product_id },
            transaction: t, lock: true,
          });
          if (!stock) continue;
          const freeStock = parseFloat(stock.quantity) - parseFloat(stock.reserved_quantity);
          if (freeStock < billedQty) {
            await t.rollback();
            return res.status(422).json({
              message: `Insufficient free stock for product ID ${line.product_id}. Available: ${freeStock.toFixed(2)}, Required: ${billedQty}`,
            });
          }
          await stock.increment('reserved_quantity', { by: billedQty, transaction: t });
        }
      }
      // Save return lines
      if (returns.length) {
        await OrderReturn.bulkCreate(
          returns.map(r => ({ ...r, order_id: order.id })),
          { transaction: t }
        );
      }

      // Update customer's last known GPS location
      if (data.customer_id && data.latitude && data.longitude) {
        Customer.update(
          { last_latitude: data.latitude, last_longitude: data.longitude },
          { where: { id: data.customer_id } }
        ).catch(() => {});
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
    const { Invoice, InvoiceLine, SalesOrderLine, CustomerReturn, CustomerReturnLine, User } = require('../models');
    const { Op } = require('sequelize');

    const order = await SalesOrder.findByPk(req.params.id, {
      include: [
        { model: SalesOrderLine, as: 'Lines' },
        { model: OrderReturn, as: 'Returns', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
      ],
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

    // Calculate return deductions (DEDUCT action only)
    const returns = order.Returns || [];
    const returnDeduction = returns
      .filter(r => r.action === 'DEDUCT')
      .reduce((s, r) => s + parseFloat(r.quantity) * parseFloat(r.unit_price), 0);

    // Generate return number helper
    async function generateReturnNumber(t) {
      const dp2 = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
      const like2 = `RN-${dp2}-%`;
      const last2 = await CustomerReturn.findOne({ where: { return_number: { [Op.like]: like2 } }, order: [['id', 'DESC']], transaction: t });
      const seq2  = last2 ? parseInt(last2.return_number.split('-').pop()) + 1 : 1;
      return `RN-${dp2}-${String(seq2).padStart(3, '0')}`;
    }

    const invoiceTotal = Math.max(0, parseFloat(order.total_amount) - returnDeduction);

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
        status:         'POSTED',
        subtotal:       invoiceTotal,
        total_amount:   invoiceTotal,
        balance_due:    invoiceTotal,
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

      // Create CustomerReturn records for each requested return + restock warehouse
      for (const r of returns) {
        const retNumber = await generateReturnNumber(t);
        const cr = await CustomerReturn.create({
          return_number: retNumber,
          company_id:    order.company_id,
          branch_id:     order.branch_id,
          warehouse_id:  order.warehouse_id,
          customer_id:   order.customer_id,
          sales_rep_id:  order.sales_rep_id,
          invoice_id:    invoice.id,
          return_date:   today.toISOString().slice(0,10),
          status:        'CONFIRMED',
          notes:         `Auto-created from order ${order.order_number}. Action: ${r.action}`,
          created_by:    req.user.id,
          confirmed_by:  req.user.id,
          confirmed_at:  new Date(),
        }, { transaction: t });
        await CustomerReturnLine.create({
          return_id:  cr.id,
          product_id: r.product_id,
          quantity:   r.quantity,
          unit_price: r.unit_price,
          reason:     r.reason,
        }, { transaction: t });

        // Restock warehouse — damaged/expired go to separate counters, others back to sellable
        const stock = await Stock.findOne({
          where: { warehouse_id: order.warehouse_id, product_id: r.product_id },
          transaction: t, lock: true,
        });
        if (stock) {
          const qty = parseFloat(r.quantity);
          let updateFields = {};
          let newQty;
          if (r.reason === 'DAMAGED') {
            newQty = parseFloat(stock.damaged_quantity) + qty;
            updateFields = { damaged_quantity: newQty };
          } else if (r.reason === 'EXPIRED') {
            newQty = parseFloat(stock.expired_quantity) + qty;
            updateFields = { expired_quantity: newQty };
          } else {
            newQty = parseFloat(stock.quantity) + qty;
            updateFields = { quantity: newQty };
          }
          await stock.update(updateFields, { transaction: t });
          await StockMovement.create({
            warehouse_id:  order.warehouse_id,
            product_id:    r.product_id,
            movement_type: 'IN',
            source_type:   'CUSTOMER_RETURN',
            source_id:     cr.id,
            quantity:      r.quantity,
            balance_after: newQty,
            created_by:    req.user.id,
          }, { transaction: t });
        }
      }

      // Release reservations and deduct actual stock for each billed line
      for (const l of order.Lines) {
        const billedQty = parseFloat(l.quantity || 0);
        if (billedQty <= 0) continue;
        const stock = await Stock.findOne({
          where: { warehouse_id: order.warehouse_id, product_id: l.product_id },
          transaction: t, lock: true,
        });
        if (!stock) continue;
        const newQty      = parseFloat(stock.quantity) - billedQty;
        const newReserved = Math.max(0, parseFloat(stock.reserved_quantity) - billedQty);
        await stock.update({ quantity: newQty, reserved_quantity: newReserved }, { transaction: t });
        await StockMovement.create({
          warehouse_id: order.warehouse_id, product_id: l.product_id,
          movement_type: 'OUT', source_type: 'INVOICE', source_id: invoice.id,
          quantity: billedQty, balance_after: newQty, unit_cost: 0,
          created_by: req.user.id,
        }, { transaction: t });
      }

      await order.update({ status: 'INVOICED' }, { transaction: t });
      // Increment customer outstanding_balance for the invoiced amount
      await Customer.increment('outstanding_balance', { by: invoiceTotal, where: { id: order.customer_id }, transaction: t });
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
