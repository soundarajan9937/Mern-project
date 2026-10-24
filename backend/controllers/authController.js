const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { logAction } = require('../services/auditService');
const getJwtSecret = require('../utils/jwtSecret');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign(
    { id },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @desc    Register a student user and student record
// @route   POST /api/auth/register-student
// @access  Public
const registerStudent = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      rollNumber,
      department,
      year,
      phone,
      hostelBlock,
      hostelRoom,
      guardianName,
      guardianPhone,
    } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email address, and password',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    let finalRoll = rollNumber?.trim() ? rollNumber.trim().toUpperCase() : `STU${Date.now().toString().slice(-6)}`;
    if (rollNumber?.trim()) {
      const existingStudent = await Student.findOne({ rollNumber: finalRoll });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'A student with this roll number is already registered',
        });
      }
    }

    // Photo handling: if file uploaded via multer or photoUrl provided
    let photoUrl = '';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoUrl) {
      photoUrl = req.body.photoUrl;
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'student',
      phone: phone || '',
      department: department || 'General',
      avatar: photoUrl,
    });

    // Create student record
    const student = await Student.create({
      user: user._id,
      fullName: name,
      rollNumber: finalRoll,
      department: department || 'General',
      year: year || '1st Year',
      phone: phone || '',
      hostelBlock: hostelBlock || 'Block A',
      hostelRoom: hostelRoom || '101',
      photoUrl,
      guardianName: guardianName || '',
      guardianPhone: guardianPhone || '',
    });

    const token = generateToken(user._id);

    await logAction({
      action: 'STUDENT_REGISTERED',
      actor: { id: user._id, name: user.name, email: user.email, role: 'student' },
      targetType: 'User',
      targetId: user._id.toString(),
      details: { rollNumber: student.rollNumber, department: student.department },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        avatar: user.avatar,
      },
      student,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const isPasswordCorrect = user
      ? await user.matchPassword(password)
      : false;

    if (!user || !isPasswordCorrect) {
      await logAction({
        action: 'LOGIN_FAILED',
        actor: { name: email, role: 'unknown' },
        targetType: 'User',
        targetId: '',
        details: { attemptedEmail: email },
        ipAddress: req.ip,
        status: 'WARNING',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact the administrator.',
      });
    }

    let studentProfile = null;
    if (user.role === 'student' || user.role === 'admin') {
      studentProfile = await Student.findOne({ user: user._id });
    }

    const token = generateToken(user._id);

    await logAction({
      action: 'USER_LOGIN',
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      targetType: 'User',
      targetId: user._id.toString(),
      details: { role: user.role },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        avatar: user.avatar,
      },
      student: studentProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user & linked profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let student = await Student.findOne({ user: user._id });

    res.json({
      success: true,
      user,
      student,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    await logAction({
      action: 'PASSWORD_CHANGED',
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      targetType: 'User',
      targetId: user._id.toString(),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, department, rollNumber, year, hostelBlock, hostelRoom } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (department && department.trim()) {
      user.department = department.trim();
    }

    if (req.file) {
      user.avatar = `/uploads/${req.file.filename}`;
    } else if (req.body.avatar !== undefined) {
      user.avatar = req.body.avatar;
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const emailLower = email.toLowerCase().trim();
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(emailLower)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
      }

      const existing = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists',
        });
      }
      user.email = emailLower;
    }

    await user.save();

    let student = await Student.findOne({ user: user._id });
    if (!student && (user.role === 'student' || user.role === 'admin' || rollNumber)) {
      student = new Student({
        user: user._id,
        fullName: user.name,
        rollNumber: rollNumber ? rollNumber.trim().toUpperCase() : `STU${Date.now().toString().slice(-6)}`,
        department: department || user.department || 'General',
        year: year || '1st Year',
        phone: phone || user.phone || '',
        hostelBlock: hostelBlock || 'Block A',
        hostelRoom: hostelRoom || '101',
        photoUrl: user.avatar || '',
      });
      await student.save();
    } else if (student) {
      if (name && name.trim()) student.fullName = name.trim();
      if (phone !== undefined) student.phone = phone.trim();
      if (department && department.trim()) student.department = department.trim();
      if (rollNumber && rollNumber.trim()) student.rollNumber = rollNumber.trim().toUpperCase();
      if (year && year.trim()) student.year = year.trim();
      if (hostelBlock && hostelBlock.trim()) student.hostelBlock = hostelBlock.trim();
      if (hostelRoom && hostelRoom.trim()) student.hostelRoom = hostelRoom.trim();
      if (user.avatar) student.photoUrl = user.avatar;
      await student.save();
    }

    await logAction({
      action: 'PROFILE_UPDATED',
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      targetType: 'User',
      targetId: user._id.toString(),
      details: { name: user.name, email: user.email, phone: user.phone },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        avatar: user.avatar,
      },
      student,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerStudent,
  login,
  getMe,
  changePassword,
  updateProfile,
};
