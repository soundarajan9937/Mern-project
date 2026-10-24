const mongoose = require('mongoose');
const GatePass = require('../models/GatePass');
const Student = require('../models/Student');
const User = require('../models/User');
const { generateFormattedId, generateNextUniqueId, formatLocalDateTime } = require('../utils/dateUtils');
const { generateSecureToken, generateQRCodeDataUrl } = require('../services/qrService');
const { notifyStudentOnGatePassStatus } = require('../services/notificationService');
const { logAction } = require('../services/auditService');
const { saveBase64Image } = require('../utils/photoUtils');

// @desc    Submit a gate pass leaving request (Student)
// @route   POST /api/gatepasses
// @access  Private (Student)
const submitGatePassRequest = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found. Please complete your student profile.',
      });
    }

    const {
      reason,
      destination,
      expectedLeavingDateTime,
      expectedReturnDateTime,
    } = req.body;

    if (!reason || !destination || !expectedLeavingDateTime || !expectedReturnDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reason, destination, expected leaving and return date/times',
      });
    }

    const leavingDate = new Date(expectedLeavingDateTime);
    const returnDate = new Date(expectedReturnDateTime);

    if (isNaN(leavingDate.getTime()) || isNaN(returnDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time format for expected leaving or return',
      });
    }

    if (returnDate <= leavingDate) {
      return res.status(400).json({
        success: false,
        message: 'Expected return time must be after expected leaving time',
      });
    }

    // Photo handling: if uploaded with this request, update student photo, otherwise use existing
    let photoUrl = student.photoUrl;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
      student.photoUrl = photoUrl;
      await student.save();
    } else if (req.body.photoUrl) {
      photoUrl = saveBase64Image(req.body.photoUrl, 'student-pass');
    }

    // Sequential ID generation (guaranteed collision-free)
    const passId = await generateNextUniqueId(GatePass, 'passId', 'GP');

    // Backend automatic timestamp
    const submittedAt = new Date();

    const gatePass = await GatePass.create({
      passId,
      student: student._id,
      user: req.user._id,
      studentDetails: {
        fullName: student.fullName,
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
        phone: student.phone,
        hostelBlock: student.hostelBlock,
        hostelRoom: student.hostelRoom,
        photoUrl,
      },
      reason: reason.trim(),
      destination: destination.trim(),
      expectedLeavingDateTime: leavingDate,
      expectedReturnDateTime: returnDate,
      status: 'Pending',
      submittedAt,
    });

    await logAction({
      action: 'GATE_PASS_CREATED',
      actor: { id: req.user._id, name: student.fullName, email: req.user.email, role: 'student' },
      targetType: 'GatePass',
      targetId: gatePass.passId,
      details: { destination, reason },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Gate pass leaving request submitted successfully. Pending admin approval.',
      gatePass,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's own gate pass requests
// @route   GET /api/gatepasses/my-requests
// @access  Private (Student)
const getMyGatePasses = async (req, res, next) => {
  try {
    // Find student profile to also match by rollNumber (for mobile submissions)
    let rollNumber = null;
    const student = await Student.findOne({ user: req.user._id }).select('rollNumber').lean();
    if (student) rollNumber = student.rollNumber;

    const query = rollNumber
      ? {
          $or: [
            { user: req.user._id },
            { 'studentDetails.rollNumber': new RegExp(`^${rollNumber.trim()}$`, 'i') },
          ],
        }
      : { user: req.user._id };

    const gatePasses = await GatePass.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: gatePasses.length,
      gatePasses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all gate pass requests (Admin / Security) with filtering & pagination
// @route   GET /api/gatepasses
// @access  Private (Admin / Security)
const getAllGatePasses = async (req, res, next) => {
  try {
    const { status, search, department, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (department && department !== 'All') {
      query['studentDetails.department'] = department;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { passId: searchRegex },
        { 'studentDetails.fullName': searchRegex },
        { 'studentDetails.rollNumber': searchRegex },
        { destination: searchRegex },
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
    const total = await GatePass.countDocuments(query);
    const gatePasses = await GatePass.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: gatePasses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)) || 1,
      gatePasses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single gate pass by ID or passId
// @route   GET /api/gatepasses/:id
// @access  Private
const getGatePassById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let gatePass;

    if (id.startsWith('GP-')) {
      gatePass = await GatePass.findOne({ passId: id });
    } else {
      gatePass = await GatePass.findById(id);
    }

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        message: 'Gate pass record not found',
      });
    }

    // Authorization check: student can only view own pass
    if (req.user.role === 'student' && gatePass.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this gate pass record',
      });
    }

    res.json({
      success: true,
      gatePass,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approve or reject student gate pass
// @route   PUT /api/gatepasses/:id/status
// @access  Private (Admin only)
const updateGatePassStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either Approved or Rejected',
      });
    }

    const gatePass = await GatePass.findById(id);
    if (!gatePass) {
      return res.status(404).json({
        success: false,
        message: 'Gate pass record not found',
      });
    }

    const actionDateTime = new Date();
    gatePass.actionedAt = actionDateTime;
    gatePass.actionedBy = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    };

    if (status === 'Rejected') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a reason for rejecting the gate pass',
        });
      }

      gatePass.status = 'Rejected';
      gatePass.rejectionReason = rejectionReason.trim();
      gatePass.qrToken = undefined;
      gatePass.qrCodeDataUrl = '';

      await gatePass.save();

      // Notify student
      await notifyStudentOnGatePassStatus(gatePass, 'Rejected', rejectionReason.trim());

      await logAction({
        action: 'GATE_PASS_REJECTED',
        actor: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' },
        targetType: 'GatePass',
        targetId: gatePass.passId,
        details: { reason: rejectionReason.trim() },
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        message: `Gate pass ${gatePass.passId} has been rejected.`,
        gatePass,
      });
    }

    if (status === 'Approved') {
      gatePass.status = 'Approved';
      gatePass.rejectionReason = '';

      // Generate unpredictable unique QR token
      const qrToken = generateSecureToken();
      gatePass.qrToken = qrToken;

      // Construct direct verification URL with LAN IP so student's mobile phone can connect across Wi-Fi
      let lanIp = process.env.VITE_HOST_IP || process.env.HOST_IP || getLocalLanIp();

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol === 'https' ? 'https' : 'http';
      let frontendHost = host.includes(':5000') ? host.replace(':5000', ':5173') : host;
      if ((frontendHost.includes('localhost') || frontendHost.includes('127.0.0.1')) && lanIp) {
        frontendHost = `${lanIp}:5173`;
      }
      const verifyUrl = `${protocol}://${frontendHost}/verify-outpass?passId=${encodeURIComponent(gatePass.passId)}&token=${encodeURIComponent(qrToken)}`;

      const qrCodeDataUrl = await generateQRCodeDataUrl(verifyUrl);
      gatePass.qrCodeDataUrl = qrCodeDataUrl;

      await gatePass.save();

      // Notify student
      await notifyStudentOnGatePassStatus(gatePass, 'Approved');

      await logAction({
        action: 'GATE_PASS_APPROVED',
        actor: { id: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' },
        targetType: 'GatePass',
        targetId: gatePass.passId,
        details: { approvedAt: actionDateTime },
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        message: `Approved Out Pass Successfully! Unique QR code generated for ${gatePass.passId}.`,
        gatePass,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify QR token or Pass ID for student at college gate (Security / Admin / Public scan)
// @route   POST /api/gatepasses/verify-qr
// @access  Public (Optional Protect)
const verifyGatePassQR = async (req, res, next) => {
  try {
    const { token, passId, actionType = 'STATUS_CHECK', notes = '' } = req.body;

    if (!token && !passId) {
      return res.status(400).json({
        success: false,
        isApproved: false,
        verificationStatus: 'Not Get Outpass',
        displayColor: 'red',
        message: 'Not Get Outpass — No QR token or Pass ID provided for verification.',
      });
    }

    let parsedToken = token;
    let targetPassId = passId ? passId.trim().toUpperCase() : '';

    if (typeof token === 'string') {
      const trimmed = token.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.token) parsedToken = parsed.token;
          if (parsed.passId) targetPassId = parsed.passId.trim().toUpperCase();
        } catch (e) {}
      } else if (trimmed.includes('token=') || trimmed.includes('passId=')) {
        try {
          const urlObj = new URL(trimmed);
          const t = urlObj.searchParams.get('token');
          const p = urlObj.searchParams.get('passId');
          if (t) parsedToken = t;
          if (p) targetPassId = p.trim().toUpperCase();
        } catch (e) {
          const tMatch = trimmed.match(/token=([a-zA-Z0-9_\-]+)/);
          const pMatch = trimmed.match(/passId=([a-zA-Z0-9_\-]+)/);
          if (tMatch) parsedToken = tMatch[1];
          if (pMatch) targetPassId = pMatch[1].trim().toUpperCase();
        }
      }
    }

    const query = {};
    if (parsedToken && targetPassId) {
      query.$or = [{ qrToken: parsedToken }, { passId: targetPassId }];
    } else if (parsedToken) {
      query.qrToken = parsedToken;
    } else if (targetPassId) {
      query.passId = targetPassId;
    }

    const gatePass = await GatePass.findOne(query);

    if (!gatePass) {
      await logAction({
        action: 'GATE_PASS_VERIFICATION_FAILED',
        actor: req.user ? { id: req.user._id, name: req.user.name, role: req.user.role } : { name: 'Gate Scanner', role: 'security' },
        targetType: 'SecurityScan',
        details: { attemptedToken: parsedToken, attemptedPassId: targetPassId || passId },
        status: 'WARNING',
        ipAddress: req.ip,
      });

      return res.status(404).json({
        success: false,
        isApproved: false,
        verificationStatus: 'Not Get Outpass',
        displayColor: 'red',
        message: 'Not Get Outpass — No active out pass found with provided QR credentials.',
      });
    }

    // Check statuses
    let verificationStatus = '';
    let message = '';
    let displayColor = 'red';
    let isApproved = false;
    const now = new Date();

    if (gatePass.status === 'Pending') {
      verificationStatus = 'Not Get Outpass';
      displayColor = 'red';
      isApproved = false;
      message = 'Not Get Outpass — This request is still pending admin approval.';
    } else if (gatePass.status === 'Rejected') {
      verificationStatus = 'Not Get Outpass';
      displayColor = 'red';
      isApproved = false;
      message = `Not Get Outpass — Pass was rejected by administration. Reason: ${gatePass.rejectionReason || 'Unauthorized'}`;
    } else if (gatePass.status === 'Expired') {
      verificationStatus = 'Not Get Outpass';
      displayColor = 'red';
      isApproved = false;
      message = 'Not Get Outpass — This out pass has expired.';
    } else if (gatePass.status === 'Approved' || gatePass.status === 'Checked-Out' || gatePass.status === 'Completed') {
      // Valid out pass!
      verificationStatus = 'Out Pass Got Successfully';
      displayColor = 'green';
      isApproved = true;
      message = 'Out Pass Got Successfully';

      if (actionType === 'EXIT_SCAN' && gatePass.status === 'Approved') {
        gatePass.actualExitTime = now;
        gatePass.status = 'Checked-Out';
        if (req.user) {
          gatePass.verificationHistory.push({
            verifiedAt: now,
            actionType: 'EXIT_SCAN',
            verifiedBy: { id: req.user._id, name: req.user.name, role: req.user.role },
            notes: notes || `Departure verified by ${req.user.name}`,
          });
        }
        await gatePass.save();
      } else if (actionType === 'ENTRY_SCAN' && gatePass.status === 'Checked-Out') {
        gatePass.actualEntryTime = now;
        gatePass.status = 'Completed';
        if (req.user) {
          gatePass.verificationHistory.push({
            verifiedAt: now,
            actionType: 'ENTRY_SCAN',
            verifiedBy: { id: req.user._id, name: req.user.name, role: req.user.role },
            notes: notes || `Re-entry verified by ${req.user.name}`,
          });
        }
        await gatePass.save();
      }

      await logAction({
        action: 'GATE_PASS_COMPLETED',
        actor: req.user ? { id: req.user._id, name: req.user.name, role: req.user.role } : { name: 'Gate Scanner', role: 'security' },
        targetType: 'GatePass',
        targetId: gatePass.passId,
        details: { actionType: 'ENTRY_SCAN', studentRoll: gatePass.studentDetails.rollNumber },
        ipAddress: req.ip,
      });
    }

    res.json({
      success: isApproved,
      isApproved,
      verificationStatus,
      displayColor,
      message,
      gatePass,
      timestamps: {
        submittedAt: formatLocalDateTime(gatePass.submittedAt),
        actionedAt: formatLocalDateTime(gatePass.actionedAt),
        expectedLeaving: formatLocalDateTime(gatePass.expectedLeavingDateTime),
        expectedReturn: formatLocalDateTime(gatePass.expectedReturnDateTime),
        actualExitTime: formatLocalDateTime(gatePass.actualExitTime),
        actualEntryTime: formatLocalDateTime(gatePass.actualEntryTime),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record student return to campus with YES/NO and return date/time
// @route   POST /api/gatepasses/record-return
// @access  Public (Optional Protect)
const recordStudentReturn = async (req, res, next) => {
  try {
    const { passId, token, returnStatus = 'YES', returnDateTime } = req.body;

    if (!passId && !token) {
      return res.status(400).json({
        success: false,
        message: 'Pass ID or token is required to record return',
      });
    }

    const query = {};
    if (token && passId) {
      query.$or = [{ qrToken: token }, { passId: passId.trim().toUpperCase() }];
    } else if (token) {
      query.qrToken = token;
    } else if (passId) {
      query.passId = passId.trim().toUpperCase();
    }

    const gatePass = await GatePass.findOne(query);
    if (!gatePass) {
      return res.status(404).json({
        success: false,
        message: 'Gate pass record not found',
      });
    }

    if (returnStatus === 'NO') {
      return res.json({
        success: true,
        message: 'Student return status set to NO. Gate pass remains active.',
        gatePass,
      });
    }

    // returnStatus === 'YES'
    const returnTime = returnDateTime ? new Date(returnDateTime) : new Date();
    gatePass.actualEntryTime = returnTime;
    if (!gatePass.actualExitTime) {
      gatePass.actualExitTime = gatePass.expectedLeavingDateTime || new Date(returnTime.getTime() - 24 * 60 * 60 * 1000);
    }
    gatePass.status = 'Completed';

    await gatePass.save();

    await logAction({
      action: 'GATE_PASS_RETURN_RECORDED',
      actor: req.user ? { id: req.user._id, name: req.user.name, role: req.user.role } : { name: gatePass.studentDetails?.fullName || 'Student', role: 'student' },
      targetType: 'GatePass',
      targetId: gatePass.passId,
      details: { returnDateTime: returnTime, status: 'Completed' },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Return recorded successfully for ${gatePass.studentDetails?.fullName || 'Student'}! Details added to gate passes history.`,
      gatePass,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Security staff search for student by Name or Roll Number
// @route   GET /api/gatepasses/search-student
// @access  Private (Security, Admin)
const searchStudent = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search term (Student Name or Roll Number)',
      });
    }

    const regex = new RegExp(query.trim(), 'i');

    const passes = await GatePass.find({
      $or: [
        { 'studentDetails.rollNumber': regex },
        { 'studentDetails.fullName': regex },
        { passId: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: passes.length,
      passes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply Out Pass from mobile scan (Public / Student)
// @route   POST /api/gatepasses/apply-mobile
// @access  Public / Optional Student
const applyOutPassMobile = async (req, res, next) => {
  try {
    const {
      fullName,
      rollNumber,
      department,
      year,
      phone,
      hostelBlock,
      hostelRoom,
      reason,
      destination,
      expectedLeavingDateTime,
      expectedReturnDateTime,
      photoUrl,
    } = req.body;

    if (!fullName || !rollNumber || !reason || !destination || !expectedLeavingDateTime || !expectedReturnDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (Name, Roll Number, Reason, Destination, Dates).',
      });
    }

    const leavingDate = new Date(expectedLeavingDateTime);
    const returnDate = new Date(expectedReturnDateTime);

    if (isNaN(leavingDate.getTime()) || isNaN(returnDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time format for expected leaving or return.',
      });
    }

    if (returnDate <= leavingDate) {
      return res.status(400).json({
        success: false,
        message: 'Expected return time must be strictly after expected leaving time.',
      });
    }

    // Photo handling: uploaded file takes priority, then body.photoUrl
    let finalPhotoUrl = '';
    if (req.file) {
      finalPhotoUrl = `/uploads/${req.file.filename}`;
    } else if (photoUrl) {
      finalPhotoUrl = saveBase64Image(photoUrl, 'mobile-pass');
    }

    // Associate with student / user if available
    let student = null;
    let userId = null;

    if (req.user) {
      userId = req.user._id;
      student = await Student.findOne({ user: req.user._id });
    }

    if (!student && rollNumber) {
      student = await Student.findOne({ rollNumber: new RegExp(`^${rollNumber.trim()}$`, 'i') });
      if (student) {
        userId = student.user;
      }
    }

    // Fallbacks if new student is submitting
    if (!userId) {
      const anyUser = (await User.findOne({ role: 'student' })) || (await User.findOne());
      if (anyUser) {
        userId = anyUser._id;
      } else {
        userId = new mongoose.Types.ObjectId();
      }
    }
    if (!student) {
      const anyStudent = await Student.findOne();
      student = anyStudent || { _id: new mongoose.Types.ObjectId() };
    }

    // Sequential ID generation (guaranteed collision-free)
    const passId = await generateNextUniqueId(GatePass, 'passId', 'GP');

    const gatePass = await GatePass.create({
      passId,
      student: student._id || new mongoose.Types.ObjectId(),
      user: userId,
      studentDetails: {
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim(),
        department: department ? department.trim() : 'General',
        year: year ? String(year).trim() : '1',
        phone: phone ? phone.trim() : '',
        hostelBlock: hostelBlock ? hostelBlock.trim() : '',
        hostelRoom: hostelRoom ? hostelRoom.trim() : '',
        photoUrl: finalPhotoUrl,
      },
      reason: reason.trim(),
      destination: destination.trim(),
      expectedLeavingDateTime: leavingDate,
      expectedReturnDateTime: returnDate,
      status: 'Pending',
      qrToken: '',
      qrCodeDataUrl: '',
      submittedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Out pass request submitted successfully. Status is Pending.',
      gatePass,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get real-time public status of an Out Pass (Student phone polling)
// @route   GET /api/gatepasses/public-status/:passId
// @access  Public
const getGatePassPublicStatus = async (req, res, next) => {
  try {
    const { passId } = req.params;
    if (!passId) {
      return res.status(400).json({ success: false, message: 'Pass ID is required' });
    }

    const query = {
      $or: [
        { passId: passId.trim().toUpperCase() },
        { qrToken: passId.trim() },
      ],
    };

    if (mongoose.isValidObjectId(passId)) {
      query.$or.push({ _id: passId });
    }

    const gatePass = await GatePass.findOne(query);

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        message: 'Gate pass not found',
      });
    }

    res.json({
      success: true,
      status: gatePass.status,
      gatePass,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a gate pass
// @route   DELETE /api/gatepasses/:id
// @access  Private (Admin or Owner)
const deleteGatePass = async (req, res, next) => {
  try {
    const { id } = req.params;
    let gatePass;
    if (mongoose.Types.ObjectId.isValid(id)) {
      gatePass = await GatePass.findById(id);
    }
    if (!gatePass) {
      gatePass = await GatePass.findOne({ passId: id });
    }

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        message: 'Gate pass not found',
      });
    }

    // Allow Admin or the student who owns the pass
    if (req.user.role !== 'admin') {
      const student = await Student.findOne({ user: req.user._id });
      if (!student || !gatePass.student || gatePass.student.toString() !== student._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this gate pass',
        });
      }
    }

    await GatePass.findByIdAndDelete(gatePass._id);

    await logAction({
      action: 'GATEPASS_DELETED',
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      targetType: 'GatePass',
      targetId: gatePass.passId || gatePass._id.toString(),
      details: { destination: gatePass.destination },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Gate pass deleted successfully',
      deletedId: gatePass._id,
      passId: gatePass.passId,
    });
  } catch (error) {
    next(error);
  }
};

const getLocalLanIp = () => {
  try {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    for (let dev in ifaces) {
      for (let details of ifaces[dev]) {
        if (details.family === 'IPv4' && !details.internal && !details.address.startsWith('127.')) {
          return details.address;
        }
      }
    }
  } catch (e) {}
  return null;
};

// @desc    Get dynamic network info (LAN IP / URLs) for mobile QR generation
// @route   GET /api/gatepasses/network-info
// @access  Public
const getNetworkInfo = async (req, res) => {
  try {
    const detectedIp = getLocalLanIp();
    const configuredIp = process.env.VITE_HOST_IP || process.env.HOST_IP;
    const lanIp = configuredIp || detectedIp || 'localhost';

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    let frontendHost = host.includes(':5000') ? host.replace(':5000', ':5173') : host;
    if ((frontendHost.includes('localhost') || frontendHost.includes('127.0.0.1')) && lanIp !== 'localhost') {
      frontendHost = `${lanIp}:5173`;
    }

    res.json({
      success: true,
      lanIp,
      detectedIp,
      networkUrl: `${protocol}://${frontendHost}`,
      clientUrl: process.env.CLIENT_URL || process.env.FRONTEND_URL || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};

