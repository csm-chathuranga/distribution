const { Invoice, InvoiceLine, Customer, Product, JournalEntry, JournalLine, Account, AccountingPeriod, Stock, StockMovement, sequelize } = require('../models');
const notify = require('../notify');
const { Op } = require('sequelize');

const include = [
  { model: Customer, attributes: ['id', 'name', 'code', 'customer_type'] },
  { model: InvoiceLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
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
    // Sales reps see only their own invoices
    const ownOnly = req.permissions?.has('sales.view_own') && !req.permissions?.has('sales.view_all');
    if (ownOnly) where.sales_rep_id = req.user.id;

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
    if (ownOnly && invoice.sales_rep_id !== req.user.id) {
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

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { lines, ...invoiceData } = req.body;
    invoiceData.created_by = req.user.id;
    if (!invoiceData.branch_id) invoiceData.branch_id = req.user.branch_id;
    if (!invoiceData.company_id) invoiceData.company_id = req.user.Branch?.company_id;
    if (!invoiceData.invoice_number) {
      invoiceData.invoice_number = await generateInvoiceNumber(invoiceData.invoice_type);
    }

    let subtotal = 0, vat = 0;
    const processedLines = lines.map((l) => {
      const lineSub = l.quantity * l.unit_price * (1 - (l.discount_rate || 0) / 100);
      const lineVat = lineSub * ((l.vat_rate || 0) / 100);
      subtotal += lineSub;
      vat += lineVat;
      return { ...l, line_subtotal: lineSub, vat_amount: lineVat, line_total: lineSub + lineVat };
    });

    invoiceData.subtotal = subtotal;
    invoiceData.vat_amount = vat;
    invoiceData.total_amount = subtotal + vat;
    invoiceData.balance_due = invoiceData.total_amount;

    const invoice = await Invoice.create(invoiceData, { transaction: t });
    await InvoiceLine.bulkCreate(
      processedLines.map((l) => ({ ...l, invoice_id: invoice.id })),
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(await Invoice.findByPk(invoice.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
};

exports.post = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: InvoiceLine, as: 'Lines' }],
      transaction: t,
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status !== 'DRAFT') return res.status(400).json({ message: 'Invoice already posted' });

    const now = new Date();
    const period = await AccountingPeriod.findOne({
      where: { year: now.getFullYear(), month: now.getMonth() + 1, is_open: true },
      transaction: t,
    });
    if (!period) return res.status(400).json({ message: 'No open accounting period' });

    // Fetch system accounts
    const debtorAcc = await Account.findOne({ where: { is_system: true, sub_type: 'TRADE_DEBTORS' }, transaction: t });
    const revenueAcc = await Account.findOne({ where: { is_system: true, sub_type: 'SALES_REVENUE' }, transaction: t });
    const vatAcc = await Account.findOne({ where: { is_system: true, sub_type: 'VAT_PAYABLE' }, transaction: t });
    const cogsAcc = await Account.findOne({ where: { is_system: true, sub_type: 'COGS' }, transaction: t });
    const stockAcc = await Account.findOne({ where: { is_system: true, sub_type: 'STOCK' }, transaction: t });

    const isCreditNote = invoice.invoice_type === 'CREDIT_NOTE';
    const entryNum = `${isCreditNote ? 'CN' : 'INV'}-JE-${invoice.invoice_number}`;

    // For credit notes: DR Revenue, CR Debtors (reverse). For invoices: DR Debtors, CR Revenue.
    const journalLines = isCreditNote ? [
      { account_id: revenueAcc?.id, debit_amount: parseFloat(invoice.subtotal), credit_amount: 0, narration: 'Revenue reversal — credit note' },
      ...(invoice.vat_amount > 0 && vatAcc ? [{ account_id: vatAcc.id, debit_amount: parseFloat(invoice.vat_amount), credit_amount: 0, narration: 'VAT reversal' }] : []),
      { account_id: debtorAcc?.id, debit_amount: 0, credit_amount: parseFloat(invoice.total_amount), narration: 'Debtor credit — credit note' },
    ] : [
      { account_id: debtorAcc?.id, debit_amount: parseFloat(invoice.total_amount), credit_amount: 0 },
      { account_id: revenueAcc?.id, debit_amount: 0, credit_amount: parseFloat(invoice.subtotal) },
      ...(invoice.vat_amount > 0 && vatAcc ? [{ account_id: vatAcc.id, debit_amount: 0, credit_amount: parseFloat(invoice.vat_amount) }] : []),
    ];

    const journal = await JournalEntry.create({
      company_id: invoice.company_id,
      branch_id: invoice.branch_id,
      period_id: period.id,
      entry_number: entryNum,
      entry_date: invoice.invoice_date,
      source_type: 'INVOICE',
      source_id: invoice.id,
      description: `${isCreditNote ? 'Credit Note' : 'Invoice'} ${invoice.invoice_number}`,
      total_debit: invoice.total_amount,
      total_credit: invoice.total_amount,
      is_posted: true,
      created_by: req.user.id,
    }, { transaction: t });

    await JournalLine.bulkCreate(journalLines.map(l => ({ ...l, journal_id: journal.id })), { transaction: t });

    // COGS & stock per line
    for (const line of invoice.Lines) {
      const stock = await Stock.findOne({
        where: { warehouse_id: invoice.warehouse_id, product_id: line.product_id },
        transaction: t, lock: true,
      });
      if (stock) {
        const costTotal = (line.cost_price || 0) * parseFloat(line.quantity);
        const newQty = isCreditNote
          ? parseFloat(stock.quantity) + parseFloat(line.quantity)  // restore stock for credit notes
          : parseFloat(stock.quantity) - parseFloat(line.quantity); // deduct for regular invoices
        await stock.update({ quantity: newQty }, { transaction: t });
        await StockMovement.create({
          warehouse_id: invoice.warehouse_id, product_id: line.product_id,
          movement_type: isCreditNote ? 'IN' : 'OUT', source_type: 'INVOICE', source_id: invoice.id,
          quantity: line.quantity, balance_after: newQty, unit_cost: line.cost_price,
          created_by: req.user.id,
        }, { transaction: t });
        if (cogsAcc && stockAcc && costTotal > 0) {
          await JournalLine.bulkCreate(isCreditNote ? [
            { journal_id: journal.id, account_id: stockAcc.id, debit_amount: costTotal, credit_amount: 0, narration: 'Stock restored — credit note' },
            { journal_id: journal.id, account_id: cogsAcc.id, debit_amount: 0, credit_amount: costTotal, narration: 'COGS reversal — credit note' },
          ] : [
            { journal_id: journal.id, account_id: cogsAcc.id, debit_amount: costTotal, credit_amount: 0 },
            { journal_id: journal.id, account_id: stockAcc.id, debit_amount: 0, credit_amount: costTotal },
          ], { transaction: t });
        }
      }
    }

    await invoice.update({ status: 'POSTED', journal_id: journal.id, posted_by: req.user.id, posted_at: now }, { transaction: t });
    // Credit notes reduce outstanding balance; regular invoices increase it
    if (isCreditNote) {
      await Customer.decrement('outstanding_balance', { by: invoice.total_amount, where: { id: invoice.customer_id }, transaction: t });
    } else {
      await Customer.increment('outstanding_balance', { by: invoice.total_amount, where: { id: invoice.customer_id }, transaction: t });
    }

    await t.commit();

    // Notify finance & cashier roles that a new invoice was posted
    const notifType = isCreditNote ? 'CREDIT_NOTE_POSTED' : 'INVOICE_POSTED';
    const notifTitle = isCreditNote ? 'Credit Note Posted' : 'Invoice Posted';
    notify({ roleName: 'finance',  type: notifType, title: notifTitle, body: invoice.invoice_number, link: `/invoices/${invoice.id}` });
    notify({ roleName: 'cashier',  type: notifType, title: notifTitle, body: invoice.invoice_number, link: `/invoices/${invoice.id}` });

    res.json(await Invoice.findByPk(invoice.id, { include }));
  } catch (err) { await t.rollback(); next(err); }
};
