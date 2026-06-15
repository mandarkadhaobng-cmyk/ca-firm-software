const { verifyAccessToken } = require('../config/jwt');
const { unauthorized }      = require('../utils/response');

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return unauthorized(res, 'No token provided');

  try {
    const decoded = verifyAccessToken(header.split(' ')[1]);
    // Normalise both snake_case and camelCase so controllers can use either
    req.user = {
      ...decoded,
      firmId: decoded.firmId || decoded.firm_id,   // camelCase alias
      firm_id: decoded.firm_id || decoded.firmId,  // snake_case alias
    };
    next();
  } catch (err) {
    return unauthorized(res, err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
  }
};
