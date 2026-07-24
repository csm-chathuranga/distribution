const router = require('express').Router();
const authorize = require('../middleware/authorize');
const { PurchaseOrder, PurchaseOrderLine, Supplier, Product, Warehouse } = require('../models');
const crud = require('../controllers/crudFactory')(PurchaseOrder, {
  include: [{ model: Supplier, attributes: ['id', 'name'] }, { model: Warehouse, attributes: ['id', 'name'] }],
  order: [['po_date', 'DESC']],
});

router.get('/', authorize('purchase.view'), crud.list);
router.get('/:id', authorize('purchase.view'), crud.get);
router.post('/', authorize('purchase.create'), async (req, res, next) => {
  try {
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    const { sequelize } = require('../models');
    const t = await sequelize.transaction();
    try {
      const po = await PurchaseOrder.create(data, { transaction: t });
      if (lines?.length) {
        await PurchaseOrderLine.bulkCreate(lines.map(l => ({ ...l, po_id: po.id })), { transaction: t });
      }
      await t.commit();
      res.status(201).json(await PurchaseOrder.findByPk(po.id, {
        include: [{ model: PurchaseOrderLine, as: 'Lines', include: [{ model: Product }] }, { model: Supplier }],
      }));
    } catch (e) { await t.rollback(); throw e; }
  } catch (err) { next(err); }
});
router.put('/:id', authorize('purchase.approve'), crud.update);
router.put('/:id/approve', authorize('purchase.approve'), async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    await po.update({ status: 'APPROVED', approved_by: req.user.id, approved_at: new Date() });
    res.json(po);
  } catch (err) { next(err); }
});

module.exports = router;
