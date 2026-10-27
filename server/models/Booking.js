const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    arrivalDate: { type: Date, required: true },
    departureDate: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    guests: { type: Number, required: true, min: 1 },
    pricePerNight: { type: Number, required: true }, // snapshot at booking time
    totalAmount: { type: Number, required: true, min: 0 },
    phone: { type: String, required: true },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    holdExpiresAt: { type: Date }, // Pending bookings only block inventory until this time
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String },
    paymentMode: { type: String, enum: ['razorpay', 'sandbox'] },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    refundId: { type: String },
    refundNote: { type: String },
  },
  { timestamps: true }
);

bookingSchema.index({ room: 1, arrivalDate: 1, departureDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
