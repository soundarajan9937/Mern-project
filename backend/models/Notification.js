const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientContact: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recipientName: {
      type: String,
      default: '',
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['VISITOR_ALERT', 'GATE_PASS_ALERT', 'SYSTEM_ALERT'],
      default: 'VISITOR_ALERT',
    },
    metadata: {
      visitorId: { type: String, default: '' },
      visitorName: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
      place: { type: String, default: '' },
      purpose: { type: String, default: '' },
      passId: { type: String, default: '' },
      status: { type: String, default: '' },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deliveryStatus: {
      type: String,
      enum: ['Stored', 'Delivered', 'Read'],
      default: 'Stored',
    },
    smsSent: {
      type: Boolean,
      default: false,
    },
    smsProviderResponse: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
