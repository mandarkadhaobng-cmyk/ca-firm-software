const db = require('../config/database');

/**
 * Attach audit logger to req — call req.audit(action, entity, entityId, meta)
 */
module.exports = (req, res, next) => {
  req.audit = async (action, entity, entityId, meta = {}) => {
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, firm_id, action, entity, entity_id, meta, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [req.user?.id, req.user?.firm_id, action, entity, entityId, JSON.stringify(meta),
         req.ip, req.headers['user-agent']]
      );
    } catch { /* non-blocking */ }
  };
  next();
};
