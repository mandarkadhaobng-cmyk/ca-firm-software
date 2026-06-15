require('dotenv').config({ path: '.env' });
const db = require('./config/database');

async function test() {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.title, b.description, b.image_url, b.link_url, b.link_text,
              b.bg_color, b.text_color, b.created_by, b.created_at, b.expires_at,
              u.first_name as author_first, u.last_name as author_last
       FROM banners b
       LEFT JOIN users u ON u.id = b.created_by
       WHERE b.firm_id='00000000-0000-0000-0000-000000000001'
         AND b.is_active=true
         AND (b.expires_at IS NULL OR b.expires_at > NOW())
       ORDER BY b.created_at DESC`
    );
    console.log('Query Success:', rows.length);
  } catch (err) {
    console.error('Query Failed:', err.message);
  }
  process.exit(0);
}
test();
