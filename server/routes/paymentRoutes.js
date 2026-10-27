const router = require('express').Router();
const c = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// NOTE: POST /webhook is mounted in app.js with express.raw() before the JSON parser.
router.get('/config', c.paymentConfig);
router.post('/order', protect, c.createOrder);
router.post('/verify', protect, c.verify);
router.post('/failed', protect, c.markFailed);
router.post('/sandbox/confirm', protect, c.sandboxConfirm);

module.exports = router;
