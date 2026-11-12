const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { parseDay, parseMonth, pct, paginate } = require('../utils/helpers');

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const toSummary = (rows) => {
  const present = rows.find((r) => r._id === 'present')?.count || 0;
  const absent = rows.find((r) => r._id === 'absent')?.count || 0;
  return { total: present + absent, present, absent, percentage: pct(present, present + absent) };
};

exports.summary = async (studentId, range) => {
  const match = { student: oid(studentId) };
  if (range) match.date = { $gte: range.start, $lt: range.end };
  return toSummary(await Attendance.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]));
};

exports.monthly = async (studentId) => {
  const rows = await Attendance.aggregate([
    { $match: { student: oid(studentId) } },
    { $group: { _id: { m: { $dateToString: { format: '%Y-%m', date: '$date' } }, s: '$status' }, count: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach(({ _id, count }) => {
    map[_id.m] = map[_id.m] || { month: _id.m, present: 0, absent: 0 };
    map[_id.m][_id.s] = count;
  });
  return Object.values(map)
    .map((m) => ({ ...m, total: m.present + m.absent, percentage: pct(m.present, m.present + m.absent) }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

exports.history = async (studentId, q) => {
  const filter = { student: studentId };
  let range;
  if (q.month) {
    range = parseMonth(q.month);
    filter.date = { $gte: range.start, $lt: range.end };
  }
  const { page, limit, skip } = paginate({ limit: 31, ...q });
  const [data, total, summary, monthly] = await Promise.all([
    Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Attendance.countDocuments(filter),
    exports.summary(studentId, range),
    exports.monthly(studentId),
  ]);
  return { data, total, page, pages: Math.max(Math.ceil(total / limit), 1), summary, monthly };
};

exports.roster = async (q) => {
  const date = parseDay(q.date);
  const filter = { status: 'active' };
  if (q.department && mongoose.isValidObjectId(q.department)) filter.department = q.department;
  if (q.year) filter.year = Number(q.year);
  const students = await Student.find(filter).select('studentId fullName year profileImage').sort({ studentId: 1 }).limit(1000);
  const marks = await Attendance.find({ date, student: { $in: students.map((s) => s._id) } });
  const byStudent = new Map(marks.map((m) => [String(m.student), m]));
  return students.map((s) => ({ student: s, status: byStudent.get(String(s._id))?.status || null }));
};

exports.markBulk = async ({ date, records }, userId) => {
  const day = parseDay(date);
  if (day.getTime() > Date.now() + 36 * 3600 * 1000) throw new ApiError(400, 'Attendance cannot be marked for a future date');
  if (!Array.isArray(records) || !records.length) throw new ApiError(400, 'Provide at least one attendance record');
  if (records.length > 1000) throw new ApiError(400, 'Too many records in one request (max 1000)');
  for (const r of records) {
    if (!mongoose.isValidObjectId(r.student)) throw new ApiError(400, 'Invalid student in records');
    if (!['present', 'absent'].includes(r.status)) throw new ApiError(400, 'Status must be present or absent');
  }
  const ids = [...new Set(records.map((r) => String(r.student)))];
  if ((await Student.countDocuments({ _id: { $in: ids } })) !== ids.length) throw new ApiError(400, 'One or more students do not exist');
  const result = await Attendance.bulkWrite(
    records.map((r) => ({
      updateOne: { filter: { student: r.student, date: day }, update: { $set: { status: r.status, markedBy: userId } }, upsert: true },
    }))
  );
  return { saved: records.length, created: result.upsertedCount, updated: result.modifiedCount };
};

exports.remove = async (id) => {
  const rec = await Attendance.findByIdAndDelete(id);
  if (!rec) throw new ApiError(404, 'Attendance record not found');
};

exports.monthlyReport = async ({ month, department, year }) => {
  const range = parseMonth(month);
  const filter = {};
  if (department && mongoose.isValidObjectId(department)) filter.department = department;
  if (year) filter.year = Number(year);
  const students = await Student.find(filter).populate('department', 'name code').select('studentId fullName year department').sort({ studentId: 1 }).limit(5000);
  const agg = await Attendance.aggregate([
    { $match: { date: { $gte: range.start, $lt: range.end }, student: { $in: students.map((s) => s._id) } } },
    { $group: { _id: { s: '$student', st: '$status' }, count: { $sum: 1 } } },
  ]);
  const map = new Map();
  agg.forEach(({ _id, count }) => {
    const cur = map.get(String(_id.s)) || { present: 0, absent: 0 };
    cur[_id.st] = count;
    map.set(String(_id.s), cur);
  });
  const rows = students.map((s) => {
    const c = map.get(String(s._id)) || { present: 0, absent: 0 };
    const total = c.present + c.absent;
    return { student: s, present: c.present, absent: c.absent, total, percentage: pct(c.present, total) };
  });
  const totals = rows.reduce((a, r) => ({ present: a.present + r.present, total: a.total + r.total }), { present: 0, total: 0 });
  return { month, rows, summary: { students: rows.length, present: totals.present, total: totals.total, percentage: pct(totals.present, totals.total) } };
};
