import { describe, expect, it } from 'vitest';
import {
  buildSqprWorkflowMetadata,
  getSqprCompatibilityRequestStatus,
  getSqprCompatibilityStatus,
  normalizeSqprWorkflowStage,
} from '../../src/modules/sqpr/workflow/sqpr-workflow.utils.js';
import {
  SQPR_WORKFLOW_ACTION,
  SQPR_WORKFLOW_STAGE,
} from '../../src/modules/sqpr/workflow/sqpr-workflow.constants.js';

describe('SQPR workflow utils', () => {
  it('normalizes legacy numeric stages and current aliases into canonical workflow stages', () => {
    expect(normalizeSqprWorkflowStage('2')).toBe(SQPR_WORKFLOW_STAGE.DRAFT);
    expect(normalizeSqprWorkflowStage('3')).toBe(SQPR_WORKFLOW_STAGE.CHECKER);
    expect(normalizeSqprWorkflowStage('4')).toBe(SQPR_WORKFLOW_STAGE.APPROVER);
    expect(normalizeSqprWorkflowStage('5')).toBe(SQPR_WORKFLOW_STAGE.REJECT_CHECKER);
    expect(normalizeSqprWorkflowStage('6')).toBe(SQPR_WORKFLOW_STAGE.REJECT_APPROVER);
    expect(normalizeSqprWorkflowStage('10')).toBe(SQPR_WORKFLOW_STAGE.ISSUER);
    expect(normalizeSqprWorkflowStage('1')).toBe(SQPR_WORKFLOW_STAGE.ACCEPT);

    expect(normalizeSqprWorkflowStage('DR')).toBe(SQPR_WORKFLOW_STAGE.DRAFT);
    expect(normalizeSqprWorkflowStage('SUBM')).toBe(SQPR_WORKFLOW_STAGE.CHECKER);
    expect(normalizeSqprWorkflowStage('CK')).toBe(SQPR_WORKFLOW_STAGE.APPROVER);
    expect(normalizeSqprWorkflowStage('APRV')).toBe(SQPR_WORKFLOW_STAGE.ISSUER);
    expect(normalizeSqprWorkflowStage('ISSU')).toBe(SQPR_WORKFLOW_STAGE.ACCEPT);
    expect(normalizeSqprWorkflowStage('RJCT', { approver_remarks: 'rework' })).toBe(SQPR_WORKFLOW_STAGE.REJECT_APPROVER);
    expect(normalizeSqprWorkflowStage('RJCT')).toBe(SQPR_WORKFLOW_STAGE.REJECT_CHECKER);
  });

  it('builds checker-stage actions for the assigned actor', () => {
    const metadata = buildSqprWorkflowMetadata(
      {
        request_status: '3',
        checker_id: 'checker-1',
        checker_name: 'Checker One',
      },
      { actor: { userId: 'checker-1' } },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: SQPR_WORKFLOW_STAGE.CHECKER,
      workflowStageCode: '3',
      availableActions: [
        SQPR_WORKFLOW_ACTION.CHECK,
        SQPR_WORKFLOW_ACTION.REJECT,
      ],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker One',
    }));
  });

  it('builds rejected-stage actions for the assigned incharge', () => {
    const metadata = buildSqprWorkflowMetadata(
      {
        request_status: '6',
        incharge_id: 'issuer-1',
        incharge_name: 'Issuer One',
      },
      { actor: { userId: 'issuer-1' } },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: SQPR_WORKFLOW_STAGE.REJECT_APPROVER,
      workflowStageCode: '6',
      availableActions: [
        SQPR_WORKFLOW_ACTION.SAVE,
        SQPR_WORKFLOW_ACTION.RESUBMIT,
      ],
      nextApproverId: 'issuer-1',
      nextApproverName: 'Issuer One',
    }));
  });

  it('maps workflow stages back to the current SQPR compatibility statuses', () => {
    expect(getSqprCompatibilityStatus(SQPR_WORKFLOW_STAGE.CHECKER)).toBe('SUBMITTED');
    expect(getSqprCompatibilityStatus(SQPR_WORKFLOW_STAGE.ISSUER)).toBe('APPROVED');
    expect(getSqprCompatibilityStatus(SQPR_WORKFLOW_STAGE.ACCEPT)).toBe('ISSUED');
    expect(getSqprCompatibilityRequestStatus(SQPR_WORKFLOW_STAGE.DRAFT)).toBe('DRFT');
    expect(getSqprCompatibilityRequestStatus(SQPR_WORKFLOW_STAGE.REJECT_CHECKER)).toBe('RJCT');
  });
});
