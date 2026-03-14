import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/errors/AppError.js';
import { qmqaRepository, type QmqaRepository } from '../qmqa.repository.js';
import { qmqaService } from '../qmqa.service.js';
import {
  QMQA_LEGACY_STAGE_CODE,
  QMQA_WORKFLOW_ACTION,
  QMQA_WORKFLOW_STAGE,
  type QmqaWorkflowAction,
  type QmqaWorkflowStage,
} from './qmqa-workflow.constants.js';
import {
  buildQmqaWorkflowMetadata,
  getQmqaCompatibilityStatus,
  isQmqaSupplierActor,
  normalizeQmqaWorkflowStage,
} from './qmqa-workflow.utils.js';

interface WorkflowContext {
  record: Record<string, any>;
  latestResponse: Record<string, any> | null;
  supplierIds: string[];
  availableActions: QmqaWorkflowAction[];
}

interface TransitionResult {
  success: true;
  data: Record<string, any>;
  message: string;
}

export class QmqaWorkflowService {
  constructor(private repository: QmqaRepository = qmqaRepository) {}

  private async getWorkflowContext(id: string, userId?: string): Promise<WorkflowContext> {
    const record = await this.repository.findRecordByIdDetailed(id);
    if (!record) {
      throw new NotFoundError('QMQA Record not found');
    }

    const latestResponse = await this.repository.findResponseByQmqaId(record.qmqa_id) || null;
    const supplierIds = userId
      ? await this.repository.findSupplierIdsByUserId(userId)
      : [];
    const metadata = buildQmqaWorkflowMetadata(record, {
      latestResponse,
      actor: { userId, supplierIds },
    });

    return {
      record,
      latestResponse,
      supplierIds,
      availableActions: metadata.availableActions,
    };
  }

  private getStage(context: WorkflowContext): QmqaWorkflowStage {
    return normalizeQmqaWorkflowStage(
      context.record.request_status,
      context.latestResponse,
      context.record,
    );
  }

  private ensureAction(
    context: WorkflowContext,
    action: QmqaWorkflowAction,
    message: string,
  ) {
    if (!context.availableActions.includes(action)) {
      throw new ForbiddenError(message);
    }
  }

  private ensureRemarks(remarks?: string | null) {
    if (!remarks?.trim()) {
      throw new BadRequestError('Remarks are required for this action.');
    }
  }

  private ensureLatestResponse(context: WorkflowContext) {
    if (!context.latestResponse?.qmqa_response_id) {
      throw new BadRequestError('QMQA response data is missing for this workflow step.');
    }

    return context.latestResponse;
  }

  private async updateMainStatus(
    trx: any,
    qmqaId: string,
    userId: string,
    updates: Record<string, unknown>,
  ) {
    await trx.updateTable('QMQA')
      .set({
        ...updates,
        last_update: new Date(),
        updateby: userId,
      })
      .where('qmqa_id', '=', qmqaId)
      .execute();
  }

  private async updateResponseStatus(
    trx: any,
    responseId: string,
    userId: string,
    updates: Record<string, unknown>,
  ) {
    await trx.updateTable('QMQA_RESPONSE')
      .set({
        ...updates,
        last_update: new Date(),
        updateby: userId,
      })
      .where('qmqa_response_id', '=', responseId)
      .execute();
  }

  private buildResult(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null,
    userId: string,
    message: string,
  ): TransitionResult {
    const metadata = buildQmqaWorkflowMetadata(record, {
      latestResponse,
      actor: {
        userId,
      },
    });

    return {
      success: true,
      data: {
        id: record.qmqa_id,
        status: getQmqaCompatibilityStatus(
          metadata.workflowStage,
          latestResponse,
          record,
        ),
        request_status: QMQA_LEGACY_STAGE_CODE[metadata.workflowStage],
        ...metadata,
      },
      message,
    };
  }

  private async refetchResult(id: string, userId: string, message: string) {
    const record = await this.repository.findRecordByIdDetailed(id);
    if (!record) {
      throw new NotFoundError('QMQA Record not found after workflow update.');
    }

    const latestResponse = await this.repository.findResponseByQmqaId(id) || null;
    return this.buildResult(record, latestResponse, userId, message);
  }

  async submitMain(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (
      stage !== QMQA_WORKFLOW_STAGE.DRAFT &&
      stage !== QMQA_WORKFLOW_STAGE.REJECT_CHECKER &&
      stage !== QMQA_WORKFLOW_STAGE.REJECT_APPROVER
    ) {
      throw new BadRequestError(`Cannot submit QMQA from ${stage}.`);
    }

    if (
      context.record.issuer_id !== userId &&
      context.record.encoder_id !== userId
    ) {
      throw new ForbiddenError('Only the issuer or originator can submit this QMQA.');
    }

    const now = new Date();

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER],
        issuer_date: now,
        issuer_remarks: remarks || null,
        checker_date: null,
        checker_remarks: null,
        approver_date: null,
        approver_remarks: null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA submitted to cycle 1 checker');
  }

  async checkMain(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.CHECKER) {
      throw new BadRequestError('Only cycle 1 checker-stage QMQA records can be checked.');
    }

    this.ensureAction(
      context,
      QMQA_WORKFLOW_ACTION.CHECK_MAIN,
      'Only the assigned checker can check this QMQA.',
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER],
        checker_date: new Date(),
        checker_remarks: remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA checked and routed to approver');
  }

  async approveMain(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.APPROVER) {
      throw new BadRequestError('Only cycle 1 approver-stage QMQA records can be approved.');
    }

    this.ensureAction(
      context,
      QMQA_WORKFLOW_ACTION.APPROVE_MAIN,
      'Only the assigned approver can approve this QMQA.',
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER],
        approver_date: new Date(),
        approver_remarks: remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA approved and routed back to issuer');
  }

  async rejectMain(id: string, userId: string, remarks?: string) {
    this.ensureRemarks(remarks);

    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);
    const now = new Date();

    await this.repository.executeTransaction(async (trx) => {
      if (stage === QMQA_WORKFLOW_STAGE.CHECKER) {
        this.ensureAction(
          context,
          QMQA_WORKFLOW_ACTION.REJECT_MAIN,
          'Only the assigned checker can reject this QMQA.',
        );

        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER],
          checker_date: now,
          checker_remarks: remarks,
        });
        return;
      }

      if (stage === QMQA_WORKFLOW_STAGE.APPROVER) {
        this.ensureAction(
          context,
          QMQA_WORKFLOW_ACTION.REJECT_MAIN,
          'Only the assigned approver can reject this QMQA.',
        );

        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER],
          approver_date: now,
          approver_remarks: remarks,
        });
        return;
      }

      throw new BadRequestError(`Cannot reject QMQA from ${stage}.`);
    });

    return this.refetchResult(id, userId, 'QMQA rejected');
  }

  async issueMain(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.ISSUER) {
      throw new BadRequestError('Only issuer-stage QMQA records can be issued.');
    }

    this.ensureAction(
      context,
      QMQA_WORKFLOW_ACTION.ISSUE_MAIN,
      'Only the assigned issuer can issue this QMQA.',
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.SUPPLIER],
        issued_date: new Date(),
        issuer_remarks: remarks || context.record.issuer_remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA issued to supplier');
  }

  async cancelMain(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (
      stage !== QMQA_WORKFLOW_STAGE.DRAFT &&
      stage !== QMQA_WORKFLOW_STAGE.ISSUER
    ) {
      throw new BadRequestError(`Cannot cancel QMQA from ${stage}.`);
    }

    if (
      context.record.issuer_id !== userId &&
      context.record.encoder_id !== userId
    ) {
      throw new ForbiddenError('Only the issuer or originator can cancel this QMQA.');
    }

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CANCEL],
        remarks: remarks || context.record.remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA cancelled');
  }

  async saveResponse(
    id: string,
    userId: string,
    payload: Record<string, any>,
    files: any[] = [],
  ) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const saveableSupplierStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.SUPPLIER,
        QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER,
        QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.NOT_ACCEPT,
      ];

    if (!saveableSupplierStages.includes(stage)) {
      throw new BadRequestError(`Cannot save supplier response from ${stage}.`);
    }

    if (
      !isQmqaSupplierActor(context.record, {
        userId,
        supplierIds: context.supplierIds,
      })
    ) {
      throw new ForbiddenError('Only the assigned supplier can update this QMQA response.');
    }

    const initialSectionStages: QmqaWorkflowStage[] = [
      QMQA_WORKFLOW_STAGE.SUPPLIER,
      QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER,
    ];

    const section = initialSectionStages.includes(stage)
      ? 'initial'
      : 'final';

    await qmqaService.saveSupplierResponseContent(
      context.record.qmqa_id,
      userId,
      payload,
      files,
      section,
    );

    return this.refetchResult(id, userId, 'QMQA response saved');
  }

  async submitInitialResponse(
    id: string,
    userId: string,
    payload: Record<string, any>,
    files: any[] = [],
  ) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const initialSubmitStages: QmqaWorkflowStage[] = [
      QMQA_WORKFLOW_STAGE.SUPPLIER,
      QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER,
    ];

    if (!initialSubmitStages.includes(stage)) {
      throw new BadRequestError(`Cannot submit initial response from ${stage}.`);
    }

    if (
      !isQmqaSupplierActor(context.record, {
        userId,
        supplierIds: context.supplierIds,
      })
    ) {
      throw new ForbiddenError('Only the assigned supplier can submit the initial response.');
    }

    await qmqaService.saveSupplierResponseContent(
      context.record.qmqa_id,
      userId,
      payload,
      files,
      'initial',
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE],
      });
    });

    return this.refetchResult(id, userId, 'Initial response submitted');
  }

  async submitFinalResponse(
    id: string,
    userId: string,
    payload: Record<string, any>,
    files: any[] = [],
  ) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const finalSubmitStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.NOT_ACCEPT,
      ];

    if (!finalSubmitStages.includes(stage)) {
      throw new BadRequestError(`Cannot submit final response from ${stage}.`);
    }

    if (
      !isQmqaSupplierActor(context.record, {
        userId,
        supplierIds: context.supplierIds,
      })
    ) {
      throw new ForbiddenError('Only the assigned supplier can submit the final response.');
    }

    await qmqaService.saveSupplierResponseContent(
      context.record.qmqa_id,
      userId,
      payload,
      files,
      'final',
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.FINAL_RESPONSE],
      });
    });

    return this.refetchResult(id, userId, 'Final response submitted');
  }

  async saveResponseReview(id: string, userId: string, payload: Record<string, any>) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const issuerReviewStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
      ];

    if (!issuerReviewStages.includes(stage)) {
      throw new BadRequestError(`Cannot save issuer review from ${stage}.`);
    }

    if (context.record.issuer_id !== userId) {
      throw new ForbiddenError('Only the assigned issuer can save the response review.');
    }

    await qmqaService.saveResponseReviewContent(context.record.qmqa_id, userId, payload);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND],
      });
    });

    return this.refetchResult(id, userId, 'Response review saved');
  }

  async submitResponseReview(id: string, userId: string, payload: Record<string, any>) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const issuerReviewSubmitStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
      ];

    if (!issuerReviewSubmitStages.includes(stage)) {
      throw new BadRequestError(`Cannot submit issuer review from ${stage}.`);
    }

    if (context.record.issuer_id !== userId) {
      throw new ForbiddenError('Only the assigned issuer can submit the response review.');
    }

    await qmqaService.saveResponseReviewContent(context.record.qmqa_id, userId, payload);
    const latestResponse = await this.repository.findResponseByQmqaId(context.record.qmqa_id);

    if (!latestResponse?.checker_id || !latestResponse?.approver_id) {
      throw new BadRequestError('Cycle 2 checker and approver must be assigned before submission.');
    }

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER_2ND],
      });
    });

    return this.refetchResult(id, userId, 'Response review submitted to cycle 2 checker');
  }

  async checkResponse(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.CHECKER_2ND) {
      throw new BadRequestError('Only cycle 2 checker-stage QMQA records can be checked.');
    }

    this.ensureAction(
      context,
      QMQA_WORKFLOW_ACTION.CHECK_RESPONSE,
      'Only the assigned cycle 2 checker can check this response.',
    );

    const latestResponse = this.ensureLatestResponse(context);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        checker_date: new Date(),
        checker_remarks: remarks || null,
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER_2ND],
      });
    });

    return this.refetchResult(id, userId, 'Response checked and routed to cycle 2 approver');
  }

  async approveResponse(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.APPROVER_2ND) {
      throw new BadRequestError('Only cycle 2 approver-stage QMQA records can be approved.');
    }

    this.ensureAction(
      context,
      QMQA_WORKFLOW_ACTION.APPROVE_RESPONSE,
      'Only the assigned cycle 2 approver can approve this response.',
    );

    const latestResponse = this.ensureLatestResponse(context);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        approver_date: new Date(),
        approver_remarks: remarks || null,
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_3RD],
      });
    });

    return this.refetchResult(id, userId, 'Response approved and routed to final issuer acceptance');
  }

  async rejectResponse(id: string, userId: string, remarks?: string) {
    this.ensureRemarks(remarks);

    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);
    const latestResponse = this.ensureLatestResponse(context);
    const now = new Date();

    await this.repository.executeTransaction(async (trx) => {
      if (stage === QMQA_WORKFLOW_STAGE.ISSUER_2ND) {
        if (context.record.issuer_id !== userId) {
          throw new ForbiddenError('Only the assigned issuer can reject this response at issuer review.');
        }

        await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
          issuer_date: now,
          issuer_remarks: remarks,
        });
        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND],
        });
        return;
      }

      if (stage === QMQA_WORKFLOW_STAGE.CHECKER_2ND) {
        this.ensureAction(
          context,
          QMQA_WORKFLOW_ACTION.REJECT_RESPONSE,
          'Only the assigned cycle 2 checker can reject this response.',
        );

        await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
          checker_date: now,
          checker_remarks: remarks,
        });
        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND],
        });
        return;
      }

      if (stage === QMQA_WORKFLOW_STAGE.APPROVER_2ND) {
        this.ensureAction(
          context,
          QMQA_WORKFLOW_ACTION.REJECT_RESPONSE,
          'Only the assigned cycle 2 approver can reject this response.',
        );

        await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
          approver_date: now,
          approver_remarks: remarks,
        });
        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND],
        });
        return;
      }

      throw new BadRequestError(`Cannot reject QMQA response from ${stage}.`);
    });

    return this.refetchResult(id, userId, 'QMQA response rejected');
  }

  async acceptResponse(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      throw new BadRequestError('Only final-issuer-stage QMQA records can be accepted.');
    }

    this.ensureAction(
      context,
      QMQA_WORKFLOW_ACTION.ACCEPT_RESPONSE,
      'Only the assigned issuer can accept this response.',
    );

    const latestResponse = this.ensureLatestResponse(context);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        accept_date: new Date(),
        remarks: remarks || latestResponse.remarks || null,
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ACCEPT],
      });
    });

    return this.refetchResult(id, userId, 'QMQA response accepted and closed');
  }

  async notAcceptResponse(id: string, userId: string, remarks?: string) {
    this.ensureRemarks(remarks);

    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      throw new BadRequestError('Only final-issuer-stage QMQA records can be marked as not accepted.');
    }

    this.ensureAction(
      context,
      QMQA_WORKFLOW_ACTION.NOT_ACCEPT_RESPONSE,
      'Only the assigned issuer can mark this response as not accepted.',
    );

    const latestResponse = this.ensureLatestResponse(context);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        remarks,
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT],
      });
    });

    return this.refetchResult(id, userId, 'QMQA response marked as not accepted');
  }

  async submit(id: string, userId: string, remarks?: string) {
    return this.submitMain(id, userId, remarks);
  }

  async check(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (stage === QMQA_WORKFLOW_STAGE.CHECKER) {
      return this.checkMain(id, userId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.CHECKER_2ND) {
      return this.checkResponse(id, userId, remarks);
    }

    throw new BadRequestError(`Cannot check QMQA from ${stage}.`);
  }

  async approve(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (stage === QMQA_WORKFLOW_STAGE.APPROVER) {
      return this.approveMain(id, userId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.APPROVER_2ND) {
      return this.approveResponse(id, userId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      return this.acceptResponse(id, userId, remarks);
    }

    throw new BadRequestError(`Cannot approve QMQA from ${stage}.`);
  }

  async reject(id: string, userId: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (
      stage === QMQA_WORKFLOW_STAGE.CHECKER ||
      stage === QMQA_WORKFLOW_STAGE.APPROVER
    ) {
      return this.rejectMain(id, userId, remarks);
    }

    if (
      stage === QMQA_WORKFLOW_STAGE.ISSUER_2ND ||
      stage === QMQA_WORKFLOW_STAGE.CHECKER_2ND ||
      stage === QMQA_WORKFLOW_STAGE.APPROVER_2ND
    ) {
      return this.rejectResponse(id, userId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      return this.notAcceptResponse(id, userId, remarks);
    }

    throw new BadRequestError(`Cannot reject QMQA from ${stage}.`);
  }

  async issue(id: string, userId: string, remarks?: string) {
    return this.issueMain(id, userId, remarks);
  }

  async cancel(id: string, userId: string, remarks?: string) {
    return this.cancelMain(id, userId, remarks);
  }

  async verify(
    id: string,
    userId: string,
    payload: {
      verification_remarks?: string;
      cycle2_checker_id?: string;
      cycle2_checker_remarks?: string;
      cycle2_approver_id?: string;
      cycle2_approver_remarks?: string;
    },
  ) {
    return this.submitResponseReview(id, userId, {
      verification_remarks: payload.verification_remarks,
      cycle2_checker_id: payload.cycle2_checker_id,
      cycle2_checker_remarks: payload.cycle2_checker_remarks,
      cycle2_approver_id: payload.cycle2_approver_id,
      cycle2_approver_remarks: payload.cycle2_approver_remarks,
    });
  }

  async saveInitialReport(
    id: string,
    userId: string,
    payload: {
      skip_initial?: boolean;
      initial_remarks?: string | null;
      is_submit?: boolean;
    },
    files: any[] = [],
  ) {
    if (payload.is_submit) {
      return this.submitInitialResponse(id, userId, payload, files);
    }

    return this.saveResponse(id, userId, payload, files);
  }

  async submitFinalReport(
    id: string,
    userId: string,
    payload: {
      final_remarks?: string | null;
      is_submit?: boolean;
    },
    files: any[] = [],
  ) {
    if (payload.is_submit) {
      return this.submitFinalResponse(id, userId, payload, files);
    }

    return this.saveResponse(id, userId, payload, files);
  }
}

export const qmqaWorkflowService = new QmqaWorkflowService();
