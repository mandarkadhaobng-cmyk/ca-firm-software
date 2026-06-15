const db        = require('../config/database');
const { success } = require('../utils/response');
const path      = require('path');

// ── GET /firms/me ────────────────────────────────────────────────────────────
exports.getFirm = async (req, res) => {
  const firmId = req.user.firm_id || req.user.firmId;
  const { rows } = await db.query(
    `SELECT
       f.id, f.name, f.registration_number, f.email, f.phone, f.website,
       f.address, f.city, f.state, f.pincode, f.country,
       f.logo_url, f.favicon_url,
       f.primary_color, f.accent_color,
       f.gstin, f.pan,
       f.created_at, f.updated_at
     FROM firms f
     WHERE f.id = $1`,
    [firmId]
  );
  success(res, rows[0] || {});
};

// ── PUT /firms/me ────────────────────────────────────────────────────────────
exports.updateFirm = async (req, res) => {
  // Accept both camelCase (API) and snake_case (React form with react-hook-form)
  const b = req.body;
  const name              = b.name;
  const registrationNumber = b.registrationNumber ?? b.registration_number;
  const email             = b.email;
  const phone             = b.phone;
  const website           = b.website;
  const address           = b.address;
  const city              = b.city;
  const state             = b.state;
  const pincode           = b.pincode;
  const country           = b.country;
  const gstin             = b.gstin;
  const pan               = b.pan;
  const logoUrl           = b.logoUrl    ?? b.logo_url;
  const faviconUrl        = b.faviconUrl ?? b.favicon_url;
  const primaryColor      = b.primaryColor ?? b.primary_color;
  const accentColor       = b.accentColor  ?? b.accent_color;

  const firmId = req.user.firm_id || req.user.firmId;
  const { rows } = await db.query(
    `UPDATE firms SET
       name                = COALESCE($2, name),
       registration_number = COALESCE($3, registration_number),
       email               = COALESCE($4, email),
       phone               = COALESCE($5, phone),
       website             = COALESCE($6, website),
       address             = COALESCE($7, address),
       city                = COALESCE($8, city),
       state               = COALESCE($9, state),
       pincode             = COALESCE($10, pincode),
       country             = COALESCE($11, country),
       gstin               = COALESCE($12, gstin),
       pan                 = COALESCE($13, pan),
       logo_url            = COALESCE($14, logo_url),
       favicon_url         = COALESCE($15, favicon_url),
       primary_color       = COALESCE($16, primary_color),
       accent_color        = COALESCE($17, accent_color),
       updated_at          = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      firmId,
      name, registrationNumber, email, phone, website,
      address, city, state, pincode, country,
      gstin, pan,
      logoUrl, faviconUrl,
      primaryColor, accentColor,
    ]
  );

  success(res, rows[0], 'Firm settings saved');
};

// ── POST /firms/me/logo ──────────────────────────────────────────────────────
// Expects multipart/form-data with field "logo".
// If Cloudflare R2 is configured the file is uploaded there;
// otherwise the URL sent in the body JSON is stored as-is (URL mode).
exports.uploadLogo = async (req, res) => {
  const firmId = req.user.firm_id || req.user.firmId;
  // If a URL was provided directly (no file upload infra needed)
  if (req.body?.logoUrl) {
    const { rows } = await db.query(
      `UPDATE firms SET logo_url=$2, updated_at=NOW() WHERE id=$1 RETURNING logo_url`,
      [firmId, req.body.logoUrl]
    );
    return success(res, { logoUrl: rows[0].logo_url });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  // ── R2 / S3 upload (optional, only if env vars are set) ──────────────────
  if (process.env.R2_BUCKET) {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const ext      = path.extname(req.file.originalname);
    const key      = `logos/${firmId}${ext}`;
    const mimeType = req.file.mimetype;

    await s3.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET,
      Key:         key,
      Body:        req.file.buffer,
      ContentType: mimeType,
    }));

    const logoUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    const { rows } = await db.query(
      `UPDATE firms SET logo_url=$2, updated_at=NOW() WHERE id=$1 RETURNING logo_url`,
      [firmId, logoUrl]
    );
    return success(res, { logoUrl: rows[0].logo_url });
  }

  // Fallback: return a dummy URL (dev mode without R2)
  return res.status(501).json({
    success: false,
    message: 'File upload not configured. Set R2_BUCKET env var or provide a logoUrl string.',
  });
};
