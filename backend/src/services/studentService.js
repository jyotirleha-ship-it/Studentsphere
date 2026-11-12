const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const AcademicRecord = require('../models/AcademicRecord');
const ApiError = require('../utils/ApiError');
const { escapeRegex, pick, paginate } = require('../utils/helpers');

const FIELDS = ['studentId', 'fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'department', 'course', 'year', 'semester', 'address', 'profileImage', 'enrollmentDate', 'status'];
const SELF_FIELDS = ['fullName', 'phone', 'dateOfBirth', 'gender', 'address', 'profileImage'];
const SORTABLE = ['fullName', 'studentId', 'year', 'createdAt', 'enrollmentDate', 'status'];
const POPULATE = [{ path: 'department', select: 'name code head' }, { path: 'course', select: 'name code' }];

const clean = (obj) => {
  for (const k of Object.keys(obj)) if (obj[k] === '' || obj[k] === null) obj[k] = undefined;
  return obj;
};

async function assertRefs({ department, course }) {
  if (!department || !course) return;
  if (!mongoose.isValidObjectId(department) || !mongoose.isValidObjectId(course)) throw new ApiError(400, 'Invalid department or course');
  const [d, c] = await Promise.all([Department.findById(department), Course.findById(course)]);
  if (!d) throw new ApiError(400, 'Department does not exist');
  if (!c) throw new ApiError(400, 'Course does not exist');
  if (String(c.department) !== String(d._id)) throw new ApiError(400, `Course ${c.code} does not belong to ${d.name}`);
}

function buildFilter(q) {
  const f = {};
  if (q.search) {
    const rx = new RegExp(escapeRegex(String(q.search).trim()), 'i');
    f.$or = [{ fullName: rx }, { studentId: rx }];
  }
  if (q.department && mongoose.isValidObjectId(q.department)) f.department = q.department;
  if (q.year) f.year = Number(q.year);
  if (q.status && ['active', 'inactive'].includes(q.status)) f.status = q.status;
  return f;
}

exports.list = async (q) => {
  const filter = buildFilter(q);
  const { page, limit, skip } = paginate(q);
  const sortKey = SORTABLE.includes(q.sort) ? q.sort : 'createdAt';
  const sort = { [sortKey]: q.order === 'asc' ? 1 : -1, _id: 1 };
  const [data, total] = await Promise.all([
    Student.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit),
    Student.countDocuments(filter),
  ]);
  return { data, total, page, pages: Math.max(Math.ceil(total / limit), 1) };
};

exports.listAll = (q) => Student.find(buildFilter(q)).populate(POPULATE).sort({ studentId: 1 }).limit(10000);

exports.options = () => Student.find({ status: 'active' }).select('studentId fullName department year semester').sort({ fullName: 1 }).limit(2000);

exports.get = async (id) => {
  const s = await Student.findById(id).populate(POPULATE);
  if (!s) throw new ApiError(404, 'Student not found');
  return s;
};

exports.create = async (body) => {
  const fields = clean(pick(body, FIELDS));
  if (body.password !== undefined && body.password !== '' && String(body.password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
  await assertRefs(fields);
  const student = await Student.create(fields);
  if (body.password) {
    try {
      await User.create({ name: student.fullName, email: student.email, password: body.password, role: 'student', student: student._id, isActive: student.status === 'active' });
    } catch (e) {
      await Student.deleteOne({ _id: student._id }); // keep data consistent
      throw e;
    }
  }
  return exports.get(student._id);
};

exports.update = async (id, body) => {
  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, 'Student not found');
  student.set(clean(pick(body, FIELDS)));
  await assertRefs({ department: student.department, course: student.course });
  await student.save();
  await User.updateOne({ student: student._id }, { name: student.fullName, email: student.email, isActive: student.status === 'active' });
  return exports.get(id);
};

exports.selfUpdate = async (id, body) => {
  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, 'Student not found');
  student.set(clean(pick(body, SELF_FIELDS)));
  await student.save();
  await User.updateOne({ student: student._id }, { name: student.fullName });
  return exports.get(id);
};

exports.remove = async (id) => {
  const student = await Student.findById(id);
  if (!student) throw new ApiError(404, 'Student not found');
  await Promise.all([
    Attendance.deleteMany({ student: id }),
    AcademicRecord.deleteMany({ student: id }),
    User.deleteMany({ student: id }),
    student.deleteOne(),
  ]);
};
