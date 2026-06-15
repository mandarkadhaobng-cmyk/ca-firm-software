// Core helpers
const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const created = (res, data, message = 'Created successfully') =>
  res.status(201).json({ success: true, message, data });

const paginated = (res, data, total, page, pageSize) =>
  res.status(200).json({
    success: true, data,
    pagination: { total, page: +page, pageSize: +pageSize, totalPages: Math.ceil(total / pageSize) },
  });

const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) =>
  res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });

const notFound   = (res, msg = 'Not found')     => error(res, msg, 404);
const forbidden  = (res, msg = 'Access denied') => error(res, msg, 403);
const badRequest = (res, msg, errors)            => error(res, msg || 'Bad request', 400, errors);
const unauthorized = (res, msg = 'Unauthorized') => error(res, msg, 401);

// Semantic aliases used in newer controllers
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) =>
  success(res, data, message, statusCode);

const sendPaginated = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination });

module.exports = {
  success, created, paginated, error,
  notFound, forbidden, badRequest, unauthorized,
  // Aliases
  sendSuccess, sendPaginated,
};
