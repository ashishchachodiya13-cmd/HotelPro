const router = require('express').Router();
const c = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');
const { roomImages } = require('../middleware/uploadMiddleware');

router.get('/', c.listRooms);
router.get('/availability', c.availability); // must stay above /:id
router.get('/:id', c.getRoom);
router.post('/', protect, adminOnly, roomImages, c.createRoom);
router.put('/:id', protect, adminOnly, roomImages, c.updateRoom);
router.delete('/:id', protect, adminOnly, c.deleteRoom);

module.exports = router;
