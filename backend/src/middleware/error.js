const ApiError = require('../utils/ApiError');

exports.notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  let details;

  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = Object.values(details)[0] || 'Validation failed';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    const label = field === 'studentId' ? 'Student ID' : field.charAt(0).toUpperCase() + field.slice(1);
    message = `${label} already exists`;
    details = { [field]: message };
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request is too large (images must be under ~300KB)';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err.details) {
    details = err.details;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message, details });
};
