const express = require('express');
const multer = require('multer');
const path = require('path');
const { ObjectId } = require('mongodb');
const { uploadToR2, deleteFromR2 } = require('../utils/r2Client');

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF), PDF, and DOCX files are allowed.'), false);
    }
  }
});

function createTeacherVerificationRoutes({ getUsersCollection, isAuthenticated }) {
  const router = express.Router();

  function isTeacherPending(req, res, next) {
    if (req.session?.role !== 'teacher_pending') {
      return res.status(403).json({ success: false, message: 'Only pending teacher accounts can upload verification documents.' });
    }
    next();
  }

  // POST /api/teacher/verification-doc
  router.post('/verification-doc', isAuthenticated, isTeacherPending, (req, res, next) => {
    upload.single('verificationDoc')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10 MB.' });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      const userId = req.session.userId;
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid session.' });
      }

      const col = getUsersCollection();
      if (!col) {
        return res.status(503).json({ success: false, message: 'Service unavailable.' });
      }

      // Look up any existing key to delete from R2 first
      const existing = await col.findOne(
        { _id: new ObjectId(userId) },
        { projection: { verificationDocKey: 1 } }
      );

      if (existing?.verificationDocKey) {
        try {
          await deleteFromR2(existing.verificationDocKey);
        } catch (delErr) {
          console.error('R2 delete (old doc) error:', delErr);
          // Non-fatal: proceed with upload
        }
      }

      // Build a safe R2 object key
      const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '';
      const safeExt = ext.length > 1 ? ext : '.bin';
      const key = `verification/${userId}/${Date.now()}${safeExt}`;

      await uploadToR2(key, req.file.buffer, req.file.mimetype);

      await col.updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            verificationDocKey: key,
            verificationDocMimeType: req.file.mimetype,
            verificationDocUploadedAt: new Date()
          }
        }
      );

      return res.json({ success: true, message: 'Verification document uploaded successfully.' });
    } catch (err) {
      console.error('Teacher verification upload error:', err);
      return res.status(500).json({ success: false, message: 'Upload failed. Please try again.' });
    }
  });

  // DELETE /api/teacher/verification-doc
  router.delete('/verification-doc', isAuthenticated, isTeacherPending, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid session.' });
      }

      const col = getUsersCollection();
      if (!col) {
        return res.status(503).json({ success: false, message: 'Service unavailable.' });
      }

      const user = await col.findOne(
        { _id: new ObjectId(userId) },
        { projection: { verificationDocKey: 1 } }
      );

      if (!user?.verificationDocKey) {
        return res.status(404).json({ success: false, message: 'No verification document on file.' });
      }

      await deleteFromR2(user.verificationDocKey);

      await col.updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { verificationDocKey: '', verificationDocMimeType: '', verificationDocUploadedAt: '' } }
      );

      return res.json({ success: true, message: 'Verification document removed.' });
    } catch (err) {
      console.error('Teacher verification delete error:', err);
      return res.status(500).json({ success: false, message: 'Failed to remove document.' });
    }
  });

  return router;
}

module.exports = createTeacherVerificationRoutes;
