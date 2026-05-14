import { randomUUID } from 'crypto';
import type { AttachmentCommand, UploadedAttachmentFile } from '../../../shared/services/attachment.service.js';
import type { SpcTrendAttachmentRow, SpcTrendHeaderRow } from '../spc-trend.repository.js';
import type { SpcTrendRecordInput } from '../spc-trend.schema.js';
import {
  buildSpcTrendWorkflowMetadata,
  getSpcTrendCompatibilityStatus,
  type SpcTrendWorkflowRecordLike,
} from '../workflow/spc-trend-workflow.js';

export type SpcTrendActorContext = {
  userId?: string | null;
  roleName?: string | null;
};

export type SpcTrendUploadedFile = Omit<Pick<UploadedAttachmentFile, 'fieldname' | 'filename' | 'originalname' | 'mimetype' | 'path' | 'size'>, 'fieldname'> & {
  fieldname?: string;
};

export const SPC_TREND_ATTACHMENT_RECORD_CONFIG = {
  tableName: 'SPC_ATTACHMENT',
  ownerColumn: 'spc_id',
  idColumn: 'spc_attachment_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

function toIsoDateTime(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function parseIsoDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function normalizeKeyword(value: string | undefined) {
  return String(value || '').trim().toLowerCase();
}

function mapApprovalStatus(
  compatibilityStatus: string,
  currentRole: 'issuer' | 'checker' | 'approver',
  hasDate: boolean,
) {
  if (compatibilityStatus === 'REJECTED' && currentRole !== 'issuer') {
    return 'REJECTED';
  }

  if (
    hasDate
    || (compatibilityStatus === 'APPROVED' && currentRole === 'approver')
    || (compatibilityStatus === 'ISSUED' && currentRole !== 'issuer')
  ) {
    return 'APPROVED';
  }

  return 'PENDING';
}

export function mapAttachmentView(row: SpcTrendAttachmentRow) {
  return {
    attachmentId: row.spc_attachment_id,
    fileName: row.file_name,
    fileExtension: row.file_extension || undefined,
    fileUrl: `/api/spc-trend/attachments/${row.spc_attachment_id}`,
  };
}

export function mapAttachmentViews(rows: SpcTrendAttachmentRow[]) {
  return rows
    .slice()
    .sort((left, right) => new Date(String(right.last_update)).getTime() - new Date(String(left.last_update)).getTime())
    .map(mapAttachmentView);
}

export function mapAttachmentCleanupQueue(rows: SpcTrendAttachmentRow[]) {
  return rows.map((row) => ({
    fileName: row.file_name,
  }));
}

export function buildSpcTrendRecordView(
  header: SpcTrendHeaderRow,
  attachmentRows: SpcTrendAttachmentRow[],
  actor?: SpcTrendActorContext,
) {
  const workflow = buildSpcTrendWorkflowMetadata(header, actor);
  const status = getSpcTrendCompatibilityStatus(header.request_status, header);
  const attachments = mapAttachmentViews(attachmentRows);
  const attachment = attachments[0] || null;

  return {
    id: header.spc_id,
    controlNo: header.control_no,
    status,
    uploadDate: toIsoDate(header.upload_date) || '',
    createdAt: toIsoDateTime(header.upload_date) || '',
    updatedAt: toIsoDateTime(header.last_update) || '',
    createdBy: header.incharge_id,
    createdByName: header.incharge_name || undefined,
    workflowStageLabel: workflow.workflowStageLabel,
    attachmentCount: attachments.length,
    attachments,
    attachment,
    mainDetails: {
      siteId: header.site_id,
      siteCode: header.site_code || undefined,
      siteName: header.site_name || undefined,
      supplierId: header.supplier_id,
      supplierName: header.supplier_name || undefined,
      supplierInchargeId: header.supplier_incharge_id || '',
      supplierInchargeName: header.supplier_incharge_name || undefined,
      partId: header.part_id,
      partCode: header.part_code || undefined,
      partName: header.part_name || undefined,
      remarks: header.remarks || '',
    },
    approval: {
      issuer: {
        userId: header.issuer_id || header.incharge_id,
        name: header.issuer_name || header.incharge_name || undefined,
        remarks: header.issuer_remarks || '',
        date: toIsoDateTime(header.submit_date),
        status: mapApprovalStatus(status, 'issuer', Boolean(header.submit_date)),
      },
      checker: {
        userId: header.checker_id || '',
        name: header.checker_name || undefined,
        remarks: header.checker_remarks || '',
        date: toIsoDateTime(header.checked_at),
        status: mapApprovalStatus(status, 'checker', Boolean(header.checked_at)),
      },
      approver: {
        userId: header.approver_id || '',
        name: header.approver_name || undefined,
        remarks: header.approver_remarks || '',
        date: toIsoDateTime(header.approved_at),
        status: mapApprovalStatus(status, 'approver', Boolean(header.approved_at)),
      },
    },
    availableActions: workflow.availableActions,
  };
}

export function headerLike(record: {
  approval?: any;
  status?: string;
  createdBy?: string;
}) {
  return {
    request_status: record.status,
    incharge_id: record.approval?.issuer?.userId || record.createdBy,
    checker_id: record.approval?.checker?.userId || null,
    approver_id: record.approval?.approver?.userId || null,
  } as SpcTrendWorkflowRecordLike;
}

export function buildSingleAttachmentCommands(
  payload: SpcTrendRecordInput,
  files: SpcTrendUploadedFile[],
): AttachmentCommand[] {
  const file = files[0];
  const attachment = payload.attachment;

  if (!attachment && !file) {
    return [];
  }

  if (attachment?.action === 'delete') {
    return attachment.attachmentId
      ? [{ id: attachment.attachmentId, attachmentId: attachment.attachmentId, action: 'delete' }]
      : [];
  }

  if (!attachment && file) {
    const attachmentId = randomUUID();
    return [{
      id: attachmentId,
      attachmentId,
      fileName: file.originalname,
      action: 'add',
      fileField: file.fieldname || 'files',
    }];
  }

  if (!attachment) {
    return [];
  }

  const attachmentId = attachment.attachmentId || randomUUID();
  return [{
    id: attachmentId,
    attachmentId,
    fileName: attachment.fileName,
    file_extension: attachment.fileExtension || null,
    action: attachment.action || (file ? 'add' : 'existing'),
    fileField: file?.fieldname || 'files',
  }];
}
