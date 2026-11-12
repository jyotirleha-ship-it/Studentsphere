const mongoose = require('mongoose');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { pick, escapeRegex } = require('../utils/helpers');

const counts = async (Model, field) => {
  const rows = await Model.aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
};

// Factory for the shared create / update / delete / get behaviour.
const base = (Model, fields, label) => ({
  get: asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new ApiError(404, `${label} not found`);
    res.json({ success: true, data: doc });
  }),
  create: asyncHandler(async (req, res) => {
    const doc = await Model.create(pick(req.body, fields));
    res.status(201).json({ success: true, data: doc });
  }),
  update: asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new ApiError(404, `${label} not found`);
    doc.set(pick(req.body, fields));
    await doc.save();
    res.json({ success: true, data: doc });
  }),
});

const dept = base(Department, ['name', 'code', 'head', 'description'], 'Department');
exports.departments = {
  ...dept,
  list: asyncHandler(async (req, res) => {
    const filter = req.query.search ? { name: new RegExp(escapeRegex(req.query.search), 'i') } : {};
    const [docs, sc, cc] = await Promise.all([Department.find(filter).sort('name'), counts(Student, 'department'), counts(Course, 'department')]);
    res.json({ success: true, data: docs.map((d) => ({ ...d.toJSON(), studentCount: sc.get(String(d._id)) || 0, courseCount: cc.get(String(d._id)) || 0 })) });
  }),
  remove: asyncHandler(async (req, res) => {
    const [s, c] = await Promise.all([Student.countDocuments({ department: req.params.id }), Course.countDocuments({ department: req.params.id })]);
    if (s || c) throw new ApiError(409, `Cannot delete: ${s} student(s) and ${c} course(s) belong to this department`);
    if (!(await Department.findByIdAndDelete(req.params.id))) throw new ApiError(404, 'Department not found');
    res.json({ success: true, message: 'Department deleted' });
  }),
};

const course = base(Course, ['name', 'code', 'department', 'durationYears', 'description'], 'Course');
exports.courses = {
  ...course,
  create: asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.body.department) || !(await Department.exists({ _id: req.body.department }))) throw new ApiError(400, 'Select a valid department');
    const doc = await Course.create(pick(req.body, ['name', 'code', 'department', 'durationYears', 'description']));
    res.status(201).json({ success: true, data: await doc.populate('department', 'name code') });
  }),
  list: asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.department && mongoose.isValidObjectId(req.query.department)) filter.department = req.query.department;
    if (req.query.search) filter.name = new RegExp(escapeRegex(req.query.search), 'i');
    const [docs, sc] = await Promise.all([Course.find(filter).populate('department', 'name code').sort('name'), counts(Student, 'course')]);
    res.json({ success: true, data: docs.map((d) => ({ ...d.toJSON(), studentCount: sc.get(String(d._id)) || 0 })) });
  }),
  remove: asyncHandler(async (req, res) => {
    const s = await Student.countDocuments({ course: req.params.id });
    if (s) throw new ApiError(409, `Cannot delete: ${s} student(s) are enrolled in this course`);
    if (!(await Course.findByIdAndDelete(req.params.id))) throw new ApiError(404, 'Course not found');
    res.json({ success: true, message: 'Course deleted' });
  }),
};
