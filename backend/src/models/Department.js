const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Department name is required'], unique: true, trim: true, maxlength: 100 },
    code: { type: String, required: [true, 'Department code is required'], unique: true, uppercase: true, trim: true, maxlength: 10 },
    head: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
