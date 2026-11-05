const { Sequelize } = require('sequelize');
const initModels = require('../models/define');
const tenantMap = require('../config/tenants.json');

// Cache: db_name → initialised models object
const pool = {};

function resolveConfig(hostname) {
  const host = (hostname || '').split(':')[0].toLowerCase();
  const entry = tenantMap[host];
  if (!entry) return null;

  return {
    db_name: entry.db_name || process.env.DB_NAME || 'distribution_db',
    db_user: entry.db_user || process.env.DB_USER || 'root',
    db_pass: entry.db_pass != null ? entry.db_pass : (process.env.DB_PASS || ''),
    db_host: entry.db_host || process.env.DB_HOST || 'localhost',
    db_port: entry.db_port || parseInt(process.env.DB_PORT) || 3306,
  };
}

async function getDb(hostname) {
  const cfg = resolveConfig(hostname);
  if (!cfg) return null;

  if (pool[cfg.db_name]) return pool[cfg.db_name];

  const seq = new Sequelize(cfg.db_name, cfg.db_user, cfg.db_pass, {
    host: cfg.db_host,
    port: cfg.db_port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { underscored: true, timestamps: true },
  });

  await seq.authenticate();
  const models = initModels(seq);
  pool[cfg.db_name] = models;
  console.log(`[tenant] Connected to DB: ${cfg.db_name} for host: ${hostname}`);
  return models;
}

module.exports = { getDb };
