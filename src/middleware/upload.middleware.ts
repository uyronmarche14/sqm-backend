/**
 * Universal File Upload Middleware Factory (Enhanced)
 * ==================================================
 * A dynamic, module-aware multer middleware for the SQM platform.
 * Supports hierarchical folder organization via attachmentType.
 *
 * Features:
 *   1. Hierarchical or flat storage routing
 *   2. Collision-free filenames (timestamp-uuid.ext)
 *   3. Enforces size and MIME-type constraints
 *   4. Detailed development logging
 *   5. Backward compatible with old flat folder calls
 *
 * Usage:
 *   const upload = createModuleUpload('mnr', { attachmentType: 'mnr-main' });
 *   router.post('/', upload.any(), controller.createRecord);
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { NextFunction, Request, Response } from 'express';
import { ATTACHMENT_TYPE_FOLDERS } from '../shared/services/file-storage.service.js';

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
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/** Allowed file extensions (must match MIME types above) */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx',
  '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.ppt', '.pptx',
]);

interface UploadedFile {
  originalname: string;
  mimetype: string;
  filename: string;
  fieldname: string;
  size: number;
}

interface UploadRequest extends Request {
  files?: UploadedFile[];
  file?: UploadedFile;
}

interface UploadOptions {
  attachmentType?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

type MulterStorageCallback = (error: Error | null, value?: string) => void;
type MulterFileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

// ---------------------------------------------------------------------------
// Storage Factory
// ---------------------------------------------------------------------------

/**
 * Creates a multer diskStorage engine scoped to a module directory.
 * @param {string} moduleName - e.g. 'mnr', 'sqpr', '5m1e'
 * @param {string} [attachmentType] - Optional subfolder trigger
 */
function createStorage(moduleName: string, attachmentType?: string) {
  let moduleDir = path.join(ROOT_UPLOAD_DIR, moduleName);

  // If attachmentType is provided and has a mapping, append subfolder
  if (attachmentType && ATTACHMENT_TYPE_FOLDERS[attachmentType]) {
    moduleDir = path.join(moduleDir, ATTACHMENT_TYPE_FOLDERS[attachmentType]);
    console.log(`📁 [Upload] Using hierarchical structure: uploads/${moduleName}/${ATTACHMENT_TYPE_FOLDERS[attachmentType]}/`);
  } else {
    console.log(`📁 [Upload] Using flat structure: uploads/${moduleName}/`);
  }

  // Ensure the directory tree exists at startup, not per-request
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
    console.log(`📁 [Upload] Created directory: ${moduleDir.replace(ROOT_UPLOAD_DIR, 'uploads')}/`);
  }

  return multer.diskStorage({
    destination: (_req: Request, _file: UploadedFile, cb: MulterStorageCallback) => cb(null, moduleDir),
    filename:    (_req: Request, file: UploadedFile, cb: MulterStorageCallback) => {
      const ext        = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  });
}

// ---------------------------------------------------------------------------
// File Filter
// ---------------------------------------------------------------------------

function fileFilter(_req: Request, file: UploadedFile, cb: MulterFileFilterCallback) {
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

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
 * @param {string} [options.attachmentType]  Attachment type for subfolder routing.
 * @param {number} [options.maxFileSize]  Override max size in bytes.
 * @param {number} [options.maxFiles]     Override max files per request.
 * @returns {multer.Multer}
 */
export function createModuleUpload(moduleName: string, options: UploadOptions = {}) {
  const {
    attachmentType,
    maxFileSize = MAX_FILE_SIZE,
    maxFiles    = MAX_FILES_PER_REQUEST,
  } = options;

  return multer({
    storage:    createStorage(moduleName, attachmentType),
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

export function handleUploadError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const statusMap: Record<string, { status: number; message: string }> = {
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

  return next(err);
}

// ---------------------------------------------------------------------------
// Request Logger
// ---------------------------------------------------------------------------

export function logUploads(req: UploadRequest, _res: Response, next: NextFunction) {
  const files = req.files || (req.file ? [req.file] : []);
  const route = `${req.method} ${req.originalUrl || req.url}`;

  if (files.length > 0) {
    const totalSize = files.reduce((sum: number, f: UploadedFile) => sum + f.size, 0);
    console.log('────────────────────────────────────────────────');
    console.log(`📎 [Upload] ${files.length} file(s) received on ${route}`);
    console.log(`   Total size: ${(totalSize / 1024).toFixed(1)} KB`);
    files.forEach((f: UploadedFile, i: number) => {
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
// Utility Patterns
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path for a file in a module's upload directory.
 * Includes subfolder if attachmentType is provided.
 */
export function getUploadPath(moduleName: string, filename: string, attachmentType?: string) {
  if (attachmentType && ATTACHMENT_TYPE_FOLDERS[attachmentType]) {
    return path.join(ROOT_UPLOAD_DIR, moduleName, ATTACHMENT_TYPE_FOLDERS[attachmentType], filename);
  }
  return path.join(ROOT_UPLOAD_DIR, moduleName, filename);
}

/**
 * Safely deletes an uploaded file. Checks both hierarchical and flat paths.
 */
export function deleteUploadedFile(moduleName: string, filename: string, attachmentType?: string) {
  // Try new structure first if attachment type specified
  if (attachmentType) {
    const newPath = getUploadPath(moduleName, filename, attachmentType);
    if (fs.existsSync(newPath)) {
      fs.unlinkSync(newPath);
      console.log(`🗑️  [Upload] Deleted: ${newPath.replace(ROOT_UPLOAD_DIR, 'uploads')}`);
      return true;
    }
  }

  // Fallback to flat structure
  const oldPath = path.join(ROOT_UPLOAD_DIR, moduleName, filename);
  if (fs.existsSync(oldPath)) {
    fs.unlinkSync(oldPath);
    console.log(`🗑️  [Upload] Deleted (fallback): ${oldPath.replace(ROOT_UPLOAD_DIR, 'uploads')}`);
    return true;
  }

  console.warn(`⚠️  [Upload] Not found for deletion: ${moduleName}/${filename}`);
  return false;
}
