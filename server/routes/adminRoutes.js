const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

router.use(protect, adminOnly);
router.get('/stats', c.stats);
router.get('/bookings', c.listBookings);
router.get('/rooms', c.listRooms);
router.get('/users', c.listUsers);
router.patch('/users/:id/role', c.updateUserRole);

module.exports = router;
