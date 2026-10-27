const HttpError = require('../utils/httpError');

module.exports = function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return next(new HttpError(403, 'Administrator access required.'));
  next();
};
