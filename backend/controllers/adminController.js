const GatePass = require('../models/GatePass');
const Visitor = require('../models/Visitor');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { formatLocalDateTime } = require('../utils/dateUtils');

// @desc    Get complete admin dashboard analytics and recent activities
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin only)
const getDashboardStats = async (req, res, next) => {
  try {
    // Parallel counts for high performance
    const [
      totalStudents,
      totalUsers,
      pendingGatePasses,
      approvedGatePasses,
      rejectedGatePasses,
      totalGatePasses,
      pendingVisitors,
      approvedVisitors,
      rejectedVisitors,
      totalVisitors,
      recentGatePasses,
      recentVisitors,
      recentNotifications,
      recentAuditLogs,
    ] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments(),
      GatePass.countDocuments({ status: 'Pending' }),
      GatePass.countDocuments({ status: { $in: ['Approved', 'Checked-Out', 'Completed'] } }),
      GatePass.countDocuments({ status: 'Rejected' }),
      GatePass.countDocuments(),
      Visitor.countDocuments({ status: 'Pending' }),
      Visitor.countDocuments({ status: { $in: ['Approved', 'Checked-In', 'Completed'] } }),
      Visitor.countDocuments({ status: 'Rejected' }),
      Visitor.countDocuments(),
      GatePass.find().sort({ createdAt: -1 }).limit(6),
      Visitor.find().sort({ createdAt: -1 }).limit(6),
      Notification.find().sort({ createdAt: -1 }).limit(6),
      AuditLog.find().sort({ timestamp: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalUsers,
        gatePasses: {
          total: totalGatePasses,
          pending: pendingGatePasses,
          approved: approvedGatePasses,
          rejected: rejectedGatePasses,
        },
        visitors: {
          total: totalVisitors,
          pending: pendingVisitors,
          approved: approvedVisitors,
          rejected: rejectedVisitors,
        },
      },
      recentGatePasses,
      recentVisitors,
      recentNotifications,
      recentAuditLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private (Admin)
const getAllStudents = async (req, res, next) => {
  try {
    const { search, department, year, page = 1, limit = 20 } = req.query;
    const query = {};

    if (department && department !== 'All') {
      query.department = department;
    }
    if (year && year !== 'All') {
      query.year = year;
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ fullName: regex }, { rollNumber: regex }, { phone: regex }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('user', 'email isActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: students.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
      students,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (action && action !== 'All') {
      query.action = action;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'actor.name': regex },
        { 'actor.email': regex },
        { targetId: regex },
        { action: regex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllStudents,
  getAuditLogs,
};
