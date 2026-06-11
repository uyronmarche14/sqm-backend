import { randomUUID } from 'crypto';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import {
  extractOriginalFilenameMarker,
  formatAttachmentRemarks,
} from '../../../shared/utils/attachment-remarks.js';
import {
  spcTrendRepository,
} from '../spc-trend.repository.js';
import type { SpcTrendRecordInput } from '../spc-trend.schema.js';
import { spcTrendAccessService } from './spc-trend-access.service.js';
import {
  buildSingleAttachmentCommands,
  mapAttachmentCleanupQueue,
  parseIsoDate,
  SPC_TREND_ATTACHMENT_RECORD_CONFIG,
  type SpcTrendActorContext,
  type SpcTrendUploadedFile,
} from './spc-trend-shared.js';

export class SpcTrendRecordCommandService {
  private async syncAttachments(
    trx: any,
    recordId: string,
    payload: SpcTrendRecordInput,
    files: SpcTrendUploadedFile[],
    userId: string,
    now: Date,
  ) {
    const normalizedFiles = files.map((file) => ({
      ...file,
      fieldname: file.fieldname || 'files',
    }));

    return await attachmentService.syncAttachments(
      trx,
      buildSingleAttachmentCommands(payload, normalizedFiles),
      normalizedFiles,
      {
        ownerId: recordId,
        userId,
        now,
        recordConfig: SPC_TREND_ATTACHMENT_RECORD_CONFIG,
        createId: () => randomUUID(),
        remarkFormatter: ({ command, existing, originalName }) =>
          formatAttachmentRemarks(
            command.remarks ?? existing?.remarks ?? null,
            originalName,
            extractOriginalFilenameMarker(existing?.remarks),
          ),
      },
    );
  }

  async create(payload: SpcTrendRecordInput, userId: string, files: SpcTrendUploadedFile[] = []) {
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

    const inchargeId = payload.approval.issuer.userId || userId;
    const result = await spcTrendRepository.executeTransaction(async (trx) => {
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

      const attachmentSync = await this.syncAttachments(trx, recordId, payload, files, userId, now);
      return {
        recordId,
        cleanupQueue: attachmentSync.cleanupQueue,
      };
    });

    await attachmentService.deleteStoredAttachments('spc-trend-main', result.cleanupQueue);
    return result.recordId;
  }

  async update(
    id: string,
    payload: SpcTrendRecordInput,
    actor: SpcTrendActorContext,
    files: SpcTrendUploadedFile[] = [],
  ) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    await spcTrendAccessService.assertActionAccess(existing, actor, 'update');

    const now = new Date();
    const uploadDate = parseIsoDate(payload.uploadDate, parseIsoDate(String(existing.upload_date), now));

    const result = await spcTrendRepository.executeTransaction(async (trx) => {
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

      const attachmentSync = await this.syncAttachments(
        trx,
        existing.spc_id,
        payload,
        files,
        actor.userId || 'SYSTEM',
        now,
      );

      return {
        recordId: existing.spc_id,
        cleanupQueue: attachmentSync.cleanupQueue,
      };
    });

    await attachmentService.deleteStoredAttachments('spc-trend-main', result.cleanupQueue);
    return result.recordId;
  }

  async delete(id: string, actor: SpcTrendActorContext) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    await spcTrendAccessService.assertActionAccess(existing, actor, 'delete');
    const attachments = await spcTrendRepository.findAttachmentsByRecordIds([existing.spc_id]);

    await spcTrendRepository.executeTransaction(async (trx) => {
      await spcTrendRepository.deleteRecordTree(trx, existing.spc_id);
    });

    await attachmentService.deleteStoredAttachments('spc-trend-main', mapAttachmentCleanupQueue(attachments));
    return existing.spc_id;
  }
}

export const spcTrendRecordCommandService = new SpcTrendRecordCommandService();
