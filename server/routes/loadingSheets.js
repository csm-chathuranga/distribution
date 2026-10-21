const router = require('express').Router();
const { LoadingSheet, LoadingSheetLine, Product, Warehouse, Route, User, Stock, StockMovement, Invoice, InvoiceLine, Customer, Vehicle, JournalEntry, JournalLine, Account, AccountingPeriod, SalesOrder, OrderReturn, sequelize } = require('../models');

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
  { model: Invoice, as: 'Invoices', attributes: ['id', 'invoice_number', 'total_amount', 'paid_amount', 'balance_due', 'status', 'invoice_date', 'customer_id', 'delivered_at', 'notes', 'order_id'],
    include: [
      { model: Customer, attributes: ['id', 'name', 'address'] },
      { model: InvoiceLine, as: 'Lines', attributes: ['id', 'product_id', 'quantity', 'free_quantity', 'unit_price', 'line_total'],
        include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
      { model: SalesOrder, as: 'Order', attributes: ['id', 'latitude', 'longitude'],
        include: [{ model: OrderReturn, as: 'Returns', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] }] },
    ],
  },
];

// GET /api/loading-sheets
router.get('/', async (req, res, next) => {
  try {
    const { status, from, to, route_id, sales_rep_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)       where.status       = status;
    if (route_id)     where.route_id     = route_id;
    if (sales_rep_id) where.sales_rep_id = sales_rep_id;
    if (from || to) {
      where.sheet_date = {};
      if (from) where.sheet_date[Op.gte] = from;
      if (to) where.sheet_date[Op.lte] = to;
    }
    const { count, rows } = await LoadingSheet.findAndCountAll({
      where, include: [
        { model: User, as: 'SalesRep', attributes: ['id', 'name'] },
        { model: Route, attributes: ['id', 'name'] },
        { model: Vehicle, attributes: ['id', 'registration_number'] },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['sheet_date', 'DESC']],
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/loading-sheets/active — current user's LOADED loading sheet (sales rep OR driver)
router.get('/active', async (req, res, next) => {
  try {
    const sheet = await LoadingSheet.findOne({
      where: {
        status: 'LOADED',
        [Op.or]: [{ sales_rep_id: req.user.id }, { driver_id: req.user.id }],
      },
      order: [['sheet_date', 'DESC']],
      attributes: ['id', 'sheet_number', 'status', 'sheet_date', 'warehouse_id'],
    });
    if (!sheet) return res.status(404).json({ message: 'No active loading sheet' });
    res.json(sheet);
  } catch (err) { next(err); }
});

// GET /api/loading-sheets/available-invoices — POSTED invoices with no sheet (for new sheet creation)
router.get('/available-invoices', authorize('sales.approve'), async (req, res, next) => {
  try {
    const where = { status: 'POSTED', loading_sheet_id: null };
    if (req.user.branch_id) where.branch_id = req.user.branch_id;
    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'name', 'code'], include: [{ model: Route, attributes: ['id', 'name'] }] },
        { model: InvoiceLine, as: 'Lines',
          include: [{ model: Product, attributes: ['id', 'name', 'sku', 'cost_price'] }] },
      ],
      order: [['invoice_date', 'DESC'], ['id', 'DESC']],
      limit: 200,
    });
    res.json(invoices);
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
        { model: Invoice, as: 'Invoices', attributes: ['id', 'status'],
          include: [{ model: InvoiceLine, as: 'Lines', attributes: ['product_id', 'quantity'] }] },
      ],
    });
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status !== 'LOADED') return res.status(400).json({ message: 'Sheet must be LOADED' });

    // Build sold qty map from actual invoice lines (exclude CANCELLED invoices)
    const soldMap = {};
    for (const inv of (sheet.Invoices || [])) {
      if (inv.status === 'CANCELLED') continue;
      for (const il of (inv.Lines || [])) {
        soldMap[il.product_id] = (soldMap[il.product_id] || 0) + parseFloat(il.quantity || 0);
      }
    }

    const lines = (sheet.Lines || []).map(line => {
      const loaded = parseFloat(line.loaded_quantity);
      const sold   = soldMap[line.product_id] || 0;
      return {
        line_id: line.id,
        product_id: line.product_id,
        product: line.Product,
        loaded,
        sold,
        remaining: Math.max(0, loaded - sold),
        unit_cost: parseFloat(line.unit_cost),
      };
    });
    res.json({ sheet_id: sheet.id, sheet_number: sheet.sheet_number, warehouse_id: sheet.warehouse_id, warehouse: sheet.Warehouse, lines });
  } catch (err) { next(err); }
});

// POST /api/loading-sheets — create in DRAFT status
router.post('/', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...sheetData } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one product line is required' });
    }
    const year = new Date().getFullYear();
    const count = await LoadingSheet.count();
    const sheet_number = `LS-${year}-${String(count + 1).padStart(5, '0')}`;
    const totalLoaded = lines.reduce((s, l) => s + Number(l.loaded_quantity) * Number(l.unit_cost || 0), 0);
    const sheet = await LoadingSheet.create({ ...sheetData, sheet_number, total_loaded_value: totalLoaded, branch_id: req.user.branch_id, created_by: req.user.id }, { transaction: t });
    await LoadingSheetLine.bulkCreate(lines.map(l => ({ ...l, sheet_id: sheet.id })), { transaction: t });
    await t.commit();
    const created = await LoadingSheet.findByPk(sheet.id, { include });
    res.status(201).json(created);
    // Notify the assigned driver that a loading sheet has been created for them
    if (sheetData.driver_id) {
      notify({ userId: sheetData.driver_id, type: 'SHEET_CREATED', title: 'Loading Sheet Assigned', body: `${sheet_number} has been assigned to you — awaiting loading`, link: `/loading-sheets/${sheet.id}` });
    }
    if (sheetData.sales_rep_id && sheetData.sales_rep_id !== sheetData.driver_id) {
      notify({ userId: sheetData.sales_rep_id, type: 'SHEET_CREATED', title: 'Loading Sheet Assigned', body: `${sheet_number} has been assigned to you — awaiting loading`, link: `/loading-sheets/${sheet.id}` });
    }
  } catch (err) { await t.rollback(); next(err); }
});

// GET /api/loading-sheets/:id/available-invoices — POSTED invoices not yet on any sheet
router.get('/:id/available-invoices', authorize('sales.approve'), async (req, res, next) => {
  try {
    const sheet = await LoadingSheet.findByPk(req.params.id, { attributes: ['id', 'branch_id'] });
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    const invoices = await Invoice.findAll({
      where: { status: 'POSTED', loading_sheet_id: null, branch_id: sheet.branch_id },
      include: [{ model: Customer, attributes: ['id', 'name', 'code'], include: [{ model: Route, attributes: ['id', 'name'] }] }],
      order: [['invoice_date', 'DESC'], ['id', 'DESC']],
      limit: 200,
    });
    res.json(invoices);
  } catch (err) { next(err); }
});

// PUT /api/loading-sheets/:id/invoices — assign invoice_ids to this sheet
router.put('/:id/invoices', authorize('sales.approve'), async (req, res, next) => {
  try {
    const { invoice_ids } = req.body;
    if (!Array.isArray(invoice_ids) || !invoice_ids.length) return res.status(400).json({ message: 'invoice_ids required' });
    const sheet = await LoadingSheet.findByPk(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status === 'CLOSED') return res.status(422).json({ message: 'Sheet is closed' });
    const [count] = await Invoice.update(
      { loading_sheet_id: sheet.id },
      { where: { id: invoice_ids, status: 'POSTED', loading_sheet_id: null } }
    );
    res.json({ linked: count });
  } catch (err) { next(err); }
});

// DELETE /api/loading-sheets/:id/invoices/:invoiceId — unlink invoice from sheet
router.delete('/:id/invoices/:invoiceId', authorize('sales.approve'), async (req, res, next) => {
  try {
    await Invoice.update(
      { loading_sheet_id: null },
      { where: { id: req.params.invoiceId, loading_sheet_id: req.params.id } }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/loading-sheets/:id — update driver/sales_rep on non-closed sheets
router.patch('/:id', authorize('sales.approve'), async (req, res, next) => {
  try {
    const sheet = await LoadingSheet.findByPk(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status === 'CLOSED') return res.status(422).json({ message: 'Cannot edit a closed sheet' });
    const { driver_id, sales_rep_id } = req.body;
    const updates = {};
    if (driver_id !== undefined) updates.driver_id = driver_id || null;
    if (sales_rep_id !== undefined) updates.sales_rep_id = sales_rep_id || null;
    await sheet.update(updates);
    res.json(await LoadingSheet.findByPk(sheet.id, { include }));
  } catch (err) { next(err); }
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

// PUT /api/loading-sheets/:id/close — record returns, damage, loss and reconcile
router.put('/:id/close', authorize('sales.create'), async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { returns = [], cash_collected = 0 } = req.body;
    const sheet = await LoadingSheet.findByPk(req.params.id, { include: [{ model: LoadingSheetLine, as: 'Lines', include: [{ model: Product }] }], transaction: t, lock: true });
    if (!sheet) return res.status(404).json({ message: 'Not found' });
    if (sheet.status !== 'LOADED') return res.status(400).json({ message: 'Sheet must be LOADED to close' });

    const invoiceCount = await Invoice.count({ where: { loading_sheet_id: sheet.id, status: ['POSTED', 'DELIVERED', 'PAID', 'PARTIAL'] }, transaction: t });
    const hasInvoices = invoiceCount > 0;

    // Build product_id → total invoiced quantity from actual invoice lines
    const invoicedQtyMap = {};
    if (hasInvoices) {
      const sheetInvoices = await Invoice.findAll({
        where: { loading_sheet_id: sheet.id, status: ['POSTED', 'DELIVERED', 'PAID', 'PARTIAL'] },
        include: [{ model: InvoiceLine, as: 'Lines', attributes: ['product_id', 'quantity'] }],
        transaction: t,
      });
      sheetInvoices.forEach(inv => {
        (inv.Lines || []).forEach(il => {
          const pid = il.product_id;
          invoicedQtyMap[pid] = (invoicedQtyMap[pid] || 0) + parseFloat(il.quantity || 0);
        });
      });
    }

    // Build maps from the returns payload
    const returnMap   = {};
    const damagedMap  = {};
    const lostMap     = {};
    const notesMap    = {};
    returns.forEach(r => {
      returnMap[r.line_id]  = Number(r.returned_quantity  || 0);
      damagedMap[r.line_id] = Number(r.damaged_quantity   || 0);
      lostMap[r.line_id]    = Number(r.lost_quantity      || 0);
      notesMap[r.line_id]   = r.damage_notes || null;
    });

    let totalSales = 0;

    for (const line of sheet.Lines) {
      const returnedQty = returnMap[line.id]  || 0;
      const damagedQty  = damagedMap[line.id] || 0;
      const lostQty     = lostMap[line.id]    || 0;
      const soldQty = hasInvoices
        ? (invoicedQtyMap[line.product_id] || 0)
        : Math.max(0, parseFloat(line.loaded_quantity) - returnedQty - damagedQty - lostQty);

      await line.update({
        returned_quantity: returnedQty,
        sold_quantity:     soldQty,
        damaged_quantity:  damagedQty,
        lost_quantity:     lostQty,
        damage_notes:      notesMap[line.id] || null,
      }, { transaction: t });

      const stock = await Stock.findOne({ where: { warehouse_id: sheet.warehouse_id, product_id: line.product_id }, transaction: t });
      if (stock) {
        // Return good stock to warehouse
        if (returnedQty > 0) {
          const newQty = parseFloat(stock.quantity) + returnedQty;
          await stock.update({ quantity: newQty }, { transaction: t });
          await StockMovement.create({
            warehouse_id: sheet.warehouse_id, product_id: line.product_id,
            movement_type: 'IN', source_type: 'VAN_RETURN', source_id: sheet.id,
            quantity: returnedQty, balance_after: newQty, unit_cost: line.unit_cost,
            created_by: req.user.id,
          }, { transaction: t });
        }

        // Damaged/lost: stock already deducted at load — record audit-only adjustment movement
        const curStock = await Stock.findOne({ where: { warehouse_id: sheet.warehouse_id, product_id: line.product_id }, transaction: t });
        const curQty = parseFloat(curStock?.quantity || 0);
        if (damagedQty > 0) {
          await StockMovement.create({
            warehouse_id: sheet.warehouse_id, product_id: line.product_id,
            movement_type: 'ADJUSTMENT', source_type: 'VAN_DAMAGE', source_id: sheet.id,
            quantity: damagedQty, balance_after: curQty, unit_cost: line.unit_cost,
            created_by: req.user.id,
          }, { transaction: t });
        }
        if (lostQty > 0) {
          await StockMovement.create({
            warehouse_id: sheet.warehouse_id, product_id: line.product_id,
            movement_type: 'ADJUSTMENT', source_type: 'VAN_LOSS', source_id: sheet.id,
            quantity: lostQty, balance_after: curQty, unit_cost: line.unit_cost,
            created_by: req.user.id,
          }, { transaction: t });
        }
      }

      totalSales += soldQty * (parseFloat(line.unit_cost) || 0);
    }

    // Journal write-off for damaged + lost stock
    const totalDamageLoss = returns.reduce((sum, r) => {
      const line = sheet.Lines.find(l => l.id === r.line_id);
      const cost = parseFloat(line?.unit_cost || 0);
      return sum + (Number(r.damaged_quantity || 0) + Number(r.lost_quantity || 0)) * cost;
    }, 0);

    if (totalDamageLoss > 0) {
      const [period, lossAcc, stockAcc] = await Promise.all([
        AccountingPeriod.findOne({ where: { is_open: true }, transaction: t }),
        Account.findOne({ where: { is_system: true, sub_type: 'VAN_LOSS' }, transaction: t }),
        Account.findOne({ where: { is_system: true, sub_type: 'STOCK' }, transaction: t }),
      ]);
      if (period && lossAcc && stockAcc) {
        const entryCount = await JournalEntry.count({ transaction: t });
        const entryNum = `JE-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(entryCount + 1).padStart(5,'0')}`;
        const je = await JournalEntry.create({
          company_id: sheet.company_id, branch_id: sheet.branch_id, period_id: period.id,
          entry_number: entryNum, entry_date: new Date().toISOString().slice(0, 10),
          source_type: 'VAN_CLOSE', source_id: sheet.id,
          description: `Van damage/loss write-off — ${sheet.sheet_number}`,
          total_debit: totalDamageLoss, total_credit: totalDamageLoss, is_posted: true,
          created_by: req.user.id,
        }, { transaction: t });
        await JournalLine.bulkCreate([
          { journal_id: je.id, account_id: lossAcc.id,  debit: totalDamageLoss, credit: 0,               description: 'Van damage & loss expense' },
          { journal_id: je.id, account_id: stockAcc.id, debit: 0,               credit: totalDamageLoss, description: 'Stock written off — van damage/loss' },
        ], { transaction: t });
      }
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
