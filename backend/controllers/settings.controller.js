const db = require('../config/database');
const { success, created, notFound } = require('../utils/response');

// ── Departments ──────────────────────────────────────────────────────────────
exports.getDepartments = async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM departments WHERE firm_id=$1 AND is_active=true ORDER BY name`,
    [req.user.firm_id]
  );
  success(res, rows);
};
exports.createDepartment = async (req, res) => {
  const { rows } = await db.query(
    `INSERT INTO departments (firm_id, name, code, head_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.firm_id, req.body.name, req.body.code, req.body.headId || null]
  );
  created(res, rows[0]);
};
exports.updateDepartment = async (req, res) => {
  const { rows } = await db.query(
    `UPDATE departments SET name=$1, code=$2, head_id=$3, updated_at=NOW()
     WHERE id=$4 AND firm_id=$5 RETURNING *`,
    [req.body.name, req.body.code, req.body.headId || null, req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};
exports.deleteDepartment = async (req, res) => {
  await db.query(`UPDATE departments SET is_active=false WHERE id=$1 AND firm_id=$2`,
    [req.params.id, req.user.firm_id]);
  success(res, null, 'Department removed');
};

// ── Branches ─────────────────────────────────────────────────────────────────
exports.getBranches = async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM branches WHERE firm_id=$1 ORDER BY name`, [req.user.firm_id]
  );
  success(res, rows);
};
exports.createBranch = async (req, res) => {
  const { name, city, state, address, phone } = req.body;
  const { rows } = await db.query(
    `INSERT INTO branches (firm_id, name, city, state, address, phone) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.firm_id, name, city, state, address, phone]
  );
  created(res, rows[0]);
};
exports.updateBranch = async (req, res) => {
  const { name, city, state, address, phone, isActive } = req.body;
  const { rows } = await db.query(
    `UPDATE branches SET name=$1, city=$2, state=$3, address=$4, phone=$5, is_active=$6, updated_at=NOW()
     WHERE id=$7 AND firm_id=$8 RETURNING *`,
    [name, city, state, address, phone, isActive !== false, req.params.id, req.user.firm_id]
  );
  if (!rows.length) return notFound(res);
  success(res, rows[0]);
};

// ── Branding ─────────────────────────────────────────────────────────────────
exports.getBranding = async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM branding_settings WHERE firm_id=$1`, [req.user.firm_id]
  );
  success(res, rows[0] || {});
};
exports.updateBranding = async (req, res) => {
  const b = req.body;
  // Accept both snake_case (React form) and camelCase
  const firmName     = b.firmName     ?? b.firm_name    ?? null;
  const tagline      = b.tagline      ?? null;
  const email        = b.email        ?? null;
  const phone        = b.phone        ?? null;
  const website      = b.website      ?? null;
  const address      = b.address      ?? null;
  const primaryColor = b.primaryColor ?? b.primary_color ?? null;
  const accentColor  = b.accentColor  ?? b.accent_color  ?? null;
  const textColor    = b.textColor    ?? b.text_color    ?? null;
  const bgColor      = b.bgColor      ?? b.bg_color      ?? null;
  const logoUrl      = b.logoUrl      ?? b.logo_url      ?? null;
  const faviconUrl   = b.faviconUrl   ?? b.favicon_url   ?? null;

  let rows;
  try {
    // Full save with all columns (requires migration 004 to have been run)
    ({ rows } = await db.query(
      `INSERT INTO branding_settings
         (firm_id, firm_name, tagline, email, phone, website, address,
          primary_color, accent_color, text_color, bg_color, logo_url, favicon_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (firm_id) DO UPDATE SET
         firm_name     = $2,  tagline       = $3,
         email         = $4,  phone         = $5,
         website       = $6,  address       = $7,
         primary_color = COALESCE($8,  branding_settings.primary_color),
         accent_color  = COALESCE($9,  branding_settings.accent_color),
         text_color    = COALESCE($10, branding_settings.text_color),
         bg_color      = COALESCE($11, branding_settings.bg_color),
         logo_url      = COALESCE($12, branding_settings.logo_url),
         favicon_url   = COALESCE($13, branding_settings.favicon_url),
         updated_at    = NOW()
       RETURNING *`,
      [req.user.firm_id, firmName, tagline, email, phone, website, address,
       primaryColor, accentColor, textColor, bgColor, logoUrl, faviconUrl]
    ));
  } catch (e) {
    // Fallback: migration hasn't been run yet — save only the base columns
    if (e.message && e.message.includes('column') && e.message.includes('does not exist')) {
      ({ rows } = await db.query(
        `INSERT INTO branding_settings
           (firm_id, firm_name, tagline, email, phone, website, address, primary_color, logo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (firm_id) DO UPDATE SET
           firm_name     = $2, tagline       = $3,
           email         = $4, phone         = $5,
           website       = $6, address       = $7,
           primary_color = COALESCE($8, branding_settings.primary_color),
           logo_url      = COALESCE($9, branding_settings.logo_url),
           updated_at    = NOW()
         RETURNING *`,
        [req.user.firm_id, firmName, tagline, email, phone, website, address, primaryColor, logoUrl]
      ));
    } else {
      throw e;
    }
  }
  success(res, rows[0], 'Branding saved');
};

// ── Roles ─────────────────────────────────────────────────────────────────────
exports.getRoles = async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM roles WHERE firm_id=$1 OR is_system=true ORDER BY name`, [req.user.firm_id]
  );
  success(res, rows);
};

// ── Company Policy ────────────────────────────────────────────────────────────
exports.getPolicy = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT policy_text FROM branding_settings WHERE firm_id=$1`, [req.user.firm_id]
    );
    success(res, { policy_text: rows[0]?.policy_text || '' });
  } catch {
    // Column may not exist yet (migration not run) — return empty gracefully
    success(res, { policy_text: '' });
  }
};

exports.updatePolicy = async (req, res) => {
  const policyText = req.body.policyText ?? req.body.policy_text ?? '';
  try {
    await db.query(
      `INSERT INTO branding_settings (firm_id, policy_text)
       VALUES ($1, $2)
       ON CONFLICT (firm_id) DO UPDATE SET policy_text=$2, updated_at=NOW()`,
      [req.user.firm_id, policyText]
    );
    success(res, { policy_text: policyText }, 'Policy saved');
  } catch (e) {
    if (e.message && e.message.includes('column') && e.message.includes('does not exist')) {
      const err = new Error(
        'Run migration: ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS policy_text TEXT;'
      );
      err.statusCode = 422;
      throw err;
    }
    throw e;
  }
};

// ── Email Configuration ───────────────────────────────────────────────────────
exports.getEmailConfig = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT smtp_provider, smtp_host, smtp_port, smtp_user, smtp_from
       FROM branding_settings WHERE firm_id=$1`,
      [req.user.firm_id]
    );
    const cfg = rows[0] || {};
    // Never return the stored password — send a masked placeholder instead
    success(res, {
      smtp_provider: cfg.smtp_provider || 'gmail',
      smtp_host:     cfg.smtp_host     || '',
      smtp_port:     cfg.smtp_port     || 587,
      smtp_user:     cfg.smtp_user     || '',
      smtp_pass:     cfg.smtp_user     ? '••••••••••••••••' : '',  // masked
      smtp_from:     cfg.smtp_from     || '',
    });
  } catch {
    success(res, { smtp_provider: 'gmail', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_from: '' });
  }
};

exports.updateEmailConfig = async (req, res) => {
  const { smtpProvider, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = req.body;

  // Build SET clause — only update password if user actually typed a new one (not the masked placeholder)
  const passwordChanged = smtpPass && smtpPass !== '••••••••••••••••';

  try {
    if (passwordChanged) {
      await db.query(
        `INSERT INTO branding_settings (firm_id, smtp_provider, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (firm_id) DO UPDATE SET
           smtp_provider=$2, smtp_host=$3, smtp_port=$4,
           smtp_user=$5, smtp_pass=$6, smtp_from=$7, updated_at=NOW()`,
        [req.user.firm_id, smtpProvider, smtpHost, smtpPort || 587, smtpUser, smtpPass, smtpFrom]
      );
    } else {
      await db.query(
        `INSERT INTO branding_settings (firm_id, smtp_provider, smtp_host, smtp_port, smtp_user, smtp_from)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (firm_id) DO UPDATE SET
           smtp_provider=$2, smtp_host=$3, smtp_port=$4,
           smtp_user=$5, smtp_from=$6, updated_at=NOW()`,
        [req.user.firm_id, smtpProvider, smtpHost, smtpPort || 587, smtpUser, smtpFrom]
      );
    }
    // Clear cached transporter so next email picks up new settings
    require('../notifications/email.provider').clearCache();
    success(res, null, 'Email settings saved');
  } catch (e) {
    if (e.message && e.message.includes('column') && e.message.includes('does not exist')) {
      const err = new Error('Run migration to add SMTP columns to branding_settings');
      err.statusCode = 422;
      throw err;
    }
    throw e;
  }
};

exports.testEmailConfig = async (req, res) => {
  const nodemailer = require('nodemailer');
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return res.status(400).json({
      success: false,
      message: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in your .env file.',
    });
  }

  const port   = parseInt(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  const t = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
    requireTLS: !secure,
    tls: { rejectUnauthorized: false, ciphers: 'SSLv3' },
  });

  try {
    await t.verify();
    // Send a test email to the admin
    await t.sendMail({
      from:    process.env.EMAIL_FROM || (process.env.FIRM_NAME + ' <' + user + '>'),
      to:      req.user.email,
      subject: 'SMTP Test — CA Practice Manager',
      text:    'SMTP is working correctly. This test was triggered from Admin Settings.',
    });
    success(res, { host, port, user }, 'SMTP verified and test email sent to ' + req.user.email);
  } catch (err) {
    let hint = '';
    if (err.message && (err.message.includes('535') || err.message.includes('Username and Password'))) {
      hint = ' GMAIL FIX: Use a 16-character App Password (not your regular password). ' +
             'Generate at: https://myaccount.google.com/apppasswords';
    }
    return res.status(400).json({ success: false, message: 'SMTP test failed: ' + err.message + hint });
  }
};

// ── Theme Settings ────────────────────────────────────────────────────────────
exports.getTheme = async (req, res) => {
  try {
    // Ensure column exists (safe auto-migration)
    await db.query(
      `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS theme_settings JSONB`
    ).catch(() => {});
    const { rows } = await db.query(
      `SELECT theme_settings FROM branding_settings WHERE firm_id=$1`,
      [req.user.firm_id]
    );
    success(res, rows[0]?.theme_settings || {});
  } catch {
    success(res, {});
  }
};

exports.updateTheme = async (req, res) => {
  const theme = req.body;
  // Ensure column exists
  await db.query(
    `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS theme_settings JSONB`
  ).catch(() => {});
  const { rows } = await db.query(
    `INSERT INTO branding_settings (firm_id, theme_settings)
     VALUES ($1, $2)
     ON CONFLICT (firm_id) DO UPDATE SET theme_settings=$2, updated_at=NOW()
     RETURNING theme_settings`,
    [req.user.firm_id, JSON.stringify(theme)]
  );
  success(res, rows[0]?.theme_settings || theme, 'Theme saved');
};

// ── Leave Rules ───────────────────────────────────────────────────────────────
exports.getLeaveRules = async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM leave_rules WHERE firm_id=$1`, [req.user.firm_id]
  );
  success(res, rows);
};
exports.upsertLeaveRule = async (req, res) => {
  const { leaveType, totalDays, carryForward, description } = req.body;
  const { rows } = await db.query(
    `INSERT INTO leave_rules (firm_id, leave_type, total_days, carry_forward, description)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (firm_id, leave_type)
     DO UPDATE SET total_days=$3, carry_forward=$4, description=$5, updated_at=NOW()
     RETURNING *`,
    [req.user.firm_id, leaveType, totalDays, carryForward || false, description]
  );
  success(res, rows[0]);
};
