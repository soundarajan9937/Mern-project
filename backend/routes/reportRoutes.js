const express = require('express');
const router = express.Router();
const {
  exportGatePassesCSV,
  exportVisitorsCSV,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/gatepasses/csv', exportGatePassesCSV);
router.get('/visitors/csv', exportVisitorsCSV);

module.exports = router;
