const Student = require('../models/Student');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const { pct } = require('../utils/helpers');

exports.admin = async () => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [total, active, inactive, departments, courses, users, recent, attStatus, attTrend, perfByDept, grades, overallPerf, byYear] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ status: 'active' }),
    Student.countDocuments({ status: 'inactive' }),
    Department.countDocuments(),
    Course.countDocuments(),
    User.countDocuments(),
    Student.find().sort({ createdAt: -1 }).limit(6).populate('department', 'name code').select('studentId fullName email department year status profileImage createdAt'),
    Attendance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Attendance.aggregate([
      { $match: { date: { $gte: since } } },
      { $group: { _id: { d: '$date', s: '$status' }, count: { $sum: 1 } } },
    ]),
    AcademicRecord.aggregate([
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 's' } },
      { $unwind: '$s' },
      { $group: { _id: '$s.department', obtained: { $sum: '$total' }, max: { $sum: { $add: ['$maxInternal', '$maxExam'] } }, records: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'd' } },
      { $unwind: '$d' },
      { $project: { name: '$d.name', code: '$d.code', records: 1, percentage: { $round: [{ $multiply: [{ $divide: ['$obtained', '$max'] }, 100] }, 1] } } },
      { $sort: { percentage: -1 } },
    ]),
    AcademicRecord.aggregate([{ $group: { _id: '$grade', count: { $sum: 1 } } }]),
    AcademicRecord.aggregate([{ $group: { _id: null, obtained: { $sum: '$total' }, max: { $sum: { $add: ['$maxInternal', '$maxExam'] } }, records: { $sum: 1 } } }]),
    Student.aggregate([{ $group: { _id: '$year', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);

  const present = attStatus.find((a) => a._id === 'present')?.count || 0;
  const absent = attStatus.find((a) => a._id === 'absent')?.count || 0;

  const days = {};
  attTrend.forEach(({ _id, count }) => {
    const k = _id.d.toISOString().slice(0, 10);
    days[k] = days[k] || { date: k, present: 0, absent: 0 };
    days[k][_id.s] = count;
  });
  const trend = Object.values(days).sort((a, b) => a.date.localeCompare(b.date)).slice(-10).map((d) => ({ ...d, percentage: pct(d.present, d.present + d.absent) }));

  const op = overallPerf[0];
  return {
    totals: { students: total, active, inactive, departments, courses, users },
    attendance: { present, absent, total: present + absent, percentage: pct(present, present + absent), trend },
    performance: {
      average: op ? Math.round((op.obtained / op.max) * 1000) / 10 : 0,
      records: op?.records || 0,
      byDepartment: perfByDept,
      grades: ['A+', 'A', 'B', 'C', 'D', 'F'].map((g) => ({ grade: g, count: grades.find((x) => x._id === g)?.count || 0 })),
    },
    studentsByYear: byYear.map((y) => ({ year: y._id, count: y.count })),
    recentRegistrations: recent,
  };
};

// Recent activity feed for a single student (derived from real records).
exports.activities = async (studentId) => {
  const [att, marks, student] = await Promise.all([
    Attendance.find({ student: studentId }).sort({ updatedAt: -1 }).limit(6),
    AcademicRecord.find({ student: studentId }).sort({ updatedAt: -1 }).limit(6),
    Student.findById(studentId).select('createdAt updatedAt'),
  ]);
  const items = [
    ...att.map((a) => ({ type: 'attendance', text: `Marked ${a.status} on ${a.date.toISOString().slice(0, 10)}`, at: a.updatedAt })),
    ...marks.map((m) => ({ type: 'marks', text: `${m.subject}: ${m.total}/${m.maxInternal + m.maxExam} (${m.grade})`, at: m.updatedAt })),
  ];
  if (student) {
    items.push({ type: 'profile', text: 'Account created', at: student.createdAt });
    if (student.updatedAt - student.createdAt > 60000) items.push({ type: 'profile', text: 'Profile updated', at: student.updatedAt });
  }
  return items.sort((a, b) => b.at - a.at).slice(0, 10);
};
