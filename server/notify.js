const { db, messaging } = require('./firebase-admin');

function getModels() {
  return require('./models');
}

async function notify({ userId, roleName, type, title, body, link, data }) {
  try {
    const { Notification, User, Role } = getModels();

    // 1. Persist to MySQL — keeps REST /notifications working
    const record = await Notification.create({
      user_id:   userId   || null,
      role_name: roleName || null,
      type, title, body,
      link: link || null,
      data: data ? JSON.stringify(data) : null,
    });

    // 2. Write to Firestore → triggers onSnapshot on all open clients instantly
    if (db) {
      const recipients = [];
      if (userId)   recipients.push(`user:${userId}`);
      if (roleName) recipients.push(`role:${roleName}`);

      const { FieldValue } = require('firebase-admin/firestore');
      await db.collection('notifications').doc(String(record.id)).set({
        id: record.id,
        recipients,
        type, title, body,
        link:       link || null,
        data:       data || null,
        is_read:    false,
        created_at: FieldValue.serverTimestamp(),
      });
    }

    // 3. FCM push → works when app is background or closed
    if (messaging) {
      const where = {};
      if (userId) {
        where.id = userId;
      } else if (roleName) {
        const role = await Role.findOne({ where: { name: roleName } });
        if (role) where.role_id = role.id;
      }

      if (Object.keys(where).length) {
        const users  = await User.findAll({ where, attributes: ['fcm_token'], raw: true });
        const tokens = users.map(u => u.fcm_token).filter(Boolean);
        if (tokens.length) {
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title, body: body || '' },
            data:         { link: link || '/', notif_id: String(record.id) },
            android:      { priority: 'high' },
            webpush:      {
              notification: { title, body: body || '', icon: '/logo.png' },
              fcmOptions:   { link: link || '/' },
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[notify] error:', err.message);
  }
}

module.exports = notify;
