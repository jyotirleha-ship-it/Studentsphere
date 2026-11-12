const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    password: { type: String, required: true, minlength: [8, 'Password must be at least 8 characters'], select: false },
    role: { type: String, enum: ['admin', 'student'], default: 'student', index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function hash(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function compare(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', { transform: (_d, ret) => { delete ret.password; delete ret.__v; return ret; } });

module.exports = mongoose.model('User', userSchema);
