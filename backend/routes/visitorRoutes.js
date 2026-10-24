const express = require('express');
const router = express.Router();
const {
  registerVisitor,
  getAllVisitors,
  getVisitorById,
  updateVisitorStatus,
  verifyVisitorQR,
  searchVisitors,
  getMyVisitors,
  deleteVisitor,
} = require('../controllers/visitorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { publicRegistrationLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/uploadMiddleware');

// Public visitor registration
router.post(
  '/register',
  publicRegistrationLimiter,
  upload.single('photo'),
  registerVisitor
);

// Authenticated user's visitors (student or staff)
router.get('/my-visitors', protect, getMyVisitors);

// Public or authenticated status check by visitor ID
router.get('/:id', getVisitorById);

// Protected routes (Admin & Security)
router.get(
  '/',
  protect,
  authorize('admin', 'security'),
  getAllVisitors
);

router.get(
  '/search/records',
  protect,
  authorize('admin', 'security'),
  searchVisitors
);

router.post(
  '/verify-qr',
  protect,
  authorize('admin', 'security'),
  verifyVisitorQR
);

// Admin approval/rejection
router.put(
  '/:id/status',
  protect,
  authorize('admin'),
  updateVisitorStatus
);

// Delete visitor endpoint (Admin or Owner)
router.delete('/:id', protect, deleteVisitor);

module.exports = router;
