const router = require('express').Router();
const { SupplierReturn, SupplierReturnLine, Supplier, GoodsReceived, Product, JournalEntry, JournalLine, Account, AccountingPeriod, Stock, StockMovement, sequelize } = require('../models');
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');

const include = [
  { model: Supplier, attributes: ['id', 'name', 'code'] },
  { model: GoodsReceived, attributes: ['id', 'grn_number'] },
  { model: SupplierReturnLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
];

// GET /api/supplier-returns
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    const { count, rows } = await SupplierReturn.findAndCountAll({
      where, include: [{ model: Supplier, attributes: ['id', 'name'] }, { model: GoodsReceived, attributes: ['id', 'grn_number'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['return_date', 'DESC']],
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/supplier-returns/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ret = await SupplierReturn.findByPk(req.params.id, { include });
    if (!ret) return res.status(404).json({ message: 'Not found' });
    res.json(ret);
  } catch (err) { next(err); }
});

// POST /api/supplier-returns
router.post('/', authorize('purchase.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...retData } = req.body;
    const total = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unit_cost), 0);
    const year = new Date().getFullYear();
    const count = await SupplierReturn.count();
    const return_number = `SR-${year}-${String(count + 1).padStart(5, '0')}`;
    const ret = await SupplierReturn.create({
      ...retData, return_number, total_amount: total, created_by: req.user.id,
    }, { transaction: t });
    await SupplierReturnLine.bulkCreate(
      lines.map(l => ({ ...l, return_id: ret.id, line_total: Number(l.quantity) * Number(l.unit_cost) })),
      { transaction: t }
    );
    await t.commit();
    res.status(201).json(await SupplierReturn.findByPk(ret.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
});

// PUT /api/supplier-returns/:id/post
router.put('/:id/post', authorize('purchase.approve'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const ret = await SupplierReturn.findByPk(req.params.id, {
      include: [{ model: SupplierReturnLine, as: 'Lines' }, { model: Supplier }],
      transaction: t,
    });
    if (!ret) return res.status(404).json({ message: 'Not found' });
    if (ret.status !== 'DRAFT') return res.status(400).json({ message: 'Already posted' });

    const now = new Date();
    const period = await AccountingPeriod.findOne({
      where: { year: now.getFullYear(), month: now.getMonth() + 1, is_open: true },
      transaction: t,
    });
    if (!period) return res.status(400).json({ message: 'No open accounting period' });

    // System accounts: DR Creditors (Supplier), CR Stock
    const creditorAcc = await Account.findOne({ where: { is_system: true, sub_type: 'TRADE_CREDITORS' }, transaction: t });
    const stockAcc = await Account.findOne({ where: { is_system: true, sub_type: 'STOCK' }, transaction: t });

    const journal = await JournalEntry.create({
      company_id: ret.company_id, branch_id: ret.branch_id, period_id: period.id,
      entry_number: `SR-JE-${ret.return_number}`,
      entry_date: ret.return_date,
      source_type: 'SUPPLIER_RETURN', source_id: ret.id,
      description: `Supplier Return ${ret.return_number} — ${ret.Supplier?.name}`,
      total_debit: ret.total_amount, total_credit: ret.total_amount, is_posted: true,
      created_by: req.user.id,
    }, { transaction: t });

    // DR Creditors (reduces what we owe the supplier), CR Stock (reduces stock value)
    await JournalLine.bulkCreate([
      { journal_id: journal.id, account_id: creditorAcc?.id, debit_amount: ret.total_amount, credit_amount: 0, narration: 'Supplier credit for returned goods' },
      { journal_id: journal.id, account_id: stockAcc?.id, debit_amount: 0, credit_amount: ret.total_amount, narration: 'Stock value reduced on return' },
    ], { transaction: t });

    // Deduct stock for each returned line
    for (const line of ret.Lines) {
      // Find the GRN warehouse to deduct from
      let warehouseId = ret.Supplier?.default_warehouse_id;
      if (ret.goods_received_id) {
        const grn = await GoodsReceived.findByPk(ret.goods_received_id, { transaction: t });
        if (grn) warehouseId = grn.warehouse_id;
      }
      if (warehouseId) {
        const stock = await Stock.findOne({ where: { warehouse_id: warehouseId, product_id: line.product_id }, transaction: t });
        if (stock) {
          const newQty = Math.max(0, parseFloat(stock.quantity) - parseFloat(line.quantity));
          await stock.update({ quantity: newQty }, { transaction: t });
          await StockMovement.create({
            warehouse_id: warehouseId, product_id: line.product_id,
            movement_type: 'OUT', source_type: 'SUPPLIER_RETURN', source_id: ret.id,
            quantity: line.quantity, balance_after: newQty, unit_cost: line.unit_cost,
            created_by: req.user.id,
          }, { transaction: t });
        }
      }
    }

    await ret.update({ status: 'POSTED', journal_entry_id: journal.id }, { transaction: t });
    await t.commit();
    res.json(await SupplierReturn.findByPk(ret.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
});

module.exports = router;
