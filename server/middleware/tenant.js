const { getDb } = require('../services/tenantDb');

module.exports = async (req, res, next) => {
  try {
    const hostname = req.hostname || (req.headers.host || '').split(':')[0];
    const db = await getDb(hostname);

    if (!db) {
      return res.status(503).json({ message: `Tenant not configured for host: ${hostname}` });
    }

    req.db = db;
    next();
  } catch (err) {
    console.error('[tenant] DB connection error:', err.message);
    next(err);
  }
};
