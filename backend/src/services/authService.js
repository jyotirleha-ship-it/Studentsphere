const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const studentService = require('./studentService');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, student: u.student || null });

exports.login = async ({ email, password, role }) => {
  if (!email || !password) throw new ApiError(400, 'Email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(String(password)))) throw new ApiError(401, 'Incorrect email or password');
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated. Contact the administrator.');
  if (role && role !== user.role) {
    throw new ApiError(403, user.role === 'admin' ? 'This is an administrator account. Use the Administrator login.' : 'This is a student account. Use the Student login.');
  }
  user.lastLogin = new Date();
  await user.save();
  return { token: signToken(user), user: publicUser(user) };
};

exports.register = async (body) => {
  if (!body.password || String(body.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  await studentService.create(body); // creates Student + linked User (role: student)
  return exports.login({ email: body.email, password: body.password, role: 'student' });
};

exports.publicUser = publicUser;
