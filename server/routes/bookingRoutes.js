const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/', c.createBooking);
router.get('/my', c.myBookings); // above /:id
router.get('/:id', c.getBooking);
router.patch('/:id/cancel', c.cancelBooking);

module.exports = router;
