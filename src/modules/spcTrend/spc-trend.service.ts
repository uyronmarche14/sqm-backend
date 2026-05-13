import { randomUUID } from 'crypto';
import { attachmentService } from '../../shared/services/attachment.service.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
import { deleteResponse, successResponse } from '../../shared/utils/api-response.js';
import {
  buildSpcTrendWorkflowMetadata,
  getSpcTrendCompatibilityStatus,
  getSpcTrendStageOwnerId,
  normalizeSpcTrendWorkflowStage,
  type SpcTrendWorkflowRecordLike,
} from './workflow/spc-trend-workflow.js';
import {
  spcTrendRepository,
  type SpcTrendAttachmentRow,
  type SpcTrendHeaderRow,
} from './spc-trend.repository.js';
import type { SpcTrendListQuery, SpcTrendRecordInput } from './spc-trend.schema.js';

type UploadedFile = {
  filename: string;
  originalname: string;
  mimetype?: string;
  path?: string;
};

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

function parseIsoDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeKeyword(value: string | undefined) {
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

function mapPrimaryAttachment(rows: SpcTrendAttachmentRow[]) {
  const row = rows[0];
  if (!row) return null;

  return {
    attachmentId: row.spc_attachment_id,
    fileName: row.file_name,
    fileExtension: row.file_extension || undefined,
  };
}

export class SpcTrendService {
  private canReadRecord(record: SpcTrendWorkflowRecordLike, actor?: { userId?: string | null }) {
    if (!actor?.userId) {
      return false;
    }

    const workflow = buildSpcTrendWorkflowMetadata(record, actor);
    if (workflow.availableActions.length > 0) {
      return true;
    }

    return [
      record.incharge_id,
      record.checker_id,
      record.approver_id,
    ].includes(actor.userId);
  }

  private ensureOwner(record: SpcTrendWorkflowRecordLike, actorUserId: string, message: string) {
    const ownerId = getSpcTrendStageOwnerId(record);
    if (!ownerId || ownerId !== actorUserId) {
      throw new ForbiddenError(message);
    }
  }

  private async hydrateRecord(
    header: SpcTrendHeaderRow,
    attachmentRows: SpcTrendAttachmentRow[],
    actor?: { userId?: string | null },
  ) {
    const workflow = buildSpcTrendWorkflowMetadata(header, actor);
    const status = getSpcTrendCompatibilityStatus(header.request_status, header);
    const attachment = mapPrimaryAttachment(attachmentRows);

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
      attachment,
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

  private resolveAttachmentState(
    payload: SpcTrendRecordInput,
    files: UploadedFile[],
    fallback?: SpcTrendAttachmentRow | null,
  ) {
    const uploaded = files[0];
    const desiredAction = payload.attachment?.action || (uploaded ? 'add' : 'existing');

    if (desiredAction === 'delete') {
      return null;
    }

    if (uploaded) {
      const extension = uploaded.originalname.includes('.')
        ? uploaded.originalname.split('.').pop() || ''
        : '';
      return {
        spc_attachment_id: payload.attachment?.attachmentId || randomUUID(),
        file_name: uploaded.filename,
        file_extension: extension,
      };
    }

    if (payload.attachment?.attachmentId && payload.attachment?.fileName) {
      return {
        spc_attachment_id: payload.attachment.attachmentId,
        file_name: payload.attachment.fileName,
        file_extension: payload.attachment.fileExtension || null,
      };
    }

    if (fallback?.spc_attachment_id && fallback?.file_name) {
      return {
        spc_attachment_id: fallback.spc_attachment_id,
        file_name: fallback.file_name,
        file_extension: fallback.file_extension,
      };
    }

    return null;
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

  async list(actor: { userId?: string | null }, query: SpcTrendListQuery = {}) {
    const headers = await spcTrendRepository.findAllHeaders();
    const attachments = await spcTrendRepository.findAttachmentsByRecordIds(headers.map((row) => row.spc_id));
    const attachmentsByRecord = new Map<string, SpcTrendAttachmentRow[]>();

    for (const row of attachments) {
      attachmentsByRecord.set(row.spc_id, [...(attachmentsByRecord.get(row.spc_id) || []), row]);
    }

    const keyword = normalizeKeyword(query.keyword);
    const dateFrom = query.dateFrom ? parseIsoDate(query.dateFrom, new Date(0)) : null;
    const dateTo = query.dateTo ? parseIsoDate(query.dateTo, new Date('2999-12-31')) : null;

    const records = await Promise.all(headers.map(async (header) =>
      this.hydrateRecord(
        header,
        attachmentsByRecord.get(header.spc_id) || [],
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

      if (query.supplierId && record.mainDetails?.supplierId !== query.supplierId) {
        return false;
      }

      if (query.partId && record.mainDetails?.partId !== query.partId) {
        return false;
      }

      const uploadDate = record.uploadDate ? new Date(record.uploadDate) : null;
      if (dateFrom && uploadDate && uploadDate < dateFrom) {
        return false;
      }
      if (dateTo && uploadDate && uploadDate > dateTo) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        record.controlNo,
        record.mainDetails?.siteName,
        record.mainDetails?.siteCode,
        record.mainDetails?.supplierName,
        record.mainDetails?.partCode,
        record.mainDetails?.partName,
        record.mainDetails?.remarks,
        record.attachment?.fileName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }

  async getById(id: string, actor: { userId?: string | null }) {
    const header = await spcTrendRepository.findHeaderById(id);
    if (!header) {
      throw new NotFoundError('SPC Trend record not found');
    }

    if (!this.canReadRecord(header, actor)) {
      throw new ForbiddenError('You do not have access to this SPC Trend record.');
    }

    const attachments = await spcTrendRepository.findAttachmentsByRecordIds([header.spc_id]);
    return await this.hydrateRecord(header, attachments, actor);
  }

  async create(payload: SpcTrendRecordInput, userId: string, files: UploadedFile[] = []) {
    const now = new Date();
    const recordId = payload.id || randomUUID();
    const site = await spcTrendRepository.findSite(payload.mainDetails.siteId);
    if (!site?.site_code) {
      throw new NotFoundError('Unable to resolve site code for SPC Trend record.');
    }

    const uploadDate = parseIsoDate(payload.uploadDate, now);
    const controlNo = payload.controlNo && payload.controlNo !== 'TMP-SPC'
      ? payload.controlNo
      : await controlNumberService.buildSpcDraft({
          siteId: payload.mainDetails.siteId,
          siteCode: site.site_code,
          date: uploadDate,
        });

    if (await spcTrendRepository.controlNoExists(controlNo)) {
      throw new ConflictError(`SPC Trend control number already exists: ${controlNo}`);
    }

    const attachment = this.resolveAttachmentState(payload, files);
    const inchargeId = payload.approval.issuer.userId || userId;

    await spcTrendRepository.executeTransaction(async (trx) => {
      await spcTrendRepository.insertRecord(trx, {
        spc_id: recordId,
        control_no: controlNo,
        upload_date: uploadDate,
        incharge_id: inchargeId,
        site_id: payload.mainDetails.siteId,
        supplier_id: payload.mainDetails.supplierId,
        part_id: payload.mainDetails.partId,
        remarks: payload.mainDetails.remarks || null,
        submit_date: null,
        request_status: '2',
        last_update: now,
        updateby: userId,
      });

      await spcTrendRepository.upsertWorkflow(trx, recordId, {
        supplier_incharge_id: payload.mainDetails.supplierInchargeId || null,
        issuer_id: inchargeId,
        checker_id: payload.approval.checker.userId || null,
        approver_id: payload.approval.approver.userId || null,
        issuer_remarks: payload.approval.issuer.remarks || null,
        checker_remarks: payload.approval.checker.remarks || null,
        approver_remarks: payload.approval.approver.remarks || null,
        checked_at: null,
        approved_at: null,
        rejected_at: null,
        issued_at: null,
        last_action_by: userId,
        last_update: now,
        updateby: userId,
      });

      await spcTrendRepository.replaceAttachment(
        trx,
        recordId,
        attachment
          ? {
              spc_attachment_id: attachment.spc_attachment_id,
              spc_id: recordId,
              file_name: attachment.file_name,
              file_extension: attachment.file_extension,
              remarks: null,
              last_update: now,
              updateby: userId,
            }
          : null,
      );
    });

    return await this.getById(recordId, { userId });
  }

  async update(
    id: string,
    payload: SpcTrendRecordInput,
    actor: { userId?: string | null },
    files: UploadedFile[] = [],
  ) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);
    if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
      throw new ForbiddenError('Only draft or rejected SPC Trend records can be updated.');
    }

    this.ensureOwner(existing, actor.userId || '', 'Only the assigned issuer can update this SPC Trend record.');

    const attachments = await spcTrendRepository.findAttachmentsByRecordIds([existing.spc_id]);
    const currentAttachment = attachments[0] || null;
    const now = new Date();
    const uploadDate = parseIsoDate(payload.uploadDate, parseIsoDate(toIsoDate(existing.upload_date), now));
    const attachment = this.resolveAttachmentState(payload, files, currentAttachment);

    await spcTrendRepository.executeTransaction(async (trx) => {
      await spcTrendRepository.updateRecord(trx, existing.spc_id, {
        upload_date: uploadDate,
        site_id: payload.mainDetails.siteId,
        supplier_id: payload.mainDetails.supplierId,
        part_id: payload.mainDetails.partId,
        remarks: payload.mainDetails.remarks || null,
        last_update: now,
        updateby: actor.userId || 'SYSTEM',
      });

      await spcTrendRepository.upsertWorkflow(trx, existing.spc_id, {
        supplier_incharge_id: payload.mainDetails.supplierInchargeId || null,
        issuer_id: payload.approval.issuer.userId || existing.incharge_id,
        checker_id: payload.approval.checker.userId || null,
        approver_id: payload.approval.approver.userId || null,
        issuer_remarks: payload.approval.issuer.remarks || null,
        checker_remarks: payload.approval.checker.remarks || null,
        approver_remarks: payload.approval.approver.remarks || null,
        checked_at: existing.checked_at,
        approved_at: existing.approved_at,
        rejected_at: existing.rejected_at,
        issued_at: existing.issued_at,
        last_action_by: actor.userId || 'SYSTEM',
        last_update: now,
        updateby: actor.userId || 'SYSTEM',
      });

      await spcTrendRepository.replaceAttachment(
        trx,
        existing.spc_id,
        attachment
          ? {
              spc_attachment_id: attachment.spc_attachment_id,
              spc_id: existing.spc_id,
              file_name: attachment.file_name,
              file_extension: attachment.file_extension,
              remarks: null,
              last_update: now,
              updateby: actor.userId || 'SYSTEM',
            }
          : null,
      );
    });

    return await this.getById(existing.spc_id, actor);
  }

  async delete(id: string, actor: { userId?: string | null }) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);
    if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
      throw new ForbiddenError('Only draft or rejected SPC Trend records can be deleted.');
    }

    this.ensureOwner(existing, actor.userId || '', 'Only the assigned issuer can delete this SPC Trend record.');

    await spcTrendRepository.executeTransaction(async (trx) => {
      await spcTrendRepository.deleteRecordTree(trx, existing.spc_id);
    });

    return deleteResponse(existing.spc_id);
  }

  async transition(
    id: string,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue',
    actor: { userId: string; remarks?: string | undefined },
  ) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const now = new Date();
    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);

    await spcTrendRepository.executeTransaction(async (trx) => {
      if (action === 'submit') {
        if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
          throw new ForbiddenError('Only draft or rejected SPC Trend records can be submitted.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned issuer can submit this SPC Trend record.');

        await spcTrendRepository.updateRecord(trx, existing.spc_id, {
          control_no: await controlNumberService.finalizeSpc({
            siteId: existing.site_id,
            siteCode: existing.site_code,
            date: existing.upload_date,
          }, trx),
          submit_date: now,
          request_status: '3',
          last_update: now,
          updateby: actor.userId,
        });
        await spcTrendRepository.updateWorkflow(trx, existing.spc_id, {
          issuer_remarks: actor.remarks ?? existing.issuer_remarks,
          checked_at: null,
          approved_at: null,
          rejected_at: null,
          last_action_by: actor.userId,
          last_update: now,
          updateby: actor.userId,
        });
      } else if (action === 'check') {
        if (stage !== 'CHECKER') {
          throw new ForbiddenError('Only records awaiting check can be checked.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned checker can check this SPC Trend record.');

        await spcTrendRepository.updateRecord(trx, existing.spc_id, {
          request_status: '4',
          last_update: now,
          updateby: actor.userId,
        });
        await spcTrendRepository.updateWorkflow(trx, existing.spc_id, {
          checker_remarks: actor.remarks ?? existing.checker_remarks,
          checked_at: now,
          rejected_at: null,
          last_action_by: actor.userId,
          last_update: now,
          updateby: actor.userId,
        });
      } else if (action === 'approve') {
        if (stage !== 'APPROVER') {
          throw new ForbiddenError('Only records awaiting approval can be approved.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned approver can approve this SPC Trend record.');

        await spcTrendRepository.updateRecord(trx, existing.spc_id, {
          request_status: '10',
          last_update: now,
          updateby: actor.userId,
        });
        await spcTrendRepository.updateWorkflow(trx, existing.spc_id, {
          approver_remarks: actor.remarks ?? existing.approver_remarks,
          approved_at: now,
          rejected_at: null,
          last_action_by: actor.userId,
          last_update: now,
          updateby: actor.userId,
        });
      } else if (action === 'reject') {
        if (stage === 'CHECKER') {
          this.ensureOwner(existing, actor.userId, 'Only the assigned checker can reject this SPC Trend record.');
          await spcTrendRepository.updateRecord(trx, existing.spc_id, {
            request_status: '5',
            last_update: now,
            updateby: actor.userId,
          });
          await spcTrendRepository.updateWorkflow(trx, existing.spc_id, {
            checker_remarks: actor.remarks ?? existing.checker_remarks,
            rejected_at: now,
            last_action_by: actor.userId,
            last_update: now,
            updateby: actor.userId,
          });
        } else if (stage === 'APPROVER') {
          this.ensureOwner(existing, actor.userId, 'Only the assigned approver can reject this SPC Trend record.');
          await spcTrendRepository.updateRecord(trx, existing.spc_id, {
            request_status: '6',
            last_update: now,
            updateby: actor.userId,
          });
          await spcTrendRepository.updateWorkflow(trx, existing.spc_id, {
            approver_remarks: actor.remarks ?? existing.approver_remarks,
            rejected_at: now,
            last_action_by: actor.userId,
            last_update: now,
            updateby: actor.userId,
          });
        } else {
          throw new ForbiddenError('Only records awaiting check or approval can be rejected.');
        }
      } else if (action === 'issue') {
        if (stage !== 'ISSUER') {
          throw new ForbiddenError('Only approved SPC Trend records can be issued.');
        }
        this.ensureOwner(existing, actor.userId, 'Only the assigned issuer can issue this SPC Trend record.');

        await spcTrendRepository.updateRecord(trx, existing.spc_id, {
          request_status: '1',
          last_update: now,
          updateby: actor.userId,
        });
        await spcTrendRepository.updateWorkflow(trx, existing.spc_id, {
          issued_at: now,
          last_action_by: actor.userId,
          last_update: now,
          updateby: actor.userId,
        });
      }
    });

    const record = await this.getById(existing.spc_id, { userId: actor.userId });
    return successResponse(record);
  }

  async downloadAttachment(attachmentId: string, actor: { userId?: string | null }) {
    const owner = await spcTrendRepository.findAttachmentOwner(attachmentId);
    if (!owner?.spc_id) {
      throw new NotFoundError('SPC Trend attachment not found');
    }

    const header = await spcTrendRepository.findHeaderById(owner.spc_id);
    if (!header) {
      throw new NotFoundError('SPC Trend record not found');
    }

    if (!this.canReadRecord(header, actor)) {
      throw new ForbiddenError('You do not have access to this SPC Trend attachment.');
    }

    return await attachmentService.downloadAttachment('spc-trend-main', attachmentId);
  }
}

function headerLike(record: { approval?: any; status?: string; createdBy?: string }) {
  return {
    request_status: record.status,
    incharge_id: record.approval?.issuer?.userId || record.createdBy,
    checker_id: record.approval?.checker?.userId || null,
    approver_id: record.approval?.approver?.userId || null,
  } as SpcTrendWorkflowRecordLike;
}

export const spcTrendService = new SpcTrendService();
