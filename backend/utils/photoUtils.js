const fs = require('fs');
const path = require('path');

/**
 * Saves a base64 image data URL to the backend uploads folder
 * @param {string} dataUrl - e.g. "data:image/jpeg;base64,..."
 * @param {string} prefix - filename prefix, e.g. "pass-photo"
 * @returns {string} public path e.g. "/uploads/pass-photo-12345.jpg" or original url if not base64
 */
function saveBase64Image(dataUrl, prefix = 'photo') {
  if (!dataUrl || typeof dataUrl !== 'string') return '';

  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:image')) {
    return trimmed;
  }

  try {
    const matches = trimmed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return trimmed;

    const rawExt = matches[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}.${ext}`;
    const targetFile = path.join(uploadsDir, filename);

    fs.writeFileSync(targetFile, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to save base64 image to uploads disk:', err);
    return trimmed;
  }
}

module.exports = {
  saveBase64Image,
};
