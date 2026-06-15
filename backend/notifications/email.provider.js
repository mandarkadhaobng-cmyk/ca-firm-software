/**
 * Email Provider — Nodemailer with Gmail App Password support
 *
 * FIX for "535 Username and Password not accepted":
 * Gmail requires an App Password, NOT your regular Gmail password.
 *
 * Steps to fix:
 *   1. Enable 2-Step Verification on your Google account
 *   2. Go to: https://myaccount.google.com/apppasswords
 *   3. Create an App Password (select "Mail" + "Other")
 *   4. Copy the 16-character password (spaces don't matter, remove them)
 *   5. In your .env file:
 *        SMTP_HOST=smtp.gmail.com
 *        SMTP_PORT=587
 *        SMTP_USER=yourname@gmail.com
 *        SMTP_PASS=xxxxxxxxxxxx  (16-char App Password, no spaces)
 *        EMAIL_FROM=CA Firm Name <yourname@gmail.com>
 */
const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return null;
  }

  const port   = parseInt(process.env.SMTP_PORT) || 587;
  const secure = port === 465;  // true for 465 (SSL), false for 587 (STARTTLS)

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Gmail port 587 → STARTTLS; port 465 → direct SSL (no requireTLS needed)
    requireTLS: !secure,
    tls: {
      rejectUnauthorized: false,
      // Do NOT set ciphers — SSLv3 is disabled in modern Node/OpenSSL
      // and causes Gmail connections to fail silently
    },
    // Connection pool for bulk sending
    pool: true,
    maxConnections: 5,
    maxMessages:    100,
    rateDelta:      1000,  // 1 second between batches
    rateLimit:      5,     // max 5 messages per rateDelta
  });

  // Verify on first use
  transporter.verify()
    .then(() => console.log('[Email] SMTP connected ✓ (' + host + ':' + port + ')'))
    .catch(err => {
      console.error('[Email] SMTP connection error:', err.message);
      if (err.message && err.message.includes('535')) {
        console.error('[Email] Gmail fix: Use an App Password, not your regular password.');
        console.error('[Email] Get one at: https://myaccount.google.com/apppasswords');
      }
      transporter = null;  // reset so next call retries
    });

  return transporter;
};

const buildHtml = ({ subject, message, link, linkText, firmName }) => {
  const firm   = firmName || process.env.FIRM_NAME || 'CA Practice';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const year   = new Date().getFullYear();

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>' +
    '<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;' +
    'overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">' +
    '<tr><td style="background:#1a3a5c;padding:24px 32px;">' +
    '<p style="margin:0;color:#fff;font-size:20px;font-weight:700;">' + firm + '</p>' +
    '<p style="margin:4px 0 0;color:rgba(255,255,255,0.65);font-size:12px;">Practice Management System</p>' +
    '</td></tr>' +
    '<tr><td style="padding:32px;">' +
    '<h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">' + subject + '</h2>' +
    '<p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.7;">' + message + '</p>' +
    (link ? '<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>' +
      '<td style="background:#1a3a5c;border-radius:8px;">' +
      '<a href="' + appUrl + link + '" style="display:inline-block;padding:12px 28px;' +
      'color:#fff;font-size:14px;font-weight:600;text-decoration:none;">' +
      (linkText || 'View in App') + '</a></td></tr></table>' : '') +
    '<p style="margin:0;color:#6b7280;font-size:12px;">This is an automated message. Do not reply.</p>' +
    '</td></tr>' +
    '<tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">' +
    '<p style="margin:0;color:#9ca3af;font-size:11px;">&copy; ' + year + ' ' + firm + '</p>' +
    '</td></tr></table></td></tr></table></body></html>';
};

const sendEmail = async ({ to, subject, message, html, text, link, linkText, firmName, attachments }) => {
  const t = getTransporter();
  if (!t) {
    console.warn('[Email] Skipped — SMTP not configured. To:', to, 'Subject:', subject);
    return;
  }

  const from = process.env.EMAIL_FROM ||
    ((process.env.FIRM_NAME || 'CA Practice') + ' <' + process.env.SMTP_USER + '>');

  return t.sendMail({
    from,
    to,
    subject,
    html:        html || buildHtml({ subject, message, link, linkText, firmName }),
    text:        text || message,
    attachments: attachments || [],
  });
};

module.exports = { sendEmail, getTransporter };
