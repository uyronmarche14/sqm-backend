import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import {
  extractOriginalFilenameMarker,
  formatAttachmentRemarks,
} from '../../../shared/utils/attachment-remarks.js';
import { assertWorkflowRecordAccess } from '../../../shared/utils/workflow-access.js';
import { qmqaRepository } from '../qmqa.repository.js';
import { QMQARecordCreationInput, QMQARecordUpdateInput } from '../qmqa.schema.js';
import { qmqaAccessService } from './qmqa-access.service.js';
import { qmqaResponseService } from './qmqa-response.service.js';
import { sanitizeUUID } from './qmqa-module-strategy.js';

const QMQA_DUPLICATE_KEY_NUMBERS = new Set([2601, 2627]);
const QMQA_PLAN_ATTACHMENT_RECORD_CONFIG = {
  tableName: 'QMQA_PLAN_ATTACHMENT',
  ownerColumn: 'qmqa_id',
  idColumn: 'qmqa_plan_attachment_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const QMQA_RECORD_ATTACHMENT_RECORD_CONFIG = {
  tableName: 'QMQA_ATTACHMENT',
  ownerColumn: 'qmqa_id',
  idColumn: 'qmqa_attachment_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

export class QmqaRecordCommandService {
  private async syncRecordAttachments(
    trx: any,
    qmqaId: string,
    payload: Pick<QMQARecordCreationInput, 'audit_plan_attachments' | 'attachments'>
      | Pick<QMQARecordUpdateInput, 'audit_plan_attachments' | 'attachments'>,
    files: any[],
    userId: string,
    now: Date,
  ) {
    const planSync = await attachmentService.syncAttachments(
      trx,
      payload.audit_plan_attachments,
      files,
      {
        ownerId: qmqaId,
        userId,
        now,
        recordConfig: QMQA_PLAN_ATTACHMENT_RECORD_CONFIG,
        createId: () => uuidv4(),
        remarkFormatter: ({ command, existing, originalName }) =>
          formatAttachmentRemarks(
            command.remarks ?? existing?.remarks ?? null,
            originalName,
            extractOriginalFilenameMarker(existing?.remarks),
          ),
      },
    );

    const recordSync = await attachmentService.syncAttachments(
      trx,
      payload.attachments,
      files,
      {
        ownerId: qmqaId,
        userId,
        now,
        recordConfig: QMQA_RECORD_ATTACHMENT_RECORD_CONFIG,
        createId: () => uuidv4(),
        remarkFormatter: ({ command, existing, originalName }) =>
          formatAttachmentRemarks(
            command.remarks ?? existing?.remarks ?? null,
            originalName,
            extractOriginalFilenameMarker(existing?.remarks),
          ),
      },
    );

    return { planSync, recordSync };
  }

  private assertRecordControlNoInputs(payload: QMQARecordCreationInput) {
    if (!payload.site_id) {
      throw new BadRequestError('Site is required before creating an ad hoc QMQA record.');
    }

    if (!payload.audit_category_id) {
      throw new BadRequestError('Audit category is required before creating an ad hoc QMQA record.');
    }

    if (!payload.audit_plan_date && !payload.audit_date) {
      throw new BadRequestError('Audit plan date or audit date is required before creating an ad hoc QMQA record.');
    }
  }

  private getDbErrorNumber(error: unknown): number | undefined {
    const candidates = [
      (error as any)?.number,
      (error as any)?.code,
      (error as any)?.originalError?.info?.number,
      (error as any)?.originalError?.number,
      (error as any)?.cause?.number,
    ];

    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private isDuplicateControlNoError(error: unknown): boolean {
    const message = String((error as any)?.message || '');
    const errorNumber = this.getDbErrorNumber(error);

    return (
      (errorNumber !== undefined && QMQA_DUPLICATE_KEY_NUMBERS.has(errorNumber)) ||
      (message.includes('UNIQUE KEY constraint') && message.includes('duplicate key value'))
    );
  }

  async createRecord(payload: QMQARecordCreationInput, userId: string, files: any[] = []) {
    const now = new Date();
    const effectiveUserId = userId || 'SYSTEM';
    const qmqaId = uuidv4();
    const isLinkedToExistingSchedule = Boolean(payload.schedule_id);

    if (!isLinkedToExistingSchedule) {
      this.assertRecordControlNoInputs(payload);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await qmqaRepository.executeTransaction(async (trx) => {
          let auditPlanId = payload.schedule_id;
          let controlNo: string | null = null;

          if (!isLinkedToExistingSchedule || !auditPlanId) {
            auditPlanId = uuidv4();
            controlNo = await controlNumberService.buildQmqaAuditPlan(
              {
                siteId: payload.site_id,
                auditCategoryId: payload.audit_category_id,
                auditPlanDate: payload.audit_plan_date || payload.audit_date,
              },
              trx,
            );

            await trx.insertInto('QMQA_AUDIT_PLAN').values({
              qmqa_audit_plan_id: auditPlanId,
              control_no: controlNo,
              created_date: now,
              site_id: payload.site_id!,
              supplier_id: payload.supplier_id!,
              audit_category_id: payload.audit_category_id!,
              audit_plan_date: payload.audit_plan_date || now,
              sqe_pic_id: payload.sqe_pic_id!,
              remarks: null,
              request_status: 'CO',
              last_update: now,
              updateby: effectiveUserId,
            }).execute();
          } else {
            const existingPlan = await trx
              .selectFrom('QMQA_AUDIT_PLAN')
              .select(['control_no'])
              .where('qmqa_audit_plan_id', '=', auditPlanId)
              .executeTakeFirst();
            controlNo = String(existingPlan?.control_no || '');

            await trx.updateTable('QMQA_AUDIT_PLAN')
              .set({
                request_status: 'PL',
                last_update: now,
                updateby: effectiveUserId,
              })
              .where('qmqa_audit_plan_id', '=', auditPlanId)
              .execute();
          }

          const resolvedAttentionId = await qmqaResponseService.resolveAttentionId(payload.attention_id, trx);

          await trx.insertInto('QMQA').values({
            qmqa_id: qmqaId,
            qmqa_audit_plan_id: auditPlanId,
            created_date: now,
            audit_type_id: payload.audit_type_id,
            attention_id: resolvedAttentionId,
            pic_auditor_id: sanitizeUUID(payload.pic_auditor_id),
            due_date: payload.due_date ? new Date(payload.due_date) : null,
            audit_date: new Date(payload.audit_date),
            issued_date: null,
            audit_rating: payload.audit_rating ?? null,
            auditees: payload.auditees || null,
            auditors: payload.auditors || null,
            attendees: payload.attendees || null,
            remarks: payload.remarks || null,
            encoder_id: effectiveUserId,
            encoder_date: now,
            issuer_id: effectiveUserId,
            issuer_remarks: null,
            issuer_date: null,
            checker_id: sanitizeUUID(payload.checker_id),
            checker_remarks: null,
            checker_date: null,
            approver_id: sanitizeUUID(payload.approver_id),
            approver_remarks: null,
            approver_date: null,
            request_status: '2',
            last_update: now,
            updateby: effectiveUserId,
          }).execute();

          if (payload.cc_list?.length) {
            for (const cc of payload.cc_list) {
              await trx.insertInto('QMQA_CC').values({
                qmqa_cc_id: uuidv4(),
                qmqa_id: qmqaId,
                user_id: cc.user_id,
                last_update: now,
                updateby: effectiveUserId,
              }).execute();
            }
          }

          await this.syncRecordAttachments(trx, qmqaId, payload, files, effectiveUserId, now);

          return {
            success: true,
            id: qmqaId,
            recordId: qmqaId,
            apid: auditPlanId,
            controlNo,
            controlNoState: controlNumberService.getControlNoState(controlNo, true),
          };
        });
      } catch (error) {
        if (!this.isDuplicateControlNoError(error) || attempt === 2 || isLinkedToExistingSchedule) {
          throw error;
        }
      }
    }

    throw new ConflictError('Unable to generate a unique QMQA control number.');
  }

  async updateRecord(
    id: string,
    payload: QMQARecordUpdateInput,
    actor: { userId: string; roleName?: string | null },
    files: any[] = [],
  ) {
    const existing = await qmqaRepository.findRecordByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('QMQA Record not found');
    }

    const actorContext = await qmqaAccessService.resolveActorContextWithRole(actor.userId, actor.roleName);
    const latestResponse = await qmqaRepository.findResponseByQmqaId(existing.qmqa_id);
    assertWorkflowRecordAccess({
      allowed: qmqaAccessService.canMutateMainRecord(existing, latestResponse, actorContext),
      action: 'update',
      moduleName: 'QMQA',
    });

    const now = new Date();
    const resolvedAttentionId = payload.attention_id !== undefined
      ? await qmqaResponseService.resolveAttentionId(payload.attention_id)
      : undefined;

    const qmqaUpdates: Record<string, any> = {
      last_update: now,
      updateby: actor.userId || 'SYSTEM',
    };

    if (payload.audit_type_id !== undefined) qmqaUpdates.audit_type_id = payload.audit_type_id;
    if (resolvedAttentionId !== undefined) qmqaUpdates.attention_id = resolvedAttentionId;
    if (payload.pic_auditor_id !== undefined) qmqaUpdates.pic_auditor_id = sanitizeUUID(payload.pic_auditor_id);
    if (payload.due_date !== undefined) qmqaUpdates.due_date = payload.due_date ? new Date(payload.due_date) : null;
    if (payload.audit_date !== undefined) qmqaUpdates.audit_date = payload.audit_date ? new Date(payload.audit_date) : null;
    if (payload.audit_rating !== undefined) {
      const rating = payload.audit_rating as string | number | null | undefined;
      qmqaUpdates.audit_rating = (rating === '' || rating === null || rating === undefined)
        ? null
        : Number(rating);
    }
    if (payload.auditees !== undefined) qmqaUpdates.auditees = payload.auditees || null;
    if (payload.auditors !== undefined) qmqaUpdates.auditors = payload.auditors || null;
    if (payload.attendees !== undefined) qmqaUpdates.attendees = payload.attendees || null;
    if (payload.remarks !== undefined) qmqaUpdates.remarks = payload.remarks || null;
    if (payload.checker_id !== undefined) qmqaUpdates.checker_id = sanitizeUUID(payload.checker_id);
    if (payload.approver_id !== undefined) qmqaUpdates.approver_id = sanitizeUUID(payload.approver_id);

    const planUpdates: Record<string, any> = {
      last_update: now,
      updateby: actor.userId || 'SYSTEM',
    };

    if (payload.site_id !== undefined) planUpdates.site_id = payload.site_id;
    if (payload.supplier_id !== undefined) planUpdates.supplier_id = payload.supplier_id;
    if (payload.audit_category_id !== undefined) planUpdates.audit_category_id = payload.audit_category_id;
    if (payload.audit_plan_date !== undefined) planUpdates.audit_plan_date = payload.audit_plan_date ? new Date(payload.audit_plan_date) : null;
    if (payload.sqe_pic_id !== undefined) planUpdates.sqe_pic_id = payload.sqe_pic_id;

    const result = await qmqaRepository.executeTransaction(async (trx) => {
      let attachmentCleanupQueue: {
        plan: Array<{ fileName: string; storedPath?: string | null }>;
        record: Array<{ fileName: string; storedPath?: string | null }>;
      } = {
        plan: [],
        record: [],
      };

      if (Object.keys(qmqaUpdates).length > 2) {
        await trx.updateTable('QMQA')
          .set(qmqaUpdates)
          .where('qmqa_id', '=', id)
          .execute();
      }

      if (Object.keys(planUpdates).length > 2) {
        await trx.updateTable('QMQA_AUDIT_PLAN')
          .set(planUpdates)
          .where('qmqa_audit_plan_id', '=', existing.qmqa_audit_plan_id)
          .execute();
      }

      if (payload.audit_plan_attachments !== undefined || payload.attachments !== undefined) {
        const syncResult = await this.syncRecordAttachments(
          trx,
          id,
          payload,
          files,
          actor.userId || 'SYSTEM',
          now,
        );
        attachmentCleanupQueue = {
          plan: syncResult.planSync.cleanupQueue,
          record: syncResult.recordSync.cleanupQueue,
        };
      }

      return {
        success: true,
        message: 'QMQA Record updated successfully',
        cleanupQueue: attachmentCleanupQueue,
      };
    });

    await attachmentService.deleteStoredAttachments('qmqa-plan', result.cleanupQueue.plan || []);
    await attachmentService.deleteStoredAttachments('qmqa-record', result.cleanupQueue.record || []);

    return {
      success: result.success,
      message: result.message,
    };
  }

  async deleteRecord(id: string, actor?: { userId?: string | null; roleName?: string | null }) {
    const existing = await qmqaRepository.findRecordByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('QMQA Record not found');
    }

    const actorContext = await qmqaAccessService.resolveActorContextWithRole(actor?.userId, actor?.roleName);
    const latestResponse = await qmqaRepository.findResponseByQmqaId(existing.qmqa_id);
    assertWorkflowRecordAccess({
      allowed: qmqaAccessService.canDeleteMainRecord(existing, latestResponse, actorContext),
      action: 'delete',
      moduleName: 'QMQA',
    });

    return qmqaRepository.executeTransaction(async (trx) => {
      const response = await qmqaRepository.findResponseByQmqaId(id);
      if (response) {
        await trx.deleteFrom('QMQA_RESPONSE_INITIAL')
          .where('qmqa_response_id', '=', response.qmqa_response_id)
          .execute();
        await trx.deleteFrom('QMQA_RESPONSE_FINAL')
          .where('qmqa_response_id', '=', response.qmqa_response_id)
          .execute();
        await trx.deleteFrom('QMQA_RESPONSE_VERIFICATION')
          .where('qmqa_response_id', '=', response.qmqa_response_id)
          .execute();
        await trx.deleteFrom('QMQA_RESPONSE')
          .where('qmqa_id', '=', id)
          .execute();
      }

      await trx.deleteFrom('QMQA_PLAN_ATTACHMENT').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA_CC').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA_ATTACHMENT').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA_NC').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA_SCORE').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA').where('qmqa_id', '=', id).execute();

      return { success: true, message: 'QMQA Record deleted successfully' };
    });
  }
}

export const qmqaRecordCommandService = new QmqaRecordCommandService();
