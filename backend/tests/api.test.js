// Integration tests. Requires a running MongoDB (MONGODB_URI) and the admin from `npm run seed:admin`.
// Run:  npm test      (starts the app on a random port by itself)
require('dotenv').config();
process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');

let server; let base; const ctx = {};
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.text() };
};
const stamp = Date.now().toString(36).toUpperCase();

before(async () => {
  await connectDB();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  // clean up everything this run created
  const { Student, User, Attendance, AcademicRecord, Department, Course } = mongoose.models;
  if (ctx.studentId) await Promise.all([Student.deleteMany({ studentId: new RegExp(stamp) }), User.deleteMany({ email: new RegExp(stamp.toLowerCase()) })]);
  await Promise.all([Attendance.deleteMany({ student: { $in: ctx.ids || [] } }), AcademicRecord.deleteMany({ student: { $in: ctx.ids || [] } })]);
  await Promise.all([Course.deleteMany({ code: `T${stamp}` }), Department.deleteMany({ code: `T${stamp}`.slice(0, 10) })]);
  server.close();
  await mongoose.disconnect();
});

test('auth: admin login, wrong password, role mismatch', async () => {
  const bad = await call('POST', '/auth/login', { body: { email: 'admin@studentsphere.com', password: 'nope-nope' } });
  assert.equal(bad.status, 401);
  const wrongRole = await call('POST', '/auth/login', { body: { email: 'admin@studentsphere.com', password: process.env.ADMIN_PASSWORD, role: 'student' } });
  assert.equal(wrongRole.status, 403);
  const ok = await call('POST', '/auth/login', { body: { email: 'admin@studentsphere.com', password: process.env.ADMIN_PASSWORD, role: 'admin' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  ctx.admin = ok.body.token;
  assert.equal((await call('GET', '/auth/me', { token: ctx.admin })).body.user.role, 'admin');
});

test('protected routes reject anonymous and tampered tokens', async () => {
  assert.equal((await call('GET', '/students')).status, 401);
  assert.equal((await call('GET', '/students', { token: 'abc.def.ghi' })).status, 401);
});

test('departments and courses CRUD', async () => {
  const d = await call('POST', '/departments', { token: ctx.admin, body: { name: `Test Dept ${stamp}`, code: `T${stamp}`.slice(0, 10), head: 'Dr. Test' } });
  assert.equal(d.status, 201);
  ctx.dept = d.body.data._id;
  assert.equal((await call('POST', '/departments', { token: ctx.admin, body: { name: `Test Dept ${stamp}`, code: 'ZZZ' } })).status, 409);
  const c = await call('POST', '/courses', { token: ctx.admin, body: { name: 'Test Course', code: `T${stamp}`, department: ctx.dept, durationYears: 4 } });
  assert.equal(c.status, 201);
  ctx.course = c.body.data._id;
  const up = await call('PUT', `/courses/${ctx.course}`, { token: ctx.admin, body: { name: 'Test Course Updated' } });
  assert.equal(up.body.data.name, 'Test Course Updated');
  assert.equal((await call('DELETE', `/departments/${ctx.dept}`, { token: ctx.admin })).status, 409); // has a course
});

test('student CRUD, duplicates, validation', async () => {
  const body = { studentId: `TST-${stamp}`, fullName: 'Test Student', email: `test.${stamp.toLowerCase()}@example.com`, phone: '9876543210', gender: 'Female', department: ctx.dept, course: ctx.course, year: 2, semester: 3, dateOfBirth: '2004-05-01', password: 'Student@123' };
  const created = await call('POST', '/students', { token: ctx.admin, body });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  ctx.studentId = created.body.data._id;
  ctx.ids = [ctx.studentId];
  assert.equal(created.body.data.studentId, `TST-${stamp}`);

  assert.equal((await call('POST', '/students', { token: ctx.admin, body: { ...body, email: `other.${stamp.toLowerCase()}@example.com` } })).status, 409, 'duplicate studentId');
  assert.equal((await call('POST', '/students', { token: ctx.admin, body: { ...body, studentId: `TST2-${stamp}` } })).status, 409, 'duplicate email');
  assert.equal((await call('POST', '/students', { token: ctx.admin, body: { ...body, studentId: `TST3-${stamp}`, email: 'bad' } })).status, 400, 'invalid email');
  assert.equal((await call('POST', '/students', { token: ctx.admin, body: { ...body, studentId: `TST4-${stamp}`, email: `x.${stamp.toLowerCase()}@e.com`, year: 9 } })).status, 400, 'invalid year');

  const list = await call('GET', `/students?search=TST-${stamp}&department=${ctx.dept}&year=2&sort=fullName&order=asc&limit=5`, { token: ctx.admin });
  assert.equal(list.body.total, 1);
  const upd = await call('PUT', `/students/${ctx.studentId}`, { token: ctx.admin, body: { fullName: 'Test Student Edited', year: 3 } });
  assert.equal(upd.body.data.fullName, 'Test Student Edited');
  assert.equal(upd.body.data.year, 3);

  const csv = await call('GET', `/students/export/csv?search=TST-${stamp}`, { token: ctx.admin });
  assert.equal(csv.status, 200);
  assert.match(csv.body, /Student ID/);
  assert.match(csv.body, new RegExp(`TST-${stamp}`));
});

test('student login and access isolation', async () => {
  const login = await call('POST', '/auth/login', { body: { email: `test.${stamp.toLowerCase()}@example.com`, password: 'Student@123', role: 'student' } });
  assert.equal(login.status, 200);
  ctx.stu = login.body.token;
  assert.equal((await call('GET', '/students', { token: ctx.stu })).status, 403);
  assert.equal((await call('POST', '/departments', { token: ctx.stu, body: { name: 'X', code: 'X' } })).status, 403);
  assert.equal((await call('GET', '/dashboard/stats', { token: ctx.stu })).status, 403);
  assert.equal((await call('GET', `/students/${ctx.studentId}`, { token: ctx.stu })).status, 200);
  const other = await mongoose.models.Student.findOne({ _id: { $ne: ctx.studentId } });
  assert.equal((await call('GET', `/students/${other._id}`, { token: ctx.stu })).status, 403);
  assert.equal((await call('GET', `/attendance/student/${other._id}`, { token: ctx.stu })).status, 403);
  assert.equal((await call('GET', `/reports/student/${other._id}`, { token: ctx.stu })).status, 403);
  const me = await call('PUT', '/students/me', { token: ctx.stu, body: { phone: '9123456780', address: 'New address', status: 'inactive', year: 6 } });
  assert.equal(me.body.data.phone, '9123456780');
  assert.equal(me.body.data.status, 'active', 'students cannot change status');
  assert.equal(me.body.data.year, 3, 'students cannot change year');
});

test('registration creates a linked student account', async () => {
  const email = `reg.${stamp.toLowerCase()}@example.com`;
  const r = await call('POST', '/auth/register', { body: { studentId: `REG-${stamp}`, fullName: 'Reg Student', email, password: 'Student@123', department: ctx.dept, course: ctx.course, year: 1, semester: 1 } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.user.role, 'student');
  assert.ok(r.body.user.student);
  ctx.ids.push(r.body.user.student);
  assert.equal((await call('POST', '/auth/register', { body: { studentId: `REG2-${stamp}`, fullName: 'x', email, password: 'Student@123', department: ctx.dept, course: ctx.course, year: 1, semester: 1 } })).status, 409);
  assert.equal((await call('POST', '/auth/register', { body: { studentId: `REG3-${stamp}`, fullName: 'x', email: `a${email}`, password: 'short', department: ctx.dept, course: ctx.course, year: 1, semester: 1 } })).status, 400);
});

test('attendance: mark, update, percentage, monthly report', async () => {
  const ids = ctx.ids;
  const m1 = await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2026-11-03', records: [{ student: ids[0], status: 'present' }, { student: ids[1], status: 'absent' }] } });
  assert.equal(m1.status, 200, JSON.stringify(m1.body));
  await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2026-11-04', records: [{ student: ids[0], status: 'absent' }] } });
  await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2026-11-05', records: [{ student: ids[0], status: 'present' }] } });
  await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2026-11-05', records: [{ student: ids[0], status: 'present' }] } }); // idempotent
  assert.equal((await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2026-13-45', records: [{ student: ids[0], status: 'present' }] } })).status, 400);
  assert.equal((await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2026-11-05', records: [{ student: ids[0], status: 'late' }] } })).status, 400);
  assert.equal((await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2099-01-01', records: [{ student: ids[0], status: 'present' }] } })).status, 400);

  const h = await call('GET', `/attendance/student/${ids[0]}`, { token: ctx.admin });
  assert.equal(h.body.summary.total, 3);
  assert.equal(h.body.summary.present, 2);
  assert.equal(h.body.summary.percentage, 66.7);
  assert.equal(h.body.monthly[0].month, '2026-11');

  const own = await call('GET', `/attendance/student/${ids[0]}`, { token: ctx.stu });
  assert.equal(own.status, 200);

  // change a mark
  await call('POST', '/attendance/bulk', { token: ctx.admin, body: { date: '2026-11-04', records: [{ student: ids[0], status: 'present' }] } });
  assert.equal((await call('GET', `/attendance/student/${ids[0]}`, { token: ctx.admin })).body.summary.percentage, 100);

  const roster = await call('GET', `/attendance/roster?date=2026-11-03&department=${ctx.dept}`, { token: ctx.admin });
  assert.equal(roster.body.data.find((r) => r.student._id === ids[0]).status, 'present');

  const rep = await call('GET', `/reports/attendance/monthly?month=2026-11&department=${ctx.dept}`, { token: ctx.admin });
  const row = rep.body.data.rows.find((r) => r.student._id === ids[0]);
  assert.equal(row.total, 3);
  assert.equal(row.percentage, 100);
  const csv = await call('GET', `/reports/attendance/monthly?month=2026-11&department=${ctx.dept}&format=csv`, { token: ctx.admin });
  assert.match(csv.body, /Attendance %/);
});

test('academic records: calculation, validation, update, report', async () => {
  const sid = ctx.ids[0];
  const ok = await call('POST', '/academic', { token: ctx.admin, body: { student: sid, subject: 'Mathematics', semester: 3, internalMarks: 35, examMarks: 50 } });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.data.total, 85);
  assert.equal(ok.body.data.percentage, 85);
  assert.equal(ok.body.data.grade, 'A');
  const id = ok.body.data._id;
  assert.equal((await call('POST', '/academic', { token: ctx.admin, body: { student: sid, subject: 'Mathematics', semester: 3, internalMarks: 1, examMarks: 1 } })).status, 409, 'duplicate subject+semester');
  assert.equal((await call('POST', '/academic', { token: ctx.admin, body: { student: sid, subject: 'Physics', semester: 3, internalMarks: 41, examMarks: 10 } })).status, 400, 'internal > max');
  assert.equal((await call('POST', '/academic', { token: ctx.admin, body: { student: sid, subject: 'Physics', semester: 3, internalMarks: 10, examMarks: 61 } })).status, 400, 'exam > max');
  assert.equal((await call('POST', '/academic', { token: ctx.admin, body: { student: sid, subject: 'Physics', semester: 3, internalMarks: -1, examMarks: 10 } })).status, 400, 'negative');
  assert.equal((await call('POST', '/academic', { token: ctx.admin, body: { student: sid, subject: 'Physics', semester: 3, internalMarks: 'abc', examMarks: 10 } })).status, 400, 'non numeric');
  const up = await call('PUT', `/academic/${id}`, { token: ctx.admin, body: { examMarks: 55 } });
  assert.equal(up.body.data.total, 90);
  assert.equal(up.body.data.grade, 'A+');
  await call('POST', '/academic', { token: ctx.admin, body: { student: sid, subject: 'Physics', semester: 3, internalMarks: 20, examMarks: 30 } });
  const mine = await call('GET', `/academic/student/${sid}`, { token: ctx.stu });
  assert.equal(mine.body.data.records.length, 2);
  assert.equal(mine.body.data.summary.percentage, 70); // (90+50)/200
  assert.equal(mine.body.data.summary.best.subject, 'Mathematics');
  const rep = await call('GET', `/reports/student/${sid}`, { token: ctx.stu });
  assert.equal(rep.status, 200);
  assert.equal(rep.body.data.academic.summary.subjects, 2);
  assert.equal(rep.body.data.attendance.total, 3);
  assert.equal((await call('POST', '/academic', { token: ctx.stu, body: { student: sid, subject: 'Hack', semester: 1, internalMarks: 40, examMarks: 60 } })).status, 403);
  assert.equal((await call('DELETE', `/academic/${id}`, { token: ctx.admin })).status, 200);
  assert.equal((await call('GET', `/academic/student/${sid}`, { token: ctx.admin })).body.data.records.length, 1);
});

test('dashboard stats come from the database', async () => {
  const s = await call('GET', '/dashboard/stats', { token: ctx.admin });
  assert.equal(s.status, 200);
  const total = await mongoose.models.Student.countDocuments();
  assert.equal(s.body.data.totals.students, total);
  assert.equal(s.body.data.totals.active + s.body.data.totals.inactive, total);
  assert.ok(Array.isArray(s.body.data.recentRegistrations));
  assert.ok(s.body.data.attendance.total >= 3);
});

test('user management', async () => {
  const list = await call('GET', '/users?role=student&search=test', { token: ctx.admin });
  const u = list.body.data.find((x) => x.email === `test.${stamp.toLowerCase()}@example.com`);
  assert.ok(u);
  assert.equal((await call('PUT', `/users/${u._id}`, { token: ctx.admin, body: { isActive: false } })).status, 200);
  assert.equal((await call('POST', '/auth/login', { body: { email: u.email, password: 'Student@123' } })).status, 403);
  assert.equal((await call('POST', `/users/${u._id}/reset-password`, { token: ctx.admin, body: { password: 'NewPass@123' } })).status, 200);
  await call('PUT', `/users/${u._id}`, { token: ctx.admin, body: { isActive: true } });
  assert.equal((await call('POST', '/auth/login', { body: { email: u.email, password: 'NewPass@123' } })).status, 200);
  const adminUser = (await call('GET', '/auth/me', { token: ctx.admin })).body.user;
  assert.equal((await call('DELETE', `/users/${adminUser.id}`, { token: ctx.admin })).status, 400, 'cannot delete self');
});

test('delete student cascades; course/department deletes work when empty', async () => {
  assert.equal((await call('DELETE', `/students/${ctx.ids[0]}`, { token: ctx.admin })).status, 200);
  assert.equal((await call('GET', `/students/${ctx.ids[0]}`, { token: ctx.admin })).status, 404);
  assert.equal(await mongoose.models.Attendance.countDocuments({ student: ctx.ids[0] }), 0);
  assert.equal(await mongoose.models.AcademicRecord.countDocuments({ student: ctx.ids[0] }), 0);
  assert.equal(await mongoose.models.User.countDocuments({ student: ctx.ids[0] }), 0);
  assert.equal((await call('DELETE', `/students/${ctx.ids[1]}`, { token: ctx.admin })).status, 200);
  assert.equal((await call('DELETE', `/courses/${ctx.course}`, { token: ctx.admin })).status, 200);
  assert.equal((await call('DELETE', `/departments/${ctx.dept}`, { token: ctx.admin })).status, 200);
});
