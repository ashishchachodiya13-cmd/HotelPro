const MS_DAY = 86400000;

/** Parse a strict YYYY-MM-DD string into a UTC-midnight Date, or null. */
function parseDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return d;
}

/** "Today" as a UTC-midnight Date in the hotel's timezone (offset in minutes, e.g. 330 for IST). */
function hotelToday(offsetMinutes = 330, now = new Date()) {
  const local = new Date(now.getTime() + offsetMinutes * 60000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

function nightsBetween(arrival, departure) {
  return Math.round((departure.getTime() - arrival.getTime()) / MS_DAY);
}

/** Validate a stay. Returns { error } or { arrival, departure, nights }. */
function validateStay(arrivalStr, departureStr, opts = {}) {
  const maxNights = opts.maxNights ?? 30;
  const maxAdvanceDays = opts.maxAdvanceDays ?? 365;
  const today = opts.today ?? hotelToday(opts.offsetMinutes ?? 330);
  const arrival = parseDate(arrivalStr);
  const departure = parseDate(departureStr);
  if (!arrival || !departure) return { error: 'Dates must be valid and formatted as YYYY-MM-DD.' };
  if (arrival < today) return { error: 'Arrival date cannot be in the past.' };
  if (departure <= arrival) return { error: 'Departure must be later than arrival.' };
  const nights = nightsBetween(arrival, departure);
  if (nights > maxNights) return { error: `A single booking cannot exceed ${maxNights} nights.` };
  if (nightsBetween(today, arrival) > maxAdvanceDays)
    return { error: `Bookings can be made at most ${maxAdvanceDays} days in advance.` };
  return { arrival, departure, nights };
}

module.exports = { MS_DAY, parseDate, hotelToday, nightsBetween, validateStay };
