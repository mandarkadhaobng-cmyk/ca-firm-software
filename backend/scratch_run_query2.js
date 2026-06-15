require('dotenv').config({ path: '.env' });
const db = require('./config/database');

async function run() {
  try {
    await db.query(`ALTER TABLE firms ADD COLUMN IF NOT EXISTS logo_url TEXT, ADD COLUMN IF NOT EXISTS favicon_url TEXT, ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20), ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20);`);
    console.log('Query executed successfully');
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    process.exit(0);
  }
}

run();
