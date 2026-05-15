import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';
import { ssiRepository } from '../ssi.repository.js';
import { buildSsiRecordFromRow, serializeJson } from '../shared/ssi-shared.js';
import { ssiAccessService } from '../shared/ssi-access.service.js';
import type { SsiActorContext, SsiResponseDetail } from '../types/ssi.types.js';

export class SsiResponseService {
  private async assertReadableRecord(recordId: string, actor: SsiActorContext) {
    const row = await ssiRepository.findRecordById(recordId);
    if (!row) {
      throw new NotFoundError('SSI record not found');
    }

    const record = buildSsiRecordFromRow(row);
    if (!ssiAccessService.canReadRecord(record, actor)) {
      throw new NotFoundError('SSI record not found');
    }

    return record;
  }

  private mapResponse(row: Record<string, unknown>): SsiResponseDetail {
    let payload: Record<string, unknown> = {};
    try {
      payload = row.payload_json ? JSON.parse(String(row.payload_json)) : {};
    } catch {
      payload = {};
    }

    return {
      id: String(row.ssi_response_id || ''),
      recordId: String(row.ssi_record_id || ''),
      responseStatus: String(row.response_status || 'DRAFT'),
      payload,
      reviewRemarks: String(row.review_remarks || '') || undefined,
      submittedBy: String(row.submitted_by || '') || null,
      checkedBy: String(row.checked_by || '') || null,
      approvedBy: String(row.approved_by || '') || null,
      submittedAt: row.submitted_at ? new Date(String(row.submitted_at)).toISOString() : null,
      checkedAt: row.checked_at ? new Date(String(row.checked_at)).toISOString() : null,
      approvedAt: row.approved_at ? new Date(String(row.approved_at)).toISOString() : null,
      rejectedAt: row.rejected_at ? new Date(String(row.rejected_at)).toISOString() : null,
    };
  }

  async save(recordId: string, actor: SsiActorContext, payload: Record<string, unknown> = {}) {
    const record = await this.assertReadableRecord(recordId, actor);
    if (!['ISSUED', 'WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT', 'RESPONSE_REJECTED'].includes(record.status)) {
      throw new BadRequestError('SSI response can only be saved after issuance.');
    }

    const now = new Date();
    const responseId = await ssiRepository.executeTransaction(async (trx) =>
      ssiRepository.upsertResponse(
        trx,
        recordId,
        {
          ssi_response_id: uuidv4(),
          ssi_record_id: recordId,
          response_status: 'DRAFT',
          payload_json: serializeJson(payload),
          review_remarks: null,
          submitted_by: null,
          checked_by: null,
          approved_by: null,
          submitted_at: null,
          checked_at: null,
          approved_at: null,
          rejected_at: null,
          last_update: now,
          updateby: actor.userId || 'SYSTEM',
        },
        {
          payload_json: serializeJson(payload),
          last_update: now,
          updateby: actor.userId || 'SYSTEM',
        },
      ),
    );

    const row = await ssiRepository.findResponseByRecordId(recordId);
    return this.mapResponse({ ...row, ssi_response_id: responseId } as Record<string, unknown>);
  }

  async submit(recordId: string, actor: SsiActorContext, payload: Record<string, unknown> = {}) {
    await this.save(recordId, actor, payload);
    const now = new Date();
    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.upsertResponse(
        trx,
        recordId,
        {
          ssi_response_id: uuidv4(),
          ssi_record_id: recordId,
          response_status: 'SUBMITTED',
          payload_json: serializeJson(payload),
          review_remarks: null,
          submitted_by: actor.userId || null,
          checked_by: null,
          approved_by: null,
          submitted_at: now,
          checked_at: null,
          approved_at: null,
          rejected_at: null,
          last_update: now,
          updateby: actor.userId || 'SYSTEM',
        },
        {
          response_status: 'SUBMITTED',
          payload_json: serializeJson(payload),
          submitted_by: actor.userId || null,
          submitted_at: now,
          last_update: now,
          updateby: actor.userId || 'SYSTEM',
        },
      );
      await ssiRepository.updateRecord(trx, recordId, {
        request_status: 'RESPONSE_AWAIT_APPROVAL',
        last_update: now,
        updateby: actor.userId || 'SYSTEM',
      });
    });

    const row = await ssiRepository.findResponseByRecordId(recordId);
    return this.mapResponse(row as Record<string, unknown>);
  }

  async review(recordId: string, actor: SsiActorContext, payload: Record<string, unknown> = {}) {
    const record = await this.assertReadableRecord(recordId, actor);
    if (record.status !== 'RESPONSE_AWAIT_APPROVAL') {
      throw new BadRequestError('SSI response review is only available while awaiting approval.');
    }

    const now = new Date();
    const approved = String(payload.outcome || 'approve').toLowerCase() !== 'reject';
    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.upsertResponse(
        trx,
        recordId,
        {
          ssi_response_id: uuidv4(),
          ssi_record_id: recordId,
          response_status: approved ? 'APPROVED' : 'REJECTED',
          payload_json: serializeJson(payload.payload || {}),
          review_remarks: String(payload.remarks || '') || null,
          submitted_by: null,
          checked_by: actor.userId || null,
          approved_by: approved ? actor.userId || null : null,
          submitted_at: null,
          checked_at: now,
          approved_at: approved ? now : null,
          rejected_at: approved ? null : now,
          last_update: now,
          updateby: actor.userId || 'SYSTEM',
        },
        {
          response_status: approved ? 'APPROVED' : 'REJECTED',
          review_remarks: String(payload.remarks || '') || null,
          checked_by: actor.userId || null,
          approved_by: approved ? actor.userId || null : null,
          checked_at: now,
          approved_at: approved ? now : null,
          rejected_at: approved ? null : now,
          last_update: now,
          updateby: actor.userId || 'SYSTEM',
        },
      );
      await ssiRepository.updateRecord(trx, recordId, {
        request_status: approved ? 'CLOSED' : 'RESPONSE_REJECTED',
        closed_date: approved ? now : null,
        last_update: now,
        updateby: actor.userId || 'SYSTEM',
      });
    });

    const row = await ssiRepository.findResponseByRecordId(recordId);
    return this.mapResponse(row as Record<string, unknown>);
  }
}

export const ssiResponseService = new SsiResponseService();
