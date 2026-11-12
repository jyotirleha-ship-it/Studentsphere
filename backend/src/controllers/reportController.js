const asyncHandler = require('../utils/asyncHandler');
const studentService = require('../services/studentService');
const attendanceService = require('../services/attendanceService');
const academicService = require('../services/academicService');
const { toCSV, sendCSV } = require('../utils/csv');

exports.student = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const [student, attendance, academic] = await Promise.all([studentService.get(id), attendanceService.summary(id), academicService.forStudent(id)]);
  const monthly = await attendanceService.monthly(id);
  res.json({ success: true, data: { generatedAt: new Date(), student, attendance: { ...attendance, monthly }, academic } });
});

exports.attendanceMonthly = asyncHandler(async (req, res) => {
  const report = await attendanceService.monthlyReport(req.query);
  if (req.query.format !== 'csv') return res.json({ success: true, data: report });
  const cols = [
    { header: 'Student ID', value: (r) => r.student.studentId }, { header: 'Name', value: (r) => r.student.fullName },
    { header: 'Department', value: (r) => r.student.department?.name }, { header: 'Year', value: (r) => r.student.year },
    { header: 'Present', value: (r) => r.present }, { header: 'Absent', value: (r) => r.absent },
    { header: 'Total Days', value: (r) => r.total }, { header: 'Attendance %', value: (r) => r.percentage },
  ];
  return sendCSV(res, `attendance-${report.month}.csv`, toCSV(cols, report.rows));
});

exports.academic = asyncHandler(async (req, res) => {
  const rows = await academicService.report(req.query);
  if (req.query.format !== 'csv') return res.json({ success: true, data: rows });
  const cols = [
    { header: 'Student ID', value: (r) => r.student.studentId }, { header: 'Name', value: (r) => r.student.fullName },
    { header: 'Department', value: (r) => r.student.department?.name }, { header: 'Year', value: (r) => r.student.year },
    { header: 'Subjects', value: (r) => r.subjects }, { header: 'Marks Obtained', value: (r) => r.obtained },
    { header: 'Maximum Marks', value: (r) => r.max }, { header: 'Percentage', value: (r) => r.percentage ?? '' }, { header: 'Grade', value: (r) => r.grade },
  ];
  return sendCSV(res, 'academic-report.csv', toCSV(cols, rows));
});
