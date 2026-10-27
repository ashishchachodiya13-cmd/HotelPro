const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Never trust the original file name: generate our own and derive the extension from the MIME type.
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    const err = new Error('Only JPG, PNG or WEBP images are allowed.');
    err.status = 400;
    cb(err);
  },
});

const roomImages = upload.array('images', 6);

function removeUploadedFiles(paths = []) {
  for (const p of paths) {
    if (typeof p !== 'string' || !p.startsWith('/uploads/')) continue;
    const file = path.join(UPLOAD_DIR, path.basename(p));
    fs.promises.unlink(file).catch(() => {});
  }
}

module.exports = { roomImages, removeUploadedFiles, UPLOAD_DIR };
