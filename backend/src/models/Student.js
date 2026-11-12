const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: [true, 'Student ID is required'], unique: true, uppercase: true, trim: true, maxlength: 30 },
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 100 },
    email: {
      type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    phone: { type: String, trim: true, match: [/^[+]?[0-9\s-]{7,15}$/, 'Enter a valid phone number'] },
    dateOfBirth: {
      type: Date,
      validate: { validator: (v) => !v || v < new Date(), message: 'Date of birth must be in the past' },
    },
    gender: { type: String, enum: { values: ['Male', 'Female', 'Other'], message: 'Gender must be Male, Female or Other' } },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: [true, 'Department is required'], index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: [true, 'Course is required'] },
    year: { type: Number, required: [true, 'Year is required'], min: [1, 'Year must be 1-6'], max: [6, 'Year must be 1-6'], index: true },
    semester: { type: Number, required: [true, 'Semester is required'], min: [1, 'Semester must be 1-12'], max: [12, 'Semester must be 1-12'] },
    address: { type: String, trim: true, maxlength: 300 },
    profileImage: {
      type: String,
      validate: { validator: (v) => !v || (/^data:image\/(png|jpe?g|webp);base64,/.test(v) && v.length < 400000), message: 'Profile image must be a PNG/JPG/WEBP under ~300KB' },
    },
    enrollmentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true }
);

studentSchema.index({ fullName: 1 });

module.exports = mongoose.model('Student', studentSchema);
