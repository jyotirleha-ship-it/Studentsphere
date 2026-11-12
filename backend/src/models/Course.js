const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Course name is required'], trim: true, maxlength: 120 },
    code: { type: String, required: [true, 'Course code is required'], unique: true, uppercase: true, trim: true, maxlength: 15 },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: [true, 'Department is required'], index: true },
    durationYears: { type: Number, min: [1, 'Minimum duration is 1 year'], max: [6, 'Maximum duration is 6 years'], default: 4 },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
