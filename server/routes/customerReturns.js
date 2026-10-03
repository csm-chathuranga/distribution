const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const {
  CustomerReturn, CustomerReturnLine,
  Customer, Product, Invoice, InvoiceLine, Warehouse,
  Stock, StockMovement, sequelize,
} = require('../models');
const notify = require('../notify');

const include = [
  { model: Customer,  attributes: ['id', 'name', 'code'] },
  { model: Warehouse, attributes: ['id', 'name'] },
  { model: Invoice, as: 'OriginalInvoice', attributes: ['id', 'invoice_number'] },
  { model: Invoice, as: 'CreditNote',      attributes: ['id', 'invoice_number'] },
  { model: CustomerReturnLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
];

async function generateReturnNumber() {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const like = `RN-${datePart}-%`;
  const last = await CustomerReturn.findOne({ where: { return_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.return_number.split('-').pop()) + 1 : 1;
  return `RN-${datePart}-${String(seq).padStart(3, '0')}`;
}

// List
router.get('/', authorize.any('sales.view_own', 'sales.view_all'), async (req, res, next) => {
  try {
    const { status, customer_id, from, to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)      where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (from || to) {
      where.return_date = {};
      if (from) where.return_date[Op.gte] = from;
      if (to)   where.return_date[Op.lte] = to;
    }
    const { count, rows } = await CustomerReturn.findAndCountAll({
      where,
      include: [{ model: Customer, attributes: ['id', 'name', 'code'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['return_date', 'DESC'], ['id', 'DESC']],
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// Get single
router.get('/:id', authorize.any('sales.view_own', 'sales.view_all'), async (req, res, next) => {
  try {
    const ret = await CustomerReturn.findByPk(req.params.id, { include });
    if (!ret) return res.status(404).json({ message: 'Return note not found' });
    res.json(ret);
  } catch (err) { next(err); }
});

// Create
router.post('/', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...data } = req.body;
    data.created_by  = req.user.id;
    if (!data.branch_id)  data.branch_id  = req.user.branch_id;
    if (!data.company_id) data.company_id = req.user.Branch?.company_id ?? 1;
    if (!data.return_number) data.return_number = await generateReturnNumber();

    const ret = await CustomerReturn.create(data, { transaction: t });
    if (lines?.length) {
      await CustomerReturnLine.bulkCreate(
        lines.map(l => ({ ...l, return_id: ret.id })),
        { transaction: t }
      );
    }
    await t.commit();
    res.status(201).json(await CustomerReturn.findByPk(ret.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
});

// Confirm — restocks the warehouse and auto-creates a credit note
router.put('/:id/confirm', authorize('sales.approve'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const ret = await CustomerReturn.findByPk(req.params.id, {
      include: [{ model: CustomerReturnLine, as: 'Lines' }],
      transaction: t,
    });
    if (!ret) return res.status(404).json({ message: 'Return note not found' });
    if (ret.status !== 'DRAFT') return res.status(400).json({ message: `Return already ${ret.status.toLowerCase()}` });

    // 1. Restock warehouse
    for (const line of ret.Lines) {
      const stock = await Stock.findOne({
        where: { warehouse_id: ret.warehouse_id, product_id: line.product_id },
        transaction: t, lock: true,
      });
      if (stock) {
        const newQty = parseFloat(stock.quantity) + parseFloat(line.quantity);
        await stock.update({ quantity: newQty }, { transaction: t });
        await StockMovement.create({
          warehouse_id: ret.warehouse_id,
          product_id:   line.product_id,
          movement_type: 'IN',
          source_type:  'CUSTOMER_RETURN',
          source_id:    ret.id,
          quantity:     line.quantity,
          balance_after: newQty,
          created_by:   req.user.id,
        }, { transaction: t });
      }
    }

    // 2. Update status
    await ret.update({
      status:       'CONFIRMED',
      confirmed_by: req.user.id,
      confirmed_at: new Date(),
    }, { transaction: t });

    await t.commit();

    notify({ roleName: 'manager', type: 'CUSTOMER_RETURN_CONFIRMED', title: 'Return Confirmed',
      body: `Return note ${ret.return_number} confirmed`, link: `/customer-returns/${ret.id}` });

    res.json(await CustomerReturn.findByPk(ret.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
});

// Cancel
router.put('/:id/cancel', authorize('sales.approve'), async (req, res, next) => {
  try {
    const ret = await CustomerReturn.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ message: 'Return note not found' });
    if (ret.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT returns can be cancelled' });
    await ret.update({ status: 'CANCELLED' });
    res.json(ret);
  } catch (err) { next(err); }
});

module.exports = router;
