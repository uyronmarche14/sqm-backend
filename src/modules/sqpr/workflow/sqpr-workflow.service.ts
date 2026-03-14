import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { sqprRepository } from '../sqpr.repository.js';
import {
  buildSqprWorkflowMetadata,
  getSqprCompatibilityRequestStatus,
  getSqprCompatibilityStatus,
  getSqprStageOwnerId,
  normalizeSqprWorkflowStage,
} from './sqpr-workflow.utils.js';
import { SQPR_WORKFLOW_STAGE } from './sqpr-workflow.constants.js';

type DetailedRecord = Record<string, any>;

export class SqprWorkflowService {
  constructor(private readonly repository = sqprRepository) {}

  private async getRecordOrThrow(id: string) {
    const data = await this.repository.findByIdDetailed(id);
    if (!data) {
      throw new NotFoundError('SQPR Record not found');
    }

    return data;
  }

  private ensureActor(record: DetailedRecord, userId: string, message: string) {
    const ownerId = getSqprStageOwnerId(record);
    if (ownerId && ownerId !== userId) {
      throw new ForbiddenError(message);
    }
  }

  private decorateRecord(record: DetailedRecord, actorUserId?: string | null) {
    const workflow = buildSqprWorkflowMetadata(record, {
      actor: { userId: actorUserId || null },
    });

    return {
      ...record,
      status: getSqprCompatibilityStatus(workflow.workflowStage, record),
      request_status: getSqprCompatibilityRequestStatus(workflow.workflowStage, record),
      created_at: record.date_created,
      ...workflow,
    };
  }

  private async buildResult(id: string, actorUserId: string | null | undefined, message: string) {
    const updated = await this.getRecordOrThrow(id);
    return {
      success: true,
      data: this.decorateRecord(updated.record, actorUserId),
      message,
    };
  }

  async submit(id: string, userId: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (
      stage !== SQPR_WORKFLOW_STAGE.DRAFT &&
      stage !== SQPR_WORKFLOW_STAGE.REJECT_CHECKER &&
      stage !== SQPR_WORKFLOW_STAGE.REJECT_APPROVER
    ) {
      throw new BadRequestError(`Cannot submit SQPR from ${stage}.`);
    }

    this.ensureActor(record, userId, 'Only the assigned incharge can submit this SQPR record.');

    const now = new Date();
    const nextControlNo = String(record.control_no || '').startsWith('DRF-')
      ? String(record.control_no).replace(/^DRF-/, 'SQPR-')
      : record.control_no;

    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          control_no: nextControlNo,
          request_status: '3',
          submit_date: now,
          incharge_remarks: remarks ?? record.incharge_remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record submitted successfully');
  }

  async check(id: string, userId: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (stage !== SQPR_WORKFLOW_STAGE.CHECKER) {
      throw new BadRequestError(`Cannot check SQPR from ${stage}.`);
    }

    this.ensureActor(record, userId, 'Only the assigned checker can check this SQPR record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '4',
          checker_date: now,
          checker_remarks: remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record checked successfully');
  }

  async approve(id: string, userId: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (stage !== SQPR_WORKFLOW_STAGE.APPROVER) {
      throw new BadRequestError(`Cannot approve SQPR from ${stage}.`);
    }

    this.ensureActor(record, userId, 'Only the assigned approver can approve this SQPR record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '10',
          approver_date: now,
          approver_remarks: remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record approved successfully');
  }

  async reject(id: string, userId: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (
      stage !== SQPR_WORKFLOW_STAGE.CHECKER &&
      stage !== SQPR_WORKFLOW_STAGE.APPROVER
    ) {
      throw new BadRequestError(`Cannot reject SQPR from ${stage}.`);
    }

    const now = new Date();

    if (stage === SQPR_WORKFLOW_STAGE.CHECKER) {
      this.ensureActor(record, userId, 'Only the assigned checker can reject this SQPR record.');
      await this.repository.executeTransaction(async (trx: any) => {
        await trx.updateTable('SQPR')
          .set({
            request_status: '5',
            checker_date: now,
            checker_remarks: remarks ?? null,
            last_update: now,
            updateby: userId,
          })
          .where('sqpr_id', '=', record.sqpr_id)
          .execute();
      });

      return this.buildResult(id, userId, 'Record rejected successfully');
    }

    this.ensureActor(record, userId, 'Only the assigned approver can reject this SQPR record.');
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '6',
          approver_date: now,
          approver_remarks: remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record rejected successfully');
  }

  async issue(id: string, userId: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (stage !== SQPR_WORKFLOW_STAGE.ISSUER) {
      throw new BadRequestError(`Cannot issue SQPR from ${stage}.`);
    }

    this.ensureActor(record, userId, 'Only the assigned incharge can issue this SQPR record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '1',
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record issued successfully');
  }
}

export const sqprWorkflowService = new SqprWorkflowService();
