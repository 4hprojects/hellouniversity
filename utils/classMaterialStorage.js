const path = require('path');

const { uploadToR2, deleteFromR2, getSignedViewUrl } = require('./r2Client');

const MATERIAL_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const MATERIAL_UPLOAD_ALLOWED_MIME_TYPES = {
  document: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]),
  file: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar'
  ])
};

function sanitizeFileSegment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'file';
}

function buildClassMaterialStorageKey({ classId, materialId, originalName }) {
  const ext = path.extname(String(originalName || '')).toLowerCase().replace(/[^.a-z0-9]/g, '') || '';
  const basename = sanitizeFileSegment(path.basename(String(originalName || ''), ext));
  const safeExt = ext.length > 1 ? ext : '.bin';
  return `class-materials/${sanitizeFileSegment(classId)}/${sanitizeFileSegment(materialId)}/${Date.now()}-${basename}${safeExt}`;
}

function validateMaterialUpload(type, file) {
  const normalizedType = String(type || '').trim().toLowerCase();
  if (!['document', 'file'].includes(normalizedType)) {
    return 'Uploads are only supported for document and file materials.';
  }
  if (!file) {
    return 'No file uploaded.';
  }
  const allowedMimeTypes = MATERIAL_UPLOAD_ALLOWED_MIME_TYPES[normalizedType];
  if (!allowedMimeTypes?.has(file.mimetype)) {
    return normalizedType === 'document'
      ? 'Unsupported document type. Upload PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, or TXT files.'
      : 'Unsupported file type. Upload a supported document, image, or archive file.';
  }
  if (!Number.isFinite(Number(file.size)) || Number(file.size) <= 0) {
    return 'Uploaded file is empty.';
  }
  if (Number(file.size) > MATERIAL_UPLOAD_MAX_BYTES) {
    return 'File too large. Maximum size is 10 MB.';
  }
  return '';
}

async function uploadClassMaterialFile({ classId, materialId, file, uploadedByUserId }) {
  const storageKey = buildClassMaterialStorageKey({
    classId,
    materialId,
    originalName: file.originalname
  });

  await uploadToR2(storageKey, file.buffer, file.mimetype);

  return {
    storageKey,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: Number(file.size) || Buffer.byteLength(file.buffer || Buffer.alloc(0)),
    uploadedAt: new Date(),
    uploadedByUserId
  };
}

async function deleteClassMaterialFile(storageKey) {
  if (!storageKey) {
    return;
  }
  await deleteFromR2(storageKey);
}

async function serializeClassMaterial(material) {
  const safeMaterial = {
    ...material
  };

  if (!safeMaterial.file || !safeMaterial.file.storageKey) {
    if (safeMaterial.file) {
      safeMaterial.file = {
        originalName: safeMaterial.file.originalName || '',
        mimeType: safeMaterial.file.mimeType || '',
        sizeBytes: Number(safeMaterial.file.sizeBytes) || 0,
        uploadedAt: safeMaterial.file.uploadedAt || null,
        uploadedByUserId: safeMaterial.file.uploadedByUserId || null,
        downloadUrl: null
      };
    }
    return safeMaterial;
  }

  let downloadUrl = null;
  try {
    downloadUrl = await getSignedViewUrl(safeMaterial.file.storageKey);
  } catch (error) {
    console.warn('Unable to sign class material file URL:', error.message);
  }

  safeMaterial.file = {
    originalName: safeMaterial.file.originalName || '',
    mimeType: safeMaterial.file.mimeType || '',
    sizeBytes: Number(safeMaterial.file.sizeBytes) || 0,
    uploadedAt: safeMaterial.file.uploadedAt || null,
    uploadedByUserId: safeMaterial.file.uploadedByUserId || null,
    downloadUrl
  };

  return safeMaterial;
}

async function serializeClassMaterials(materials = []) {
  return Promise.all((Array.isArray(materials) ? materials : []).map((material) => serializeClassMaterial(material)));
}

module.exports = {
  MATERIAL_UPLOAD_MAX_BYTES,
  MATERIAL_UPLOAD_ALLOWED_MIME_TYPES,
  validateMaterialUpload,
  uploadClassMaterialFile,
  deleteClassMaterialFile,
  serializeClassMaterial,
  serializeClassMaterials
};
