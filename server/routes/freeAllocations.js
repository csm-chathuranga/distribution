const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { FreeItemAllocation, FreeItemUsage, Product, User, Warehouse, Customer, Invoice, Stock, StockMovement, sequelize } = require('../models');

const include = [
  { model: Product,   attributes: ['id', 'name', 'sku'] },
  { model: Warehouse, attributes: ['id', 'name'] },
  { model: User, as: 'SalesRep', attributes: ['id', 'name'] },
];

const companyId = (req) => req.user.Branch?.company_id ?? 1;
const canApprove = (req) => req.permissions?.has('sales.approve');

// GET /api/free-allocations — admin sees all, sales rep sees own
router.get('/', async (req, res, next) => {
  try {
    const where = { company_id: companyId(req) };
    if (!canApprove(req)) where.sales_rep_id = req.user.id;
    const rows = await FreeItemAllocation.findAll({ where, include, order: [['updatedAt', 'DESC']] });
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/free-allocations — create allocation (admin/manager)
router.post('/', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { sales_rep_id, product_id, warehouse_id, quantity, notes } = req.body;
    if (!sales_rep_id || !product_id || !warehouse_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'sales_rep_id, product_id, warehouse_id and quantity are required' });
    }
    const [alloc, created] = await FreeItemAllocation.findOrCreate({
      where: { sales_rep_id, product_id },
      defaults: {
        company_id: companyId(req),
        branch_id:  req.user.branch_id,
        warehouse_id,
        allocated_quantity: quantity,
        used_quantity: 0,
        notes,
        created_by: req.user.id,
      },
    });
    if (!created) {
      await alloc.increment('allocated_quantity', { by: parseFloat(quantity) });
      if (notes) await alloc.update({ notes });
    }
    res.status(201).json(await FreeItemAllocation.findByPk(alloc.id, { include }));
  } catch (err) { next(err); }
});

// PUT /api/free-allocations/:id/topup — add more quantity (admin/manager)
router.put('/:id/topup', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { quantity, notes } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ message: 'quantity must be > 0' });
    const alloc = await FreeItemAllocation.findByPk(req.params.id);
    if (!alloc) return res.status(404).json({ message: 'Allocation not found' });
    await alloc.increment('allocated_quantity', { by: parseFloat(quantity) });
    if (notes) await alloc.update({ notes });
    res.json(await FreeItemAllocation.findByPk(alloc.id, { include }));
  } catch (err) { next(err); }
});

// POST /api/free-allocations/:id/distribute — sales rep gives items to customer
router.post('/:id/distribute', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { customer_id, invoice_id, quantity, notes } = req.body;
    if (!quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'quantity must be > 0' });
    }

    const alloc = await FreeItemAllocation.findByPk(req.params.id, { transaction: t, lock: true });
    if (!alloc) { await t.rollback(); return res.status(404).json({ message: 'Allocation not found' }); }

    if (!canApprove(req) && alloc.sales_rep_id !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ message: 'Not your allocation' });
    }

    const remaining = parseFloat(alloc.allocated_quantity) - parseFloat(alloc.used_quantity);
    if (parseFloat(quantity) > remaining) {
      await t.rollback();
      return res.status(422).json({ message: `Only ${remaining} units remaining in allocation` });
    }

    const stock = await Stock.findOne({ where: { warehouse_id: alloc.warehouse_id, product_id: alloc.product_id }, transaction: t, lock: true });
    if (!stock || parseFloat(stock.quantity) < parseFloat(quantity)) {
      await t.rollback();
      return res.status(422).json({ message: 'Insufficient stock in warehouse for free item distribution' });
    }
    const newQty = parseFloat(stock.quantity) - parseFloat(quantity);
    await stock.update({ quantity: newQty }, { transaction: t });
    await StockMovement.create({
      warehouse_id: alloc.warehouse_id, product_id: alloc.product_id,
      movement_type: 'OUT', source_type: 'FREE_DIST', source_id: alloc.id,
      quantity, balance_after: newQty, unit_cost: 0,
      created_by: req.user.id,
    }, { transaction: t });

    await FreeItemUsage.create({ allocation_id: alloc.id, customer_id, invoice_id, quantity, notes, given_by: req.user.id }, { transaction: t });
    await alloc.increment('used_quantity', { by: parseFloat(quantity), transaction: t });

    await t.commit();
    res.status(201).json({ message: 'Free items distributed', remaining: remaining - parseFloat(quantity) });
  } catch (err) { await t.rollback(); next(err); }
});

// GET /api/free-allocations/:id/history — usage history for an allocation
router.get('/:id/history', async (req, res, next) => {
  try {
    const alloc = await FreeItemAllocation.findByPk(req.params.id);
    if (!alloc) return res.status(404).json({ message: 'Not found' });
    if (!canApprove(req) && alloc.sales_rep_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    const usages = await FreeItemUsage.findAll({
      where: { allocation_id: alloc.id },
      include: [
        { model: Customer, attributes: ['id', 'name', 'code'] },
        { model: User, as: 'GivenBy', attributes: ['id', 'name'] },
        { model: Invoice, attributes: ['id', 'invoice_number'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(usages);
  } catch (err) { next(err); }
});

module.exports = router;
