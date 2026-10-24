const Notification = require('../models/Notification');
const { formatLocalDateTime } = require('../utils/dateUtils');

// @desc    Get notifications for currently authenticated user or meeting person
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    const query = {
      $or: [
        { recipientUser: user._id },
        { recipientContact: user.phone },
        { recipientContact: user.email },
      ],
    };

    // If admin, can see all notifications or their own
    if (user.role === 'admin' && req.query.all === 'true') {
      delete query.$or;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = notifications.map((n) => ({
      id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      metadata: n.metadata,
      recipientName: n.recipientName,
      recipientContact: n.recipientContact,
      isRead: n.isRead,
      deliveryStatus: n.deliveryStatus,
      smsSent: n.smsSent,
      createdAt: n.createdAt,
      formattedCreatedAt: formatLocalDateTime(n.createdAt),
    }));

    res.json({
      success: true,
      count: formatted.length,
      notifications: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const user = req.user;
    const query = {
      isRead: false,
      $or: [
        { recipientUser: user._id },
        { recipientContact: user.phone },
        { recipientContact: user.email },
      ],
    };

    if (user.role === 'admin' && req.query.all === 'true') {
      delete query.$or;
    }

    const count = await Notification.countDocuments(query);

    res.json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    notification.deliveryStatus = 'Read';
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    const user = req.user;
    const query = {
      isRead: false,
      $or: [
        { recipientUser: user._id },
        { recipientContact: user.phone },
        { recipientContact: user.email },
      ],
    };

    await Notification.updateMany(query, {
      $set: { isRead: true, readAt: new Date(), deliveryStatus: 'Read' },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
