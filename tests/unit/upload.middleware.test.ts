import { describe, expect, it, vi, beforeEach } from 'vitest';
import multer from 'multer';

// Mock file-storage service before importing upload middleware
vi.mock('../../shared/services/file-storage.service.js', () => ({
  ATTACHMENT_TYPE_FOLDERS: {
    'mnr-main': 'main',
    'sqpr': 'attachments',
  },
}));

import { createModuleUpload, handleUploadError } from '../../middleware/upload.middleware.js';

describe('Upload Middleware', () => {
  describe('createModuleUpload configuration', () => {
    const upload = createModuleUpload('test-module');

    it('returns a multer instance', () => {
      expect(upload).toBeDefined();
      expect(upload.any).toBeDefined();
      expect(upload.single).toBeDefined();
    });

    it('respects custom max file size', () => {
      const customUpload = createModuleUpload('test-module', { maxFileSize: 1024 });
      expect(customUpload).toBeDefined();
    });

    it('respects custom max files', () => {
      const customUpload = createModuleUpload('test-module', { maxFiles: 5 });
      expect(customUpload).toBeDefined();
    });

    it('accepts attachment type override', () => {
      const uploadWithType = createModuleUpload('mnr', { attachmentType: 'mnr-main' });
      expect(uploadWithType).toBeDefined();
    });
  });

  describe('handleUploadError', () => {
    const mockJson = vi.fn();
    const mockStatus = vi.fn(() => ({ json: mockJson }));
    const mockReq = {} as any;
    const mockNext = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('maps LIMIT_FILE_SIZE to 413', () => {
      const error = new multer.MulterError('LIMIT_FILE_SIZE', 'file');
      handleUploadError(error, mockReq, { status: mockStatus } as any, mockNext);
      expect(mockStatus).toHaveBeenCalledWith(413);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('maps LIMIT_FILE_COUNT to 400', () => {
      const error = new multer.MulterError('LIMIT_FILE_COUNT', 'file');
      handleUploadError(error, mockReq, { status: mockStatus } as any, mockNext);
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('maps LIMIT_UNEXPECTED_FILE to 400', () => {
      const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file');
      handleUploadError(error, mockReq, { status: mockStatus } as any, mockNext);
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('passes non-Multer errors to next middleware', () => {
      const error = new Error('Unknown error');
      handleUploadError(error, mockReq, { status: mockStatus } as any, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });
});
