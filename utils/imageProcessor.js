// imageProcessor.js - Convert uploaded image buffers to WebP before storage.

const sharp = require('sharp');

/**
 * Convert an image buffer to WebP. Non-image files (PDF, DOCX, etc.) and
 * files already in WebP format are returned unchanged.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
async function convertToWebp(buffer, mimeType) {
  if (!mimeType || !mimeType.startsWith('image/') || mimeType === 'image/webp') {
    return { buffer, mimeType };
  }

  const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
  return { buffer: webpBuffer, mimeType: 'image/webp' };
}

module.exports = { convertToWebp };
