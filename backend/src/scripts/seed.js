/* Usage:
 *   npm run seed:admin   -> creates/updates the first administrator from ADMIN_* env vars
 *   npm run seed:demo    -> also inserts demo departments, courses, students, attendance and marks
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const AcademicRecord = require('../models/AcademicRecord');

const demo = process.argv.includes('--demo');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@studentsphere.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  let admin = await User.findOne({ email }).select('+password');
  if (admin) {
    console.log(`Administrator already exists: ${email}`);
    return;
  }
  admin = await User.create({ name: process.env.ADMIN_NAME || 'System Administrator', email, password, role: 'admin' });
  console.log(`Administrator created: ${admin.email}  (password from ADMIN_PASSWORD)`);
}

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

async function seedDemo() {
  if (await Student.countDocuments()) {
    console.log('Students already exist, skipping demo data.');
    return;
  }
  const deptData = [
    ['Computer Science', 'CSE', 'Dr. R. Meenakshi'], ['Electronics & Communication', 'ECE', 'Dr. K. Suresh'],
    ['Mechanical Engineering', 'MECH', 'Dr. A. Prakash'], ['Business Administration', 'MBA', 'Dr. S. Lakshmi'],
  ];
  const depts = await Department.insertMany(deptData.map(([name, code, head]) => ({ name, code, head, description: `${name} department` })));
  const courses = await Course.insertMany(depts.map((d) => ({ name: `B.Tech ${d.name}`, code: `${d.code}-BT`, department: d._id, durationYears: 4 })));
  const names = ['Aarav Kumar', 'Diya Sharma', 'Karthik Raja', 'Meera Nair', 'Arjun Das', 'Priya Lakshmi', 'Rahul Verma', 'Sneha Iyer', 'Vikram Singh', 'Ananya Reddy', 'Harish Babu', 'Kavya Menon', 'Naveen Prasad', 'Ishita Gupta', 'Surya Narayan', 'Pooja Devi'];
  const students = [];
  for (let i = 0; i < names.length; i += 1) {
    const di = i % depts.length;
    students.push({
      studentId: `SS2026${String(i + 1).padStart(3, '0')}`, fullName: names[i], email: `${names[i].toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: `98${rnd(10000000, 99999999)}`, dateOfBirth: new Date(2003 + (i % 3), rnd(0, 11), rnd(1, 28)), gender: i % 2 ? 'Female' : 'Male',
      department: depts[di]._id, course: courses[di]._id, year: (i % 4) + 1, semester: ((i % 4) + 1) * 2 - 1,
      address: `${rnd(1, 99)}, Gandhi Street, Madurai`, status: i % 7 === 6 ? 'inactive' : 'active', enrollmentDate: new Date(Date.now() - rnd(10, 900) * 864e5),
    });
  }
  const created = await Student.insertMany(students);
  // student logins: password is "Student@123" for every demo student
  for (const s of created) await User.create({ name: s.fullName, email: s.email, password: 'Student@123', role: 'student', student: s._id, isActive: s.status === 'active' });

  const subjects = ['Mathematics', 'Programming', 'Physics', 'Communication Skills', 'Data Structures'];
  const attendance = [];
  const records = [];
  for (const s of created) {
    for (let d = 0; d < 20; d += 1) {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - d);
      if (day.getUTCDay() === 0) continue;
      attendance.push({ student: s._id, date: day, status: Math.random() < 0.85 ? 'present' : 'absent' });
    }
    for (const sub of subjects) {
      const internal = rnd(18, 40);
      const exam = rnd(25, 60);
      records.push({ student: s._id, subject: sub, semester: s.semester, internalMarks: internal, examMarks: exam });
    }
  }
  await Attendance.insertMany(attendance);
  for (const r of records) await AcademicRecord.create(r); // create() so totals/grades are computed
  console.log(`Demo data created: ${depts.length} departments, ${courses.length} courses, ${created.length} students (login password: Student@123), ${attendance.length} attendance rows, ${records.length} marks.`);
}

(async () => {
  await connectDB();
  await seedAdmin();
  if (demo) await seedDemo();
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
