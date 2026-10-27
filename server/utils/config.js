// Centralised, validated runtime configuration (read lazily so tests can override env).
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

module.exports = {
  get tzOffset() { return num(process.env.HOTEL_TZ_OFFSET_MINUTES, 330); },
  get maxNights() { return num(process.env.MAX_NIGHTS, 30); },
  get maxAdvanceDays() { return num(process.env.MAX_ADVANCE_DAYS, 365); },
  get holdMinutes() { return num(process.env.HOLD_MINUTES, 15); },
  get freeCancelHours() { return num(process.env.FREE_CANCEL_HOURS, 48); },
  get isProd() { return process.env.NODE_ENV === 'production'; },
};
