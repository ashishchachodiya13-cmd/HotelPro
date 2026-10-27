// Usage: npm run create-admin   (reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from .env)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { isEmail, passwordError } = require('../utils/validators');

(async () => {
  const { ADMIN_NAME = 'Hotel Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!isEmail(ADMIN_EMAIL) || passwordError(ADMIN_PASSWORD)) {
    console.error('Set a valid ADMIN_EMAIL and a strong ADMIN_PASSWORD (8+ chars, upper, lower, number) in server/.env');
    process.exit(1);
  }
  await connectDB();
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`Existing user ${email} promoted to admin.`);
  } else {
    await User.create({ name: ADMIN_NAME, email, password: await bcrypt.hash(ADMIN_PASSWORD, 12), phone: '0000000000', role: 'admin' });
    console.log(`Admin created: ${email}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
