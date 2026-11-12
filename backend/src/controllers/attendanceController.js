const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/attendanceService');

exports.roster = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.roster(req.query) }));
exports.markBulk = asyncHandler(async (req, res) => res.json({ success: true, ...(await svc.markBulk(req.body, req.user._id)), message: 'Attendance saved' }));
exports.history = asyncHandler(async (req, res) => res.json({ success: true, ...(await svc.history(req.params.id, req.query)) }));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  res.json({ success: true, message: 'Attendance record deleted' });
});
