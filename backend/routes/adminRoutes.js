const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllStudents,
  getAuditLogs,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/students', getAllStudents);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
