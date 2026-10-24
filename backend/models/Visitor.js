const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Visitor full name is required'],
      trim: true,
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    place: {
      type: String,
      required: [true, 'Place/City is required'],
      trim: true,
    },
    meetingPersonName: {
      type: String,
      required: [true, "Meeting person's name is required"],
      trim: true,
    },
    meetingPersonContact: {
      type: String,
      required: [true, "Meeting person's phone/contact is required"],
      trim: true,
      index: true,
    },
    studentRollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of visit is required'],
      trim: true,
    },
    expectedMeetingDate: {
      type: Date,
      default: null,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    consentGiven: {
      type: Boolean,
      required: [true, 'Consent is required for photograph and data processing'],
      default: false,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Checked-In', 'Completed'],
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
    // Automatic backend timestamps
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
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedOutAt: {
      type: Date,
      default: null,
    },
    verificationHistory: [
      {
        verifiedAt: { type: Date, default: Date.now },
        actionType: {
          type: String,
          enum: ['CHECK_IN', 'CHECK_OUT', 'STATUS_CHECK'],
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

visitorSchema.index({ fullName: 1, phone: 1, visitorId: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
