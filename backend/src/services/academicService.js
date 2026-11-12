const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { escapeRegex, pick, paginate } = require('../utils/helpers');

const FIELDS = ['student', 'subject', 'semester', 'maxInternal', 'maxExam', 'internalMarks', 'examMarks'];
const numeric = (o) => {
  for (const k of ['semester', 'maxInternal', 'maxExam', 'internalMarks', 'examMarks']) {
    if (o[k] === '' || o[k] === null) o[k] = undefined;
    else if (o[k] !== undefined) o[k] = Number(o[k]); // NaN is rejected by schema cast
  }
  return o;
};

exports.list = async (q) => {
  const filter = {};
  if (q.student && mongoose.isValidObjectId(q.student)) filter.student = q.student;
  if (q.semester) filter.semester = Number(q.semester);
  if (q.subject) filter.subject = new RegExp(escapeRegex(q.subject), 'i');
  const { page, limit, skip } = paginate(q);
  const [data, total] = await Promise.all([
    AcademicRecord.find(filter).populate('student', 'studentId fullName').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AcademicRecord.countDocuments(filter),
  ]);
  return { data, total, page, pages: Math.max(Math.ceil(total / limit), 1) };
};

exports.create = async (body, userId) => {
  if (!mongoose.isValidObjectId(body.student) || !(await Student.exists({ _id: body.student }))) throw new ApiError(400, 'Select a valid student');
  const rec = await AcademicRecord.create({ ...numeric(pick(body, FIELDS)), recordedBy: userId });
  return rec.populate('student', 'studentId fullName');
};

exports.update = async (id, body, userId) => {
  const rec = await AcademicRecord.findById(id);
  if (!rec) throw new ApiError(404, 'Academic record not found');
  const { student: _ignored, ...rest } = pick(body, FIELDS); // student cannot be reassigned
  rec.set(numeric(rest));
  rec.recordedBy = userId;
  await rec.save();
  return rec.populate('student', 'studentId fullName');
};

exports.remove = async (id) => {
  const rec = await AcademicRecord.findByIdAndDelete(id);
  if (!rec) throw new ApiError(404, 'Academic record not found');
};

const gradeFor = (p) => (p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : 'F');

exports.forStudent = async (studentId) => {
  const records = await AcademicRecord.find({ student: studentId }).sort({ semester: 1, subject: 1 });
  const obtained = records.reduce((a, r) => a + r.total, 0);
  const max = records.reduce((a, r) => a + r.maxInternal + r.maxExam, 0);
  const percentage = max ? Math.round((obtained / max) * 1000) / 10 : 0;
  const bySem = {};
  records.forEach((r) => {
    bySem[r.semester] = bySem[r.semester] || { obtained: 0, max: 0 };
    bySem[r.semester].obtained += r.total;
    bySem[r.semester].max += r.maxInternal + r.maxExam;
  });
  const sorted = [...records].sort((a, b) => b.percentage - a.percentage);
  return {
    records,
    summary: {
      subjects: records.length, obtained, max, percentage, grade: records.length ? gradeFor(percentage) : '-',
      best: sorted[0] ? { subject: sorted[0].subject, percentage: sorted[0].percentage } : null,
      weakest: sorted.length > 1 ? { subject: sorted[sorted.length - 1].subject, percentage: sorted[sorted.length - 1].percentage } : null,
      semesters: Object.entries(bySem).map(([semester, v]) => ({ semester: Number(semester), percentage: Math.round((v.obtained / v.max) * 1000) / 10 })),
    },
  };
};

exports.report = async ({ department, year, semester }) => {
  const sf = {};
  if (department && mongoose.isValidObjectId(department)) sf.department = department;
  if (year) sf.year = Number(year);
  const students = await Student.find(sf).populate('department', 'name code').select('studentId fullName year department').sort({ studentId: 1 }).limit(5000);
  const match = { student: { $in: students.map((s) => s._id) } };
  if (semester) match.semester = Number(semester);
  const agg = await AcademicRecord.aggregate([
    { $match: match },
    { $group: { _id: '$student', obtained: { $sum: '$total' }, max: { $sum: { $add: ['$maxInternal', '$maxExam'] } }, subjects: { $sum: 1 } } },
  ]);
  const map = new Map(agg.map((a) => [String(a._id), a]));
  return students.map((s) => {
    const a = map.get(String(s._id));
    const percentage = a && a.max ? Math.round((a.obtained / a.max) * 1000) / 10 : null;
    return { student: s, subjects: a?.subjects || 0, obtained: a?.obtained || 0, max: a?.max || 0, percentage, grade: percentage === null ? '-' : gradeFor(percentage) };
  });
};
