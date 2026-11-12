const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize, ownStudentOrAdmin } = require('../middleware/auth');
const auth = require('../controllers/authController');
const students = require('../controllers/studentController');
const catalog = require('../controllers/catalogController');
const attendance = require('../controllers/attendanceController');
const academic = require('../controllers/academicController');
const reports = require('../controllers/reportController');
const dashboard = require('../controllers/dashboardController');
const users = require('../controllers/userController');

const admin = [protect, authorize('admin')];
const own = ownStudentOrAdmin('id');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 1000 : 50, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again in a few minutes.' } });

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date() }));

// Auth
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/register', authLimiter, auth.register);
router.get('/auth/options', auth.options);
router.get('/auth/me', protect, auth.me);
router.post('/auth/change-password', protect, auth.changePassword);

// Students (order matters: static paths before /:id)
router.get('/students/options', admin, students.options);
router.get('/students/export/csv', admin, students.exportCSV);
router.get('/students/me', protect, authorize('student'), students.me);
router.put('/students/me', protect, authorize('student'), students.updateMe);
router.route('/students').get(admin, students.list).post(admin, students.create);
router.get('/students/:id/overview', protect, own, students.overview);
router.route('/students/:id').get(protect, own, students.get).put(admin, students.update).delete(admin, students.remove);

// Departments & courses (read: any signed-in user, write: admin)
router.route('/departments').get(protect, catalog.departments.list).post(admin, catalog.departments.create);
router.route('/departments/:id').get(protect, catalog.departments.get).put(admin, catalog.departments.update).delete(admin, catalog.departments.remove);
router.route('/courses').get(protect, catalog.courses.list).post(admin, catalog.courses.create);
router.route('/courses/:id').get(protect, catalog.courses.get).put(admin, catalog.courses.update).delete(admin, catalog.courses.remove);

// Attendance
router.get('/attendance/roster', admin, attendance.roster);
router.post('/attendance/bulk', admin, attendance.markBulk);
router.get('/attendance/student/:id', protect, own, attendance.history);
router.delete('/attendance/:id', admin, attendance.remove);

// Academic records
router.route('/academic').get(admin, academic.list).post(admin, academic.create);
router.get('/academic/student/:id', protect, own, academic.forStudent);
router.route('/academic/:id').put(admin, academic.update).delete(admin, academic.remove);

// Reports & dashboard
router.get('/reports/student/:id', protect, own, reports.student);
router.get('/reports/attendance/monthly', admin, reports.attendanceMonthly);
router.get('/reports/academic', admin, reports.academic);
router.get('/dashboard/stats', admin, dashboard.admin);

// User accounts
router.route('/users').get(admin, users.list).post(admin, users.create);
router.post('/users/:id/reset-password', admin, users.resetPassword);
router.route('/users/:id').put(admin, users.update).delete(admin, users.remove);

module.exports = router;
