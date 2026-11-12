const asyncHandler = require('../utils/asyncHandler');
const stats = require('../services/statsService');

exports.admin = asyncHandler(async (_req, res) => res.json({ success: true, data: await stats.admin() }));
