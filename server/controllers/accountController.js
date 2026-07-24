const { Account, JournalEntry, JournalLine, AccountingPeriod, sequelize } = require('../models');
const { Op, QueryTypes } = require('sequelize');

exports.list = async (req, res, next) => {
  try {
    const { type, is_active, search } = req.query;
    const where = { company_id: req.user.company_id || 1 };
    if (type) where.type = type;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) where.name = { [Op.like]: `%${search}%` };

    const accounts = await Account.findAll({
      where,
      include: [{ model: Account, as: 'Children', attributes: ['id', 'code', 'name', 'type', 'balance'] }],
      order: [['code', 'ASC']],
    });
    res.json({ data: accounts, total: accounts.length });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const account = await Account.findByPk(req.params.id, {
      include: [{ model: Account, as: 'Children' }],
    });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const account = await Account.create(req.body);
    res.status(201).json(account);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const account = await Account.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    if (account.is_system && req.body.code) {
      return res.status(400).json({ message: 'Cannot change code of system account' });
    }
    await account.update(req.body);
    res.json(account);
  } catch (err) { next(err); }
};

exports.ledger = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = { account_id: req.params.id };
    if (from || to) {
      where['$JournalEntry.entry_date$'] = {};
      if (from) where['$JournalEntry.entry_date$'][Op.gte] = from;
      if (to) where['$JournalEntry.entry_date$'][Op.lte] = to;
    }

    const lines = await JournalLine.findAll({
      where,
      include: [{ model: require('../models').JournalEntry, attributes: ['entry_number', 'entry_date', 'description'] }],
      order: [[require('../models').JournalEntry, 'entry_date', 'ASC']],
    });

    let balance = 0;
    const withBalance = lines.map((l) => {
      balance += parseFloat(l.debit) - parseFloat(l.credit);
      return { ...l.toJSON(), running_balance: balance };
    });
    res.json(withBalance);
  } catch (err) { next(err); }
};

exports.openingBalance = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { entries, date, notes } = req.body;
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'entries array is required' });
    }

    const companyId = req.user.company_id || 1;
    const entryDate = date || new Date().toISOString().slice(0, 10);
    const period = await AccountingPeriod.findOne({
      where: { company_id: companyId, is_open: true },
      order: [['year', 'DESC'], ['month', 'DESC']],
      transaction: t,
    });
    if (!period) {
      await t.rollback();
      return res.status(400).json({ message: 'No open accounting period found' });
    }

    const entryNum = `OB-${Date.now()}`;
    const totalDebit = entries.reduce((s, e) => s + parseFloat(e.debit || 0), 0);
    const totalCredit = entries.reduce((s, e) => s + parseFloat(e.credit || 0), 0);

    const journal = await JournalEntry.create({
      company_id: companyId,
      period_id: period.id,
      entry_number: entryNum,
      entry_date: entryDate,
      source_type: 'MANUAL',
      reference: 'OPENING-BALANCE',
      description: notes || 'Opening balance entry',
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_posted: true,
      created_by: req.user.id,
    }, { transaction: t });

    const lines = entries
      .filter(e => parseFloat(e.debit || 0) > 0 || parseFloat(e.credit || 0) > 0)
      .map(e => ({
        journal_id: journal.id,
        account_id: e.account_id,
        debit: parseFloat(e.debit || 0),
        credit: parseFloat(e.credit || 0),
        description: 'Opening balance',
      }));

    await JournalLine.bulkCreate(lines, { transaction: t });

    for (const e of lines) {
      const net = parseFloat(e.debit) - parseFloat(e.credit);
      await Account.increment({ balance: net }, { where: { id: e.account_id }, transaction: t });
    }

    await t.commit();
    res.status(201).json({ message: 'Opening balance posted', journal_id: journal.id });
  } catch (err) { await t.rollback(); next(err); }
};

exports.trialBalance = async (req, res, next) => {
  try {
    const { period_id } = req.query;
    const result = await sequelize.query(`
      SELECT a.code, a.name, a.type,
        COALESCE(SUM(jl.debit), 0) AS total_debit,
        COALESCE(SUM(jl.credit), 0) AS total_credit,
        COALESCE(SUM(jl.debit) - SUM(jl.credit), 0) AS net
      FROM accounts a
      LEFT JOIN journal_lines jl ON jl.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jl.journal_id
        ${period_id ? 'AND je.period_id = :period_id' : ''}
      WHERE a.is_active = 1
      GROUP BY a.id
      ORDER BY a.code
    `, { type: QueryTypes.SELECT, replacements: { period_id } });
    res.json(result);
  } catch (err) { next(err); }
};
