const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set. Copy .env.example to .env first.');
  mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] MongoDB reconnected'));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
}

module.exports = connectDB;
