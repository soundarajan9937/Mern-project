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

module.exports = {
  TIMEZONE,
  formatLocalDateTime,
  formatLocalDate,
  formatLocalTime,
  generateFormattedId,
};
