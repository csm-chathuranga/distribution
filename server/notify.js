const socket = require('./socket');

// Lazy-require to avoid circular dependency at startup
function getNotification() {
  return require('./models').Notification;
}

/**
 * Save a notification to the DB and push it via Socket.io.
 *
 * @param {object} opts
 * @param {number}  [opts.userId]   - target a specific user
 * @param {string}  [opts.roleName] - target all users of a role
 * @param {string}   opts.type      - e.g. 'INVOICE_POSTED'
 * @param {string}   opts.title     - short heading
 * @param {string}   opts.body      - detail text
 * @param {string}  [opts.link]     - client-side route to navigate to
 * @param {object}  [opts.data]     - arbitrary extra payload
 */
async function notify({ userId, roleName, type, title, body, link, data }) {
  try {
    const Notification = getNotification();
    const record = await Notification.create({
      user_id:   userId   || null,
      role_name: roleName || null,
      type,
      title,
      body,
      link:      link || null,
      data:      data ? JSON.stringify(data) : null,
    });

    const payload = {
      id:         record.id,
      type,
      title,
      body,
      link:       link || null,
      data:       data || null,
      is_read:    false,
      created_at: record.createdAt,
    };

    if (userId)   socket.emitToUser(userId,   'notification', payload);
    if (roleName) socket.emitToRole(roleName, 'notification', payload);
  } catch (err) {
    // Notifications are non-critical — log but never crash the request
    console.error('[notify] error:', err.message);
  }
}

module.exports = notify;
