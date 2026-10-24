const AuditLog = require('../models/AuditLog');

/**
 * Log an auditable action
 * @param {Object} params
 */
const logAction = async ({
  action,
  actor = { name: 'System', role: 'system' },
  targetType,
  targetId = '',
  details = {},
  ipAddress = '',
  status = 'SUCCESS',
}) => {
  try {
    await AuditLog.create({
      action,
      actor: {
        id: actor._id || actor.id,
        name: actor.name || 'Anonymous',
        email: actor.email || '',
        role: actor.role || 'system',
      },
      targetType,
      targetId,
      details,
      ipAddress,
      status,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to record audit log:', err.message);
  }
};

module.exports = {
  logAction,
};
