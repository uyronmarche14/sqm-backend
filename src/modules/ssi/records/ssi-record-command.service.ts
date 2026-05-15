import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { ssiRepository } from '../ssi.repository.js';
import { buildEmptyRecord, buildSsiRecordFromRow, getDefaultAuditType, serializeJson } from '../shared/ssi-shared.js';
import { ssiAccessService } from '../shared/ssi-access.service.js';
import type { SsiActorContext, SsiRecord } from '../types/ssi.types.js';

type RecordPayload = Partial<SsiRecord>;

function normalizeString(value: unknown) {
  return String(value || '').trim();
}

export class SsiRecordCommandService {
  private buildPersistedPayload(record: SsiRecord, actor: SsiActorContext, now: Date) {
    const approvers = record.approvers || [];
    const issuer = approvers.find((entry) => entry.role === 'ISSUER');
    const checker = approvers.find((entry) => entry.role === 'CHECKER');
    const approver = approvers.find((entry) => entry.role === 'APPROVER');

    return {
      control_no: record.controlNo,
      request_status: record.status,
      mfg_site_id: record.mfgSiteId,
      supplier_id: record.supplierId,
      category_family: record.categoryFamily,
      audit_type: record.auditType || getDefaultAuditType(record.categoryFamily),
      sqe_pic_id: record.sqePicId || actor.userId || '',
      scheduled_date: record.scheduledDate ? new Date(record.scheduledDate) : now,
      remarks: record.remarks || null,
      overall_judgment: record.overallJudgment || 'PENDING',
      overall_judgment_remarks: record.overallJudgmentRemarks || null,
      inspector_registrations_json: serializeJson(record.inspectorRegistrations || []),
      written_exam_json: serializeJson(record.writtenExam || buildEmptyRecord().writtenExam),
      repeatability_study_json: serializeJson(record.repeatabilityStudy || buildEmptyRecord().repeatabilityStudy),
      audit_artifacts_json: serializeJson(record.auditArtifacts || buildEmptyRecord().auditArtifacts),
      certificate_json: serializeJson(record.certificate || buildEmptyRecord().certificate),
      cc_list_json: serializeJson(record.ccList || []),
      approvers_json: serializeJson(record.approvers || []),
      notifications_json: serializeJson(record.notifications || []),
      issuer_id: issuer?.userId || null,
      checker_id: checker?.userId || null,
      approver_id: approver?.userId || null,
      issuer_remarks: issuer?.remarks || null,
      checker_remarks: checker?.remarks || null,
      approver_remarks: approver?.remarks || null,
      submit_date: issuer?.approvedAt ? new Date(issuer.approvedAt) : null,
      checked_date: checker?.approvedAt ? new Date(checker.approvedAt) : null,
      approved_date: approver?.approvedAt ? new Date(approver.approvedAt) : null,
      last_update: now,
      updateby: actor.userId || 'SYSTEM',
    };
  }

  private resolveCreateShape(payload: RecordPayload, actor: SsiActorContext) {
    const empty = buildEmptyRecord();
    const categoryFamily = (payload.categoryFamily || empty.categoryFamily);
    const auditType = payload.auditType || getDefaultAuditType(categoryFamily);
    const record: SsiRecord = {
      ...empty,
      ...payload,
      id: payload.id || '',
      controlNo: payload.controlNo || '',
      categoryFamily,
      auditType,
      mfgSiteId: payload.mfgSiteId || '',
      supplierId: payload.supplierId || '',
      scheduledDate: payload.scheduledDate || '',
      sqePicId: payload.sqePicId || actor.userId || '',
      approvers: payload.approvers || [],
      inspectorRegistrations: payload.inspectorRegistrations || [],
      writtenExam: payload.writtenExam || empty.writtenExam,
      repeatabilityStudy: payload.repeatabilityStudy || empty.repeatabilityStudy,
      auditArtifacts: payload.auditArtifacts || empty.auditArtifacts,
      certificate: payload.certificate || empty.certificate,
      ccList: payload.ccList || [],
      notifications: payload.notifications || [],
      status: (payload.status || 'DRAFT'),
      availableActions: payload.availableActions || empty.availableActions,
    };

    if (!record.mfgSiteId || !record.supplierId || !record.scheduledDate) {
      throw new BadRequestError('Site, supplier, and scheduled date are required for SSI records.');
    }

    return record;
  }

  async create(
    actor: SsiActorContext,
    payload: RecordPayload,
    options?: { scheduleId?: string | null; inheritedControlNo?: string | null },
  ) {
    const now = new Date();
    const record = this.resolveCreateShape(payload, actor);
    const recordId = uuidv4();
    const controlNo = options?.inheritedControlNo
      ? options.inheritedControlNo
      : await controlNumberService.buildSsiDraft({ siteId: record.mfgSiteId, date: record.scheduledDate });
    const persisted = {
      ssi_record_id: recordId,
      ssi_plan_id: options?.scheduleId || payload.scheduleId || null,
      created_date: now,
      created_by: actor.userId || 'SYSTEM',
      issued_date: null,
      closed_date: null,
      rejected_date: null,
      ...this.buildPersistedPayload({ ...record, id: recordId, controlNo }, actor, now),
    };

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.insertRecord(trx, persisted);
      if (options?.scheduleId) {
        await ssiRepository.updatePlan(trx, options.scheduleId, {
          linked_record_id: recordId,
          request_status: 'PLANNED',
          last_update: now,
          updateby: actor.userId || 'SYSTEM',
        });
      }
    });

    const created = await ssiRepository.findRecordById(recordId);
    if (!created) {
      throw new NotFoundError('SSI record was created but could not be reloaded.');
    }
    return buildSsiRecordFromRow(created);
  }

  async update(id: string, actor: SsiActorContext, payload: RecordPayload) {
    const existingRow = await ssiRepository.findRecordById(id);
    if (!existingRow) {
      throw new NotFoundError('SSI record not found');
    }

    const existing = buildSsiRecordFromRow(existingRow);
    if (!ssiAccessService.canReadRecord(existing, actor)) {
      throw new BadRequestError('You do not have access to update this SSI record.');
    }

    const now = new Date();
    const merged = this.resolveCreateShape({
      ...existing,
      ...payload,
      id,
      controlNo: existing.controlNo,
      status: payload.status || existing.status,
      approvers: payload.approvers || existing.approvers,
      certificate: payload.certificate || existing.certificate,
      notifications: payload.notifications || existing.notifications,
      writtenExam: payload.writtenExam || existing.writtenExam,
      repeatabilityStudy: payload.repeatabilityStudy || existing.repeatabilityStudy,
      auditArtifacts: payload.auditArtifacts || existing.auditArtifacts,
      ccList: payload.ccList || existing.ccList,
      inspectorRegistrations: payload.inspectorRegistrations || existing.inspectorRegistrations,
    }, actor);

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.updateRecord(trx, id, this.buildPersistedPayload(merged, actor, now));
    });

    const updated = await ssiRepository.findRecordById(id);
    if (!updated) {
      throw new NotFoundError('Updated SSI record could not be reloaded.');
    }
    return buildSsiRecordFromRow(updated);
  }

  async delete(id: string, actor: SsiActorContext) {
    const existingRow = await ssiRepository.findRecordById(id);
    if (!existingRow) {
      throw new NotFoundError('SSI record not found');
    }

    const existing = buildSsiRecordFromRow(existingRow);
    if (!ssiAccessService.canReadRecord(existing, actor)) {
      throw new BadRequestError('You do not have access to delete this SSI record.');
    }

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.deleteRecord(trx, id);
      if (normalizeString(existing.scheduleId)) {
        await ssiRepository.updatePlan(trx, existing.scheduleId!, {
          linked_record_id: null,
          last_update: new Date(),
          updateby: actor.userId || 'SYSTEM',
        });
      }
    });
  }
}

export const ssiRecordCommandService = new SsiRecordCommandService();
