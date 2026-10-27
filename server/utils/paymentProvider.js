// Thin wrapper around Razorpay. When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are missing the
// server runs in SANDBOX mode: no real money moves and the UI says so explicitly.
const crypto = require('crypto');
const cfg = require('./config');

let client = null;

const hasKeys = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const mode = () => (hasKeys() ? 'razorpay' : 'sandbox');
const sandboxAllowed = () => mode() === 'sandbox' && !cfg.isProd;

function razorpay() {
  if (!client) {
    const Razorpay = require('razorpay');
    client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return client;
}

async function createOrder({ amountPaise, receipt }) {
  if (mode() === 'sandbox') {
    return { id: `sandbox_order_${crypto.randomBytes(8).toString('hex')}`, amount: amountPaise, currency: 'INR' };
  }
  return razorpay().orders.create({ amount: amountPaise, currency: 'INR', receipt });
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!hasKeys() || !orderId || !paymentId || !signature) return false;
  return safeEqual(hmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(hmac(secret, rawBody), signature);
}

async function refund(paymentId, amountPaise) {
  if (mode() === 'sandbox') return { id: `sandbox_refund_${crypto.randomBytes(6).toString('hex')}` };
  return razorpay().payments.refund(paymentId, { amount: amountPaise });
}

module.exports = { mode, hasKeys, sandboxAllowed, createOrder, verifyPaymentSignature, verifyWebhookSignature, refund };
