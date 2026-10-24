const mongoose = require('mongoose');
const Visitor = require('../models/Visitor');
const Student = require('../models/Student');
const { generateFormattedId, formatLocalDateTime } = require('../utils/dateUtils');
const { generateSecureToken, generateQRCodeDataUrl } = require('../services/qrService');
const { notifyMeetingPersonOnVisitorRegistration } = require('../services/notificationService');
const { logAction } = require('../services/auditService');
const { saveBase64Image } = require('../utils/photoUtils');

// @desc    Public registration for parents & visitors
// @route   POST /api/visitors/register
// @access  Public
const registerVisitor = async (req, res, next) => {
  try {
    const {
      fullName,
      relationship,
      phone,
      place,
      meetingPersonName,
      meetingPersonContact,
      studentRollNumber,
      department,
      purpose,
      expectedMeetingDate,
      consentGiven,
    } = req.body;

    // Validate required fields
    if (!fullName || !relationship || !phone || !place || !meetingPersonName || !meetingPersonContact || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory visitor registration details',
      });
    }

    if (consentGiven !== true && consentGiven !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'You must provide consent for photograph and visitor entry verification',
      });
    }

    // Photo handling: uploaded file or base64 image data URL (optional)
    let photoUrl = '';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoUrl) {
      photoUrl = saveBase64Image(req.body.photoUrl, 'visitor');
    }

    // Generate unique sequential visitor ID
    const visitorCount = await Visitor.countDocuments();
    const visitorId = generateFormattedId('VIS', visitorCount);

    // Backend automatic timestamp
    const submittedAt = new Date();

    // Generate unpredictable unique QR token and pass for instant entry
    const qrToken = generateSecureToken();
    const qrPayload = JSON.stringify({
      type: 'VISITOR_PASS',
      token: qrToken,
      visitorId,
    });
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const visitor = await Visitor.create({
      visitorId,
      fullName: fullName.trim(),
      relationship: relationship.trim(),
      phone: phone.trim(),
      place: place.trim(),
      meetingPersonName: meetingPersonName.trim(),
      meetingPersonContact: meetingPersonContact.trim(),
      studentRollNumber: studentRollNumber ? studentRollNumber.trim().toUpperCase() : '',
      department: department ? department.trim() : '',
      purpose: purpose.trim(),
      expectedMeetingDate: expectedMeetingDate ? new Date(expectedMeetingDate) : null,
      photoUrl,
      consentGiven: true,
      status: 'Approved',
      qrToken,
      qrCodeDataUrl,
      submittedAt,
    });

    // Automatic notification to meeting person (as specified)
    // The meeting person receives notification only - no approval or rejection required
    await notifyMeetingPersonOnVisitorRegistration(visitor);

    await logAction({
      action: 'VISITOR_REGISTERED',
      actor: { name: fullName, role: 'visitor' },
      targetType: 'Visitor',
      targetId: visitor.visitorId,
      details: { meetingPerson: meetingPersonName, purpose },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Visitor registration successful!',
      visitorId: visitor.visitorId,
      qrCodeDataUrl: visitor.qrCodeDataUrl,
      visitor: {
        id: visitor._id,
        visitorId: visitor.visitorId,
        fullName: visitor.fullName,
        relationship: visitor.relationship,
        meetingPersonName: visitor.meetingPersonName,
        meetingPersonContact: visitor.meetingPersonContact,
        status: 'Registration Successful',
        qrCodeDataUrl: visitor.qrCodeDataUrl,
        submittedAt: formatLocalDateTime(visitor.submittedAt),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all visitor registrations (Admin / Security)
// @route   GET /api/visitors
// @access  Private (Admin, Security)
const getAllVisitors = async (req, res, next) => {
  try {
    const { status, search, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { visitorId: searchRegex },
        { fullName: searchRegex },
        { phone: searchRegex },
        { meetingPersonName: searchRegex },
        { meetingPersonContact: searchRegex },
        { studentRollNumber: searchRegex },
      ];
    }

    if (dateFrom || dateTo) {
      query.submittedAt = {};
      if (dateFrom) query.submittedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query.submittedAt.$lte = to;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Visitor.countDocuments(query);
    const visitors = await Visitor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: visitors.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
      visitors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get visitor by ID, visitorId, or visitor name/phone
// @route   GET /api/visitors/:id
// @access  Private or Public tracking
const getVisitorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const term = decodeURIComponent(id || '').trim();
    if (!term) {
      return res.status(400).json({ success: false, message: 'Please enter a visitor name or ID' });
    }

    let visitors = [];

    // 1. If matches VIS- ID format
    if (term.toUpperCase().startsWith('VIS-')) {
      visitors = await Visitor.find({ visitorId: new RegExp(`^${term}$`, 'i') });
    } else if (mongoose.Types.ObjectId.isValid(term) && term.length === 24) {
      const v = await Visitor.findById(term);
      if (v) visitors = [v];
    }

    // 2. Search by visitor fullName (exact or case-insensitive), phone, or visitorId
    if (visitors.length === 0) {
      visitors = await Visitor.find({
        $or: [
          { fullName: new RegExp(`^${term}$`, 'i') },
          { phone: term },
          { visitorId: new RegExp(term, 'i') },
        ],
      }).sort({ createdAt: -1 });
    }

    // 3. If still not found, try partial match anywhere in fullName or meetingPersonName
    if (visitors.length === 0) {
      const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      visitors = await Visitor.find({
        $or: [
          { fullName: new RegExp(safeTerm, 'i') },
          { meetingPersonName: new RegExp(safeTerm, 'i') },
        ],
      }).sort({ createdAt: -1 }).limit(10);
    }

    if (visitors.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No visitor record found for "${term}"`,
      });
    }

    const primary = visitors[0];

    res.json({
      success: true,
      visitor: primary,
      visitors: visitors,
      count: visitors.length,
      timestamps: {
        submittedAt: formatLocalDateTime(primary.submittedAt),
        actionedAt: formatLocalDateTime(primary.actionedAt),
        checkedInAt: formatLocalDateTime(primary.checkedInAt),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approve or reject visitor registration
// @route   PUT /api/visitors/:id/status
// @access  Private (Admin only)
const updateVisitorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Approved or Rejected',
      });
    }

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor record not found',
      });
    }

    const actionDateTime = new Date();
    visitor.actionedAt = actionDateTime;
    visitor.actionedBy = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    };

    if (status === 'Rejected') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a reason for rejecting the visitor registration',
        });
      }

      visitor.status = 'Rejected';
      visitor.rejectionReason = rejectionReason.trim();
      visitor.qrToken = undefined;
      visitor.qrCodeDataUrl = '';

      await visitor.save();

      await logAction({
        action: 'VISITOR_REJECTED',
        actor: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' },
        targetType: 'Visitor',
        targetId: visitor.visitorId,
        details: { reason: rejectionReason.trim() },
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        message: `Visitor registration ${visitor.visitorId} has been rejected.`,
        visitor,
      });
    }

    if (status === 'Approved') {
      visitor.status = 'Approved';
      visitor.rejectionReason = '';

      // Generate unpredictable unique QR token
      const qrToken = generateSecureToken();
      visitor.qrToken = qrToken;

      const qrPayload = JSON.stringify({
        type: 'VISITOR_PASS',
        token: qrToken,
        visitorId: visitor.visitorId,
      });

      const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);
      visitor.qrCodeDataUrl = qrCodeDataUrl;

      await visitor.save();

      await logAction({
        action: 'VISITOR_APPROVED',
        actor: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' },
        targetType: 'Visitor',
        targetId: visitor.visitorId,
        details: { approvedAt: actionDateTime },
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        message: `Visitor registration ${visitor.visitorId} approved successfully! QR pass generated.`,
        visitor,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify QR code or Visitor ID at gate (Security / Admin)
// @route   POST /api/visitors/verify-qr
// @access  Private (Security, Admin)
const verifyVisitorQR = async (req, res, next) => {
  try {
    const { token, visitorId, actionType = 'STATUS_CHECK', notes = '' } = req.body;

    if (!token && !visitorId) {
      return res.status(400).json({
        success: false,
        verificationStatus: 'Not Registered / Invalid',
        message: 'No QR token or Visitor ID provided for verification',
      });
    }

    let parsedToken = token;
    if (typeof token === 'string' && token.startsWith('{') && token.endsWith('}')) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.token) parsedToken = parsed.token;
      } catch (e) {}
    }

    const query = {};
    if (parsedToken) query.qrToken = parsedToken;
    else if (visitorId) query.visitorId = visitorId.trim().toUpperCase();

    const visitor = await Visitor.findOne(query);

    if (!visitor) {
      await logAction({
        action: 'VISITOR_VERIFICATION_FAILED',
        actor: { id: req.user._id, name: req.user.name, role: req.user.role },
        targetType: 'SecurityScan',
        details: { attemptedToken: parsedToken, attemptedVisitorId: visitorId },
        status: 'WARNING',
        ipAddress: req.ip,
      });

      return res.status(404).json({
        success: false,
        verificationStatus: 'Not Registered / Invalid',
        message: 'No visitor record found matching the scanned QR code or ID.',
      });
    }

    let verificationStatus = '';
    let message = '';
    const now = new Date();

    if (visitor.status === 'Pending') {
      verificationStatus = 'Pending Approval';
      message = 'Visitor registration is still pending administrative approval. Entry is not permitted yet.';
    } else if (visitor.status === 'Rejected') {
      verificationStatus = 'Rejected';
      message = `Visitor registration was rejected. Reason: ${visitor.rejectionReason || 'Unauthorized'}`;
    } else if (visitor.status === 'Approved' || visitor.status === 'Checked-In') {
      verificationStatus = 'Registered and Approved';
      message = 'Visitor is registered and approved! Compare photo before admitting.';

      if (actionType === 'CHECK_IN') {
        visitor.checkedInAt = now;
        visitor.status = 'Checked-In';
      } else if (actionType === 'CHECK_OUT') {
        visitor.checkedOutAt = now;
        visitor.status = 'Completed';
      }

      visitor.verificationHistory.push({
        verifiedAt: now,
        actionType,
        verifiedBy: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role,
        },
        notes: notes || `Verified by ${req.user.name}`,
      });

      await visitor.save();

      await logAction({
        action: 'VISITOR_VERIFIED',
        actor: { id: req.user._id, name: req.user.name, role: req.user.role },
        targetType: 'Visitor',
        targetId: visitor.visitorId,
        details: { actionType, visitorName: visitor.fullName },
        ipAddress: req.ip,
      });
    }

    res.json({
      success: true,
      verificationStatus,
      message,
      visitor,
      timestamps: {
        submittedAt: formatLocalDateTime(visitor.submittedAt),
        actionedAt: formatLocalDateTime(visitor.actionedAt),
        checkedInAt: formatLocalDateTime(visitor.checkedInAt),
        checkedOutAt: formatLocalDateTime(visitor.checkedOutAt),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search visitors by Name, Phone, or Visitor ID (Security / Admin)
// @route   GET /api/visitors/search
// @access  Private (Security, Admin)
const searchVisitors = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search term (Name, Phone number, or Visitor ID)',
      });
    }

    const regex = new RegExp(query.trim(), 'i');

    const visitors = await Visitor.find({
      $or: [
        { visitorId: regex },
        { fullName: regex },
        { phone: regex },
        { meetingPersonName: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: visitors.length,
      visitors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get visitors meeting the logged-in student or staff member
// @route   GET /api/visitors/my-visitors
// @access  Private
const getMyVisitors = async (req, res, next) => {
  try {
    const user = req.user;
    let studentRoll = '';
    if (user.role === 'student') {
      const student = await Student.findOne({ user: user._id });
      if (student) studentRoll = student.rollNumber;
    }

    const conditions = [];
    if (studentRoll) {
      conditions.push({ studentRollNumber: studentRoll });
    }
    if (user.phone) {
      conditions.push({ meetingPersonContact: user.phone });
    }
    if (user.name) {
      conditions.push({ meetingPersonName: new RegExp(`^${user.name}$`, 'i') });
    }

    const query = conditions.length > 0 ? { $or: conditions } : {};
    const visitors = await Visitor.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: visitors.length,
      visitors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a visitor record
// @route   DELETE /api/visitors/:id
// @access  Private (Admin or Owner)
const deleteVisitor = async (req, res, next) => {
  try {
    const { id } = req.params;
    let visitor;
    if (mongoose.Types.ObjectId.isValid(id)) {
      visitor = await Visitor.findById(id);
    }
    if (!visitor) {
      visitor = await Visitor.findOne({ visitorId: id });
    }

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor record not found',
      });
    }

    // Allow Admin or the user who invited/created the visitor
    if (req.user.role !== 'admin') {
      const isOwner = visitor.meetingPersonUser && visitor.meetingPersonUser.toString() === req.user._id.toString();
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this visitor record',
        });
      }
    }

    await Visitor.findByIdAndDelete(visitor._id);

    await logAction({
      action: 'VISITOR_DELETED',
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      targetType: 'Visitor',
      targetId: visitor.visitorId || visitor._id.toString(),
      details: { fullName: visitor.fullName },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Visitor record deleted successfully',
      deletedId: visitor._id,
      visitorId: visitor.visitorId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerVisitor,
  getAllVisitors,
  getVisitorById,
  updateVisitorStatus,
  verifyVisitorQR,
  searchVisitors,
  getMyVisitors,
  deleteVisitor,
};

