require('dotenv').config({ path: '../backend/.env' });
const db = require('../backend/config/database');

async function run() {
  try {
    await db.query(`ALTER TABLE firms ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50), ADD COLUMN IF NOT EXISTS website VARCHAR(255), ADD COLUMN IF NOT EXISTS city VARCHAR(100), ADD COLUMN IF NOT EXISTS state VARCHAR(100), ADD COLUMN IF NOT EXISTS pincode VARCHAR(20), ADD COLUMN IF NOT EXISTS country VARCHAR(100);`);
    console.log('Query executed successfully');
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    process.exit(0);
  }
}

run();
