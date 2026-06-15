/**
 * Master Notification Engine
 * Dispatches notifications across all configured channels.
 * Each notification type has configurable channels in the DB.
 */
const db                   = require('../config/database');
const { sendEmail }        = require('./email.provider');
const { sendSMS }          = require('./sms.provider');
const { sendWhatsApp }     = require('./whatsapp.provider');
let   io;                  // set by socket.server.js after init

const setSocketIO = (socketInstance) => { io = socketInstance; };

/**
 * Default channels per event type.
 * Used when a firm has no notification_configs row for an event.
 */
const DEFAULT_CHANNELS = {
  leave_request:       ['inapp', 'email'],
  leave_approved:      ['inapp', 'email'],
  leave_rejected:      ['inapp', 'email'],
  timesheet_submitted: ['inapp'],
  timesheet_approved:  ['inapp'],
  timesheet_rejected:  ['inapp', 'email'],
  holiday_announced:   ['inapp'],
  notice_published:    ['inapp', 'email'],
  payroll_approved:    ['inapp', 'email'],
  payslip_ready:       ['inapp'],
  payslip_bulk_sent:   ['inapp'],
};

/**
 * Get the enabled channels for a notification type from DB.
 * Falls back to sensible defaults if not configured for this firm.
 */
const getChannels = async (firmId, notificationType) => {
  try {
    const { rows } = await db.query(
      `SELECT channels FROM notification_configs
       WHERE firm_id=$1 AND event_type=$2 AND is_active=true LIMIT 1`,
      [firmId, notificationType]
    );
    return rows[0]?.channels || DEFAULT_CHANNELS[notificationType] || ['inapp'];
  } catch { return DEFAULT_CHANNELS[notificationType] || ['inapp']; }
};

/**
 * Core dispatch function.
 * @param {Object} opts
 * @param {string}   opts.firmId
 * @param {string[]} opts.recipientIds   — user IDs to notify
 * @param {string}   opts.type           — e.g. 'leave_request', 'timesheet_approved'
 * @param {string}   opts.title
 * @param {string}   opts.message
 * @param {string}   [opts.link]         — optional in-app link
 * @param {Object}   [opts.meta]         — extra data
 */
const dispatch = async ({ firmId, recipientIds = [], type, title, message, link, meta = {} }) => {
  if (!recipientIds.length) return;

  const channels = await getChannels(firmId, type);

  // 1. In-App — always insert to DB
  for (const userId of recipientIds) {
    try {
      const { rows } = await db.query(
        `INSERT INTO notifications (user_id, firm_id, type, title, message, link, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [userId, firmId, type, title, message, link || null, JSON.stringify(meta)]
      );
      // Push via WebSocket if user is online
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          id: rows[0].id, type, title, message, link, meta, createdAt: new Date(),
        });
      }
    } catch { /* non-blocking */ }
  }

  if (channels.length === 1 && channels[0] === 'inapp') return;

  // 2. Get recipients' contact info for other channels
  let recipients = [];
  try {
    const { rows } = await db.query(
      `SELECT id, email, phone, whatsapp_number FROM users WHERE id = ANY($1::uuid[])`,
      [recipientIds]
    );
    recipients = rows;
  } catch { return; }

  // 3. Email
  if (channels.includes('email')) {
    for (const r of recipients) {
      if (!r.email) continue;
      sendEmail({
        to:        r.email,
        subject:   title,
        message,
        link,
        linkText:  meta?.linkText || 'View in App',
        firmName:  meta?.firmName || process.env.FIRM_NAME,
      }).catch(err => console.error('[Email] send error:', err.message));
    }
  }

  // 4. SMS
  if (channels.includes('sms')) {
    for (const r of recipients) {
      if (!r.phone) continue;
      sendSMS({ to: r.phone, message: `${title}: ${message}` })
        .catch(err => console.error('SMS error:', err.message));
    }
  }

  // 5. WhatsApp
  if (channels.includes('whatsapp')) {
    for (const r of recipients) {
      const num = r.whatsapp_number || r.phone;
      if (!num) continue;
      sendWhatsApp({ to: num, message: `*${title}*\n${message}` })
        .catch(err => console.error('WhatsApp error:', err.message));
    }
  }
};

module.exports = { dispatch, setSocketIO };
