const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT and loads the user.
exports.protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Not authenticated. Please log in.');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Session expired or invalid. Please log in again.');
  }
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or deactivated.');
  req.user = user;
  next();
});

// Role-based access control.
exports.authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have permission to do this.'));

// Admins pass; students may only access the student record linked to their own account.
exports.ownStudentOrAdmin = (param = 'id') => (req, _res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.user.student && String(req.user.student) === String(req.params[param])) return next();
  return next(new ApiError(403, 'You can only access your own information.'));
};
