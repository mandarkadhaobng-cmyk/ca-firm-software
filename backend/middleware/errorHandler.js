const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });

  if (err.code === '23505') // PostgreSQL unique violation
    return res.status(409).json({ success: false, message: 'Record already exists' });
  if (err.code === '23503') // FK violation
    return res.status(400).json({ success: false, message: 'Referenced record not found' });

  res.status(err.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
