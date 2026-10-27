require('dotenv').config();
const connectDB = require('./config/db');
const provider = require('./utils/paymentProvider');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET is missing or too short (min 16 chars). Set it in server/.env');
  process.exit(1);
}

const app = require('./app');
const PORT = process.env.PORT || 8001;

(async () => {
  try {
    await connectDB(); // connect before accepting traffic
    app.listen(PORT, () => {
      console.log(`[server] HotelPro API listening on http://localhost:${PORT}`);
      console.log(provider.mode() === 'sandbox'
        ? '[payments] SANDBOX mode (no Razorpay keys set). No real money moves.'
        : '[payments] Razorpay mode enabled.');
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
})();
