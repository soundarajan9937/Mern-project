const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate an unpredictable opaque security token
 * @returns {string} 48-char hex string
 */
const generateSecureToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Generate a QR code base64 Data URL containing ONLY the opaque token or verification URL
 * As per security requirement #14: Never encode personal information directly in QR codes!
 * @param {string} token 
 * @returns {Promise<string>} base64 data URL
 */
const generateQRCodeDataUrl = async (token) => {
  try {
    // Generate QR with error correction level M and high visual clarity
    const qrDataUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#0F172A', // Dark Navy Blue
        light: '#FFFFFF',
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('Failed to generate QR code');
  }
};

module.exports = {
  generateSecureToken,
  generateQRCodeDataUrl,
};
