import { v4 as uuidv4 } from 'uuid';
import { deleteResponse, successResponse } from '../../shared/utils/api-response.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';
import { ForbiddenError, NotFoundError, ConflictError } from '../../shared/errors/AppError.js';
import {
  buildSupplierQualityWorkflowMetadata,
  getSupplierQualityCompatibilityStatus,
  getSupplierQualityStageOwnerId,
  normalizeSupplierQualityWorkflowStage,
  type SupplierQualityWorkflowRecordLike,
} from './workflow/supplier-quality-workflow.js';
import { supplierQualityRepository, type SupplierQualityCcRow, type SupplierQualityDetailRow, type SupplierQualityHeaderRow } from './supplier-quality.repository.js';
import type { SupplierQualityListQuery, SupplierQualityRecordInput } from './supplier-quality.schema.js';

type UploadedFile = {
  filename: string;
  originalname: string;
  mimetype?: string;
  path?: string;
};

const DETAIL_TYPE_MAP = {
  larWorstRows: 1,
  larWorstKeyPartsRows: 2,
  larWorstMechanicalRows: 3,
  larWorstOtherRows: 5,
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

function normalizeKeyword(value: string | undefined) {
  return String(value || '').trim().toLowerCase();
}

function parseReportingMonth(frequency: number, periodLabel?: string | null) {
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

function buildPeriodLabel(reportType: number, month: number, fiscalYear: number) {
  if (reportType === 2) {
    return `${month === 2 ? 'Semester B' : 'Semester A'} ${fiscalYear}`;
  }

  const baseDate = new Date(Date.UTC(fiscalYear, Math.max(month - 1, 0), 1));
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(baseDate);
  return `${monthLabel} ${fiscalYear}`;
}

function groupDetails(rows: SupplierQualityDetailRow[]) {
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

  if (hasDate || (compatibilityStatus === 'APPROVED' && currentRole === 'approver') || (compatibilityStatus === 'ISSUED' && currentRole !== 'issuer')) {
    return 'APPROVED';
  }

  return 'PENDING';
}

export class SupplierQualityService {
  private canReadRecord(record: SupplierQualityWorkflowRecordLike, actor?: { userId?: string | null; roleName?: string | null }) {
    if (!actor?.userId) {
      return false;
    }

    const workflow = buildSupplierQualityWorkflowMetadata(record, actor);
    if (workflow.availableActions.length > 0) {
      return true;
    }

    return [
      record.incharge_id,
      record.checker_id,
      record.approver_id,
    ].includes(actor.userId);
  }

  private ensureOwner(record: SupplierQualityWorkflowRecordLike, actorUserId: string, message: string) {
    const ownerId = getSupplierQualityStageOwnerId(record);
    if (!ownerId || ownerId !== actorUserId) {
      throw new ForbiddenError(message);
    }
  }

  private async hydrateRecord(
    header: SupplierQualityHeaderRow,
    details: SupplierQualityDetailRow[],
    ccRows: SupplierQualityCcRow[],
    actor?: { userId?: string | null; roleName?: string | null },
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

  private buildDetailRows(recordId: string, payload: SupplierQualityRecordInput, userId: string, now: Date) {
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

  private buildCcRows(recordId: string, payload: SupplierQualityRecordInput, userId: string, now: Date) {
    return payload.ccList.map((cc) => ({
      sqpr_lar_cc_id: cc.id || uuidv4(),
      sqpr_lar_id: recordId,
      user_id: cc.userId,
      last_update: now,
      updateby: userId,
    }));
  }

  private resolveAttachmentState(payload: SupplierQualityRecordInput, files: UploadedFile[], fallback?: { file_id: string; file_name: string; file_extension: string }) {
    const uploaded = files[0];
    if (uploaded) {
      const extension = uploaded.originalname.includes('.') ? uploaded.originalname.split('.').pop() || '' : '';
      return {
        file_id: uuidv4(),
        file_name: uploaded.filename,
        file_extension: extension,
      };
    }

    const firstExisting = [...payload.coverPageAttachments, ...payload.appendixAttachments]
      .find((attachment) => attachment.id && attachment.fileName);
    if (firstExisting) {
      return {
        file_id: firstExisting.id || fallback?.file_id || uuidv4(),
        file_name: firstExisting.fileName || fallback?.file_name || '',
        file_extension: firstExisting.fileExtension || fallback?.file_extension || '',
      };
    }

    return fallback || {
      file_id: '',
      file_name: '',
      file_extension: '',
    };
  }

  private matchesStatus(recordStatus: string, filterStatus?: string) {
    if (!filterStatus || filterStatus === 'all') {
      return true;
    }

    const expected = filterStatus
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    return expected.length === 0 || expected.includes(String(recordStatus || '').trim().toUpperCase());
  }

  async list(actor: { userId?: string | null; roleName?: string | null }, query: SupplierQualityListQuery = {}) {
    const headers = await supplierQualityRepository.findAllHeaders();
    const details = await supplierQualityRepository.findDetailsByRecordIds(headers.map((row) => row.sqpr_lar_id));
    const ccRows = await supplierQualityRepository.findCcByRecordIds(headers.map((row) => row.sqpr_lar_id));
    const detailsByRecord = new Map<string, SupplierQualityDetailRow[]>();
    const ccByRecord = new Map<string, SupplierQualityCcRow[]>();

    for (const row of details) {
      detailsByRecord.set(row.sqpr_lar_id, [...(detailsByRecord.get(row.sqpr_lar_id) || []), row]);
    }
    for (const row of ccRows) {
      ccByRecord.set(row.sqpr_lar_id, [...(ccByRecord.get(row.sqpr_lar_id) || []), row]);
    }

    const keyword = normalizeKeyword(query.keyword);
    const fiscalYearFilter = query.fiscalYear ? Number(query.fiscalYear) : undefined;
    const frequencyFilter = query.frequency ? Number(query.frequency) : undefined;

    const records = await Promise.all(headers.map(async (header) =>
      this.hydrateRecord(
        header,
        detailsByRecord.get(header.sqpr_lar_id) || [],
        ccByRecord.get(header.sqpr_lar_id) || [],
        actor,
      ),
    ));

    return records.filter((record) => {
      if (!this.canReadRecord(headerLike(record), actor)) {
        return false;
      }

      if (query.scope === 'assigned' && (!Array.isArray(record.availableActions) || record.availableActions.length === 0)) {
        return false;
      }

      if (!this.matchesStatus(String(record.status || ''), query.status)) {
        return false;
      }

      if (query.siteId && record.mainDetails?.siteId !== query.siteId) {
        return false;
      }

      if (fiscalYearFilter && Number(record.mainDetails?.fiscalYear) !== fiscalYearFilter) {
        return false;
      }

      if (frequencyFilter && Number(record.mainDetails?.frequency) !== frequencyFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        record.controlNo,
        record.mainDetails?.siteName,
        record.mainDetails?.periodLabel,
        record.mainDetails?.remarks,
        record.larSummaryRemarks,
        record.larDppmSummaryRemarks,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }

  async getById(id: string, actor: { userId?: string | null; roleName?: string | null }) {
    const header = await supplierQualityRepository.findHeaderById(id);
    if (!header) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    if (!this.canReadRecord(header, actor)) {
      throw new ForbiddenError('You do not have access to this Supplier Quality record.');
    }

    const details = await supplierQualityRepository.findDetailsByRecordIds([header.sqpr_lar_id]);
    const ccRows = await supplierQualityRepository.findCcByRecordIds([header.sqpr_lar_id]);
    return await this.hydrateRecord(header, details, ccRows, actor);
  }

  async create(payload: SupplierQualityRecordInput, userId: string, files: UploadedFile[] = []) {
    const now = new Date();
    const recordId = payload.id || uuidv4();
    const site = await supplierQualityRepository.findSiteCode(payload.mainDetails.siteId);
    if (!site?.site_code) {
      throw new NotFoundError('Unable to resolve site code for Supplier Quality record.');
    }

    const reportType = Number(payload.mainDetails.frequency || 1);
    const month = parseReportingMonth(reportType, payload.mainDetails.periodLabel);
    const controlNo = payload.controlNo && payload.controlNo !== 'TMP'
      ? payload.controlNo
      : controlNumberService.buildSupplierQualityDraft({
          fiscalYear: payload.mainDetails.fiscalYear,
          reportType,
          month,
          siteCode: site.site_code,
        });

    if (await supplierQualityRepository.controlNoExists(controlNo)) {
      throw new ConflictError(`Supplier Quality control number already exists: ${controlNo}`);
    }

    const attachment = this.resolveAttachmentState(payload, files);
    const inchargeId = payload.approval.issuer.userId || userId;

    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.insertRecord(trx, {
        sqpr_lar_id: recordId,
        control_no: controlNo,
        site_id: payload.mainDetails.siteId,
        fiscal_year: payload.mainDetails.fiscalYear,
        report_type: reportType,
        month,
        file_id: attachment.file_id,
        file_name: attachment.file_name,
        file_extension: attachment.file_extension,
        remarks: payload.mainDetails.remarks || null,
        date_created: now,
        worst_lar_remarks: payload.larSummaryRemarks || null,
        worst_dppm_remarks: payload.larDppmSummaryRemarks || null,
        incharge_id: inchargeId,
        incharge_remarks: payload.approval.issuer.remarks || null,
        submit_date: null,
        checker_id: payload.approval.checker.userId || null,
        checker_remarks: payload.approval.checker.remarks || null,
        checker_date: null,
        approver_id: payload.approval.approver.userId || null,
        approver_remarks: payload.approval.approver.remarks || null,
        approver_date: null,
        request_status: '2',
        last_update: now,
        updateby: userId,
      });

      await supplierQualityRepository.replaceDetails(
        trx,
        recordId,
        this.buildDetailRows(recordId, payload, userId, now),
      );
      await supplierQualityRepository.replaceCc(
        trx,
        recordId,
        this.buildCcRows(recordId, payload, userId, now),
      );
    });

    return await this.getById(recordId, { userId, roleName: null });
  }

  async update(id: string, payload: SupplierQualityRecordInput, actor: { userId?: string | null; roleName?: string | null }, files: UploadedFile[] = []) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);
    if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
      throw new ForbiddenError('Only draft or rejected Supplier Quality records can be updated.');
    }

    this.ensureOwner(existing, actor.userId || '', 'Only the assigned issuer can update this Supplier Quality record.');

    const now = new Date();
    const reportType = Number(payload.mainDetails.frequency || existing.report_type || 1);
    const month = parseReportingMonth(reportType, payload.mainDetails.periodLabel);
    const attachment = this.resolveAttachmentState(payload, files, {
      file_id: existing.file_id,
      file_name: existing.file_name,
      file_extension: existing.file_extension,
    });

    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
        site_id: payload.mainDetails.siteId,
        fiscal_year: payload.mainDetails.fiscalYear,
        report_type: reportType,
        month,
        file_id: attachment.file_id,
        file_name: attachment.file_name,
        file_extension: attachment.file_extension,
        remarks: payload.mainDetails.remarks || null,
        worst_lar_remarks: payload.larSummaryRemarks || null,
        worst_dppm_remarks: payload.larDppmSummaryRemarks || null,
        incharge_remarks: payload.approval.issuer.remarks || null,
        checker_id: payload.approval.checker.userId || null,
        checker_remarks: payload.approval.checker.remarks || null,
        approver_id: payload.approval.approver.userId || null,
        approver_remarks: payload.approval.approver.remarks || null,
        last_update: now,
        updateby: actor.userId || 'SYSTEM',
      });

      await supplierQualityRepository.replaceDetails(
        trx,
        existing.sqpr_lar_id,
        this.buildDetailRows(existing.sqpr_lar_id, payload, actor.userId || 'SYSTEM', now),
      );
      await supplierQualityRepository.replaceCc(
        trx,
        existing.sqpr_lar_id,
        this.buildCcRows(existing.sqpr_lar_id, payload, actor.userId || 'SYSTEM', now),
      );
    });

    return await this.getById(existing.sqpr_lar_id, actor);
  }

  async delete(id: string, actor: { userId?: string | null; roleName?: string | null }) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);
    if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
      throw new ForbiddenError('Only draft or rejected Supplier Quality records can be deleted.');
    }

    this.ensureOwner(existing, actor.userId || '', 'Only the assigned issuer can delete this Supplier Quality record.');

    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.deleteRecordTree(trx, existing.sqpr_lar_id);
    });

    return deleteResponse(existing.sqpr_lar_id);
  }

  async transition(
    id: string,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue',
    actor: { userId: string; roleId?: string | null; remarks?: string | undefined },
  ) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const now = new Date();
    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);

    await supplierQualityRepository.executeTransaction(async (trx) => {
      if (action === 'submit') {
        if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
          throw new ForbiddenError('Only draft or rejected Supplier Quality records can be submitted.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned issuer can submit this Supplier Quality record.');

        await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
          control_no: controlNumberService.finalizeSupplierQuality(existing.control_no),
          submit_date: now,
          incharge_remarks: actor.remarks ?? existing.incharge_remarks,
          request_status: '3',
          last_update: now,
          updateby: actor.userId,
        });
      } else if (action === 'check') {
        if (stage !== 'CHECKER') {
          throw new ForbiddenError('Only records awaiting check can be checked.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned checker can check this Supplier Quality record.');
        await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
          checker_remarks: actor.remarks ?? existing.checker_remarks,
          checker_date: now,
          request_status: '4',
          last_update: now,
          updateby: actor.userId,
        });
      } else if (action === 'approve') {
        if (stage !== 'APPROVER') {
          throw new ForbiddenError('Only records awaiting approval can be approved.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned approver can approve this Supplier Quality record.');
        await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
          approver_remarks: actor.remarks ?? existing.approver_remarks,
          approver_date: now,
          request_status: '10',
          last_update: now,
          updateby: actor.userId,
        });
      } else if (action === 'reject') {
        if (stage === 'CHECKER') {
          this.ensureOwner(existing, actor.userId, 'Only the assigned checker can reject this Supplier Quality record.');
          await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
            checker_remarks: actor.remarks ?? existing.checker_remarks,
            request_status: '5',
            last_update: now,
            updateby: actor.userId,
          });
        } else if (stage === 'APPROVER') {
          this.ensureOwner(existing, actor.userId, 'Only the assigned approver can reject this Supplier Quality record.');
          await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
            approver_remarks: actor.remarks ?? existing.approver_remarks,
            request_status: '6',
            last_update: now,
            updateby: actor.userId,
          });
        } else {
          throw new ForbiddenError('Only records awaiting check or approval can be rejected.');
        }
      } else if (action === 'issue') {
        if (stage !== 'ISSUER') {
          throw new ForbiddenError('Only approved Supplier Quality records can be issued.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned issuer can issue this Supplier Quality record.');
        await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
          request_status: '1',
          last_update: now,
          updateby: actor.userId,
        });
      }
    });

    const record = await this.getById(existing.sqpr_lar_id, { userId: actor.userId, roleName: null });
    return successResponse(record);
  }

  async downloadAttachment(attachmentId: string, actor: { userId?: string | null; roleName?: string | null }) {
    const owner = await supplierQualityRepository.findAttachmentOwner(attachmentId);
    if (!owner?.sqpr_lar_id) {
      throw new NotFoundError('Supplier Quality attachment not found');
    }

    const header = await supplierQualityRepository.findHeaderById(owner.sqpr_lar_id);
    if (!header) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    if (!this.canReadRecord(header, actor)) {
      throw new ForbiddenError('You do not have access to this Supplier Quality attachment.');
    }

    return await attachmentService.downloadAttachment('supplier-quality-main', attachmentId);
  }
}

function headerLike(record: { approval?: any; status?: string; createdBy?: string }) {
  return {
    request_status: record.status,
    incharge_id: record.approval?.issuer?.userId || record.createdBy,
    checker_id: record.approval?.checker?.userId || null,
    approver_id: record.approval?.approver?.userId || null,
  } as SupplierQualityWorkflowRecordLike;
}

export const supplierQualityService = new SupplierQualityService();
