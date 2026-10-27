const crypto = require('crypto');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const cfg = require('../utils/config');
const { validateStay } = require('../utils/dates');
const { isObjectId } = require('../utils/validators');
const { withLock } = require('../utils/mutex');
const { computeAvailability, housekeeping } = require('../utils/availability');
const provider = require('../utils/paymentProvider');

const POPULATE_ROOM = { path: 'room', select: 'name images pricePerNight' };

function newBookingId() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `HPR-${d}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Cancellation policy shared with the UI via the booking payload. */
function cancellationInfo(b, now = new Date()) {
  if (!['Pending', 'Confirmed'].includes(b.bookingStatus)) return { canCancel: false, refundEligible: false };
  const hoursToArrival = (new Date(b.arrivalDate).getTime() - now.getTime()) / 3600000;
  if (hoursToArrival <= 0) return { canCancel: false, refundEligible: false };
  return { canCancel: true, refundEligible: hoursToArrival >= cfg.freeCancelHours };
}

function present(b) {
  const o = b.toObject ? b.toObject() : b;
  const holdActive = o.bookingStatus === 'Pending' && o.holdExpiresAt && new Date(o.holdExpiresAt) > new Date();
  return {
    ...o,
    ...cancellationInfo(o),
    canPay: !!holdActive && ['Pending', 'Failed'].includes(o.paymentStatus),
    freeCancelHours: cfg.freeCancelHours,
  };
}

exports.present = present;

exports.createBooking = asyncHandler(async (req, res) => {
  const { roomId, arrivalDate, departureDate } = req.body || {};
  const guests = Number(req.body?.guests ?? 1);
  if (!isObjectId(roomId)) throw new HttpError(400, 'A valid room is required.');
  if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, 'Guest count must be a whole number of at least 1.');
  const stay = validateStay(arrivalDate, departureDate, { maxNights: cfg.maxNights, maxAdvanceDays: cfg.maxAdvanceDays, offsetMinutes: cfg.tzOffset });
  if (stay.error) throw new HttpError(400, stay.error);

  const booking = await withLock(`room:${roomId}`, async () => {
    const room = await Room.findOne({ _id: roomId, isActive: true });
    if (!room) throw new HttpError(404, 'This room is not available.');
    if (guests > room.maxOccupancy) throw new HttpError(400, `This room sleeps at most ${room.maxOccupancy} guests.`);

    await housekeeping();
    // The same customer cannot hold two overlapping reservations for the same room.
    const dup = await Booking.exists({
      user: req.user._id, room: room._id,
      arrivalDate: { $lt: stay.departure }, departureDate: { $gt: stay.arrival },
      bookingStatus: { $in: ['Pending', 'Confirmed'] },
    });
    if (dup) throw new HttpError(409, 'You already have a booking for this room that overlaps these dates.');

    const avail = (await computeAvailability([room], stay.arrival, stay.departure)).get(String(room._id));
    if (avail < 1) throw new HttpError(409, 'Sorry, this room was just booked for those dates.');

    return Booking.create({
      bookingId: newBookingId(),
      user: req.user._id,
      room: room._id,
      arrivalDate: stay.arrival,
      departureDate: stay.departure,
      nights: stay.nights,
      guests,
      pricePerNight: room.pricePerNight,
      totalAmount: room.pricePerNight * stay.nights, // always computed on the server
      phone: req.user.phone,
      holdExpiresAt: new Date(Date.now() + cfg.holdMinutes * 60000),
    });
  });

  await booking.populate(POPULATE_ROOM);
  res.status(201).json({ booking: present(booking), holdMinutes: cfg.holdMinutes, paymentMode: provider.mode() });
});

exports.myBookings = asyncHandler(async (req, res) => {
  await housekeeping();
  const list = await Booking.find({ user: req.user._id }).populate(POPULATE_ROOM).sort({ createdAt: -1 });
  res.json({ bookings: list.map(present), policy: { freeCancelHours: cfg.freeCancelHours } });
});

exports.getBooking = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(400, 'Invalid booking id.');
  await housekeeping();
  const b = await Booking.findById(req.params.id).populate(POPULATE_ROOM).populate('user', 'name email phone');
  if (!b) throw new HttpError(404, 'Booking not found.');
  const ownerId = String(b.user._id || b.user);
  if (req.user.role !== 'admin' && ownerId !== String(req.user._id)) throw new HttpError(404, 'Booking not found.'); // don't reveal existence
  res.json({ booking: present(b) });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(400, 'Invalid booking id.');
  const b = await Booking.findById(req.params.id);
  if (!b || (req.user.role !== 'admin' && String(b.user) !== String(req.user._id))) throw new HttpError(404, 'Booking not found.');

  await withLock(`room:${b.room}`, async () => {
    const fresh = await Booking.findById(b._id);
    const info = cancellationInfo(fresh);
    if (!info.canCancel) throw new HttpError(400, 'This booking can no longer be cancelled.');

    fresh.bookingStatus = 'Cancelled';
    fresh.cancelledAt = new Date();
    fresh.cancelReason = req.user.role === 'admin' && String(fresh.user) !== String(req.user._id) ? 'Cancelled by hotel' : 'Cancelled by guest';

    if (fresh.paymentStatus === 'Paid') {
      // Admin cancellations are always refunded; guest cancellations follow the policy window.
      const refundable = info.refundEligible || fresh.cancelReason === 'Cancelled by hotel';
      if (refundable) {
        try {
          const r = await provider.refund(fresh.razorpayPaymentId, Math.round(fresh.totalAmount * 100));
          fresh.paymentStatus = 'Refunded';
          fresh.refundId = r.id;
          fresh.refundNote = fresh.paymentMode === 'sandbox' ? 'Sandbox refund (no real money moved).' : 'Refund issued to the original payment method.';
        } catch (e) {
          console.error('[refund] failed', e);
          fresh.refundNote = 'Refund could not be processed automatically. The hotel will contact you.';
        }
      } else {
        fresh.refundNote = `Cancelled less than ${cfg.freeCancelHours} hours before arrival: not eligible for a refund.`;
      }
    }
    await fresh.save();
  });

  const out = await Booking.findById(b._id).populate(POPULATE_ROOM);
  res.json({ message: 'Booking cancelled.', booking: present(out) });
});
