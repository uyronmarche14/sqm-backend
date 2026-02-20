/**
 * QMQA File Upload Middleware
 * Handles file uploads with size and type validation for QMQA module
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure QMQA uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/qmqa');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created QMQA uploads directory:', uploadDir);
}

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with UUID
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

/**
 * File filter for allowed file types
 * Allowed: PDF, JPG, PNG, XLSX, XLS, DOCX, DOC
 */
const fileFilter = (req, file, cb) => {
    console.log('🔍 [FILE-UPLOAD] Validating file type');
    console.log('   Original Name:', file.originalname);
    console.log('   MIME Type:', file.mimetype);
    
    const allowedMimeTypes = [
        'application/pdf',                                                          // PDF
        'image/jpeg',                                                               // JPG
        'image/png',                                                                // PNG
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',      // XLSX
        'application/vnd.ms-excel',                                                 // XLS
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/msword'                                                        // DOC
    ];
    
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.docx', '.doc'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        console.log('✅ [FILE-UPLOAD] File type valid');
        cb(null, true);
    } else {
        console.log('❌ [FILE-UPLOAD] Invalid file type');
        cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, XLSX, XLS, DOCX, DOC'), false);
    }
};

/**
 * Configure multer with storage, file filter, and size limits
 * Max file size: 10MB
 */
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB in bytes
    }
});

/**
 * Middleware for single file upload
 */
export const uploadSingleFile = (fieldName = 'file') => {
    return (req, res, next) => {
        const uploadMiddleware = upload.single(fieldName);
        
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                console.error('❌ [FILE-UPLOAD] Multer error:', err);
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: {
                            name: 'ValidationError',
                            message: 'File size exceeds 10MB limit',
                            details: [{
                                field: fieldName,
                                message: 'File size must not exceed 10MB'
                            }]
                        }
                    });
                }
                
                return res.status(400).json({
                    success: false,
                    error: {
                        name: 'ValidationError',
                        message: 'File upload error',
                        details: [{
                            field: fieldName,
                            message: err.message
                        }]
                    }
                });
            } else if (err) {
                console.error('❌ [FILE-UPLOAD] Error:', err);
                
                return res.status(400).json({
                    success: false,
                    error: {
                        name: 'ValidationError',
                        message: err.message,
                        details: [{
                            field: fieldName,
                            message: err.message
                        }]
                    }
                });
            }
            
            // File uploaded successfully
            if (req.file) {
                console.log('✅ [FILE-UPLOAD] File uploaded successfully');
                console.log('   Original Name:', req.file.originalname);
                console.log('   Saved As:', req.file.filename);
                console.log('   Size:', req.file.size, 'bytes');
            }
            
            next();
        });
    };
};

/**
 * Middleware for multiple file uploads
 */
export const uploadMultipleFiles = (fieldName = 'files', maxCount = 10) => {
    return (req, res, next) => {
        const uploadMiddleware = upload.array(fieldName, maxCount);
        
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                console.error('❌ [FILE-UPLOAD] Multer error:', err);
                
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: {
                            name: 'ValidationError',
                            message: 'One or more files exceed 10MB limit',
                            details: [{
                                field: fieldName,
                                message: 'Each file size must not exceed 10MB'
                            }]
                        }
                    });
                }
                
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        error: {
                            name: 'ValidationError',
                            message: `Too many files. Maximum ${maxCount} files allowed`,
                            details: [{
                                field: fieldName,
                                message: `Maximum ${maxCount} files allowed`
                            }]
                        }
                    });
                }
                
                return res.status(400).json({
                    success: false,
                    error: {
                        name: 'ValidationError',
                        message: 'File upload error',
                        details: [{
                            field: fieldName,
                            message: err.message
                        }]
                    }
                });
            } else if (err) {
                console.error('❌ [FILE-UPLOAD] Error:', err);
                
                return res.status(400).json({
                    success: false,
                    error: {
                        name: 'ValidationError',
                        message: err.message,
                        details: [{
                            field: fieldName,
                            message: err.message
                        }]
                    }
                });
            }
            
            // Files uploaded successfully
            if (req.files && req.files.length > 0) {
                console.log('✅ [FILE-UPLOAD] Files uploaded successfully');
                console.log('   Count:', req.files.length);
                req.files.forEach((file, index) => {
                    console.log(`   File ${index + 1}:`, file.originalname, '-', file.size, 'bytes');
                });
            }
            
            next();
        });
    };
};

/**
 * Helper function to delete uploaded file
 */
export const deleteFile = (filename) => {
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️  [FILE-UPLOAD] File deleted:', filename);
        return true;
    }
    
    console.log('⚠️  [FILE-UPLOAD] File not found:', filename);
    return false;
};

/**
 * Helper function to get file path
 */
export const getFilePath = (filename) => {
    return path.join(uploadDir, filename);
};

/**
 * Helper function to check if file exists
 */
export const fileExists = (filename) => {
    const filePath = path.join(uploadDir, filename);
    return fs.existsSync(filePath);
};
