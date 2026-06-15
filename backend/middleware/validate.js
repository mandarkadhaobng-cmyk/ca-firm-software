const { badRequest } = require('../utils/response');

/**
 * Joi schema validation middleware.
 * Usage: validate(schema) where schema is a Joi object schema.
 */
const validate = (schema, property = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });
  if (!error) return next();
  const errors = error.details.map(d => ({ field: d.context?.key, message: d.message }));
  return badRequest(res, 'Validation failed', errors);
};

module.exports = validate;
