import { db } from '../infrastructure/db.js';
import { NotFoundError } from '../errors/AppError.js';
import path from 'path';
import fs from 'fs/promises';

export interface AttachmentConfig {
  tableName: string;
  idColumn: string;
  fileNameColumn: string;
  uploadPath: string;
  extensionColumn?: string | null;
  pathColumn?: string;
  subFolder?: string;  // NEW: Optional subfolder for organization
}

export interface AttachmentInfo {
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

/**
 * Enhanced AttachmentService with form-type-aware folder structure
 * 
 * Features:
 * - Hierarchical folder organization by attachment type
 * - Backward compatibility with flat structure
 * - Automatic fallback for old files
 * - No database schema changes required
 */
export class AttachmentService {
  private configs = new Map<string, AttachmentConfig>();

  constructor() {
    this.registerConfigs();
  }

  /**
   * Get the full upload path including subfolder
   */
  getUploadPath(moduleType: string): string {
    const config = this.configs.get(moduleType);
    if (!config) {
      throw new Error(`Unknown module type: ${moduleType}`);
    }

    if (config.subFolder) {
      return path.join(config.uploadPath, config.subFolder);
    }
    return config.uploadPath;
  }

  /**
   * Download attachment by module type and attachment ID
   * Supports both new hierarchical and old flat structures
   */
  async downloadAttachment(moduleType: string, attachmentId: string): Promise<AttachmentInfo> {
    const config = this.configs.get(moduleType);
    if (!config) {
      throw new Error(`Unknown module type: ${moduleType}`);
    }

    const columns = [config.fileNameColumn];
    if (config.extensionColumn !== null) {
      columns.push(config.extensionColumn || 'file_extension');
    }
    if (config.pathColumn) {
      columns.push(config.pathColumn);
    }

    const attachment = await db.selectFrom(config.tableName as any)
      .select(columns as any)
      .where(config.idColumn as any, '=', attachmentId)
      .executeTakeFirst();

    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    const fileName = attachment[config.fileNameColumn as keyof typeof attachment] as string;
    const storedPath = config.pathColumn
      ? attachment[config.pathColumn as keyof typeof attachment] as string | null | undefined
      : undefined;
    const extensionColumn = config.extensionColumn === undefined ? 'file_extension' : config.extensionColumn;
    const extension =
      extensionColumn
        ? attachment[extensionColumn as keyof typeof attachment] as string | null | undefined
        : path.extname(fileName).replace('.', '');
    
    // Try new structure first (with subfolder)
    const newPath = config.subFolder 
      ? path.join(config.uploadPath, config.subFolder, fileName)
      : path.join(config.uploadPath, fileName);
    
    // Fallback to old structure (flat)
    const oldPath = path.join(config.uploadPath, fileName);

    const candidatePaths = [
      storedPath ? path.resolve(storedPath) : null,
      newPath,
      oldPath,
    ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);

    let filePath: string | undefined;
    let stats: any;

    for (const candidatePath of candidatePaths) {
      try {
        await fs.access(candidatePath);
        stats = await fs.stat(candidatePath);
        filePath = candidatePath;
        console.log(`📁 [Attachment] Found attachment on disk: ${candidatePath}`);
        break;
      } catch {
        // Try next candidate path.
      }
    }

    if (!filePath) {
      throw new NotFoundError('File not found on disk');
    }

    return {
      filePath: path.resolve(filePath),
      fileName,
      mimeType: this.getMimeType(extension || ''),
      fileSize: stats.size
    };
  }

  /**
   * Get attachment metadata without file system check
   */
  async getAttachmentInfo(moduleType: string, attachmentId: string) {
    const config = this.configs.get(moduleType);
    if (!config) {
      throw new Error(`Unknown module type: ${moduleType}`);
    }

    const attachment = await db.selectFrom(config.tableName as any)
      .selectAll()
      .where(config.idColumn as any, '=', attachmentId)
      .executeTakeFirst();

    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    return attachment;
  }

  /**
   * Register module configurations with subfolders
   */
  private registerConfigs() {
    // ========================================
    // QMQA Module - 5 attachment types
    // ========================================
    this.configs.set('qmqa-plan', {
      tableName: 'QMQA_PLAN_ATTACHMENT',
      idColumn: 'qmqa_plan_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/qmqa',
      subFolder: 'schedules'
    });

    this.configs.set('qmqa-record', {
      tableName: 'QMQA_ATTACHMENT',
      idColumn: 'qmqa_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/qmqa',
      subFolder: 'records'
    });

    this.configs.set('qmqa-response-initial', {
      tableName: 'QMQA_RESPONSE_INITIAL',
      idColumn: 'qmqa_response_initial_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/qmqa',
      subFolder: 'response-initial'
    });

    this.configs.set('qmqa-response-final', {
      tableName: 'QMQA_RESPONSE_FINAL',
      idColumn: 'qmqa_response_final_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/qmqa',
      subFolder: 'response-final'
    });

    this.configs.set('qmqa-response-verification', {
      tableName: 'QMQA_RESPONSE_VERIFICATION',
      idColumn: 'qmqa_response_verification_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/qmqa',
      subFolder: 'response-verification'
    });

    // ========================================
    // SQMP Module - 5 attachment types
    // ========================================
    this.configs.set('sqmp-document', {
      tableName: 'SQMP_DOCUMENT',
      idColumn: 'sqmp_document_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/sqmp',
      subFolder: 'documents'
    });

    this.configs.set('sqmp-appendix', {
      tableName: 'SQMP_APPENDIX',
      idColumn: 'sqmp_appendix_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/sqmp',
      subFolder: 'appendix'
    });

    this.configs.set('sqmp-response-document', {
      tableName: 'SQMP_RESPONSE_DOCUMENT',
      idColumn: 'sqmp_response_document_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/sqmp',
      subFolder: 'response-documents'
    });

    this.configs.set('sqmp-response-appendix', {
      tableName: 'SQMP_RESPONSE_APPENDIX',
      idColumn: 'sqmp_response_appendix_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/sqmp',
      subFolder: 'response-appendix'
    });

    this.configs.set('sqmp-response-closure', {
      tableName: 'SQMP_RESPONSE_CLOSURE',
      idColumn: 'sqmp_response_closure_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/sqmp',
      subFolder: 'response-closure'
    });

    // ========================================
    // MNR Module - 2 attachment types
    // ========================================
    this.configs.set('mnr-main', {
      tableName: 'MNR_ATTACHMENT',
      idColumn: 'mnr_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/mnr',
      subFolder: 'main'
    });

    this.configs.set('mnr-response', {
      tableName: 'MNR_RESPONSE_ATTACHMENT',
      idColumn: 'mnr_response_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/mnr',
      subFolder: 'response'
    });

    // ========================================
    // Simple modules (single attachment type)
    // ========================================
    this.configs.set('npi', {
      tableName: 'NPI_ATTACHMENT',
      idColumn: 'npi_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/npi',
      subFolder: 'attachments'
    });

    this.configs.set('sqpr', {
      tableName: 'SQPR_ATTACHMENT',
      idColumn: 'sqpr_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/sqpr',
      subFolder: 'attachments'
    });

    this.configs.set('ogi', {
      tableName: 'OGI_ATTACHMENT',
      idColumn: 'ogi_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/ogi',
      subFolder: 'attachments'
    });

    this.configs.set('5m1e-main', {
      tableName: 'TBL_5M1E_Attachment',
      idColumn: 'ID',
      fileNameColumn: 'FileName',
      pathColumn: 'Attribute1',
      extensionColumn: null,
      uploadPath: './uploads/5m1e'
    });

    // ========================================
    // Backward compatibility configs (no subfolder)
    // ========================================
    // Keep these for routes that haven't been updated yet
    this.configs.set('qmqa', {
      tableName: 'QMQA_ATTACHMENT',
      idColumn: 'qmqa_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/qmqa'
    });

    this.configs.set('sqmp', {
      tableName: 'SQMP_DOCUMENT',
      idColumn: 'sqmp_document_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/sqmp'
    });

    this.configs.set('mnr', {
      tableName: 'MNR_ATTACHMENT',
      idColumn: 'mnr_attachment_id',
      fileNameColumn: 'file_name',
      uploadPath: './uploads/mnr'
    });
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed'
    };

    const ext = extension?.toLowerCase().replace('.', '') || '';
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export const attachmentService = new AttachmentService();
