const mongoose = require('mongoose');

const gatePassSchema = new mongoose.Schema(
  {
    passId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Snapshot of student details at submission
    studentDetails: {
      fullName: { type: String, required: true },
      rollNumber: { type: String, required: true },
      department: { type: String, required: true },
      year: { type: String, required: true },
      phone: { type: String, required: true },
      hostelBlock: { type: String, required: true },
      hostelRoom: { type: String, required: true },
      photoUrl: { type: String, default: '' },
    },
    reason: {
      type: String,
      required: [true, 'Reason for leaving is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
    },
    expectedLeavingDateTime: {
      type: Date,
      required: [true, 'Expected leaving date and time is required'],
    },
    expectedReturnDateTime: {
      type: Date,
      required: [true, 'Expected return date and time is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Checked-Out', 'Completed', 'Expired'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    qrCodeDataUrl: {
      type: String,
      default: '',
    },
    // Backend automatic timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    actionedAt: {
      type: Date,
      default: null,
    },
    actionedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    actualExitTime: {
      type: Date,
      default: null,
    },
    actualEntryTime: {
      type: Date,
      default: null,
    },
    verificationHistory: [
      {
        verifiedAt: { type: Date, default: Date.now },
        actionType: {
          type: String,
          enum: ['EXIT_SCAN', 'ENTRY_SCAN', 'STATUS_CHECK'],
          default: 'STATUS_CHECK',
        },
        verifiedBy: {
          id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          name: { type: String, default: '' },
          role: { type: String, default: 'security' },
        },
        notes: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helpful index for fast searches by name and rollNumber
gatePassSchema.index({ 'studentDetails.rollNumber': 1, 'studentDetails.fullName': 1 });

module.exports = mongoose.model('GatePass', gatePassSchema);
