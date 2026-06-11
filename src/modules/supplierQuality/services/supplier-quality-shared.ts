import { v4 as uuidv4 } from 'uuid';
import type {
  SupplierQualityCcRow,
  SupplierQualityDetailRow,
  SupplierQualityHeaderRow,
} from '../supplier-quality.repository.js';
import type { SupplierQualityRecordInput } from '../supplier-quality.schema.js';
import {
  buildSupplierQualityWorkflowMetadata,
  getSupplierQualityCompatibilityStatus,
  type SupplierQualityWorkflowRecordLike,
} from '../workflow/supplier-quality-workflow.js';

export type SupplierQualityActorContext = {
  userId?: string | null;
  roleName?: string | null;
};

export type SupplierQualityUploadedFile = {
  filename: string;
  originalname: string;
  mimetype?: string;
  path?: string;
};

export const DETAIL_TYPE_MAP = {
  larWorstRows: 1,
  larWorstKeyPartsRows: 2,
  larWorstMechanicalRows: 3,
  larWorstOtherRows: 5,
} as const;

export function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

export function toIsoDateTime(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function normalizeKeyword(value: string | undefined) {
  return String(value || '').trim().toLowerCase();
}

export function parseReportingMonth(frequency: number, periodLabel?: string | null) {
  const normalized = String(periodLabel || '').trim().toUpperCase();
  if (!normalized) {
    return 1;
  }

  if (frequency === 2) {
    if (normalized.includes('2') || normalized.includes('B') || normalized.includes('SECOND')) {
      return 2;
    }
    return 1;
  }

  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }

  const monthNames = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ];
  const index = monthNames.findIndex((name) => normalized.includes(name) || normalized.includes(name.slice(0, 3)));
  return index >= 0 ? index + 1 : 1;
}

export function buildPeriodLabel(reportType: number, month: number, fiscalYear: number) {
  if (reportType === 2) {
    return `${month === 2 ? 'Semester B' : 'Semester A'} ${fiscalYear}`;
  }

  const baseDate = new Date(Date.UTC(fiscalYear, Math.max(month - 1, 0), 1));
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(baseDate);
  return `${monthLabel} ${fiscalYear}`;
}

export function groupDetails(rows: SupplierQualityDetailRow[]) {
  return {
    larWorstRows: rows.filter((row) => row.detail_type === 1),
    larWorstKeyPartsRows: rows.filter((row) => row.detail_type === 2),
    larWorstMechanicalRows: rows.filter((row) => row.detail_type === 3),
    larWorstOtherRows: rows.filter((row) => row.detail_type === 5),
  };
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

export function buildSupplierQualityRecordView(
  header: SupplierQualityHeaderRow,
  details: SupplierQualityDetailRow[],
  ccRows: SupplierQualityCcRow[],
  actor?: SupplierQualityActorContext,
) {
  const workflow = buildSupplierQualityWorkflowMetadata(header, actor);
  const grouped = groupDetails(details);
  const status = getSupplierQualityCompatibilityStatus(header.request_status, header);
  const periodLabel = buildPeriodLabel(header.report_type, header.month, header.fiscal_year);
  const hasAttachment = Boolean(String(header.file_name || '').trim());

  return {
    id: header.sqpr_lar_id,
    branch: 'LAR_DPPM',
    controlNo: header.control_no,
    status,
    createdAt: toIsoDateTime(header.date_created) || '',
    updatedAt: toIsoDateTime(header.last_update) || '',
    createdBy: header.incharge_id,
    createdByName: header.incharge_name || undefined,
    issuedDate: toIsoDate(header.submit_date) || '',
    siteName: header.site_name || undefined,
    fiscalYear: header.fiscal_year,
    frequency: header.report_type,
    workflowStageLabel: workflow.workflowStageLabel,
    nextApproverId: workflow.nextApproverId || undefined,
    nextApproverName: workflow.nextApproverName || undefined,
    mainDetails: {
      siteId: header.site_id,
      siteName: header.site_name || undefined,
      supplierId: '',
      attentionId: '',
      attention: '',
      fiscalYear: header.fiscal_year,
      frequency: header.report_type,
      month: header.month,
      periodLabel,
      remarks: header.remarks || '',
    },
    coverPageAttachments: hasAttachment
      ? [
          {
            id: header.file_id,
            fileName: header.file_name,
            fileExtension: header.file_extension || undefined,
            attachmentType: 'COVER',
          },
        ]
      : [],
    appendixAttachments: [],
    ccList: ccRows.map((row) => ({
      id: row.sqpr_lar_cc_id,
      userId: row.user_id,
      fullName: row.full_name || undefined,
      email: row.email || undefined,
    })),
    approval: {
      issuer: {
        userId: header.incharge_id,
        name: header.incharge_name || undefined,
        date: toIsoDateTime(header.submit_date),
        remarks: header.incharge_remarks || '',
        status: mapApprovalStatus(status, 'issuer', Boolean(header.submit_date)),
      },
      checker: {
        userId: header.checker_id || '',
        name: header.checker_name || undefined,
        date: toIsoDateTime(header.checker_date),
        remarks: header.checker_remarks || '',
        status: mapApprovalStatus(status, 'checker', Boolean(header.checker_date)),
      },
      approver: {
        userId: header.approver_id || '',
        name: header.approver_name || undefined,
        date: toIsoDateTime(header.approver_date),
        remarks: header.approver_remarks || '',
        status: mapApprovalStatus(status, 'approver', Boolean(header.approver_date)),
      },
    },
    larSummaryRemarks: header.worst_lar_remarks || '',
    larDppmSummaryRemarks: header.worst_dppm_remarks || '',
    larWorstRows: grouped.larWorstRows.map((row) => ({
      id: row.sqpr_lar_detail_id,
      detailType: row.detail_type,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || undefined,
      value: Number(row.value || 0),
      remarks: row.remarks || '',
    })),
    larWorstKeyPartsRows: grouped.larWorstKeyPartsRows.map((row) => ({
      id: row.sqpr_lar_detail_id,
      detailType: row.detail_type,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || undefined,
      value: Number(row.value || 0),
      remarks: row.remarks || '',
    })),
    larWorstMechanicalRows: grouped.larWorstMechanicalRows.map((row) => ({
      id: row.sqpr_lar_detail_id,
      detailType: row.detail_type,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || undefined,
      value: Number(row.value || 0),
      remarks: row.remarks || '',
    })),
    larWorstOtherRows: grouped.larWorstOtherRows.map((row) => ({
      id: row.sqpr_lar_detail_id,
      detailType: row.detail_type,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || undefined,
      value: Number(row.value || 0),
      remarks: row.remarks || '',
    })),
    availableActions: workflow.availableActions,
  };
}

export function buildDetailRows(recordId: string, payload: SupplierQualityRecordInput, userId: string, now: Date) {
  const groups = [
    ...payload.larWorstRows.map((row) => ({ ...row, detailType: DETAIL_TYPE_MAP.larWorstRows })),
    ...payload.larWorstKeyPartsRows.map((row) => ({ ...row, detailType: DETAIL_TYPE_MAP.larWorstKeyPartsRows })),
    ...payload.larWorstMechanicalRows.map((row) => ({ ...row, detailType: DETAIL_TYPE_MAP.larWorstMechanicalRows })),
    ...payload.larWorstOtherRows.map((row) => ({ ...row, detailType: DETAIL_TYPE_MAP.larWorstOtherRows })),
  ];

  return groups.map((row) => ({
    sqpr_lar_detail_id: row.id || uuidv4(),
    sqpr_lar_id: recordId,
    detail_type: row.detailType,
    supplier_id: row.supplierId,
    value: Number(row.value || 0),
    remarks: row.remarks || null,
    last_update: now,
    updateby: userId,
  }));
}

export function buildCcRows(recordId: string, payload: SupplierQualityRecordInput, userId: string, now: Date) {
  return payload.ccList.map((cc) => ({
    sqpr_lar_cc_id: cc.id || uuidv4(),
    sqpr_lar_id: recordId,
    user_id: cc.userId,
    last_update: now,
    updateby: userId,
  }));
}

export function resolveAttachmentState(
  payload: SupplierQualityRecordInput,
  files: SupplierQualityUploadedFile[],
  fallback?: { file_id: string; file_name: string; file_extension: string } | null,
) {
  const firstExisting = [...payload.coverPageAttachments, ...payload.appendixAttachments]
    .find((attachment) => attachment.id && attachment.fileName);
  const uploaded = files[0];
  if (uploaded) {
    const extension = uploaded.originalname.includes('.') ? uploaded.originalname.split('.').pop() || '' : '';
    return {
      file_id: firstExisting?.id || fallback?.file_id || uuidv4(),
      file_name: uploaded.filename,
      file_extension: extension,
    };
  }

  if (firstExisting) {
    return {
      file_id: firstExisting.id || fallback?.file_id || '',
      file_name: firstExisting.fileName || fallback?.file_name || '',
      file_extension: firstExisting.fileExtension || fallback?.file_extension || '',
    };
  }

  return {
    file_id: '',
    file_name: '',
    file_extension: '',
  };
}

export function headerLike(record: { approval?: any; status?: string; createdBy?: string }) {
  return {
    request_status: record.status,
    incharge_id: record.approval?.issuer?.userId || record.createdBy,
    checker_id: record.approval?.checker?.userId || null,
    approver_id: record.approval?.approver?.userId || null,
  } as SupplierQualityWorkflowRecordLike;
}
