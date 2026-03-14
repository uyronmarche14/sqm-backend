import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { fiveM1ERepository } from '../fiveM1E.repository.js';
import {
  buildFiveM1EWorkflowMetadata,
  getApprovalSeq,
  getPostDesignApprovalSeq,
  getPostEnviApprovalSeq,
  getPostSqeApprovalSeq,
  normalizeFiveM1EWorkflowStage,
} from './fiveM1E-workflow.utils.js';
import { FIVE_M1E_WORKFLOW_STAGE } from './fiveM1E-workflow.constants.js';

type FiveM1EWorkflowRecord = Record<string, unknown>;

function getString(record: FiveM1EWorkflowRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return undefined;
}

function normalizeRequestedFinalStatus(requestedStatus?: string) {
  const normalized = requestedStatus?.trim().toUpperCase();
  if (
    normalized === 'APPROVEDWC' ||
    normalized === 'APPROVED W/CONDITION' ||
    normalized === 'APPROVED W/ CONDITION' ||
    normalized === 'APPROVED WITH CONDITION' ||
    normalized === 'APRDWCOND'
  ) {
    return 'APRDWCOND';
  }

  return 'FOR RELEASE';
}

export class FiveM1EWorkflowService {
  constructor(private readonly repository = fiveM1ERepository) {}

  private async getRecordOrThrow(controlNo: string) {
    const record = await this.repository.findWithApproval(controlNo);
    if (!record) {
      throw new NotFoundError(`5M1E Application ${controlNo} not found`);
    }
    return record as FiveM1EWorkflowRecord;
  }

  private getStageOwner(record: FiveM1EWorkflowRecord) {
    const stage = normalizeFiveM1EWorkflowStage(record);
    switch (stage) {
      case FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER:
        return getString(record, 'mpd_checker', 'MPDChecker', 'mpd_pic', 'MPDPIC');
      case FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER:
        return getString(record, 'mpd_approver', 'MPDApprover');
      case FIVE_M1E_WORKFLOW_STAGE.REVIEWER:
        return getString(record, 'reviewer', 'Reviewer');
      case FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC:
        return getString(record, 'evaluation_ic', 'EvaluationIC');
      case FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER:
        return getString(record, 'checker', 'Checker');
      case FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER:
        return getString(record, 'approver', 'Approver');
      case FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER:
        return getString(record, 'final_approver', 'FinalApprover');
      case FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER:
        return getString(record, 'design_approver_id', 'DesignApproverID');
      case FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER:
        return getString(record, 'envi_approver_id', 'EnviApproverID');
      case FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER:
        return getString(record, 'qa_checker_id', 'QACheckerID');
      case FIVE_M1E_WORKFLOW_STAGE.APPROVED:
      case FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION:
      case FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE:
        return getString(record, 'mpd_pic', 'MPDPIC', 'mpd_approver', 'MPDApprover');
      default:
        return undefined;
    }
  }

  private ensureActor(record: FiveM1EWorkflowRecord, userId: string, message: string) {
    const ownerId = this.getStageOwner(record);
    if (ownerId && ownerId !== userId) {
      throw new ForbiddenError(message);
    }
  }

  private async persistStatusRemark(controlNo: string, userId: string, status: string, remarks?: string) {
    if (!remarks) return;
    await this.repository.insertStatusRemark(controlNo, {
      remarks,
      remark_by: userId,
      status,
    });
  }

  private buildResult(record: FiveM1EWorkflowRecord, controlNo: string) {
    const metadata = buildFiveM1EWorkflowMetadata(record);
    return {
      success: true,
      data: {
        controlNo,
        status: getString(record, 'approval_status', 'status', 'Status'),
        ...metadata,
      },
    };
  }

  private isSameSqeActor(record: FiveM1EWorkflowRecord) {
    const checkerId = getString(record, 'checker', 'Checker');
    const approverId = getString(record, 'approver', 'Approver');
    return Boolean(checkerId && approverId && checkerId === approverId);
  }

  async submitApplication(controlNo: string, userId: string, remarks?: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);
    const createdBy = getString(record, 'CreatedBy', 'created_by');

    if (stage !== FIVE_M1E_WORKFLOW_STAGE.DRAFT && stage !== FIVE_M1E_WORKFLOW_STAGE.RAR) {
      throw new BadRequestError(`Cannot submit 5M1E from ${stage}.`);
    }

    if (createdBy && createdBy !== userId) {
      throw new ForbiddenError('Only the creator can submit this 5M1E application.');
    }

    await this.repository.updateApprovalStatus(controlNo, 'SUBMITTED', {
      ApprovalSeq: 1,
      ModifiedDate: new Date(),
    });
    await this.persistStatusRemark(controlNo, userId, 'SUBMITTED', remarks);

    return {
      ...this.buildResult(
        {
          ...record,
          approval_status: 'SUBMITTED',
          approval_seq: 1,
        },
        controlNo,
      ),
      message: 'Application submitted successfully',
    };
  }

  async checkApplication(controlNo: string, userId: string, remarks?: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER) {
      this.ensureActor(record, userId, 'Only the assigned MPD checker can check this 5M1E application.');
      await this.repository.updateApprovalStatus(controlNo, 'CHECKED', {
        ApprovalSeq: 2,
        MPDCheckerStatus: 1,
        MPDChkrDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'CHECKED', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'CHECKED',
            approval_seq: 2,
            mpd_checker_status: 1,
          },
          controlNo,
        ),
        message: 'Application checked successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER) {
      this.ensureActor(record, userId, 'Only the assigned SQE checker can check this 5M1E application.');
      const sameSqeActor = this.isSameSqeActor(record);
      const nextApprovalSeq = sameSqeActor ? getPostSqeApprovalSeq(record) : 6;
      const nextStatus = sameSqeActor ? 'FOR APPROVAL' : 'CHECKED';
      await this.repository.updateApprovalStatus(controlNo, nextStatus, {
        ApprovalSeq: nextApprovalSeq,
        ChkrStatus: '1',
        AprStatus: sameSqeActor ? '1' : getString(record, 'apr_status', 'AprStatus') ?? null,
        ChkrDtAprd: new Date(),
        ApproverDtAprd: sameSqeActor ? new Date() : getString(record, 'ApproverDtAprd', 'approver_dt_aprd') ?? null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, nextStatus, remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: nextStatus,
            approval_seq: nextApprovalSeq,
            chkr_status: '1',
            apr_status: sameSqeActor ? '1' : getString(record, 'apr_status', 'AprStatus'),
          },
          controlNo,
        ),
        message: 'Application checked successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER) {
      this.ensureActor(record, userId, 'Only the assigned QA checker can check this 5M1E application.');
      await this.repository.updateApprovalStatus(controlNo, 'CHECKED', {
        ApprovalSeq: 7,
        QACheckerStatus: 1,
        QACheckerDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'CHECKED', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'CHECKED',
            approval_seq: 7,
            qa_checker_status: 1,
          },
          controlNo,
        ),
        message: 'Application checked successfully',
      };
    }

    throw new BadRequestError(`Cannot check 5M1E from ${stage}.`);
  }

  async approveApplication(controlNo: string, userId: string, remarks?: string, requestedStatus = 'APPROVED') {
    const record = await this.getRecordOrThrow(controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER) {
      this.ensureActor(record, userId, 'Only the assigned MPD approver can approve this 5M1E application.');
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 3,
        MPDApproverStatus: 1,
        MPDAprDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 3,
            mpd_approver_status: 1,
          },
          controlNo,
        ),
        message: 'Application approved successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.REVIEWER) {
      this.ensureActor(record, userId, 'Only the assigned reviewer can approve this 5M1E application.');
      const currentSeq = getApprovalSeq(record);
      const nextApprovalSeq = currentSeq === 500 ? 501 : 5;
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: nextApprovalSeq,
        ReviewerStatus: 1,
        IssueDate: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: nextApprovalSeq,
            reviewer_status: 1,
          },
          controlNo,
        ),
        message: 'Application approved successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC) {
      this.ensureActor(record, userId, 'Only the assigned evaluation IC can approve this 5M1E application.');
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 5,
        EvaluationICStatus: 1,
        EvaluationICDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 5,
            evaluation_ic_status: 1,
          },
          controlNo,
        ),
        message: 'Application approved successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER) {
      this.ensureActor(record, userId, 'Only the assigned SQE approver can approve this 5M1E application.');
      const nextApprovalSeq = getPostSqeApprovalSeq(record);
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: nextApprovalSeq,
        AprStatus: '1',
        ApproverDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: nextApprovalSeq,
            apr_status: '1',
          },
          controlNo,
        ),
        message: 'Application approved successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER) {
      this.ensureActor(record, userId, 'Only the assigned design approver can approve this 5M1E application.');
      const nextApprovalSeq = getPostDesignApprovalSeq(record);
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: nextApprovalSeq,
        DesignApproverStatus: 1,
        DesignApproverDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: nextApprovalSeq,
            design_approver_status: 1,
          },
          controlNo,
        ),
        message: 'Application approved successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER) {
      this.ensureActor(record, userId, 'Only the assigned environment approver can approve this 5M1E application.');
      const nextApprovalSeq = getPostEnviApprovalSeq(record);
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: nextApprovalSeq,
        EnviApproveStatus: 1,
        EnviApproveDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: nextApprovalSeq,
            envi_approve_status: 1,
          },
          controlNo,
        ),
        message: 'Application approved successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER) {
      this.ensureActor(record, userId, 'Only the assigned final approver can approve this 5M1E application.');
      const nextStatus = normalizeRequestedFinalStatus(requestedStatus);

      if (nextStatus === 'APRDWCOND') {
        await this.repository.updateApprovalStatus(controlNo, 'APRDWCOND', {
          ApprovalSeq: 14,
          FAStatus: 'aprdwcond',
          FADtAprd: new Date(),
          ModifiedDate: new Date(),
        });
        await this.persistStatusRemark(controlNo, userId, 'APRDWCOND', remarks);
        return {
          ...this.buildResult(
            {
              ...record,
              approval_status: 'APRDWCOND',
              approval_seq: 14,
              fa_status: 'aprdwcond',
            },
            controlNo,
          ),
          message: 'Application approved successfully',
        };
      }

      await this.repository.updateApprovalStatus(controlNo, 'FOR RELEASE', {
        ApprovalSeq: 8,
        FAStatus: 'approved',
        FADtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR RELEASE', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR RELEASE',
            approval_seq: 8,
            fa_status: 'approved',
          },
          controlNo,
        ),
        message: 'Application approved successfully',
      };
    }

    throw new BadRequestError(`Cannot approve 5M1E from ${stage}.`);
  }

  async rejectApplication(controlNo: string, userId: string, remarks?: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (stage === FIVE_M1E_WORKFLOW_STAGE.DRAFT || stage === FIVE_M1E_WORKFLOW_STAGE.UNKNOWN) {
      throw new BadRequestError(`Cannot reject 5M1E from ${stage}.`);
    }

    this.ensureActor(record, userId, 'Only the assigned actor can reject this 5M1E application.');

    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER) {
      await this.repository.updateApprovalStatus(controlNo, 'REJECTED', {
        RejectedBy: userId,
        RejectedDate: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'REJECTED', remarks);
      return {
        ...this.buildResult({ ...record, approval_status: 'REJECTED' }, controlNo),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER) {
      await this.repository.updateApprovalStatus(controlNo, 'SUBMITTED', {
        ApprovalSeq: 0,
        MPDApproverStatus: null,
        MPDAprDtAprd: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'SUBMITTED', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'SUBMITTED',
            approval_seq: 0,
            mpd_approver_status: null,
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.REVIEWER) {
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 3,
        ReviewerStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 3,
            reviewer_status: null,
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER) {
      const sameSqeActor = this.isSameSqeActor(record);
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 5,
        ChkrStatus: null,
        AprStatus: sameSqeActor ? null : getString(record, 'apr_status', 'AprStatus') ?? null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 5,
            chkr_status: null,
            apr_status: sameSqeActor ? null : getString(record, 'apr_status', 'AprStatus'),
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER) {
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 6,
        AprStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 6,
            apr_status: null,
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER) {
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 7,
        FAStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 7,
            fa_status: null,
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER) {
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 10,
        DesignApproverStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 10,
            design_approver_status: null,
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER) {
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 12,
        EnviApproveStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 12,
            envi_approve_status: null,
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER) {
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 13,
        QACheckerStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      return {
        ...this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 13,
            qa_checker_status: null,
          },
          controlNo,
        ),
        message: 'Application rejected successfully',
      };
    }

    throw new BadRequestError(`Cannot reject 5M1E from ${stage}.`);
  }

  async releaseApplication(controlNo: string, userId: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (stage !== FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE) {
      throw new BadRequestError(`Cannot release 5M1E from ${stage}.`);
    }

    const ownerId = this.getStageOwner(record);
    if (ownerId && ownerId !== userId) {
      throw new ForbiddenError('Only the assigned release owner can release this 5M1E application.');
    }

    await this.repository.updateApprovalStatus(controlNo, 'APPROVED', {
      ApprovalSeq: 15,
      ModifiedDate: new Date(),
    });

    return {
      ...this.buildResult(
        {
          ...record,
          approval_status: 'APPROVED',
          approval_seq: 15,
        },
        controlNo,
      ),
      message: 'Application released successfully',
    };
  }
}

export const fiveM1EWorkflowService = new FiveM1EWorkflowService();
