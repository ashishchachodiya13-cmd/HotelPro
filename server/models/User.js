const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    // Incremented on logout / role change so previously issued JWTs stop working.
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
