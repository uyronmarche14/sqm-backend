import fs from 'fs/promises';
import path from 'path';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { isAdminRole } from '../../shared/utils/admin.utils.js';
import { supplierInformationRepository, type SupplierInformationRow } from './supplier-information.repository.js';

export interface SupplierInformationRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  siteId?: string;
  siteName?: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  description: string;
  attachmentId: string;
  attachmentName: string;
  attachmentExtension: string;
  attachmentUrl?: string;
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SupplierInformationAttachmentDownload {
  filePath: string;
  fileName: string;
  mimeType: string;
}

function toBooleanFlag(value: boolean | number | null | undefined) {
  return value === true || value === 1;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildFullName(row: Pick<SupplierInformationRow, 'first_name' | 'middle_name' | 'last_name'>) {
  return [row.first_name, row.middle_name, row.last_name]
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .join(' ');
}

function getMimeType(extension: string) {
  switch (extension.replace(/^\./, '').toLowerCase()) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function buildAttachmentUrl(attachmentId: string) {
  return attachmentId ? `/api/supplier-information/attachments/${attachmentId}` : undefined;
}

function sanitizePathToken(value: string) {
  return value
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '');
}

function sanitizeDownloadName(fileName: string) {
  return sanitizePathToken(path.basename(fileName));
}

function normalizeAttachmentExtension(extension: string) {
  const sanitized = sanitizePathToken(extension.replace(/^\./, ''));
  return sanitized ? `.${sanitized}` : '';
}

export function mapSupplierInformationRecord(row: SupplierInformationRow): SupplierInformationRecord {
  const attachmentId = normalizeString(row.attachment_id);
  const attachmentName = normalizeString(row.attachment_name);
  const attachmentExtension = normalizeString(row.attachment_extension);

  return {
    id: row.supplier_information_id,
    supplierId: row.supplier_id,
    supplierName: normalizeString(row.supplier_name),
    siteId: normalizeString(row.site_id) || undefined,
    siteName: normalizeString(row.site_name) || undefined,
    firstName: normalizeString(row.first_name),
    middleName: normalizeString(row.middle_name),
    lastName: normalizeString(row.last_name),
    fullName: buildFullName(row),
    description: normalizeString(row.supplier_information_desc),
    attachmentId,
    attachmentName,
    attachmentExtension,
    attachmentUrl: buildAttachmentUrl(attachmentId),
    isActive: toBooleanFlag(row.active_flag),
    updatedAt: row.last_update ? new Date(row.last_update).toISOString() : undefined,
    updatedBy: normalizeString(row.updateby) || undefined,
  };
}

function getAttachmentDirectories() {
  const cwd = process.cwd();
  return [
    path.resolve(cwd, 'uploads/supplier-information'),
    path.resolve(cwd, 'uploads/supplier-information/attachments'),
    path.resolve(cwd, '../SQM_New/SQM/SQM_Attachment/SUPPLIER_INFORMATION'),
    path.resolve(cwd, 'SQM_New/SQM/SQM_Attachment/SUPPLIER_INFORMATION'),
  ];
}

async function findAttachmentPath(fileName: string) {
  const directories = getAttachmentDirectories();
  const safeFileName = sanitizeDownloadName(fileName);
  if (!safeFileName) {
    return null;
  }

  for (const directory of directories) {
    const candidate = path.join(directory, safeFileName);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next candidate path.
    }
  }

  return null;
}

export class SupplierInformationService {
  private async resolveAccessibleSupplierIds(userId: string | undefined): Promise<string[] | null> {
    if (!userId) {
      return [];
    }

    const roleName = await supplierInformationRepository.findActorRoleName(userId);
    if (isAdminRole(roleName)) {
      return null;
    }

    return supplierInformationRepository.findSupplierIdsByUserId(userId);
  }

  private isRecordAccessible(row: SupplierInformationRow, accessibleSupplierIds: string[] | null): boolean {
    if (accessibleSupplierIds === null) {
      return true;
    }

    return accessibleSupplierIds.includes(row.supplier_id);
  }

  async list(userId?: string) {
    const accessibleSupplierIds = await this.resolveAccessibleSupplierIds(userId);
    const rows = await supplierInformationRepository.findAllActive();
    const filtered = accessibleSupplierIds === null
      ? rows
      : rows.filter((r) => accessibleSupplierIds.includes(r.supplier_id));
    return filtered.map(mapSupplierInformationRecord);
  }

  async listBySupplier(supplierId: string, userId?: string) {
    const accessibleSupplierIds = await this.resolveAccessibleSupplierIds(userId);
    if (accessibleSupplierIds !== null && !accessibleSupplierIds.includes(supplierId)) {
      return [];
    }

    const rows = await supplierInformationRepository.findActiveBySupplier(supplierId);
    const filtered = accessibleSupplierIds === null
      ? rows
      : rows.filter((r) => accessibleSupplierIds.includes(r.supplier_id));
    return filtered.map(mapSupplierInformationRecord);
  }

  async getById(id: string, userId?: string) {
    const row = await supplierInformationRepository.findById(id);
    if (!row || !toBooleanFlag(row.active_flag)) {
      throw new NotFoundError('Supplier information record not found');
    }

    const accessibleSupplierIds = await this.resolveAccessibleSupplierIds(userId);
    if (!this.isRecordAccessible(row, accessibleSupplierIds)) {
      throw new NotFoundError('Supplier information record not found');
    }

    return mapSupplierInformationRecord(row);
  }

  async search(rawKeyword: string, userId?: string) {
    const keyword = normalizeString(rawKeyword).toLowerCase();
    if (!keyword) {
      return [];
    }

    const accessibleSupplierIds = await this.resolveAccessibleSupplierIds(userId);
    const rows = await supplierInformationRepository.searchActive(keyword);
    const filtered = accessibleSupplierIds === null
      ? rows
      : rows.filter((r) => accessibleSupplierIds.includes(r.supplier_id));
    return filtered.map(mapSupplierInformationRecord);
  }

  async downloadAttachment(attachmentId: string, userId?: string): Promise<SupplierInformationAttachmentDownload> {
    const row = await supplierInformationRepository.findByAttachmentId(attachmentId);
    if (!row || !toBooleanFlag(row.active_flag)) {
      throw new NotFoundError('Supplier information attachment not found');
    }

    const accessibleSupplierIds = await this.resolveAccessibleSupplierIds(userId);
    if (!this.isRecordAccessible(row, accessibleSupplierIds)) {
      throw new NotFoundError('Supplier information attachment not found');
    }

    const attachmentIdBase = sanitizePathToken(normalizeString(row.attachment_id));
    const attachmentExtension = normalizeAttachmentExtension(normalizeString(row.attachment_extension));
    const attachmentName = sanitizeDownloadName(normalizeString(row.attachment_name));
    const fileName = attachmentIdBase
      ? `${attachmentIdBase}${attachmentExtension}`
      : attachmentName;
    const originalName = attachmentName || fileName;

    if (!fileName) {
      throw new NotFoundError('Supplier information attachment file name is missing');
    }

    const filePath = await findAttachmentPath(fileName);
    if (!filePath) {
      throw new NotFoundError('Supplier information attachment file was not found on disk');
    }

    return {
      filePath,
      fileName: originalName,
      mimeType: getMimeType(normalizeString(row.attachment_extension)),
    };
  }
}

export const supplierInformationService = new SupplierInformationService();
