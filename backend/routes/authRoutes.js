const express = require('express');
const router = express.Router();
const {
  registerStudent,
  login,
  getMe,
  changePassword,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/uploadMiddleware');

router.post('/register-student', upload.single('photo'), registerStudent);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, upload.single('avatar'), updateProfile);

module.exports = router;
