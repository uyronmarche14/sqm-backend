/**
 * Universal File Upload Middleware Factory
 * =========================================
 * A dynamic, module-aware multer middleware for the SQM platform.
 *
 * Why this exists:
 *   Each module (MNR, 5M1E, SQPR, OGI, SQMP, QMQA, NPI) may need to receive
 *   file attachments via multipart/form-data.  This factory produces configured
 *   multer instances that:
 *     1. Route files into per-module subdirectories  (uploads/<module>/)
 *     2. Generate collision-free filenames            (timestamp-uuid.ext)
 *     3. Enforce size and MIME-type constraints
 *     4. Log upload telemetry in DEV mode
 *     5. Return Express-friendly error responses
 *
 * Usage in a route file:
 *   import { createModuleUpload } from '../middleware/upload.middleware.js';
 *   const upload = createModuleUpload('mnr');
 *   router.post('/', upload.any(), controller.createRecord);
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Path resolution (ESM compat)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_UPLOAD_DIR = path.join(__dirname, '../../uploads');

// ---------------------------------------------------------------------------
// Configuration Constants
// ---------------------------------------------------------------------------

/** Maximum file size in bytes (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum files per single request */
const MAX_FILES_PER_REQUEST = 10;

/** Allowed MIME types — covers standard business documents */
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives (optional — uncomment if needed)
  // 'application/zip',
  // 'application/x-rar-compressed',
]);

/** Allowed file extensions (must match MIME types above) */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx',
  '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.ppt', '.pptx',
]);

// ---------------------------------------------------------------------------
// Storage Factory
// ---------------------------------------------------------------------------

/**
 * Creates a multer diskStorage engine scoped to a module directory.
 * @param {string} moduleName - e.g. 'mnr', 'sqpr', '5m1e'
 */
function createStorage(moduleName) {
  const moduleDir = path.join(ROOT_UPLOAD_DIR, moduleName);

  // Ensure the directory tree exists at startup, not per-request
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
    console.log(`📁 [Upload] Created directory: uploads/${moduleName}/`);
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, moduleDir),
    filename:    (_req, file, cb) => {
      const ext        = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  });
}

// ---------------------------------------------------------------------------
// File Filter
// ---------------------------------------------------------------------------

/**
 * Validates incoming files against whitelisted MIME types and extensions.
 * Rejects with a descriptive MulterError on failure.
 */
function fileFilter(_req, file, cb) {
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  // Reject with a clear message
  const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
  error.message = `File type not allowed: "${file.originalname}" (${mime}). ` +
                  `Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`;
  return cb(error, false);
}

// ---------------------------------------------------------------------------
// Public API: createModuleUpload
// ---------------------------------------------------------------------------

/**
 * Creates a fully configured multer instance for a specific module.
 *
 * @param {string} moduleName  Identifier used for the upload subdirectory.
 * @param {object} [options]   Optional overrides.
 * @param {number} [options.maxFileSize]  Override max size in bytes.
 * @param {number} [options.maxFiles]     Override max files per request.
 * @returns {multer.Multer}
 *
 * @example
 *   const upload = createModuleUpload('mnr');
 *   router.post('/', upload.any(), controller.create);
 *
 * @example
 *   const upload = createModuleUpload('qmqa', { maxFileSize: 20 * 1024 * 1024 });
 *   router.post('/attachments', upload.single('file'), controller.attach);
 */
export function createModuleUpload(moduleName, options = {}) {
  const {
    maxFileSize = MAX_FILE_SIZE,
    maxFiles    = MAX_FILES_PER_REQUEST,
  } = options;

  return multer({
    storage:    createStorage(moduleName),
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files:    maxFiles,
    },
  });
}

// ---------------------------------------------------------------------------
// Error Handler Middleware
// ---------------------------------------------------------------------------

/**
 * Express error-handling middleware that catches Multer errors and returns
 * structured JSON responses instead of crashing the request pipeline.
 *
 * Usage:
 *   import { handleUploadError } from '../middleware/upload.middleware.js';
 *   app.use(handleUploadError);  // Place AFTER routes
 *
 * Or per-route:
 *   router.post('/',
 *     upload.any(),
 *     handleUploadError,
 *     controller.createRecord
 *   );
 */
export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const statusMap = {
      LIMIT_FILE_SIZE:       { status: 413, message: `File exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
      LIMIT_FILE_COUNT:      { status: 400, message: `Too many files. Maximum ${MAX_FILES_PER_REQUEST} allowed` },
      LIMIT_UNEXPECTED_FILE: { status: 400, message: err.message || 'Unexpected file field' },
    };

    const mapped = statusMap[err.code] || { status: 400, message: err.message };

    console.error(`❌ [Upload] Multer error [${err.code}]:`, mapped.message);

    return res.status(mapped.status).json({
      success: false,
      error: {
        name:    'UploadValidationError',
        code:    err.code,
        message: mapped.message,
        field:   err.field || undefined,
      },
    });
  }

  // Non-multer error — pass downstream
  return next(err);
}

// ---------------------------------------------------------------------------
// Request Logger
// ---------------------------------------------------------------------------

/**
 * Middleware that logs uploaded file details for every request.
 * Provides clear console output showing what files were received.
 *
 * Usage:
 *   router.post('/', upload.any(), logUploads, controller.create);
 */
export function logUploads(req, _res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  const route = `${req.method} ${req.originalUrl || req.url}`;

  if (files.length > 0) {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    console.log('────────────────────────────────────────────────');
    console.log(`📎 [Upload] ${files.length} file(s) received on ${route}`);
    console.log(`   Total size: ${(totalSize / 1024).toFixed(1)} KB`);
    files.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.originalname} (${(f.size / 1024).toFixed(1)} KB) → ${f.filename}`);
      console.log(`      MIME: ${f.mimetype} | Field: ${f.fieldname}`);
    });
    console.log('────────────────────────────────────────────────');
  } else {
    console.log(`📝 [Upload] No files in request — ${route} (JSON-only)`);
  }

  next();
}

// ---------------------------------------------------------------------------
// Utility: Delete uploaded file (for rollback on service error)
// ---------------------------------------------------------------------------

/**
 * Safely deletes an uploaded file by its full path or module-relative filename.
 *
 * @param {string} moduleName  Module identifier for path resolution.
 * @param {string} filename    Filename within the module upload dir.
 * @returns {boolean}          True if deleted, false if not found.
 */
export function deleteUploadedFile(moduleName, filename) {
  const filePath = path.join(ROOT_UPLOAD_DIR, moduleName, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`🗑️  [Upload] Deleted: ${moduleName}/${filename}`);
    return true;
  }

  console.warn(`⚠️  [Upload] Not found for deletion: ${moduleName}/${filename}`);
  return false;
}

/**
 * Returns the absolute path for a file in a module's upload directory.
 *
 * @param {string} moduleName
 * @param {string} filename
 * @returns {string}
 */
export function getUploadPath(moduleName, filename) {
  return path.join(ROOT_UPLOAD_DIR, moduleName, filename);
}
