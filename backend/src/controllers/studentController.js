const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const studentService = require('../services/studentService');
const attendanceService = require('../services/attendanceService');
const academicService = require('../services/academicService');
const statsService = require('../services/statsService');
const { toCSV, sendCSV } = require('../utils/csv');

exports.list = asyncHandler(async (req, res) => res.json({ success: true, ...(await studentService.list(req.query)) }));
exports.options = asyncHandler(async (_req, res) => res.json({ success: true, data: await studentService.options() }));
exports.get = asyncHandler(async (req, res) => res.json({ success: true, data: await studentService.get(req.params.id) }));
exports.create = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await studentService.create(req.body) }));
exports.update = asyncHandler(async (req, res) => res.json({ success: true, data: await studentService.update(req.params.id, req.body) }));
exports.remove = asyncHandler(async (req, res) => {
  await studentService.remove(req.params.id);
  res.json({ success: true, message: 'Student and related records deleted' });
});

const requireLinked = (req) => {
  if (!req.user.student) throw new ApiError(404, 'No student profile is linked to this account');
  return req.user.student;
};
exports.me = asyncHandler(async (req, res) => res.json({ success: true, data: await studentService.get(requireLinked(req)) }));
exports.updateMe = asyncHandler(async (req, res) => res.json({ success: true, data: await studentService.selfUpdate(requireLinked(req), req.body) }));

exports.exportCSV = asyncHandler(async (req, res) => {
  const rows = await studentService.listAll(req.query);
  const cols = [
    { header: 'Student ID', value: (s) => s.studentId }, { header: 'Full Name', value: (s) => s.fullName },
    { header: 'Email', value: (s) => s.email }, { header: 'Phone', value: (s) => s.phone },
    { header: 'Date of Birth', value: (s) => s.dateOfBirth }, { header: 'Gender', value: (s) => s.gender },
    { header: 'Department', value: (s) => s.department?.name }, { header: 'Course', value: (s) => s.course?.name },
    { header: 'Year', value: (s) => s.year }, { header: 'Semester', value: (s) => s.semester },
    { header: 'Address', value: (s) => s.address }, { header: 'Enrollment Date', value: (s) => s.enrollmentDate },
    { header: 'Status', value: (s) => s.status },
  ];
  sendCSV(res, `students-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(cols, rows));
});

// Everything a student dashboard needs, in one call.
exports.overview = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const student = await studentService.get(id);
  const [attendance, academic, activities] = await Promise.all([
    attendanceService.history(id, { limit: 30 }),
    academicService.forStudent(id),
    statsService.activities(id),
  ]);
  res.json({ success: true, data: { student, attendance, academic, activities } });
});
