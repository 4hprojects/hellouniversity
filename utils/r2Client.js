// r2Client.js - Cloudflare R2 storage helpers (S3-compatible)
// Server-side only. Never import this in browser-facing code.

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const {
  CF_R2_ACCOUNT_ID,
  CF_R2_ACCESS_KEY_ID,
  CF_R2_SECRET_ACCESS_KEY,
  CF_R2_BUCKET_NAME
} = process.env;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CF_R2_ACCESS_KEY_ID,
    secretAccessKey: CF_R2_SECRET_ACCESS_KEY
  }
});

/**
 * Upload a buffer to R2.
 * @param {string} key   - Object key e.g. "verification/userId/1234-filename.pdf"
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
async function uploadToR2(key, buffer, mimeType) {
  const cmd = new PutObjectCommand({
    Bucket: CF_R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType
  });
  return r2Client.send(cmd);
}

/**
 * Delete an object from R2.
 * @param {string} key
 */
async function deleteFromR2(key) {
  const cmd = new DeleteObjectCommand({
    Bucket: CF_R2_BUCKET_NAME,
    Key: key
  });
  return r2Client.send(cmd);
}

/**
 * Generate a short-lived presigned URL to view/download an object.
 * @param {string} key
 * @param {number} ttlSeconds  Default 15 minutes (900s)
 * @returns {Promise<string>}  The presigned URL
 */
async function getSignedViewUrl(key, ttlSeconds = 900) {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const cmd = new GetObjectCommand({
    Bucket: CF_R2_BUCKET_NAME,
    Key: key
  });
  return getSignedUrl(r2Client, cmd, { expiresIn: ttlSeconds });
}

module.exports = { r2Client, uploadToR2, deleteFromR2, getSignedViewUrl };
