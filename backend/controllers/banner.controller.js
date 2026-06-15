const db = require('../config/database');
const { success, created, notFound } = require('../utils/response');

// ── Get active banners (all authenticated users) ──────────────────────────────
exports.getActive = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.title, b.description, b.image_url, b.link_url, b.link_text,
              b.bg_color, b.text_color, b.created_by, b.created_at, b.expires_at,
              u.first_name as author_first, u.last_name as author_last
       FROM banners b
       LEFT JOIN users u ON u.id = b.created_by
       WHERE b.firm_id=$1
         AND b.is_active=true
         AND (b.expires_at IS NULL OR b.expires_at > NOW())
       ORDER BY b.created_at DESC`,
      [req.user.firm_id]
    );
    success(res, rows);
  } catch (e) {
    // Table may not exist yet — return empty array gracefully
    if (e.message && e.message.includes('does not exist')) {
      success(res, []);
    } else {
      throw e;
    }
  }
};

// ── Get all banners including inactive (admin/partner/hr only) ─────────────────
exports.getAll = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.title, b.description, b.image_url, b.link_url, b.link_text,
              b.bg_color, b.text_color, b.is_active, b.created_by,
              b.created_at, b.updated_at, b.expires_at,
              u.first_name as author_first, u.last_name as author_last
       FROM banners b
       LEFT JOIN users u ON u.id = b.created_by
       WHERE b.firm_id=$1
       ORDER BY b.created_at DESC`,
      [req.user.firm_id]
    );
    success(res, rows);
  } catch (e) {
    if (e.message && e.message.includes('does not exist')) {
      success(res, []);
    } else {
      throw e;
    }
  }
};

// ── Create banner ─────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  const { title, description, imageUrl, linkUrl, linkText, bgColor, textColor, expiresAt } = req.body;
  const { rows } = await db.query(
    `INSERT INTO banners
       (firm_id, title, description, image_url, link_url, link_text,
        bg_color, text_color, expires_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [req.user.firm_id, title, description || null, imageUrl || null,
     linkUrl || null, linkText || null,
     bgColor || '#1e40af', textColor || '#ffffff',
     expiresAt || null, req.user.id]
  );
  created(res, rows[0]);
};

// ── Update banner ─────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  const { title, description, imageUrl, linkUrl, linkText, bgColor, textColor, isActive, expiresAt } = req.body;
  const { rows } = await db.query(
    `UPDATE banners SET
       title=$1, description=$2, image_url=$3, link_url=$4, link_text=$5,
       bg_color=$6, text_color=$7, is_active=$8, expires_at=$9, updated_at=NOW()
     WHERE id=$10 AND firm_id=$11
     RETURNING *`,
    [title, description || null, imageUrl || null, linkUrl || null, linkText || null,
     bgColor || '#1e40af', textColor || '#ffffff',
     isActive !== false, expiresAt || null,
     req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Delete banner ─────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM banners WHERE id=$1 AND firm_id=$2 RETURNING id`,
    [req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, null, 'Banner deleted');
};
