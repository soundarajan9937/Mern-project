/**
 * Resolves any image URL safely without mangling base64 data URLs or blob URLs.
 * Handles:
 *  - "data:image/..." -> direct base64
 *  - "blob:..."       -> object URL
 *  - "http://..."     -> remote URL
 *  - "/uploads/..."   -> local upload static path
 *  - "photo-123.jpg"  -> formatted as "/uploads/photo-123.jpg"
 */
export function getSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Remove leading slashes and duplicate 'uploads'
  const clean = trimmed.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
  return `/uploads/${clean}`;
}

/**
 * Compresses and scales down an image file from a phone camera or file picker.
 * Modern smartphone photos can be 5MB - 20MB (4000x3000px).
 * This scales it down to maxDimension (default 800px) and 85% JPEG quality (~80-150KB),
 * guaranteeing instant preview, no mobile browser tab crashes, and fast submission.
 *
 * @param {File} file
 * @param {number} maxDimension
 * @param {number} quality
 * @returns {Promise<string>} base64 data URL
 */
export function compressAndResizeImage(file, maxDimension = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      const img = new Image();

      img.onerror = () => {
        // Fall back to raw data URL if Image constructor cannot decode
        resolve(rawDataUrl);
      };

      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          console.warn('Canvas resize failed, returning original image data', err);
          resolve(rawDataUrl);
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
