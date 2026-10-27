const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isEmail = (v) => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v.trim());

/** Accepts 10-15 digits with optional leading + and spaces/dashes. Returns cleaned number or null. */
function normalizePhone(v) {
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[\s-]/g, '');
  return /^\+?[0-9]{10,15}$/.test(cleaned) ? cleaned : null;
}

/** Returns an error message or null. */
function passwordError(p) {
  if (typeof p !== 'string' || p.length < 8) return 'Password must be at least 8 characters.';
  if (p.length > 72) return 'Password must be at most 72 characters.';
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/[0-9]/.test(p))
    return 'Password must include upper-case, lower-case and a number.';
  return null;
}

const isObjectId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { isEmail, normalizePhone, passwordError, isObjectId, escapeRegex };
