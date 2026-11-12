const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/academicService');

exports.list = asyncHandler(async (req, res) => res.json({ success: true, ...(await svc.list(req.query)) }));
exports.create = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await svc.create(req.body, req.user._id) }));
exports.update = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.update(req.params.id, req.body, req.user._id) }));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.id);
  res.json({ success: true, message: 'Record deleted' });
});
exports.forStudent = asyncHandler(async (req, res) => res.json({ success: true, data: await svc.forStudent(req.params.id) }));
