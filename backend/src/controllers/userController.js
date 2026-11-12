const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { escapeRegex, paginate } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role && ['admin', 'student'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const { page, limit, skip } = paginate(req.query);
  const [data, total] = await Promise.all([
    User.find(filter).populate('student', 'studentId').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

// Create an administrator, or a login for an existing student that has no account yet.
exports.create = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'admin', student } = req.body;
  if (!password || String(password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  if (role === 'admin') {
    const user = await User.create({ name, email, password, role: 'admin' });
    return res.status(201).json({ success: true, data: user });
  }
  if (!mongoose.isValidObjectId(student)) throw new ApiError(400, 'Select a student for this account');
  const s = await Student.findById(student);
  if (!s) throw new ApiError(404, 'Student not found');
  if (await User.exists({ student: s._id })) throw new ApiError(409, 'This student already has an account');
  const user = await User.create({ name: s.fullName, email: s.email, password, role: 'student', student: s._id, isActive: s.status === 'active' });
  return res.status(201).json({ success: true, data: user });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.isActive !== undefined) {
    if (String(user._id) === String(req.user._id) && !req.body.isActive) throw new ApiError(400, 'You cannot deactivate your own account');
    user.isActive = Boolean(req.body.isActive);
    if (user.student) await Student.updateOne({ _id: user.student }, { status: user.isActive ? 'active' : 'inactive' });
  }
  await user.save();
  res.json({ success: true, data: user });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  if (!req.body.password || String(req.body.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  user.password = req.body.password;
  await user.save();
  res.json({ success: true, message: 'Password reset' });
});

exports.remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user._id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) throw new ApiError(400, 'Cannot delete the last administrator');
  await user.deleteOne(); // the student record is kept; only the login is removed
  res.json({ success: true, message: 'User account deleted' });
});
