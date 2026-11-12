const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const authService = require('../services/authService');
const Department = require('../models/Department');
const Course = require('../models/Course');
const User = require('../models/User');

exports.login = asyncHandler(async (req, res) => res.json({ success: true, ...(await authService.login(req.body)) }));
exports.register = asyncHandler(async (req, res) => res.status(201).json({ success: true, ...(await authService.register(req.body)) }));
exports.me = asyncHandler(async (req, res) => res.json({ success: true, user: authService.publicUser(req.user) }));

// Public: lets the registration form list departments and courses.
exports.options = asyncHandler(async (_req, res) => {
  const [departments, courses] = await Promise.all([Department.find().select('name code').sort('name'), Course.find().select('name code department').sort('name')]);
  res.json({ success: true, departments, courses });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 8) throw new ApiError(400, 'New password must be at least 8 characters');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(String(currentPassword || '')))) throw new ApiError(401, 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});
