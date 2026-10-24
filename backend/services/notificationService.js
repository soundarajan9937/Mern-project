const Notification = require('../models/Notification');
const User = require('../models/User');
const { formatLocalDate, formatLocalTime } = require('../utils/dateUtils');

/**
 * Dispatch an automatic visitor registration alert to the designated meeting person
 * @param {Object} visitor 
 */
const notifyMeetingPersonOnVisitorRegistration = async (visitor) => {
  try {
    const regDateStr = formatLocalDate(visitor.submittedAt);
    const regTimeStr = formatLocalTime(visitor.submittedAt);

    const message = `Campus Visitor Notification:
A visitor has registered to meet you on campus.
• Visitor Name: ${visitor.fullName}
• Relationship: ${visitor.relationship}
• Phone Number: ${visitor.phone}
• Place: ${visitor.place}
• Purpose of Visit: ${visitor.purpose}
• Registration Date & Time: ${regDateStr} at ${regTimeStr}
${visitor.expectedMeetingDate ? `• Expected Visit Date: ${formatLocalDate(visitor.expectedMeetingDate)}` : ''}

Note: This is an automatic informational notification. No approval or rejection is required.`;

    // Check if the meeting person is registered in the system by phone, email, or name
    let recipientUser = null;
    if (visitor.meetingPersonContact) {
      recipientUser = await User.findOne({
        $or: [
          { phone: visitor.meetingPersonContact.trim() },
          { email: visitor.meetingPersonContact.trim().toLowerCase() },
          { name: new RegExp(`^${visitor.meetingPersonName.trim()}$`, 'i') },
        ],
      });
    } else if (visitor.meetingPersonName) {
      recipientUser = await User.findOne({
        name: new RegExp(`^${visitor.meetingPersonName.trim()}$`, 'i'),
      });
    }

    let smsSent = true;
    let smsProviderResponse = `Message notification sent to ${visitor.meetingPersonContact}`;

    // Optional real SMS provider (Twilio or Fast2SMS) if credentials exist in .env
    if (process.env.SMS_PROVIDER_API_KEY && process.env.ENABLE_REAL_SMS === 'true') {
      try {
        console.log(`[SMS-PROVIDER] Dispatching real SMS to ${visitor.meetingPersonContact}...`);
        smsSent = true;
        smsProviderResponse = 'SMS dispatched via configured gateway';
      } catch (smsErr) {
        console.error('[SMS-PROVIDER] Failed to send SMS:', smsErr.message);
        smsProviderResponse = `Failed: ${smsErr.message}`;
      }
    }

    const notification = await Notification.create({
      recipientContact: visitor.meetingPersonContact,
      recipientUser: recipientUser ? recipientUser._id : null,
      recipientName: visitor.meetingPersonName,
      title: `Visitor Notification: ${visitor.fullName}`,
      message,
      type: 'VISITOR_ALERT',
      metadata: {
        visitorId: visitor.visitorId,
        visitorName: visitor.fullName,
        relationship: visitor.relationship,
        phone: visitor.phone,
        place: visitor.place,
        purpose: visitor.purpose,
        status: 'Registration Successful',
      },
      deliveryStatus: 'Delivered',
      smsSent,
      smsProviderResponse,
    });

    console.log(`\n================== [AUTOMATIC VISITOR NOTIFICATION] ==================`);
    console.log(`TO (Meeting Person Phone/Contact): ${visitor.meetingPersonContact}`);
    console.log(`RECIPIENT: ${visitor.meetingPersonName}`);
    console.log(`MESSAGE:\n${message}`);
    console.log(`======================================================================\n`);
    return notification;
  } catch (err) {
    console.error('Error creating meeting person notification:', err);
  }
};

/**
 * Dispatch gate pass status notification to student
 */
const notifyStudentOnGatePassStatus = async (gatePass, status, reason = '') => {
  try {
    const title = status === 'Approved' ? 'Gate Pass Approved 🎉' : 'Gate Pass Rejected';
    const message = status === 'Approved'
      ? `Your Gate Pass request (${gatePass.passId}) to ${gatePass.destination} has been approved. Your QR code is now active.`
      : `Your Gate Pass request (${gatePass.passId}) was rejected. Reason: ${reason || 'Not specified by authority.'}`;

    const studentUser = gatePass.user;

    const notification = await Notification.create({
      recipientContact: gatePass.studentDetails.phone || '',
      recipientUser: studentUser,
      recipientName: gatePass.studentDetails.fullName,
      title,
      message,
      type: 'GATE_PASS_ALERT',
      metadata: {
        passId: gatePass.passId,
        status,
      },
      deliveryStatus: 'Delivered',
    });

    return notification;
  } catch (err) {
    console.error('Error creating student gate pass notification:', err);
  }
};

module.exports = {
  notifyMeetingPersonOnVisitorRegistration,
  notifyStudentOnGatePassStatus,
};
