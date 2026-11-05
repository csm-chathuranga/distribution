const sequelize = require('../config/database');
const initModels = require('./define');

// Default tenant models — used by migrations, startup health-check,
// and any route that hasn't yet been updated to use req.db.
module.exports = initModels(sequelize);
