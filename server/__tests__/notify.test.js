/**
 * Unit tests for server/notify.js
 *
 * Verifies that notify() persists to MySQL, writes to Firestore,
 * and dispatches FCM tokens — all without hitting real infrastructure.
 */

jest.mock('../firebase-admin', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc:        jest.fn().mockReturnThis(),
    set:        jest.fn().mockResolvedValue(undefined),
  },
  messaging: {
    sendEachForMulticast: jest.fn().mockResolvedValue({ responses: [] }),
  },
}));

// firebase/firestore FieldValue used inside notify.js
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => '__SERVER_TS__' },
}));

const mockNotifCreate = jest.fn().mockResolvedValue({ id: 42 });
const mockRoleFindOne = jest.fn();
const mockUserFindAll = jest.fn().mockResolvedValue([]);

jest.mock('../models', () => ({
  Notification: { create: (...a) => mockNotifCreate(...a) },
  Role:         { findOne: (...a) => mockRoleFindOne(...a) },
  User:         { findAll: (...a) => mockUserFindAll(...a) },
}));

const notify         = require('../notify');
const { db, messaging } = require('../firebase-admin');

beforeEach(() => jest.clearAllMocks());

describe('notify()', () => {
  test('persists notification to MySQL with correct fields', async () => {
    await notify({
      roleName: 'admin',
      type:     'NEW_ORDER',
      title:    'New Sales Order',
      body:     'Alice created order SO-001',
      link:     '/sales-orders/1',
    });

    expect(mockNotifCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        role_name: 'admin',
        user_id:   null,
        type:      'NEW_ORDER',
        title:     'New Sales Order',
        body:      'Alice created order SO-001',
        link:      '/sales-orders/1',
      })
    );
  });

  test('writes to Firestore with correct recipients for roleName', async () => {
    await notify({
      roleName: 'admin',
      type:     'NEW_ORDER',
      title:    'New Order',
      body:     'Test body',
    });

    expect(db.collection).toHaveBeenCalledWith('notifications');
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: ['role:admin'],
        type:       'NEW_ORDER',
        is_read:    false,
      })
    );
  });

  test('writes to Firestore with correct recipients for userId', async () => {
    await notify({
      userId: 7,
      type:   'ORDER_APPROVED',
      title:  'Order Approved',
      body:   'Your order was approved',
    });

    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: ['user:7'],
        type:       'ORDER_APPROVED',
      })
    );
  });

  test('sends FCM push to users with fcm_token when userId given', async () => {
    mockUserFindAll.mockResolvedValueOnce([
      { fcm_token: 'token-abc' },
      { fcm_token: null },          // should be filtered out
      { fcm_token: 'token-xyz' },
    ]);

    await notify({ userId: 5, type: 'ORDER_APPROVED', title: 'Approved', body: '' });

    expect(messaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['token-abc', 'token-xyz'],
        notification: { title: 'Approved', body: '' },
      })
    );
  });

  test('skips FCM when no users have fcm_token', async () => {
    mockUserFindAll.mockResolvedValueOnce([{ fcm_token: null }]);

    await notify({ userId: 3, type: 'NEW_ORDER', title: 'T', body: 'B' });

    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });

  test('does not throw when Firebase is unavailable', async () => {
    mockNotifCreate.mockRejectedValueOnce(new Error('DB down'));

    await expect(
      notify({ roleName: 'admin', type: 'NEW_ORDER', title: 'T', body: 'B' })
    ).resolves.toBeUndefined(); // errors are swallowed silently
  });
});
