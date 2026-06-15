const db = require('../config/database');

const auditService = {
  async log({ userId, firmId, action, entity, entityId, meta = {}, ip, userAgent }) {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, firm_id, action, entity, entity_id, meta, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [userId, firmId, action, entity, entityId, JSON.stringify(meta), ip, userAgent]
      );
    } catch (err) {
      console.error('Audit log error:', err.message);
    }
  },

  async getByEntity(entity, entityId, firmId) {
    const { rows } = await db.query(
      `SELECT al.*, u.first_name, u.last_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.entity=$1 AND al.entity_id=$2 AND al.firm_id=$3
       ORDER BY al.created_at DESC LIMIT 50`,
      [entity, entityId, firmId]
    );
    return rows;
  },

  async getByUser(userId, firmId, limit = 50) {
    const { rows } = await db.query(
      `SELECT * FROM audit_logs WHERE user_id=$1 AND firm_id=$2 ORDER BY created_at DESC LIMIT $3`,
      [userId, firmId, limit]
    );
    return rows;
  },
};

module.exports = auditService;
