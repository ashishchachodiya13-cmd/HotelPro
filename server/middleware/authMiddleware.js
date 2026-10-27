const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE = 'hotelpro_token';

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, 'Not authenticated. Please log in.');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Session expired or invalid. Please log in again.');
  }
  const user = await User.findById(payload.id).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.v) throw new HttpError(401, 'Session is no longer valid. Please log in again.');
  req.user = user;
  next();
});

module.exports = { protect, COOKIE };
