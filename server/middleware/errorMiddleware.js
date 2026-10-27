const multer = require('multer');
const { removeUploadedFiles } = require('./uploadMiddleware');

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Clean up any files that were uploaded for a request that then failed.
  if (req.files?.length) removeUploadedFiles(req.files.map((f) => `/uploads/${f.filename}`));

  let status = err.status || 500;
  let message = err.message || 'Server error';
  let errors = err.errors;

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller.' : err.message;
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = 'Validation failed.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'A record with that value already exists.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier.';
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (process.env.NODE_ENV === 'production') message = 'Something went wrong on our side.';
  }
  res.status(status).json({ message, ...(errors ? { errors } : {}) });
}

module.exports = { notFound, errorHandler };
