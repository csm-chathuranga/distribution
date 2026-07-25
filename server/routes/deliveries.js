const router = require('express').Router();
const { DeliveryNote, Invoice, Customer, User, Route } = require('../models');
const notify = require('../notify');
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');

const { InvoiceLine, Product } = require('../models');

const include = [
  { model: Invoice, attributes: ['id', 'invoice_number', 'total_amount'] },
  { model: Customer, attributes: ['id', 'name', 'phone', 'address'] },
  { model: User, as: 'Driver', attributes: ['id', 'name'] },
  { model: Route, attributes: ['id', 'name'] },
];

// Richer include for single-record detail (includes invoice line items + lat/lng)
const includeDetail = [
  {
    model: Invoice,
    attributes: ['id', 'invoice_number', 'total_amount', 'latitude', 'longitude'],
    include: [
      { model: InvoiceLine, as: 'Lines', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
    ],
  },
  { model: Customer, attributes: ['id', 'name', 'phone', 'address'] },
  { model: User, as: 'Driver', attributes: ['id', 'name'] },
  { model: Route, attributes: ['id', 'name'] },
];

// GET /api/deliveries
router.get('/', async (req, res, next) => {
  try {
    const { status, from, to, driver_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)    where.status    = status;
    if (driver_id) where.driver_id = driver_id;
    if (from || to) {
      where.dn_date = {};
      if (from) where.dn_date[Op.gte] = from;
      if (to) where.dn_date[Op.lte] = to;
    }
    const { count, rows } = await DeliveryNote.findAndCountAll({
      where, include,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['dn_date', 'DESC']],
    });
    res.json({ data: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/deliveries/:id
router.get('/:id', async (req, res, next) => {
  try {
    const dn = await DeliveryNote.findByPk(req.params.id, { include: includeDetail });
    if (!dn) return res.status(404).json({ message: 'Delivery note not found' });
    res.json(dn);
  } catch (err) { next(err); }
});

// POST /api/deliveries
router.post('/', authorize('sales.create'), async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.body.invoice_id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const year = new Date().getFullYear();
    const count = await DeliveryNote.count();
    const dn_number = `DN-${year}-${String(count + 1).padStart(5, '0')}`;
    const dn = await DeliveryNote.create({
      ...req.body,
      company_id: invoice.company_id,
      branch_id:  req.body.branch_id || req.user.branch_id,
      dn_number,
      customer_id: invoice.customer_id,
      delivery_address: req.body.delivery_address || null,
      created_by: req.user.id,
    });
    res.status(201).json(await DeliveryNote.findByPk(dn.id, { include }));
  } catch (err) { next(err); }
});

// PUT /api/deliveries/:id/dispatch
router.put('/:id/dispatch', authorize('sales.create'), async (req, res, next) => {
  try {
    const dn = await DeliveryNote.findByPk(req.params.id);
    if (!dn) return res.status(404).json({ message: 'Not found' });
    if (dn.status !== 'PENDING') return res.status(400).json({ message: 'Can only dispatch PENDING deliveries' });
    const driverId = req.body.driver_id || dn.driver_id;
    await dn.update({ status: 'DISPATCHED', driver_id: driverId, dispatched_at: new Date() });
    const dispatched = await DeliveryNote.findByPk(dn.id, { include });
    const dispatchedBy = req.user.name || `User #${req.user.id}`;
    if (driverId) notify({ userId: driverId, type: 'DELIVERY_DISPATCHED', title: 'Delivery Dispatched', body: `${dispatched.dn_number} has been dispatched to you`, link: `/deliveries/${dn.id}` });
    notify({ roleName: 'admin',       type: 'DELIVERY_DISPATCHED', title: 'Delivery Dispatched', body: `${dispatched.dn_number} dispatched by ${dispatchedBy}`, link: `/deliveries/${dn.id}` });
    notify({ roleName: 'super_admin', type: 'DELIVERY_DISPATCHED', title: 'Delivery Dispatched', body: `${dispatched.dn_number} dispatched by ${dispatchedBy}`, link: `/deliveries/${dn.id}` });
    res.json(dispatched);
  } catch (err) { next(err); }
});

// PUT /api/deliveries/:id/deliver  (allowed: sales.create OR the assigned driver)
router.put('/:id/deliver', async (req, res, next) => {
  try {
    const dn = await DeliveryNote.findByPk(req.params.id);
    if (!dn) return res.status(404).json({ message: 'Not found' });
    const canCreate = req.permissions?.has('sales.create') || req.user?.Role?.name === 'super_admin';
    const isDriver  = dn.driver_id === req.user.id;
    if (!canCreate && !isDriver) return res.status(403).json({ message: 'Insufficient permissions' });
    if (dn.status !== 'DISPATCHED') return res.status(400).json({ message: 'Can only deliver DISPATCHED notes' });
    await dn.update({ status: 'DELIVERED', delivered_at: new Date(), notes: req.body.notes || dn.notes });
    const delivered = await DeliveryNote.findByPk(dn.id, { include });
    notify({ roleName: 'manager',  type: 'DELIVERY_COMPLETED', title: 'Delivery Completed', body: `${delivered.dn_number} delivered successfully`, link: `/deliveries/${dn.id}` });
    notify({ roleName: 'sales_rep', type: 'DELIVERY_COMPLETED', title: 'Delivery Completed', body: `${delivered.dn_number} delivered successfully`, link: `/deliveries/${dn.id}` });
    res.json(delivered);
  } catch (err) { next(err); }
});

// PUT /api/deliveries/:id/return  (allowed: sales.create OR the assigned driver)
router.put('/:id/return', async (req, res, next) => {
  try {
    const dn = await DeliveryNote.findByPk(req.params.id);
    if (!dn) return res.status(404).json({ message: 'Not found' });
    const canCreate = req.permissions?.has('sales.create') || req.user?.Role?.name === 'super_admin';
    const isDriver  = dn.driver_id === req.user.id;
    if (!canCreate && !isDriver) return res.status(403).json({ message: 'Insufficient permissions' });
    if (!['DISPATCHED', 'DELIVERED'].includes(dn.status)) return res.status(400).json({ message: 'Cannot mark as returned' });
    await dn.update({ status: 'RETURNED', notes: req.body.notes || dn.notes });
    const returned = await DeliveryNote.findByPk(dn.id, { include });
    notify({ roleName: 'manager', type: 'DELIVERY_RETURNED', title: 'Delivery Returned', body: `${returned.dn_number} was returned`, link: `/deliveries/${dn.id}` });
    res.json(returned);
  } catch (err) { next(err); }
});

module.exports = router;
