const { forbidden } = require('../utils/response');

/**
 * requireRole('super_admin','partner')
 * requirePermission('timesheets.approve')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return forbidden(res, `Role '${req.user?.role}' cannot access this resource`);
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  const { role, permissions = [] } = req.user || {};
  if (role === 'super_admin' || permissions.includes(permission)) return next();
  return forbidden(res, `Permission '${permission}' required`);
};

const isSelf = (paramKey = 'id') => (req, res, next) => {
  if (req.user.id === req.params[paramKey] || req.user.role === 'super_admin') return next();
  return forbidden(res);
};

module.exports = { requireRole, requirePermission, isSelf };
