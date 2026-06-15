/**
 * Public routes — NO authentication required.
 * Used by the login screen to fetch dynamic branding before the user logs in.
 */
const router = require('express').Router();
const db     = require('../config/database');

/**
 * GET /api/public/branding
 * Returns only safe, public branding fields (no secrets).
 * The frontend uses this to style the login page dynamically.
 */
router.get('/branding', async (req, res) => {
  try {
    // We can't scope by firm_id here because the user hasn't logged in yet.
    // For single-firm deployments (which this app targets) we just return the
    // first active branding row.  Multi-tenant SaaS would use a subdomain or
    // query param to identify the firm.
    const { rows } = await db.query(
      `SELECT firm_name, logo_url, favicon_url,
              primary_color, accent_color, bg_color, text_color, tagline,
              theme_settings
       FROM branding_settings
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 1`
    );
    res.json({ success: true, data: rows[0] || {} });
  } catch {
    // Graceful fallback — login page will use hardcoded defaults
    res.json({ success: true, data: {} });
  }
});

module.exports = router;
