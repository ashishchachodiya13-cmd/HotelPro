const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { isObjectId, escapeRegex } = require('../utils/validators');
const { housekeeping } = require('../utils/availability');
const { present } = require('./bookingController');

exports.stats = asyncHandler(async (req, res) => {
  await housekeeping();
  const [users, rooms, bookings, revenue] = await Promise.all([
    User.countDocuments(),
    Room.countDocuments(),
    Booking.countDocuments(),
    Booking.aggregate([{ $match: { paymentStatus: 'Paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);
  res.json({ users, rooms, bookings, revenue: revenue[0]?.total || 0 });
});

exports.listBookings = asyncHandler(async (req, res) => {
  await housekeeping();
  const { status, paymentStatus, q } = req.query;
  const filter = {};
  if (['Pending', 'Confirmed', 'Cancelled', 'Completed'].includes(status)) filter.bookingStatus = status;
  if (['Pending', 'Paid', 'Failed', 'Refunded'].includes(paymentStatus)) filter.paymentStatus = paymentStatus;
  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().slice(0, 60)), 'i');
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').lean();
    filter.$or = [{ bookingId: rx }, { user: { $in: users.map((u) => u._id) } }];
  }
  const list = await Booking.find(filter)
    .populate('room', 'name images')
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json({ bookings: list.map(present) });
});

exports.listRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find().sort({ createdAt: -1 }).lean();
  res.json({ rooms });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('name email phone role createdAt').sort({ createdAt: -1 }).lean(); // password never selected
  res.json({ users });
});

exports.updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};
  if (!isObjectId(id)) throw new HttpError(400, 'Invalid user id.');
  if (!['customer', 'admin'].includes(role)) throw new HttpError(400, 'Role must be "customer" or "admin".');
  if (String(req.user._id) === id) throw new HttpError(400, 'You cannot change your own role.');
  const user = await User.findById(id).select('+tokenVersion');
  if (!user) throw new HttpError(404, 'User not found.');
  if (user.role === 'admin' && role === 'customer' && (await User.countDocuments({ role: 'admin' })) <= 1)
    throw new HttpError(400, 'Cannot demote the last administrator.');
  user.role = role;
  user.tokenVersion += 1; // revoke existing sessions so the new role applies immediately
  await user.save();
  res.json({ user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt } });
});
