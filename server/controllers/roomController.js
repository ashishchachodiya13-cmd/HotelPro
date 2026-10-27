const Room = require('../models/Room');
const Booking = require('../models/Booking');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const cfg = require('../utils/config');
const { validateStay } = require('../utils/dates');
const { isObjectId } = require('../utils/validators');
const { computeAvailability, housekeeping } = require('../utils/availability');
const { removeUploadedFiles } = require('../middleware/uploadMiddleware');

function parseList(v) {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v !== 'string' || !v.trim()) return [];
  try {
    const j = JSON.parse(v);
    if (Array.isArray(j)) return j.map(String).map((s) => s.trim()).filter(Boolean);
  } catch { /* fall through to comma separated */ }
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

function readRoomBody(body, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) errors.name = 'Room type / name is required.';
    else out.name = body.name.trim().slice(0, 80);
  }
  if (!partial || has('description')) {
    if (typeof body.description !== 'string' || body.description.trim().length < 10) errors.description = 'Description is required (min 10 characters).';
    else out.description = body.description.trim().slice(0, 2000);
  }
  if (!partial || has('pricePerNight')) {
    const p = Number(body.pricePerNight);
    if (!Number.isFinite(p) || p <= 0 || p > 10000000) errors.pricePerNight = 'Enter a valid price per night.';
    else out.pricePerNight = Math.round(p * 100) / 100;
  }
  if (!partial || has('maxOccupancy')) {
    const m = Number(body.maxOccupancy);
    if (!Number.isInteger(m) || m < 1 || m > 10) errors.maxOccupancy = 'Occupancy must be a whole number from 1 to 10.';
    else out.maxOccupancy = m;
  }
  if (!partial || has('inventory')) {
    const i = Number(body.inventory ?? 1);
    if (!Number.isInteger(i) || i < 1 || i > 500) errors.inventory = 'Inventory must be a whole number from 1 to 500.';
    else out.inventory = i;
  }
  if (has('amenities')) out.amenities = parseList(body.amenities).slice(0, 30);
  if (has('isActive')) out.isActive = body.isActive === true || body.isActive === 'true';
  return { out, errors };
}

const fileUrls = (files = []) => files.map((f) => `/uploads/${f.filename}`);

exports.listRooms = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 100);
  const rooms = await Room.find({ isActive: true }).sort({ pricePerNight: 1 }).limit(limit).lean();
  res.json({ rooms });
});

exports.getRoom = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(400, 'Invalid room id.');
  const room = await Room.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!room) throw new HttpError(404, 'Room not found.');
  res.json({ room });
});

exports.availability = asyncHandler(async (req, res) => {
  const stay = validateStay(req.query.arrival, req.query.departure, {
    maxNights: cfg.maxNights, maxAdvanceDays: cfg.maxAdvanceDays, offsetMinutes: cfg.tzOffset,
  });
  if (stay.error) throw new HttpError(400, stay.error);
  const guests = Math.max(1, parseInt(req.query.guests, 10) || 1);
  await housekeeping();
  const rooms = await Room.find({ isActive: true, maxOccupancy: { $gte: guests } }).sort({ pricePerNight: 1 }).lean();
  const avail = await computeAvailability(rooms, stay.arrival, stay.departure);
  const result = rooms
    .map((r) => ({ ...r, availableUnits: avail.get(String(r._id)), nights: stay.nights, totalPrice: r.pricePerNight * stay.nights }))
    .filter((r) => r.availableUnits > 0);
  res.json({ rooms: result, nights: stay.nights, arrival: req.query.arrival, departure: req.query.departure });
});

exports.createRoom = asyncHandler(async (req, res) => {
  const { out, errors } = readRoomBody(req.body || {});
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', errors);
  const room = await Room.create({ ...out, images: fileUrls(req.files) });
  res.status(201).json({ room });
});

exports.updateRoom = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(400, 'Invalid room id.');
  const room = await Room.findById(req.params.id);
  if (!room) throw new HttpError(404, 'Room not found.');
  const { out, errors } = readRoomBody(req.body || {}, { partial: true });
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', errors);

  // keepImages: JSON array of existing image paths to retain. Omit to keep all existing images.
  let images = room.images;
  if (req.body.keepImages !== undefined) {
    const keep = new Set(parseList(req.body.keepImages));
    const removed = room.images.filter((p) => !keep.has(p));
    images = room.images.filter((p) => keep.has(p));
    removeUploadedFiles(removed);
  }
  images = [...images, ...fileUrls(req.files)].slice(0, 10);

  Object.assign(room, out, { images });
  await room.save();
  res.json({ room });
});

// Default: soft delete (deactivate) so booking history keeps working.
// ?permanent=true removes the room only if it has never been booked.
exports.deleteRoom = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(400, 'Invalid room id.');
  const room = await Room.findById(req.params.id);
  if (!room) throw new HttpError(404, 'Room not found.');
  if (req.query.permanent === 'true') {
    if (await Booking.exists({ room: room._id })) throw new HttpError(409, 'This room has booking history and can only be deactivated.');
    removeUploadedFiles(room.images);
    await room.deleteOne();
    return res.json({ message: 'Room permanently deleted.' });
  }
  room.isActive = false;
  await room.save();
  res.json({ message: 'Room deactivated.', room });
});
