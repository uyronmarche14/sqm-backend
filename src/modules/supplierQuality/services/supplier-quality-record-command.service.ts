import { v4 as uuidv4 } from 'uuid';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { supplierQualityRepository } from '../supplier-quality.repository.js';
import type { SupplierQualityRecordInput } from '../supplier-quality.schema.js';
import { supplierQualityAccessService } from './supplier-quality-access.service.js';
import {
  buildCcRows,
  buildDetailRows,
  parseReportingMonth,
  resolveAttachmentState,
  type SupplierQualityActorContext,
  type SupplierQualityUploadedFile,
} from './supplier-quality-shared.js';

type AttachmentState = {
  file_id: string;
  file_name: string;
  file_extension: string;
};

export class SupplierQualityRecordCommandService {
  private buildAttachmentCleanupQueue(
    existing: AttachmentState | null | undefined,
    next: AttachmentState,
    uploaded: SupplierQualityUploadedFile | undefined,
  ) {
    if (!existing?.file_name) {
      return [];
    }

    const clearedAttachment = !next.file_name;
    const replacedAttachment = Boolean(uploaded && existing.file_name !== next.file_name);

    if (!clearedAttachment && !replacedAttachment) {
      return [];
    }

    return [{ fileName: existing.file_name }];
  }

  async create(payload: SupplierQualityRecordInput, userId: string, files: SupplierQualityUploadedFile[] = []) {
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

    const attachment = resolveAttachmentState(payload, files);
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
        buildDetailRows(recordId, payload, userId, now),
      );
      await supplierQualityRepository.replaceCc(
        trx,
        recordId,
        buildCcRows(recordId, payload, userId, now),
      );
    });

    return recordId;
  }

  async update(
    id: string,
    payload: SupplierQualityRecordInput,
    actor: SupplierQualityActorContext,
    files: SupplierQualityUploadedFile[] = [],
  ) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    await supplierQualityAccessService.assertActionAccess(
      existing,
      actor,
      'update',
      'SQPRLAR-01-01',
      'Only the assigned issuer can update this Supplier Quality record.',
    );

    const now = new Date();
    const reportType = Number(payload.mainDetails.frequency || existing.report_type || 1);
    const month = parseReportingMonth(reportType, payload.mainDetails.periodLabel);
    const attachment = resolveAttachmentState(payload, files, {
      file_id: existing.file_id,
      file_name: existing.file_name,
      file_extension: existing.file_extension,
    });
    const cleanupQueue = this.buildAttachmentCleanupQueue(
      {
        file_id: existing.file_id,
        file_name: existing.file_name,
        file_extension: existing.file_extension,
      },
      attachment,
      files[0],
    );

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
        buildDetailRows(existing.sqpr_lar_id, payload, actor.userId || 'SYSTEM', now),
      );
      await supplierQualityRepository.replaceCc(
        trx,
        existing.sqpr_lar_id,
        buildCcRows(existing.sqpr_lar_id, payload, actor.userId || 'SYSTEM', now),
      );
    });

    await attachmentService.deleteStoredAttachments('supplier-quality-main', cleanupQueue);
    return existing.sqpr_lar_id;
  }

  async delete(id: string, actor: SupplierQualityActorContext) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    await supplierQualityAccessService.assertActionAccess(
      existing,
      actor,
      'delete',
      'SQPRLAR-01-01',
      'Only the assigned issuer can delete this Supplier Quality record.',
    );

    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.deleteRecordTree(trx, existing.sqpr_lar_id);
    });

    if (existing.file_name) {
      await attachmentService.deleteStoredAttachments('supplier-quality-main', [{ fileName: existing.file_name }]);
    }

    return existing.sqpr_lar_id;
  }
}

export const supplierQualityRecordCommandService = new SupplierQualityRecordCommandService();
