require('dotenv').config({ path: '.env' });
const db = require('./config/database');

async function run() {
  try {
    const { rows } = await db.query(`SELECT id, email, status, role_id, firm_id FROM users`);
    console.log(rows);
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    process.exit(0);
  }
}

run();
