const router = require('express').Router();
const { LoadingSheet, LoadingSheetLine, Product, Warehouse, Route, User, Stock, StockMovement, Invoice, InvoiceLine, Customer, Vehicle, sequelize } = require('../models');
const notify = require('../notify');
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');

const include = [
  { model: LoadingSheetLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku', 'selling_price', 'cost_price'] }] },
  { model: Warehouse, attributes: ['id', 'name'] },
  { model: Route, attributes: ['id', 'name'] },
  { model: User, as: 'SalesRep', attributes: ['id', 'name'] },
  { model: User, as: 'Driver', attributes: ['id', 'name'] },
  { model: Vehicle, attributes: ['id', 'registration_number', 'make', 'model'] },
  { model: Invoice, as: 'Invoices', attributes: ['id', 'invoice_number', 'total_amount', 'status', 'invoice_date', 'customer_id'],
    include: [{ model: Customer, attributes: ['id', 'name'] }] },
];

// GET /api/loading-sheets
router.get('/', async (req, res, next) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.sheet_date = {};
      if (from) where.sheet_date[Op.gte] = from;
      if (to) where.sheet_date[Op.lte] = to;
    }
    const { count, rows } = await LoadingSheet.findAndCountAll({
      where, include: [{ model: User, as: 'SalesRep', attributes: ['id', 'name'] }, { model: Route, attributes: ['id', 'name'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['sheet_date', 'DESC']],
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/loading-sheets/active — current user's LOADED loading sheet (sales rep auto-detect)
router.get('/active', async (req, res, next) => {
  try {
    const sheet = await LoadingSheet.findOne({
      where: { sales_rep_id: req.user.id, status: 'LOADED' },
      order: [['sheet_date', 'DESC']],
      attributes: ['id', 'sheet_number', 'status', 'sheet_date', 'warehouse_id'],
    });
    if (!sheet) return res.status(404).json({ message: 'No active loading sheet' });
    res.json(sheet);
  } catch (err) { next(err); }
});

// GET /api/loading-sheets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const sheet = await LoadingSheet.findByPk(req.params.id, { include });
    if (!sheet) return res.status(404).json({ message: 'Loading sheet not found' });
    res.json(sheet);
  } catch (err) { next(err); }
});

// GET /api/loading-sheets/:id/van-stock — remaining stock per product for a LOADED sheet
router.get('/:id/van-stock', async (req, res, next) => {
  try {
    const sheet = await LoadingSheet.findByPk(req.params.id, {
      include: [
        { model: LoadingSheetLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku', 'selling_price', 'vat_rate'] }] },
        { model: Warehouse, attributes: ['id', 'name'] },
      ],
    });
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status !== 'LOADED') return res.status(400).json({ message: 'Sheet must be LOADED' });
    const lines = (sheet.Lines || []).map(line => ({
      line_id: line.id,
      product_id: line.product_id,
      product: line.Product,
      loaded: parseFloat(line.loaded_quantity),
      sold: parseFloat(line.sold_quantity || 0),
      remaining: Math.max(0, parseFloat(line.loaded_quantity) - parseFloat(line.sold_quantity || 0)),
      unit_cost: parseFloat(line.unit_cost),
    }));
    res.json({ sheet_id: sheet.id, sheet_number: sheet.sheet_number, warehouse_id: sheet.warehouse_id, warehouse: sheet.Warehouse, lines });
  } catch (err) { next(err); }
});

// POST /api/loading-sheets — create in DRAFT status
router.post('/', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...sheetData } = req.body;
    const year = new Date().getFullYear();
    const count = await LoadingSheet.count();
    const sheet_number = `LS-${year}-${String(count + 1).padStart(5, '0')}`;
    const totalLoaded = lines.reduce((s, l) => s + Number(l.loaded_quantity) * Number(l.unit_cost || 0), 0);
    const sheet = await LoadingSheet.create({ ...sheetData, sheet_number, total_loaded_value: totalLoaded, branch_id: req.user.branch_id, created_by: req.user.id }, { transaction: t });
    await LoadingSheetLine.bulkCreate(lines.map(l => ({ ...l, sheet_id: sheet.id })), { transaction: t });
    await t.commit();
    res.status(201).json(await LoadingSheet.findByPk(sheet.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
});

// PUT /api/loading-sheets/:id/load — deduct stock from warehouse, mark LOADED
router.put('/:id/load', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const sheet = await LoadingSheet.findByPk(req.params.id, {
      include: [{ model: LoadingSheetLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] }],
      transaction: t, lock: true,
    });
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status !== 'DRAFT') return res.status(400).json({ message: 'Already loaded' });

    for (const line of sheet.Lines) {
      const stock = await Stock.findOne({ where: { warehouse_id: sheet.warehouse_id, product_id: line.product_id }, transaction: t, lock: true });
      const available = stock ? parseFloat(stock.quantity) : 0;
      if (available < parseFloat(line.loaded_quantity)) {
        await t.rollback();
        const name = line.Product ? `${line.Product.sku} — ${line.Product.name}` : `Product ID ${line.product_id}`;
        return res.status(400).json({ message: `Insufficient stock for ${name}. Available: ${available}, Required: ${line.loaded_quantity}` });
      }
      const newQty = parseFloat(stock.quantity) - parseFloat(line.loaded_quantity);
      await stock.update({ quantity: newQty }, { transaction: t });
      await StockMovement.create({
        warehouse_id: sheet.warehouse_id, product_id: line.product_id,
        movement_type: 'OUT', source_type: 'LOADING_SHEET', source_id: sheet.id,
        quantity: line.loaded_quantity, balance_after: newQty, unit_cost: line.unit_cost,
        created_by: req.user.id,
      }, { transaction: t });
    }
    await sheet.update({ status: 'LOADED' }, { transaction: t });
    await t.commit();
    const loaded = await LoadingSheet.findByPk(sheet.id, { include });
    if (sheet.driver_id)   notify({ userId: sheet.driver_id,   type: 'SHEET_LOADED', title: 'Loading Sheet Ready', body: `${loaded.sheet_number} has been loaded and is ready`, link: `/loading-sheets/${sheet.id}` });
    if (sheet.sales_rep_id) notify({ userId: sheet.sales_rep_id, type: 'SHEET_LOADED', title: 'Loading Sheet Ready', body: `${loaded.sheet_number} has been loaded and is ready`, link: `/loading-sheets/${sheet.id}` });
    res.json(loaded);
  } catch (err) { await t.rollback(); next(err); }
});

// PUT /api/loading-sheets/:id/close — record returns, reconcile sold quantities
router.put('/:id/close', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { returns = [], cash_collected = 0 } = req.body;
    const sheet = await LoadingSheet.findByPk(req.params.id, { include: [{ model: LoadingSheetLine, as: 'Lines', include: [{ model: Product }] }], transaction: t, lock: true });
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status !== 'LOADED') return res.status(400).json({ message: 'Sheet must be LOADED to close' });

    // If invoices have been posted against this sheet, sold_quantity is already accumulated per line.
    const invoiceCount = await Invoice.count({ where: { loading_sheet_id: sheet.id, status: 'POSTED' }, transaction: t });
    const hasInvoices = invoiceCount > 0;

    const returnMap = {};
    returns.forEach(r => { returnMap[r.line_id] = Number(r.returned_quantity); });

    let totalSales = 0;

    for (const line of sheet.Lines) {
      const returnedQty = returnMap[line.id] || 0;
      // When invoices exist, sold_quantity was accumulated at invoice-post time — preserve it.
      // When no invoices, derive sold from returns (original day-end flow).
      const soldQty = hasInvoices
        ? parseFloat(line.sold_quantity || 0)
        : parseFloat(line.loaded_quantity) - returnedQty;
      await line.update({ returned_quantity: returnedQty, sold_quantity: soldQty }, { transaction: t });

      if (returnedQty > 0) {
        const stock = await Stock.findOne({ where: { warehouse_id: sheet.warehouse_id, product_id: line.product_id }, transaction: t });
        if (stock) {
          const newQty = parseFloat(stock.quantity) + returnedQty;
          await stock.update({ quantity: newQty }, { transaction: t });
          await StockMovement.create({
            warehouse_id: sheet.warehouse_id, product_id: line.product_id,
            movement_type: 'IN', source_type: 'VAN_RETURN', source_id: sheet.id,
            quantity: returnedQty, balance_after: newQty, unit_cost: line.unit_cost,
            created_by: req.user.id,
          }, { transaction: t });
        }
      }
      totalSales += soldQty * (line.Product?.selling_price || 0);
    }

    await sheet.update({ status: 'CLOSED', total_sales_amount: totalSales, cash_collected: parseFloat(cash_collected) || 0 }, { transaction: t });
    await t.commit();
    res.json(await LoadingSheet.findByPk(sheet.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
});

// DELETE /api/loading-sheets/:id — only allowed for DRAFT (no stock movements yet)
router.delete('/:id', authorize('sales.create'), async (req, res, next) => {
  try {
    const sheet = await LoadingSheet.findByPk(req.params.id, { include: [{ model: LoadingSheetLine, as: 'Lines' }] });
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT loading sheets can be deleted' });
    await LoadingSheetLine.destroy({ where: { sheet_id: sheet.id } });
    await sheet.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
