const router = require('express').Router();
const { Op } = require('sequelize');
const authorize = require('../middleware/authorize');
const crud = require('../controllers/crudFactory')('PurchaseOrder', {
  includeFn: (db) => [
    { model: db.Supplier,  attributes: ['id', 'name'] },
    { model: db.Warehouse, attributes: ['id', 'name'] },
  ],
  order: [['po_date', 'DESC']],
});

const generatePONumber = async (PurchaseOrder) => {
  const today = new Date();
  const datePart = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const like = `PO-${datePart}-%`;
  const last = await PurchaseOrder.findOne({ where: { po_number: { [Op.like]: like } }, order: [['id', 'DESC']] });
  const seq = last ? parseInt(last.po_number.split('-').pop()) + 1 : 1;
  return `PO-${datePart}-${String(seq).padStart(3, '0')}`;
};

router.get('/', authorize('purchase.view'), crud.list);
router.get('/:id', authorize('purchase.view'), crud.get);

router.post('/', authorize('purchase.create'), async (req, res, next) => {
  const { sequelize } = req.db;
  const t = await sequelize.transaction();
  try {
    const { PurchaseOrder, PurchaseOrderLine, Product, Supplier } = req.db;
    const { lines, ...data } = req.body;
    data.created_by = req.user.id;
    if (!data.company_id) data.company_id = req.user.Branch?.company_id ?? 1;
    if (!data.branch_id)  data.branch_id  = req.user.branch_id ?? 1;
    if (!data.po_number)  data.po_number  = await generatePONumber(PurchaseOrder);
    if (!data.po_date && data.order_date) data.po_date = data.order_date;
    delete data.order_date;

    const po = await PurchaseOrder.create(data, { transaction: t });
    if (lines?.length) {
      await PurchaseOrderLine.bulkCreate(lines.map(l => ({ ...l, po_id: po.id })), { transaction: t });
    }
    await t.commit();
    res.status(201).json(await PurchaseOrder.findByPk(po.id, {
      include: [{ model: PurchaseOrderLine, as: 'Lines', include: [{ model: Product }] }, { model: Supplier }],
    }));
  } catch (err) { await t.rollback(); next(err); }
});

router.put('/:id', authorize('purchase.approve'), crud.update);

router.put('/:id/approve', authorize('purchase.approve'), async (req, res, next) => {
  try {
    const { PurchaseOrder } = req.db;
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    await po.update({ status: 'APPROVED', approved_by: req.user.id, approved_at: new Date() });
    res.json(po);
  } catch (err) { next(err); }
});

module.exports = router;
