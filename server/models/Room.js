const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    pricePerNight: { type: Number, required: true, min: 1 },
    images: [{ type: String }],
    amenities: [{ type: String, trim: true }],
    maxOccupancy: { type: Number, required: true, min: 1, max: 10, default: 2 },
    inventory: { type: Number, required: true, min: 1, default: 1 }, // number of identical rooms
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ isActive: 1, pricePerNight: 1 });

module.exports = mongoose.model('Room', roomSchema);
