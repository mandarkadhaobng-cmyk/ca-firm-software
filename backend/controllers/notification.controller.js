const notificationService = require('../services/notification.service');
const { sendSuccess } = require('../utils/response');
const { query } = require('../config/database');

exports.getAll = async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const result = await notificationService.getAll(req.user.id, req.user.firmId, {
    page: parseInt(page), limit: parseInt(limit), unreadOnly: unreadOnly === 'true',
  });
  sendSuccess(res, result);
};

exports.getUnreadCount = async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [req.user.id]
  );
  sendSuccess(res, { count: parseInt(rows[0].count) });
};

exports.markRead = async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  sendSuccess(res, null, 'Marked as read');
};

exports.markAllRead = async (req, res) => {
  await notificationService.markAllAsRead(req.user.id, req.user.firmId);
  sendSuccess(res, null, 'All marked as read');
};

exports.getConfigs = async (req, res) => {
  const configs = await notificationService.getConfigs(req.user.firmId);
  sendSuccess(res, configs);
};

exports.updateConfig = async (req, res) => {
  const { event_type, channels } = req.body;
  await notificationService.upsertConfig(req.user.firmId, event_type, channels);
  sendSuccess(res, null, 'Notification config updated');
};

// Bulk upsert all channel toggles from the Settings UI
exports.bulkUpsertConfigs = async (req, res) => {
  const { configs } = req.body; // array of { event_type, channels }
  if (!Array.isArray(configs) || configs.length === 0) {
    return res.status(400).json({ success: false, message: 'configs array required' });
  }
  for (const cfg of configs) {
    await notificationService.upsertConfig(req.user.firmId, cfg.event_type, cfg.channels);
  }
  await req.audit('update', 'notification_configs', req.user.firmId, { count: configs.length });
  sendSuccess(res, null, 'Notification configs saved');
};
