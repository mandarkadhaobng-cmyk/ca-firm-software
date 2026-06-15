const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'ca_firm_db',
  user:     process.env.DB_USER     || 'ca_firm_user',
  password: process.env.DB_PASSWORD || '',
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max:      20,          // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release();
  }
});

/**
 * Run a query with optional params.
 * Usage: const { rows } = await db.query('SELECT * FROM users WHERE id=$1', [id])
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client for transactions.
 * Usage:
 *   const client = await db.getClient()
 *   await client.query('BEGIN')
 *   ...
 *   await client.query('COMMIT')
 *   client.release()
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };