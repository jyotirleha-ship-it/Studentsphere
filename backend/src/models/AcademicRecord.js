const mongoose = require('mongoose');

const gradeFor = (p) => (p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : 'F');

const schema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 100 },
    semester: { type: Number, required: [true, 'Semester is required'], min: [1, 'Semester must be 1-12'], max: [12, 'Semester must be 1-12'] },
    maxInternal: { type: Number, default: 40, min: [1, 'Max internal marks must be at least 1'], max: 1000 },
    maxExam: { type: Number, default: 60, min: [1, 'Max exam marks must be at least 1'], max: 1000 },
    internalMarks: { type: Number, required: [true, 'Internal marks are required'], min: [0, 'Marks cannot be negative'] },
    examMarks: { type: Number, required: [true, 'Exam marks are required'], min: [0, 'Marks cannot be negative'] },
    total: Number,
    percentage: Number,
    grade: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

schema.index({ student: 1, subject: 1, semester: 1 }, { unique: true });

schema.pre('validate', function compute(next) {
  if (this.internalMarks > this.maxInternal) this.invalidate('internalMarks', `Internal marks cannot exceed ${this.maxInternal}`);
  if (this.examMarks > this.maxExam) this.invalidate('examMarks', `Exam marks cannot exceed ${this.maxExam}`);
  if (Number.isFinite(this.internalMarks) && Number.isFinite(this.examMarks)) {
    this.total = this.internalMarks + this.examMarks;
    this.percentage = Math.round((this.total / (this.maxInternal + this.maxExam)) * 1000) / 10;
    this.grade = gradeFor(this.percentage);
  }
  next();
});

module.exports = mongoose.model('AcademicRecord', schema);
