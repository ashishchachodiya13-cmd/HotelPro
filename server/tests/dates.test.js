const test = require('node:test');
const assert = require('node:assert');
const { parseDate, validateStay, hotelToday, nightsBetween } = require('../utils/dates');
const { passwordError, normalizePhone, isEmail } = require('../utils/validators');
const { peakOccupancy } = require('../utils/availability');
const { withLock } = require('../utils/mutex');

const today = new Date('2030-01-10T00:00:00Z');

test('parseDate accepts real dates only', () => {
  assert.ok(parseDate('2030-02-28'));
  assert.strictEqual(parseDate('2030-02-30'), null);
  assert.strictEqual(parseDate('30-02-2030'), null);
});

test('validateStay rules', () => {
  assert.ok(validateStay('2030-01-10', '2030-01-12', { today }).nights === 2);
  assert.match(validateStay('2030-01-09', '2030-01-12', { today }).error, /past/);
  assert.match(validateStay('2030-01-12', '2030-01-12', { today }).error, /later/);
  assert.match(validateStay('2030-01-12', '2030-01-11', { today }).error, /later/);
  assert.match(validateStay('2030-01-12', '2030-03-12', { today, maxNights: 30 }).error, /exceed/);
});

test('hotelToday uses offset', () => {
  assert.strictEqual(hotelToday(330, new Date('2030-01-09T20:00:00Z')).toISOString().slice(0, 10), '2030-01-10');
  assert.strictEqual(nightsBetween(parseDate('2030-01-01'), parseDate('2030-01-04')), 3);
});

test('validators', () => {
  assert.ok(passwordError('abc'));
  assert.strictEqual(passwordError('Abcdefg1'), null);
  assert.strictEqual(normalizePhone('+91 98765-43210'), '+919876543210');
  assert.strictEqual(normalizePhone('12'), null);
  assert.ok(isEmail('a@b.co'));
  assert.ok(!isEmail('a@b'));
});

test('peakOccupancy counts concurrent stays, not total overlaps', () => {
  const d = (s) => new Date(`${s}T00:00:00Z`);
  const bookings = [
    { arrivalDate: d('2030-02-01'), departureDate: d('2030-02-03') },
    { arrivalDate: d('2030-02-03'), departureDate: d('2030-02-05') },
  ];
  assert.strictEqual(peakOccupancy(bookings, d('2030-02-02'), d('2030-02-04')), 1);
  bookings.push({ arrivalDate: d('2030-02-02'), departureDate: d('2030-02-04') });
  assert.strictEqual(peakOccupancy(bookings, d('2030-02-02'), d('2030-02-04')), 2);
});

test('withLock serialises critical sections', async () => {
  let running = 0, maxRunning = 0;
  const job = () => withLock('k', async () => { running++; maxRunning = Math.max(maxRunning, running); await new Promise((r) => setTimeout(r, 10)); running--; });
  await Promise.all([job(), job(), job()]);
  assert.strictEqual(maxRunning, 1);
});
