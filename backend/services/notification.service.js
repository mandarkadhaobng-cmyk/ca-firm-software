const db = require('../config/database');
const { paginate } = require('../utils/pagination');

const notificationService = {
  async getAll(userId, firmId, { page = 1, limit = 20, unreadOnly } = {}) {
    const { limit: lim, offset } = paginate({ page, pageSize: limit });
    const cond = unreadOnly ? `AND read_at IS NULL` : '';

    const [dataRes, countRes, unreadRes] = await Promise.all([
      db.query(
        `SELECT * FROM notifications WHERE user_id=$1 AND firm_id=$2 ${cond}
         ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [userId, firmId, lim, offset]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM notifications WHERE user_id=$1 AND firm_id=$2 ${cond}`,
        [userId, firmId]
      ),
      db.query(
        `SELECT COUNT(*) AS unread FROM notifications WHERE user_id=$1 AND firm_id=$2 AND read_at IS NULL`,
        [userId, firmId]
      ),
    ]);

    return {
      data: dataRes.rows,
      total: parseInt(countRes.rows[0].total),
      unread: parseInt(unreadRes.rows[0].unread),
    };
  },

  async markAsRead(id, userId) {
    await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  },

  async markAllAsRead(userId, firmId) {
    await db.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE user_id = $1 AND firm_id = $2 AND read_at IS NULL`,
      [userId, firmId]
    );
  },

  async getConfigs(firmId) {
    const { rows } = await db.query(
      `SELECT * FROM notification_configs WHERE firm_id = $1 ORDER BY event_type`,
      [firmId]
    );
    return rows;
  },

  async upsertConfig(firmId, eventType, channels) {
    await db.query(
      `INSERT INTO notification_configs (firm_id, event_type, channels)
       VALUES ($1, $2, $3)
       ON CONFLICT (firm_id, event_type)
       DO UPDATE SET channels=$3, updated_at=NOW()`,
      [firmId, eventType, JSON.stringify(channels)]
    );
  },
};

module.exports = notificationService;
