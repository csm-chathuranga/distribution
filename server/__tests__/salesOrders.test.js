/**
 * Integration tests for server/routes/salesOrders.js
 *
 * Covers the notification side-effects of:
 *   POST   /api/sales-orders          → notify admin role on new order
 *   PUT    /api/sales-orders/:id/confirm → notify creator on approval
 */

const request = require('supertest');
const express = require('express');

// ─── Mock notify before requiring the router ──────────────────────────────
const mockNotify = jest.fn().mockResolvedValue(undefined);
jest.mock('../notify', () => mockNotify);

// ─── Mock Sequelize models ─────────────────────────────────────────────────
const mockOrderCreate  = jest.fn();
const mockOrderFindOne = jest.fn();
const mockOrderFindByPk = jest.fn();
const mockOrderUpdate   = jest.fn();
const mockCustomerFindByPk = jest.fn().mockResolvedValue(null); // no credit limit by default
const mockBulkCreate    = jest.fn().mockResolvedValue([]);

const mockTransaction = {
  commit:   jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../models', () => ({
  SalesOrder: {
    create:    (...a) => mockOrderCreate(...a),
    findOne:   (...a) => mockOrderFindOne(...a),
    findByPk:  (...a) => mockOrderFindByPk(...a),
    findAll:   jest.fn().mockResolvedValue([]),
    count:     jest.fn().mockResolvedValue(0),
  },
  SalesOrderLine: { bulkCreate: (...a) => mockBulkCreate(...a) },
  Customer:  { findByPk: (...a) => mockCustomerFindByPk(...a) },
  Product:   {},
  Warehouse: {},
  sequelize: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
}));

// ─── Mock authorize middleware (passes through) ───────────────────────────
jest.mock('../middleware/authorize', () => {
  const fn = () => (req, res, next) => next();
  fn.any   = () => (req, res, next) => next();
  return fn;
});

// ─── Mock crudFactory (unused list/get in these tests) ────────────────────
jest.mock('../controllers/crudFactory', () => () => ({
  list:   (req, res) => res.json({ data: [], total: 0 }),
  get:    (req, res) => res.json({}),
  update: (req, res) => res.json({}),
}));

// ─── Build minimal Express app ────────────────────────────────────────────
const salesOrderRouter = require('../routes/salesOrders');

function buildApp(user = { id: 1, name: 'Alice', branch_id: 1 }) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = user; next(); }); // inject auth user
  app.use('/api/sales-orders', salesOrderRouter);
  return app;
}

beforeEach(() => jest.clearAllMocks());

// ─── POST / ───────────────────────────────────────────────────────────────
describe('POST /api/sales-orders', () => {
  const ORDER_PAYLOAD = {
    customer_id:  10,
    warehouse_id: 1,
    order_date:   '2026-10-12',
    lines: [{ product_id: 5, quantity: 2, unit_price: 100, discount: 0 }],
  };

  beforeEach(() => {
    mockOrderCreate.mockResolvedValue({
      id:           99,
      order_number: 'SO-20261012-001',
      created_by:   1,
    });
    // Sequence-number query
    mockOrderFindOne.mockResolvedValue(null);
  });

  test('returns 201 with the new order', async () => {
    const res = await request(buildApp())
      .post('/api/sales-orders')
      .send(ORDER_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.order_number).toBe('SO-20261012-001');
  });

  test('notifies the admin role after creating the order', async () => {
    await request(buildApp()).post('/api/sales-orders').send(ORDER_PAYLOAD);

    // Give the fire-and-forget notify() a tick to run
    await new Promise(r => setImmediate(r));

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        roleName: 'admin',
        type:     'NEW_ORDER',
        title:    'New Sales Order',
        link:     '/sales-orders/99',
      })
    );
  });

  test('notification body contains the sales rep name and order number', async () => {
    const user = { id: 2, name: 'Bob', branch_id: 1 };
    await request(buildApp(user)).post('/api/sales-orders').send(ORDER_PAYLOAD);
    await new Promise(r => setImmediate(r));

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Bob'),
      })
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('SO-20261012-001'),
      })
    );
  });

  test('does NOT notify when credit limit is exceeded (order rejected with 422)', async () => {
    mockCustomerFindByPk.mockResolvedValueOnce({
      credit_limit:        500,
      outstanding_balance: 600,
      name:                'Test Co',
    });

    const res = await request(buildApp()).post('/api/sales-orders').send(ORDER_PAYLOAD);
    await new Promise(r => setImmediate(r));

    expect(res.status).toBe(422);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test('does NOT notify when order creation fails (DB error)', async () => {
    mockOrderCreate.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(buildApp()).post('/api/sales-orders').send(ORDER_PAYLOAD);
    await new Promise(r => setImmediate(r));

    expect(res.status).toBe(500);
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

// ─── PUT /:id/confirm ─────────────────────────────────────────────────────
describe('PUT /api/sales-orders/:id/confirm', () => {
  const mockOrder = {
    id:           99,
    order_number: 'SO-20261012-001',
    created_by:   5,
    status:       'DRAFT',
    update:       jest.fn().mockResolvedValue(undefined),
    toJSON:       function () { return { ...this }; },
  };

  beforeEach(() => {
    mockOrderFindByPk.mockResolvedValue(mockOrder);
    mockOrder.update.mockResolvedValue(undefined);
  });

  test('returns 200 with the updated order', async () => {
    const res = await request(buildApp())
      .put('/api/sales-orders/99/confirm');

    expect(res.status).toBe(200);
  });

  test('returns 404 when order does not exist', async () => {
    mockOrderFindByPk.mockResolvedValueOnce(null);
    const res = await request(buildApp()).put('/api/sales-orders/999/confirm');
    expect(res.status).toBe(404);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test('notifies the order creator (sales rep) on confirmation', async () => {
    await request(buildApp()).put('/api/sales-orders/99/confirm');
    await new Promise(r => setImmediate(r));

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 5,           // order.created_by
        type:   'ORDER_APPROVED',
        title:  'Order Approved',
        link:   '/sales-orders/99',
      })
    );
  });

  test('notification body mentions the order number', async () => {
    await request(buildApp()).put('/api/sales-orders/99/confirm');
    await new Promise(r => setImmediate(r));

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('SO-20261012-001'),
      })
    );
  });

  test('does NOT notify when order has no created_by', async () => {
    mockOrderFindByPk.mockResolvedValueOnce({
      ...mockOrder,
      created_by: null,
      update: jest.fn().mockResolvedValue(undefined),
    });

    await request(buildApp()).put('/api/sales-orders/99/confirm');
    await new Promise(r => setImmediate(r));

    expect(mockNotify).not.toHaveBeenCalled();
  });
});
