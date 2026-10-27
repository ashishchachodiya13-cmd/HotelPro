const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { isEmail, normalizePhone, passwordError } = require('../utils/validators');
const { COOKIE } = require('../middleware/authMiddleware');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

const safeUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt });

function issueToken(res, user) {
  const token = jwt.sign({ id: user._id, v: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  res.cookie(COOKIE, token, cookieOptions());
}

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, phone } = req.body || {};
  const errors = {};
  if (typeof name !== 'string' || name.trim().length < 2) errors.name = 'Full name is required (min 2 characters).';
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  const pErr = passwordError(password);
  if (pErr) errors.password = pErr;
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) errors.phone = 'Enter a valid phone number (10-15 digits).';
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', errors);

  const lower = email.trim().toLowerCase();
  if (await User.exists({ email: lower })) throw new HttpError(409, 'An account with this email already exists.', { email: 'Email already registered.' });

  // NOTE: role is never read from the request body. Public sign-ups are always customers.
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name: name.trim(), email: lower, password: hashed, phone: cleanPhone, role: 'customer' });
  res.status(201).json({ message: 'Account created. Please log in.', user: safeUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!isEmail(email) || typeof password !== 'string' || !password)
    throw new HttpError(400, 'Email and password are required.');
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password +tokenVersion');
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw new HttpError(401, 'Invalid email or password.');
  issueToken(res, user);
  res.json({ user: safeUser(user) });
});

exports.me = (req, res) => res.json({ user: safeUser(req.user) });

exports.logout = asyncHandler(async (req, res) => {
  // Bumping tokenVersion revokes every token issued for this account (all devices).
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE, opts);
  res.json({ message: 'Logged out.' });
});
