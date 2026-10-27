const Booking = require('../models/Booking');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { isObjectId } = require('../utils/validators');
const { withLock } = require('../utils/mutex');
const { computeAvailability, HOLD_EXPIRED } = require('../utils/availability');
const provider = require('../utils/paymentProvider');
const Room = require('../models/Room');
const { present } = require('./bookingController');

async function loadOwnedBooking(req, bookingId) {
  if (!isObjectId(bookingId)) throw new HttpError(400, 'Invalid booking id.');
  const b = await Booking.findById(bookingId);
  if (!b || String(b.user) !== String(req.user._id)) throw new HttpError(404, 'Booking not found.');
  return b;
}

async function refundSafely(b, note) {
  try {
    const r = await provider.refund(b.razorpayPaymentId, Math.round(b.totalAmount * 100));
    b.paymentStatus = 'Refunded';
    b.refundId = r.id;
    b.refundNote = note;
  } catch (e) {
    console.error('[refund] failed', e);
    b.refundNote = 'Payment received but the booking could not be honoured; refund pending manual processing.';
  }
}

/**
 * Idempotently mark a booking as paid. Safe to call from both the client verify call and the
 * webhook: the second call is a no-op. Handles a payment that lands after the hold expired.
 */
async function settlePaid(bookingId, paymentId, mode) {
  const probe = await Booking.findById(bookingId).select('room');
  return withLock(`room:${probe.room}`, async () => {
    const b = await Booking.findById(bookingId);
    if (['Paid', 'Refunded'].includes(b.paymentStatus)) return b; // duplicate notification
    b.razorpayPaymentId = paymentId;
    b.paymentMode = mode;
    b.paymentStatus = 'Paid';

    if (['Pending', 'Confirmed'].includes(b.bookingStatus)) {
      b.bookingStatus = 'Confirmed';
      b.holdExpiresAt = undefined;
    } else if (b.bookingStatus === 'Cancelled' && b.cancelReason === HOLD_EXPIRED) {
      const room = await Room.findById(b.room);
      const free = room ? (await computeAvailability([room], b.arrivalDate, b.departureDate)).get(String(room._id)) : 0;
      if (free >= 1 && b.arrivalDate > new Date()) {
        b.bookingStatus = 'Confirmed';
        b.cancelledAt = undefined;
        b.cancelReason = undefined;
        b.holdExpiresAt = undefined;
      } else {
        await refundSafely(b, 'Payment arrived after the hold expired and the room was no longer free; refunded.');
      }
    } else {
      await refundSafely(b, 'Payment arrived for a cancelled booking; refunded.');
    }
    await b.save();
    return b;
  });
}

exports.paymentConfig = (req, res) => {
  res.json({ mode: provider.mode(), sandbox: provider.mode() === 'sandbox', keyId: process.env.RAZORPAY_KEY_ID || null });
};

exports.createOrder = asyncHandler(async (req, res) => {
  if (provider.mode() === 'sandbox' && !provider.sandboxAllowed())
    throw new HttpError(503, 'Payments are not configured on this server.');
  const b = await loadOwnedBooking(req, req.body?.bookingId);
  if (b.bookingStatus !== 'Pending' || !b.holdExpiresAt || b.holdExpiresAt <= new Date())
    throw new HttpError(409, 'This booking is no longer awaiting payment. Please search again.');
  if (!['Pending', 'Failed'].includes(b.paymentStatus)) throw new HttpError(409, 'This booking has already been paid.');

  const order = await provider.createOrder({ amountPaise: Math.round(b.totalAmount * 100), receipt: b.bookingId });
  b.razorpayOrderId = order.id;
  b.paymentMode = provider.mode();
  b.paymentStatus = 'Pending';
  await b.save();

  res.json({
    mode: provider.mode(),
    sandbox: provider.mode() === 'sandbox',
    keyId: process.env.RAZORPAY_KEY_ID || null,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    bookingId: b._id,
    bookingRef: b.bookingId,
  });
});

exports.verify = asyncHandler(async (req, res) => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  const b = await loadOwnedBooking(req, bookingId);
  if (provider.mode() !== 'razorpay') throw new HttpError(400, 'Gateway verification is unavailable in sandbox mode.');
  if (b.razorpayOrderId !== razorpay_order_id) throw new HttpError(400, 'Order does not match this booking.');
  if (!provider.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    if (b.paymentStatus === 'Pending') { b.paymentStatus = 'Failed'; await b.save(); }
    throw new HttpError(400, 'Payment signature could not be verified.');
  }
  const done = await settlePaid(b._id, razorpay_payment_id, 'razorpay');
  await done.populate({ path: 'room', select: 'name images pricePerNight' });
  res.json({ message: 'Payment verified.', booking: present(done) });
});

// Reports a failed/dismissed attempt. Can only move Pending -> Failed; never touches paid bookings.
exports.markFailed = asyncHandler(async (req, res) => {
  const b = await loadOwnedBooking(req, req.body?.bookingId);
  if (b.paymentStatus === 'Pending' && b.razorpayOrderId) { b.paymentStatus = 'Failed'; await b.save(); }
  res.json({ booking: present(b) });
});

// SANDBOX ONLY: lets you exercise the full flow without a gateway account. No real money moves.
exports.sandboxConfirm = asyncHandler(async (req, res) => {
  if (!provider.sandboxAllowed()) throw new HttpError(404, 'Not found.');
  const b = await loadOwnedBooking(req, req.body?.bookingId);
  if (!b.razorpayOrderId || !String(b.razorpayOrderId).startsWith('sandbox_order_')) throw new HttpError(400, 'Create a payment order first.');
  if (req.body?.outcome === 'failed') {
    if (b.paymentStatus === 'Pending') { b.paymentStatus = 'Failed'; await b.save(); }
    return res.json({ message: 'Sandbox payment marked as failed.', booking: present(b) });
  }
  const done = await settlePaid(b._id, `sandbox_pay_${Date.now()}`, 'sandbox');
  await done.populate({ path: 'room', select: 'name images pricePerNight' });
  res.json({ message: 'Sandbox payment recorded.', booking: present(done) });
});

// Razorpay webhook. Mounted with express.raw() so the signature is computed over the exact bytes.
exports.webhook = asyncHandler(async (req, res) => {
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : '';
  if (!provider.verifyWebhookSignature(raw, req.get('x-razorpay-signature'))) return res.status(400).json({ message: 'Invalid signature.' });
  let evt;
  try { evt = JSON.parse(raw); } catch { return res.status(400).json({ message: 'Bad payload.' }); }
  const p = evt?.payload?.payment?.entity;
  if (p?.order_id) {
    const b = await Booking.findOne({ razorpayOrderId: p.order_id });
    if (b) {
      if (evt.event === 'payment.captured' || evt.event === 'order.paid') await settlePaid(b._id, p.id, 'razorpay');
      else if (evt.event === 'payment.failed' && b.paymentStatus === 'Pending') { b.paymentStatus = 'Failed'; await b.save(); }
    }
  }
  res.json({ received: true });
});
