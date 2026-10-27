const { MS_DAY, hotelToday } = require('./dates');
const cfg = require('./config');

const HOLD_EXPIRED = 'Payment not completed in time';

/** Bookings that currently block inventory: Confirmed, or Pending with an unexpired hold. */
function blockingFilter(roomIds, arrival, departure) {
  return {
    room: { $in: roomIds },
    arrivalDate: { $lt: departure },
    departureDate: { $gt: arrival },
    $or: [
      { bookingStatus: 'Confirmed' },
      { bookingStatus: 'Pending', holdExpiresAt: { $gt: new Date() } },
    ],
  };
}

/** Highest number of simultaneously-occupied units on any night of [arrival, departure). */
function peakOccupancy(bookings, arrival, departure) {
  let peak = 0;
  for (let t = arrival.getTime(); t < departure.getTime(); t += MS_DAY) {
    const c = bookings.filter((b) => b.arrivalDate.getTime() <= t && b.departureDate.getTime() > t).length;
    if (c > peak) peak = c;
  }
  return peak;
}

/** Returns Map<roomIdString, availableUnits> for the given rooms and stay. */
async function computeAvailability(rooms, arrival, departure) {
  const Booking = require('../models/Booking');
  const ids = rooms.map((r) => r._id);
  const bookings = ids.length
    ? await Booking.find(blockingFilter(ids, arrival, departure)).select('room arrivalDate departureDate').lean()
    : [];
  const byRoom = new Map();
  for (const b of bookings) {
    const k = String(b.room);
    if (!byRoom.has(k)) byRoom.set(k, []);
    byRoom.get(k).push(b);
  }
  const out = new Map();
  for (const r of rooms) {
    const used = peakOccupancy(byRoom.get(String(r._id)) || [], arrival, departure);
    out.set(String(r._id), Math.max(0, r.inventory - used));
  }
  return out;
}

/** Lazy housekeeping: release expired holds and complete finished stays. */
async function housekeeping() {
  const Booking = require('../models/Booking');
  const now = new Date();
  await Booking.updateMany(
    { bookingStatus: 'Pending', holdExpiresAt: { $lte: now } },
    { $set: { bookingStatus: 'Cancelled', cancelledAt: now, cancelReason: HOLD_EXPIRED } }
  );
  await Booking.updateMany(
    { bookingStatus: 'Confirmed', departureDate: { $lte: hotelToday(cfg.tzOffset) } },
    { $set: { bookingStatus: 'Completed' } }
  );
}

module.exports = { computeAvailability, peakOccupancy, housekeeping, HOLD_EXPIRED };
