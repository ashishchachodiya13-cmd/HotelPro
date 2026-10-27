// Usage: npm run seed-rooms  (adds sample rooms only if the rooms collection is empty)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Room = require('../models/Room');

const rooms = [
  { name: 'Standard Room', description: 'A bright, comfortable room with a queen bed, work desk and city views. Ideal for solo travellers and couples.', pricePerNight: 2500, amenities: ['Free WiFi', 'Air conditioning', 'TV', 'Tea/Coffee maker'], maxOccupancy: 2, inventory: 6 },
  { name: 'Deluxe Room', description: 'Spacious deluxe room with a king bed, sitting area and a private balcony.', pricePerNight: 4200, amenities: ['Free WiFi', 'Air conditioning', 'Balcony', 'Mini bar', 'Breakfast included'], maxOccupancy: 3, inventory: 4 },
  { name: 'Family Suite', description: 'Two-bedroom suite with a living room and kitchenette, perfect for families.', pricePerNight: 7000, amenities: ['Free WiFi', 'Air conditioning', 'Kitchenette', 'Living room', 'Breakfast included'], maxOccupancy: 5, inventory: 2 },
  { name: 'Presidential Suite', description: 'Our finest suite: panoramic views, a private dining area and butler service.', pricePerNight: 15000, amenities: ['Free WiFi', 'Butler service', 'Jacuzzi', 'Private dining', 'Airport transfer'], maxOccupancy: 4, inventory: 1 },
];

(async () => {
  await connectDB();
  if (await Room.countDocuments()) console.log('Rooms already exist: nothing seeded.');
  else { await Room.insertMany(rooms); console.log(`Seeded ${rooms.length} rooms (add photos from the admin dashboard).`); }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
