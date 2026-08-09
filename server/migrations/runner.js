require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');

async function run() {
  await sequelize.authenticate();

  // Create tracking table if needed
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      run_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [ran] = await sequelize.query('SELECT name FROM _migrations');
  const ranSet = new Set(ran.map(r => r.name));

  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.js') && f !== 'runner.js')
    .sort();

  for (const file of files) {
    if (ranSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }
    console.log(`  run   ${file}`);
    const migration = require(path.join(__dirname, file));
    await migration.up(sequelize);
    await sequelize.query('INSERT INTO _migrations (name) VALUES (?)', { replacements: [file] });
    console.log(`  done  ${file}`);
  }

  await sequelize.close();
  console.log('\nAll migrations complete.');
}

run().catch(err => { console.error(err); process.exit(1); });
