import { ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { successResponse } from '../../../shared/utils/api-response.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { spcTrendRepository } from '../spc-trend.repository.js';
import { spcTrendRecordQueryService } from '../services/spc-trend-record-query.service.js';
import { spcTrendAccessService } from '../services/spc-trend-access.service.js';
import { normalizeSpcTrendWorkflowStage } from './spc-trend-workflow.js';

type WorkflowActor = {
  userId: string;
  remarks?: string;
  roleName?: string | null;
};

export class SpcTrendWorkflowService {
  async submit(id: string, actor: WorkflowActor) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);
    if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
      throw new ForbiddenError('Only draft or rejected SPC Trend records can be submitted.');
    }

    await spcTrendAccessService.assertActionAccess(existing, actor, 'submit', 'SPC-05-03');
    const now = new Date();

    await spcTrendRepository.executeTransaction(async (trx) => {
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
    });

    const record = await spcTrendRecordQueryService.getById(existing.spc_id, { userId: actor.userId, roleName: actor.roleName });
    return successResponse(record);
  }

  async check(id: string, actor: WorkflowActor) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);
    if (stage !== 'CHECKER') {
      throw new ForbiddenError('Only records awaiting check can be checked.');
    }

    await spcTrendAccessService.assertActionAccess(existing, actor, 'check');
    const now = new Date();

    await spcTrendRepository.executeTransaction(async (trx) => {
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
    });

    const record = await spcTrendRecordQueryService.getById(existing.spc_id, { userId: actor.userId, roleName: actor.roleName });
    return successResponse(record);
  }

  async approve(id: string, actor: WorkflowActor) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);
    if (stage !== 'APPROVER') {
      throw new ForbiddenError('Only records awaiting approval can be approved.');
    }

    await spcTrendAccessService.assertActionAccess(existing, actor, 'approve');
    const now = new Date();

    await spcTrendRepository.executeTransaction(async (trx) => {
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
    });

    const record = await spcTrendRecordQueryService.getById(existing.spc_id, { userId: actor.userId, roleName: actor.roleName });
    return successResponse(record);
  }

  async reject(id: string, actor: WorkflowActor) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);
    const now = new Date();

    if (stage === 'CHECKER') {
      await spcTrendAccessService.assertActionAccess(existing, actor, 'reject');
      await spcTrendRepository.executeTransaction(async (trx) => {
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
      });
    } else if (stage === 'APPROVER') {
      await spcTrendAccessService.assertActionAccess(existing, actor, 'reject');
      await spcTrendRepository.executeTransaction(async (trx) => {
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
      });
    } else {
      throw new ForbiddenError('Only records awaiting check or approval can be rejected.');
    }

    const record = await spcTrendRecordQueryService.getById(existing.spc_id, { userId: actor.userId, roleName: actor.roleName });
    return successResponse(record);
  }

  async issue(id: string, actor: WorkflowActor) {
    const existing = await spcTrendRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('SPC Trend record not found');
    }

    const stage = normalizeSpcTrendWorkflowStage(existing.request_status, existing);
    if (stage !== 'ISSUER') {
      throw new ForbiddenError('Only approved SPC Trend records can be issued.');
    }

    await spcTrendAccessService.assertActionAccess(existing, actor, 'issue');
    const now = new Date();

    await spcTrendRepository.executeTransaction(async (trx) => {
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
    });

    const record = await spcTrendRecordQueryService.getById(existing.spc_id, { userId: actor.userId, roleName: actor.roleName });
    return successResponse(record);
  }
}

export const spcTrendWorkflowService = new SpcTrendWorkflowService();
