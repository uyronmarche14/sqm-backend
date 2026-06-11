import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { ssiRepository } from '../ssi.repository.js';
import { buildSsiRecordFromRow, serializeJson } from '../shared/ssi-shared.js';
import { ssiAccessService } from '../shared/ssi-access.service.js';
import { computeSsiAvailableActions, getNextStatusForAction } from './ssi-workflow.js';
import type { SsiActorContext, SsiWorkflowAction } from '../types/ssi.types.js';

export class SsiWorkflowService {
  async applyAction(id: string, actor: SsiActorContext, action: SsiWorkflowAction, payload?: Record<string, unknown>) {
    const row = await ssiRepository.findRecordById(id);
    if (!row) {
      throw new NotFoundError('SSI record not found');
    }

    const record = buildSsiRecordFromRow(row);
    const availableActions = computeSsiAvailableActions(record, actor);
    if (!ssiAccessService.isAdmin(actor) && !availableActions.includes(action)) {
      throw new BadRequestError(`Action ${action} is not available for this SSI record.`);
    }

    const nextStatus = getNextStatusForAction(record.status, action);
    const now = new Date();
    const remarks = String(payload?.remarks || '').trim() || null;
    const updateValues: Record<string, unknown> = {
      request_status: nextStatus,
      last_update: now,
      updateby: actor.userId || 'SYSTEM',
    };

    if ((action === 'submit' || action === 'resubmit') && record.controlNo.toUpperCase().startsWith('DRF-')) {
      updateValues.control_no = await controlNumberService.finalizeSsi({
        siteId: record.mfgSiteId,
        date: record.scheduledDate,
      });
    }

    if (action === 'submit' || action === 'resubmit') {
      updateValues.submit_date = now;
      updateValues.issuer_id = actor.userId || null;
      updateValues.issuer_remarks = remarks;
    }
    if (action === 'check') {
      updateValues.checked_date = now;
      updateValues.checker_id = actor.userId || null;
      updateValues.checker_remarks = remarks;
    }
    if (action === 'approve') {
      updateValues.approved_date = now;
      updateValues.approver_id = actor.userId || null;
      updateValues.approver_remarks = remarks;
    }
    if (action === 'reject') {
      updateValues.rejected_date = now;
      if (record.status === 'AWAITING_CHECKED') {
        updateValues.checker_id = actor.userId || null;
        updateValues.checker_remarks = remarks;
      } else {
        updateValues.approver_id = actor.userId || null;
        updateValues.approver_remarks = remarks;
      }
    }
    if (action === 'issue') {
      updateValues.issued_date = now;
      const certificate = record.certificate || { inspectorCertificateGenerated: false, companyCertificateGenerated: false, attachments: [] };
      if (record.overallJudgment === 'PASSED' && certificate.inspectorCertificateGenerated === false && !certificate.issueDate) {
        certificate.issueDate = now.toISOString().slice(0, 10);
      }
      updateValues.certificate_json = serializeJson(certificate);
    }
    if (action === 'cancel') {
      updateValues.closed_date = now;
    }

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.updateRecord(trx, id, updateValues);
      await ssiRepository.insertWorkflowEvent(trx, {
        ssi_workflow_event_id: uuidv4(),
        ssi_record_id: id,
        action_name: action,
        from_status: record.status,
        to_status: nextStatus,
        actor_user_id: actor.userId || null,
        remarks,
        payload_json: serializeJson(payload || {}),
        created_date: now,
      });
    });

    const updated = await ssiRepository.findRecordById(id);
    if (!updated) {
      throw new NotFoundError('Updated SSI record could not be loaded.');
    }
    return buildSsiRecordFromRow(updated);
  }
}

export const ssiWorkflowService = new SsiWorkflowService();
