// Utilities for automatic dates and local timezone formatting (Asia/Kolkata)

const TIMEZONE = process.env.COLLEGE_TIMEZONE || 'Asia/Kolkata';

/**
 * Format a Date object into local date and time string
 * @param {Date|string} date 
 * @returns {string} e.g. "11 Oct 2026, 02:45 PM"
 */
const formatLocalDateTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleString('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format Date into Date only string (e.g., "11 Oct 2026")
 */
const formatLocalDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleDateString('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format Date into Time only string (e.g., "02:45 PM")
 */
const formatLocalTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleTimeString('en-IN', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Generates human readable sequential-like ID with year
 * @param {string} prefix 'GP' or 'VIS'
 * @param {number} count current count
 */
const generateFormattedId = (prefix, count) => {
  const year = new Date().getFullYear();
  const serial = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${serial}`;
};

/**
 * Asynchronously generates the next unique sequential ID by inspecting existing records
 * Guarantees no duplicate key collision even if documents were deleted or imported.
 * @param {Model} model Mongoose model (e.g. Visitor, GatePass)
 * @param {string} idField field name (e.g. 'visitorId', 'passId')
 * @param {string} prefix prefix string (e.g. 'VIS', 'GP')
 * @returns {Promise<string>} e.g. 'VIS-2026-0005'
 */
const generateNextUniqueId = async (model, idField, prefix) => {
  const year = new Date().getFullYear();
  const yearPrefixRegex = new RegExp(`^${prefix}-${year}-`);

  const lastDoc = await model
    .findOne({ [idField]: yearPrefixRegex })
    .sort({ [idField]: -1 })
    .select(idField)
    .lean();

  let nextSeq = 1;
  if (lastDoc && lastDoc[idField]) {
    const match = String(lastDoc[idField]).match(/-(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  let candidateId = `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}`;
  while (await model.exists({ [idField]: candidateId })) {
    nextSeq++;
    candidateId = `${prefix}-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  return candidateId;
};

module.exports = {
  TIMEZONE,
  formatLocalDateTime,
  formatLocalDate,
  formatLocalTime,
  generateFormattedId,
  generateNextUniqueId,
};

