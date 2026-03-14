import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { NpiRepository } from '../npi.repository.js';
import type { ServiceResponse, WorkflowActionResponse } from '../types/npi.types.js';
import {
  buildNpiWorkflowMetadata,
  getNpiDbStatus,
  normalizeNpiWorkflowStage,
} from '../workflow/npi-workflow.utils.js';
import { NPI_WORKFLOW_STAGE } from '../workflow/npi-workflow.constants.js';

export class NpiWorkflowService {
  constructor(private repository: NpiRepository) {}

  async submitForApproval(
    id: string,
    userId: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    if (
      stage !== NPI_WORKFLOW_STAGE.DRAFT &&
      stage !== NPI_WORKFLOW_STAGE.REJECT_CHECKER &&
      stage !== NPI_WORKFLOW_STAGE.REJECT_APPROVER
    ) {
      throw new BadRequestError(`Cannot submit record from ${stage}`);
    }

    if (record.inspector_id !== userId) {
      throw new ForbiddenError('Only the originator can submit this NPI record.');
    }

    if (!record.checker_id || !record.approver_id) {
      throw new BadRequestError('Checker and approver must be assigned before submitting.');
    }

    const now = new Date();
    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('NPI_LOTS')
        .set({
          request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.CHECKER),
          submitted_date: now,
          last_update: now,
          updateby: userId,
        })
        .where('npi_lot_id', '=', record.npi_lot_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.npi_lot_id,
        status: getNpiDbStatus(NPI_WORKFLOW_STAGE.CHECKER),
      },
      message: 'Record submitted for checker approval',
    };
  }

  async checkRecord(
    id: string,
    userId: string,
    remarks?: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    if (stage !== NPI_WORKFLOW_STAGE.CHECKER) {
      throw new BadRequestError(`Cannot check record from ${stage}`);
    }

    if (record.checker_id !== userId) {
      throw new ForbiddenError('Only the assigned checker can check this NPI record.');
    }

    const now = new Date();
    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('NPI_LOTS')
        .set({
          request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.APPROVER),
          checked_date: now,
          checker_remarks: remarks || null,
          last_update: now,
          updateby: userId,
        })
        .where('npi_lot_id', '=', record.npi_lot_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.npi_lot_id,
        status: getNpiDbStatus(NPI_WORKFLOW_STAGE.APPROVER),
      },
      message: 'Record checked successfully',
    };
  }

  async approveRecord(
    id: string,
    userId: string,
    remarks?: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    if (stage !== NPI_WORKFLOW_STAGE.APPROVER) {
      throw new BadRequestError(`Cannot approve record from ${stage}`);
    }

    if (record.approver_id !== userId) {
      throw new ForbiddenError('Only the assigned approver can approve this NPI record.');
    }

    const now = new Date();
    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('NPI_LOTS')
        .set({
          request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.ACCEPT),
          approved_date: now,
          approver_remarks: remarks || null,
          last_update: now,
          updateby: userId,
        })
        .where('npi_lot_id', '=', record.npi_lot_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.npi_lot_id,
        status: getNpiDbStatus(NPI_WORKFLOW_STAGE.ACCEPT),
      },
      message: 'Record approved successfully',
    };
  }

  async rejectRecord(
    id: string,
    userId: string,
    remarks: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    if (!remarks) {
      throw new BadRequestError('Remarks are required for rejection');
    }

    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    const now = new Date();

    if (stage === NPI_WORKFLOW_STAGE.CHECKER) {
      if (record.checker_id !== userId) {
        throw new ForbiddenError('Only the assigned checker can reject this NPI record.');
      }

      await this.repository.executeTransaction(async (trx) => {
        await trx
          .updateTable('NPI_LOTS')
          .set({
            request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_CHECKER),
            checked_date: now,
            checker_remarks: remarks,
            last_update: now,
            updateby: userId,
          })
          .where('npi_lot_id', '=', record.npi_lot_id)
          .execute();
      });

      return {
        success: true,
        data: {
          id: record.npi_lot_id,
          status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_CHECKER),
        },
        message: 'Record rejected by checker',
      };
    }

    if (stage === NPI_WORKFLOW_STAGE.APPROVER) {
      if (record.approver_id !== userId) {
        throw new ForbiddenError('Only the assigned approver can reject this NPI record.');
      }

      await this.repository.executeTransaction(async (trx) => {
        await trx
          .updateTable('NPI_LOTS')
          .set({
            request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_APPROVER),
            approved_date: now,
            approver_remarks: remarks,
            last_update: now,
            updateby: userId,
          })
          .where('npi_lot_id', '=', record.npi_lot_id)
          .execute();
      });

      return {
        success: true,
        data: {
          id: record.npi_lot_id,
          status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_APPROVER),
        },
        message: 'Record rejected by approver',
      };
    }

    throw new BadRequestError(`Cannot reject record from ${stage}`);
  }

  getAvailableActions(
    currentStatus: string,
    userId?: string,
    roleName?: string | null,
    record?: Record<string, unknown>,
  ) {
    const metadata = buildNpiWorkflowMetadata(
      {
        request_status: currentStatus,
        ...(record || {}),
      },
      { userId, roleName },
    );

    return metadata.availableActions;
  }
}
