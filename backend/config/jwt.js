const jwt = require('jsonwebtoken');

const JWT_SECRET         = process.env.JWT_SECRET         || 'change-this-secret';
const JWT_EXPIRES_IN     = process.env.JWT_EXPIRES_IN      || '8h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'change-this-refresh-secret';
const JWT_REFRESH_EXPIRES= process.env.JWT_REFRESH_EXPIRES_IN || '7d';

module.exports = {
  generateAccessToken: (payload) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),

  generateRefreshToken: (payload) =>
    jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES }),

  verifyAccessToken: (token) =>
    jwt.verify(token, JWT_SECRET),

  verifyRefreshToken: (token) =>
    jwt.verify(token, JWT_REFRESH_SECRET),
};
