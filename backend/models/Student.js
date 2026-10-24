const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Student full name is required'],
      trim: true,
    },
    rollNumber: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      default: () => `STU${Date.now().toString().slice(-6)}`,
    },
    department: {
      type: String,
      default: 'General',
      trim: true,
    },
    year: {
      type: String,
      default: '1st Year',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    hostelBlock: {
      type: String,
      default: 'Block A',
      trim: true,
    },
    hostelRoom: {
      type: String,
      default: '101',
      trim: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    guardianName: {
      type: String,
      trim: true,
      default: '',
    },
    guardianPhone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', studentSchema);
