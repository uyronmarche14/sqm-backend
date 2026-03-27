import { db } from '../infrastructure/db.js';
import { NotFoundError } from '../errors/AppError.js';
import path from 'path';
import fs from 'fs/promises';
import {
  attachmentRepository,
  type AttachmentRecord,
  type AttachmentRecordConfig,
} from '../repositories/attachment.repository.js';
import {
  fileStorageService,
  type FileStorageLocation,
} from './file-storage.service.js';

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

export interface AttachmentCommand {
  id?: string;
  attachmentId?: string;
  name?: string;
  file_name?: string;
  fileName?: string;
  extension?: string | null;
  file_extension?: string | null;
  remarks?: string | null;
  client_upload_id?: string;
  clientUploadId?: string;
  file_field?: string;
  fileField?: string;
  category?: string | null;
  attachment_type?: string | null;
  action?: string | null;
}

export interface UploadedAttachmentFile {
  fieldname: string;
  filename: string;
  originalname: string;
  mimetype?: string;
  path?: string;
  size?: number;
}

export interface AttachmentSyncConfig {
  ownerId: string;
  userId: string;
  now: Date;
  recordConfig: AttachmentRecordConfig;
  createId: () => string;
  remarkFormatter?: (context: {
    command: AttachmentCommand;
    existing?: AttachmentRecord;
    originalName?: string | null;
    existingOriginalName?: string | null;
  }) => string | null;
  categoryResolver?: (command: AttachmentCommand, existing?: AttachmentRecord) => string | null | undefined;
}

export interface AttachmentSyncResult {
  kept: AttachmentRecord[];
  created: AttachmentRecord[];
  updated: AttachmentRecord[];
  removed: AttachmentRecord[];
  cleanupQueue: Array<{ fileName: string; storedPath?: string | null }>;
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

  getConfig(moduleType: string): AttachmentConfig {
    const config = this.configs.get(moduleType);
    if (!config) {
      throw new Error(`Unknown module type: ${moduleType}`);
    }

    return config;
  }

  /**
   * Download attachment by module type and attachment ID
   * Supports both new hierarchical and old flat structures
   */
  async downloadAttachment(moduleType: string, attachmentId: string): Promise<AttachmentInfo> {
    const config = this.getConfig(moduleType);

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
    
    const storageLocation: FileStorageLocation = {
      uploadPath: config.uploadPath,
      subFolder: config.subFolder,
    };
    const filePath = await fileStorageService.findFirstExistingFile(storageLocation, fileName, storedPath);

    if (!filePath) {
      throw new NotFoundError('File not found on disk');
    }

    const stats = await fs.stat(filePath);
    console.log(`📁 [Attachment] Found attachment on disk: ${filePath}`);

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
    const config = this.getConfig(moduleType);

    const attachment = await db.selectFrom(config.tableName as any)
      .selectAll()
      .where(config.idColumn as any, '=', attachmentId)
      .executeTakeFirst();

    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    return attachment;
  }

  async syncAttachments(
    trx: any,
    commands: AttachmentCommand[] | undefined,
    files: UploadedAttachmentFile[] = [],
    options: AttachmentSyncConfig,
  ): Promise<AttachmentSyncResult> {
    if (commands === undefined) {
      return {
        kept: [],
        created: [],
        updated: [],
        removed: [],
        cleanupQueue: [],
      };
    }

    const existingAttachments = await attachmentRepository.listByOwner(
      trx,
      options.recordConfig,
      options.ownerId,
    );

    const existingById = new Map(existingAttachments.map((attachment) => [attachment.id, attachment]));
    const seenIds = new Set<string>();
    const keep: AttachmentRecord[] = [];
    const create: Array<{ record: AttachmentRecord; values: Record<string, unknown> }> = [];
    const update: Array<{
      record: AttachmentRecord;
      values: Record<string, unknown>;
      cleanup?: { fileName: string; storedPath?: string | null };
    }> = [];
    const explicitRemoveIds = new Set<string>();

    for (const command of commands) {
      const recordId = command.id || command.attachmentId || '';
      const existing = recordId ? existingById.get(recordId) : undefined;
      if (existing) {
        seenIds.add(existing.id);
      }

      const normalizedAction = String(command.action || '').toLowerCase();
      if (normalizedAction === 'remove' || normalizedAction === 'delete' || normalizedAction === 'deleted') {
        if (existing) {
          explicitRemoveIds.add(existing.id);
        }
        continue;
      }

      const uploadedFile = this.resolveUploadedFile(command, files);
      const fallbackFileName =
        command.file_name ||
        command.fileName ||
        command.name ||
        existing?.fileName ||
        '';

      const targetFileName = uploadedFile?.filename || fallbackFileName;
      if (!targetFileName) {
        continue;
      }

      const existingOriginalName = existing?.remarks || null;
      const formattedRemarks = options.remarkFormatter
        ? options.remarkFormatter({
            command,
            existing,
            originalName: uploadedFile?.originalname || command.file_name || command.fileName || command.name || null,
            existingOriginalName,
          })
        : (command.remarks ?? existing?.remarks ?? null);
      const nextExtension = this.resolveExtension(command, uploadedFile, targetFileName, existing);
      const nextCategory = options.categoryResolver?.(command, existing) ?? existing?.category ?? null;

      if (existing) {
        const updateValues: Record<string, unknown> = {
          [options.recordConfig.fileNameColumn]: targetFileName,
        };
        if (options.recordConfig.extensionColumn) {
          updateValues[options.recordConfig.extensionColumn] = nextExtension;
        }
        if (options.recordConfig.remarksColumn) {
          updateValues[options.recordConfig.remarksColumn] = formattedRemarks;
        }
        if (options.recordConfig.categoryColumn) {
          updateValues[options.recordConfig.categoryColumn] = nextCategory;
        }
        if (options.recordConfig.lastUpdateColumn !== null) {
          updateValues[options.recordConfig.lastUpdateColumn || 'last_update'] = options.now;
        }
        if (options.recordConfig.updatedByColumn) {
          updateValues[options.recordConfig.updatedByColumn] = options.userId;
        }

        if (
          this.isSameValue(existing.fileName, targetFileName) &&
          this.isSameValue(existing.fileExtension, nextExtension) &&
          this.isSameValue(existing.remarks, formattedRemarks) &&
          this.isSameValue(existing.category, nextCategory)
        ) {
          keep.push(existing);
          continue;
        }

        update.push({
          record: existing,
          values: updateValues,
          cleanup:
            uploadedFile && existing.fileName && existing.fileName !== targetFileName
              ? { fileName: existing.fileName, storedPath: existing.storagePath }
              : undefined,
        });
        continue;
      }

      const attachmentId = recordId || options.createId();
      const insertValues: Record<string, unknown> = {
        [options.recordConfig.idColumn]: attachmentId,
        [options.recordConfig.ownerColumn]: options.ownerId,
        [options.recordConfig.fileNameColumn]: targetFileName,
      };
      if (options.recordConfig.extensionColumn) {
        insertValues[options.recordConfig.extensionColumn] = nextExtension;
      }
      if (options.recordConfig.remarksColumn) {
        insertValues[options.recordConfig.remarksColumn] = formattedRemarks;
      }
      if (options.recordConfig.categoryColumn) {
        insertValues[options.recordConfig.categoryColumn] = nextCategory;
      }
      if (options.recordConfig.lastUpdateColumn !== null) {
        insertValues[options.recordConfig.lastUpdateColumn || 'last_update'] = options.now;
      }
      if (options.recordConfig.updatedByColumn) {
        insertValues[options.recordConfig.updatedByColumn] = options.userId;
      }

      create.push({
        record: {
          id: attachmentId,
          ownerId: options.ownerId,
          fileName: targetFileName,
          fileExtension: nextExtension,
          remarks: formattedRemarks,
          storagePath: uploadedFile?.path || null,
          category: nextCategory,
          raw: insertValues,
        },
        values: insertValues,
      });
    }

    const implicitRemovals = existingAttachments.filter(
      (attachment) => !seenIds.has(attachment.id) && !explicitRemoveIds.has(attachment.id),
    );
    const removed = existingAttachments.filter((attachment) => explicitRemoveIds.has(attachment.id));
    removed.push(...implicitRemovals);

    if (removed.length) {
      await attachmentRepository.deleteByIds(
        trx,
        options.recordConfig,
        removed.map((attachment) => attachment.id),
      );
    }

    for (const updateInstruction of update) {
      await attachmentRepository.updateById(
        trx,
        options.recordConfig,
        updateInstruction.record.id,
        updateInstruction.values,
      );
    }

    for (const createInstruction of create) {
      await attachmentRepository.insert(trx, options.recordConfig, createInstruction.values);
    }

    return {
      kept: keep,
      created: create.map((entry) => entry.record),
      updated: update.map((entry) => ({
        ...entry.record,
        fileName: String(entry.values[options.recordConfig.fileNameColumn] || entry.record.fileName),
        fileExtension: options.recordConfig.extensionColumn
          ? (entry.values[options.recordConfig.extensionColumn] as string | null | undefined) ?? entry.record.fileExtension
          : entry.record.fileExtension,
        remarks: options.recordConfig.remarksColumn
          ? (entry.values[options.recordConfig.remarksColumn] as string | null | undefined) ?? entry.record.remarks
          : entry.record.remarks,
        category: options.recordConfig.categoryColumn
          ? (entry.values[options.recordConfig.categoryColumn] as string | null | undefined) ?? entry.record.category
          : entry.record.category,
      })),
      removed,
      cleanupQueue: [
        ...removed.map((attachment) => ({
          fileName: attachment.fileName,
          storedPath: attachment.storagePath,
        })),
        ...update
          .map((entry) => entry.cleanup)
          .filter((entry): entry is { fileName: string; storedPath?: string | null } => Boolean(entry)),
      ],
    };
  }

  async deleteStoredAttachments(
    moduleType: string,
    attachments: Array<{ fileName: string; storedPath?: string | null }>,
  ) {
    if (!attachments.length) return;

    const config = this.getConfig(moduleType);
    const storageLocation: FileStorageLocation = {
      uploadPath: config.uploadPath,
      subFolder: config.subFolder,
    };

    await Promise.all(
      attachments.map(async (attachment) => {
        if (!attachment.fileName) return false;
        return fileStorageService.deleteStoredFile(storageLocation, attachment.fileName, attachment.storedPath);
      }),
    );
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
    this.configs.set('npi-main', {
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
    this.configs.set('sqpr-main', {
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
    this.configs.set('ogi-main', {
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

  private resolveUploadedFile(command: AttachmentCommand, files: UploadedAttachmentFile[]) {
    const fileField =
      command.file_field ||
      command.fileField ||
      (command.client_upload_id || command.clientUploadId
        ? `file:${command.client_upload_id || command.clientUploadId}`
        : null);

    if (fileField) {
      const matchedByField = files.find((file) => file.fieldname === fileField);
      if (matchedByField) {
        return matchedByField;
      }
    }

    const expectedOriginalName = command.file_name || command.fileName || command.name;
    if (!expectedOriginalName) {
      return undefined;
    }

    return files.find((file) => file.originalname === expectedOriginalName);
  }

  private resolveExtension(
    command: AttachmentCommand,
    uploadedFile: UploadedAttachmentFile | undefined,
    fileName: string,
    existing?: AttachmentRecord,
  ) {
    return (
      path.extname(uploadedFile?.filename || fileName).replace('.', '') ||
      command.file_extension ||
      command.extension ||
      existing?.fileExtension ||
      null
    );
  }

  private isSameValue(a: string | null | undefined, b: string | null | undefined) {
    return (a || null) === (b || null);
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
