const GatePass = require('../models/GatePass');
const Visitor = require('../models/Visitor');
const AuditLog = require('../models/AuditLog');
const { formatLocalDateTime, formatLocalDate, formatLocalTime } = require('../utils/dateUtils');
const { Parser } = require('json2csv');

// @desc    Export Gate Passes as CSV report
// @route   GET /api/reports/gatepasses/csv
// @access  Private (Admin)
const exportGatePassesCSV = async (req, res, next) => {
  try {
    const { status, dateFrom, dateTo } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
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

    const passes = await GatePass.find(query).sort({ createdAt: -1 });

    const data = passes.map((p) => ({
      Pass_ID: p.passId,
      Student_Name: p.studentDetails.fullName,
      Roll_Number: p.studentDetails.rollNumber,
      Department: p.studentDetails.department,
      Year: p.studentDetails.year,
      Phone: p.studentDetails.phone,
      Hostel: `${p.studentDetails.hostelBlock} - ${p.studentDetails.hostelRoom}`,
      Destination: p.destination,
      Reason: p.reason,
      Status: p.status,
      Rejection_Reason: p.rejectionReason || 'N/A',
      Submitted_At: formatLocalDateTime(p.submittedAt),
      Actioned_At: formatLocalDateTime(p.actionedAt),
      Expected_Leaving: formatLocalDateTime(p.expectedLeavingDateTime),
      Expected_Return: formatLocalDateTime(p.expectedReturnDateTime),
      Actual_Exit: formatLocalDateTime(p.actualExitTime),
      Actual_Entry: formatLocalDateTime(p.actualEntryTime),
      Actioned_By: p.actionedBy ? p.actionedBy.name : 'N/A',
    }));

    const json2csv = new Parser();
    const csv = json2csv.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`gate_passes_report_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Export Visitor Registrations as CSV report
// @route   GET /api/reports/visitors/csv
// @access  Private (Admin)
const exportVisitorsCSV = async (req, res, next) => {
  try {
    const { status, dateFrom, dateTo } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
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

    const visitors = await Visitor.find(query).sort({ createdAt: -1 });

    const data = visitors.map((v) => ({
      Visitor_ID: v.visitorId,
      Full_Name: v.fullName,
      Relationship: v.relationship,
      Phone: v.phone,
      Place: v.place,
      Meeting_Person: v.meetingPersonName,
      Meeting_Person_Contact: v.meetingPersonContact,
      Student_Roll_Number: v.studentRollNumber || 'N/A',
      Department: v.department || 'N/A',
      Purpose: v.purpose,
      Status: v.status,
      Rejection_Reason: v.rejectionReason || 'N/A',
      Submitted_At: formatLocalDateTime(v.submittedAt),
      Actioned_At: formatLocalDateTime(v.actionedAt),
      Checked_In_At: formatLocalDateTime(v.checkedInAt),
      Checked_Out_At: formatLocalDateTime(v.checkedOutAt),
      Actioned_By: v.actionedBy ? v.actionedBy.name : 'N/A',
    }));

    const json2csv = new Parser();
    const csv = json2csv.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`visitors_report_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportGatePassesCSV,
  exportVisitorsCSV,
};
