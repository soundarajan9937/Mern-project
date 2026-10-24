const express = require('express');
const router = express.Router();
const {
  submitGatePassRequest,
  getMyGatePasses,
  getAllGatePasses,
  getGatePassById,
  updateGatePassStatus,
  verifyGatePassQR,
  searchStudent,
  applyOutPassMobile,
  getGatePassPublicStatus,
  deleteGatePass,
  recordStudentReturn,
  getNetworkInfo,
} = require('../controllers/gatePassController');
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Dynamic Network IP and info for mobile QR code access
router.get('/network-info', getNetworkInfo);

// Mobile Out Pass Application & Real-time Public Status
router.post(
  '/apply-mobile',
  optionalProtect,
  upload.single('photo'),
  applyOutPassMobile
);
router.get('/public-status/:passId', getGatePassPublicStatus);

// Student / Admin endpoints
router.post(
  '/',
  protect,
  authorize('student', 'admin'),
  upload.single('photo'),
  submitGatePassRequest
);
router.get('/my-requests', protect, authorize('student', 'admin'), getMyGatePasses);

// Search endpoint for security & admin
router.get(
  '/search-student',
  protect,
  authorize('security', 'admin'),
  searchStudent
);

// QR verification endpoint (accessible by Security, Admin, or Gate scanner)
router.post(
  '/verify-qr',
  optionalProtect,
  verifyGatePassQR
);

// Record student return endpoint
router.post(
  '/record-return',
  optionalProtect,
  recordStudentReturn
);

// General listings (Admin, Security)
router.get('/', protect, authorize('admin', 'security'), getAllGatePasses);
router.get('/:id', protect, getGatePassById);

// Admin approval/rejection endpoint
router.put(
  '/:id/status',
  protect,
  authorize('admin'),
  updateGatePassStatus
);

// Delete gate pass endpoint (Admin or Owner)
router.delete('/:id', protect, deleteGatePass);

module.exports = router;
