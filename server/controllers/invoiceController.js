const { Invoice, InvoiceLine, Customer, Product, JournalEntry, JournalLine, Account, AccountingPeriod, Stock, StockMovement, LoadingSheetLine, LoadingSheet, sequelize } = require('../models');
const notify = require('../notify');
const { Op } = require('sequelize');

const include = [
  { model: Customer, attributes: ['id', 'name', 'code', 'customer_type'] },
  { model: InvoiceLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
  { model: LoadingSheet, as: 'VanSheet', attributes: ['id', 'sheet_number'] },
];

exports.list = async (req, res, next) => {
  try {
    const { status, customer_id, from, to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (from || to) {
      where.invoice_date = {};
      if (from) where.invoice_date[Op.gte] = from;
      if (to) where.invoice_date[Op.lte] = to;
    }
    const ownOnly = req.permissions?.has('sales.view_own') && !req.permissions?.has('sales.view_all');
    if (ownOnly) where[Op.or] = [
      { sales_rep_id: req.user.id },
      { created_by: req.user.id },
    ];

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Customer, attributes: ['id', 'name', 'code'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['invoice_date', 'DESC']],
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, { include });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const ownOnly = req.permissions?.has('sales.view_own') && !req.permissions?.has('sales.view_all');
    if (ownOnly && invoice.sales_rep_id !== req.user.id && invoice.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(invoice);
  } catch (err) { next(err); }
};

const generateInvoiceNumber = async (type = 'TAX_INVOICE') => {
  const prefix = type === 'CREDIT_NOTE' ? 'CN' : type === 'PROFORMA' ? 'PRO' : 'INV';
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const like = `${prefix}-${datePart}-%`;
  const last = await Invoice.findOne({ where: { invoice_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.invoice_number.split('-').pop()) + 1 : 1;
  return `${prefix}-${datePart}-${String(seq).padStart(3, '0')}`;
};

// Core post logic — runs inside an existing transaction.
// Handles journal entries, stock movements, and customer balance.
async function performPost(invoice, userId, t) {
  const now = new Date();
  const isCreditNote = invoice.invoice_type === 'CREDIT_NOTE';

  // Find open accounting period, or auto-create one for the current month.
  // If the period is intentionally closed by admin, skip journals but still post.
  let period = await AccountingPeriod.findOne({
    where: { year: now.getFullYear(), month: now.getMonth() + 1, is_open: true },
    transaction: t,
  });
  if (!period) {
    try {
      period = await AccountingPeriod.create({
        company_id: invoice.company_id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        is_open: true,
        name: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      }, { transaction: t });
    } catch { period = null; }
  }

  // System accounts
  const [debtorAcc, revenueAcc, vatAcc, cogsAcc, stockAcc] = await Promise.all([
    Account.findOne({ where: { is_system: true, sub_type: 'TRADE_DEBTORS'  }, transaction: t }),
    Account.findOne({ where: { is_system: true, sub_type: 'SALES_REVENUE'  }, transaction: t }),
    Account.findOne({ where: { is_system: true, sub_type: 'VAT_PAYABLE'    }, transaction: t }),
    Account.findOne({ where: { is_system: true, sub_type: 'COGS'           }, transaction: t }),
    Account.findOne({ where: { is_system: true, sub_type: 'STOCK'          }, transaction: t }),
  ]);

  // AR / Revenue journal
  let journal = null;
  if (period && debtorAcc && revenueAcc) {
    const entryNum = `${isCreditNote ? 'CN' : 'INV'}-JE-${invoice.invoice_number}`;
    const journalLines = isCreditNote ? [
      { account_id: revenueAcc.id, debit_amount: parseFloat(invoice.subtotal),     credit_amount: 0,                              narration: 'Revenue reversal — credit note' },
      ...(parseFloat(invoice.vat_amount) > 0 && vatAcc
        ? [{ account_id: vatAcc.id, debit_amount: parseFloat(invoice.vat_amount),  credit_amount: 0, narration: 'VAT reversal' }]
        : []),
      { account_id: debtorAcc.id, debit_amount: 0, credit_amount: parseFloat(invoice.total_amount), narration: 'Debtor credit — credit note' },
    ] : [
      { account_id: debtorAcc.id,  debit_amount: parseFloat(invoice.total_amount), credit_amount: 0 },
      { account_id: revenueAcc.id, debit_amount: 0, credit_amount: parseFloat(invoice.subtotal) },
      ...(parseFloat(invoice.vat_amount) > 0 && vatAcc
        ? [{ account_id: vatAcc.id, debit_amount: 0, credit_amount: parseFloat(invoice.vat_amount) }]
        : []),
    ];

    journal = await JournalEntry.create({
      company_id:   invoice.company_id,
      branch_id:    invoice.branch_id,
      period_id:    period.id,
      entry_number: entryNum,
      entry_date:   invoice.invoice_date,
      source_type:  'INVOICE',
      source_id:    invoice.id,
      description:  `${isCreditNote ? 'Credit Note' : 'Invoice'} ${invoice.invoice_number}`,
      total_debit:  invoice.total_amount,
      total_credit: invoice.total_amount,
      is_posted:    true,
      created_by:   userId,
    }, { transaction: t });

    await JournalLine.bulkCreate(journalLines.map(l => ({ ...l, journal_id: journal.id })), { transaction: t });
  }

  // Stock + COGS per line
  for (const line of invoice.Lines) {
    const billedQty = parseFloat(line.quantity);
    const freeQty   = parseFloat(line.free_quantity || 0);
    const totalShipQty = billedQty + freeQty;   // total physical units leaving warehouse
    const costTotal = (line.cost_price || 0) * totalShipQty;

    if (invoice.loading_sheet_id) {
      // Van sales: stock already deducted at Load Van; accumulate sold_quantity on sheet line
      const sheetLine = await LoadingSheetLine.findOne({
        where: { sheet_id: invoice.loading_sheet_id, product_id: line.product_id },
        transaction: t, lock: true,
      });
      if (sheetLine) {
        const newSold = parseFloat(sheetLine.sold_quantity || 0) + totalShipQty;
        await sheetLine.update({ sold_quantity: newSold }, { transaction: t });
      }
    } else {
      // Regular invoice: deduct total shipped qty (billed + free) from warehouse
      const stock = await Stock.findOne({
        where: { warehouse_id: invoice.warehouse_id, product_id: line.product_id },
        transaction: t, lock: true,
      });
      if (stock) {
        const deductQty = isCreditNote ? -totalShipQty : totalShipQty;
        const newQty = parseFloat(stock.quantity) - deductQty;
        await stock.update({ quantity: newQty }, { transaction: t });
        await StockMovement.create({
          warehouse_id: invoice.warehouse_id, product_id: line.product_id,
          movement_type: isCreditNote ? 'IN' : 'OUT', source_type: 'INVOICE', source_id: invoice.id,
          quantity: totalShipQty, balance_after: newQty, unit_cost: line.cost_price,
          created_by: userId,
        }, { transaction: t });
      }
    }

    // COGS journal (only when journal was created and cost is known)
    if (journal && cogsAcc && stockAcc && costTotal > 0) {
      await JournalLine.bulkCreate(isCreditNote ? [
        { journal_id: journal.id, account_id: stockAcc.id, debit_amount: costTotal, credit_amount: 0, narration: 'Stock restored — credit note' },
        { journal_id: journal.id, account_id: cogsAcc.id,  debit_amount: 0, credit_amount: costTotal, narration: 'COGS reversal — credit note' },
      ] : [
        { journal_id: journal.id, account_id: cogsAcc.id,  debit_amount: costTotal, credit_amount: 0 },
        { journal_id: journal.id, account_id: stockAcc.id, debit_amount: 0,          credit_amount: costTotal },
      ], { transaction: t });
    }
  }

  await invoice.update(
    { status: 'POSTED', journal_id: journal?.id ?? null, posted_by: userId, posted_at: now },
    { transaction: t }
  );

  if (isCreditNote) {
    await Customer.decrement('outstanding_balance', { by: invoice.total_amount, where: { id: invoice.customer_id }, transaction: t });
  } else {
    await Customer.increment('outstanding_balance', { by: invoice.total_amount, where: { id: invoice.customer_id }, transaction: t });
  }
}

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...invoiceData } = req.body;
    invoiceData.created_by   = req.user.id;
    invoiceData.sales_rep_id = req.user.id;
    if (!invoiceData.branch_id)  invoiceData.branch_id  = req.user.branch_id;
    if (!invoiceData.company_id) invoiceData.company_id = req.user.Branch?.company_id;
    if (!invoiceData.invoice_number) {
      invoiceData.invoice_number = await generateInvoiceNumber(invoiceData.invoice_type);
    }

    // Auto-fill cost_price from product catalogue for COGS accuracy
    const productIds = [...new Set(lines.map(l => l.product_id).filter(Boolean))];
    const dbProducts = await Product.findAll({ where: { id: productIds }, attributes: ['id', 'cost_price'], transaction: t });
    const costMap = {};
    dbProducts.forEach(p => { costMap[p.id] = parseFloat(p.cost_price || 0); });

    let subtotal = 0, vat = 0;
    const processedLines = lines.map(l => {
      const lineSub = l.quantity * l.unit_price * (1 - (l.discount_rate || 0) / 100);
      const lineVat = lineSub * ((l.vat_rate || 0) / 100);
      subtotal += lineSub;
      vat += lineVat;
      const cost_price = l.cost_price ?? costMap[l.product_id] ?? 0;
      return { ...l, cost_price, line_subtotal: lineSub, vat_amount: lineVat, line_total: lineSub + lineVat };
    });

    invoiceData.subtotal    = subtotal;
    invoiceData.vat_amount  = vat;
    invoiceData.total_amount = subtotal + vat;
    invoiceData.balance_due  = invoiceData.total_amount;

    const invoice = await Invoice.create(invoiceData, { transaction: t });
    await InvoiceLine.bulkCreate(processedLines.map(l => ({ ...l, invoice_id: invoice.id })), { transaction: t });

    // Auto-post — fetch with Lines so performPost can read them
    const fresh = await Invoice.findByPk(invoice.id, {
      include: [{ model: InvoiceLine, as: 'Lines' }],
      transaction: t,
    });
    await performPost(fresh, req.user.id, t);

    await t.commit();

    const actorName = req.user.name || `User #${req.user.id}`;
    notify({ roleName: 'admin',       type: 'INVOICE_POSTED', title: 'Invoice Posted', body: `${invoiceData.invoice_number} created by ${actorName}`, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'super_admin', type: 'INVOICE_POSTED', title: 'Invoice Posted', body: `${invoiceData.invoice_number} created by ${actorName}`, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'manager',     type: 'INVOICE_POSTED', title: 'Invoice Posted', body: `${invoiceData.invoice_number} created by ${actorName}`, link: `/invoices/${invoice.id}` });

    res.status(201).json(await Invoice.findByPk(invoice.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
};

// Manual post — kept as a fallback but rarely needed now that create() auto-posts
exports.post = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: InvoiceLine, as: 'Lines' }],
      transaction: t,
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status !== 'DRAFT') return res.status(400).json({ message: 'Invoice already posted' });

    await performPost(invoice, req.user.id, t);
    await t.commit();

    const isCreditNote = invoice.invoice_type === 'CREDIT_NOTE';
    const notifType  = isCreditNote ? 'CREDIT_NOTE_POSTED' : 'INVOICE_POSTED';
    const notifTitle = isCreditNote ? 'Credit Note Posted'  : 'Invoice Posted';
    const postedBy   = req.user.name || `User #${req.user.id}`;
    const notifBody  = `${invoice.invoice_number} posted by ${postedBy}`;
    notify({ roleName: 'finance',     type: notifType, title: notifTitle, body: notifBody, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'cashier',     type: notifType, title: notifTitle, body: notifBody, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'admin',       type: notifType, title: notifTitle, body: notifBody, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'super_admin', type: notifType, title: notifTitle, body: notifBody, link: `/invoices/${invoice.id}` });

    res.json(await Invoice.findByPk(invoice.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
};
