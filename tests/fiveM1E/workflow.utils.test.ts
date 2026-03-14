import { describe, expect, it } from 'vitest';
import {
  buildFiveM1EWorkflowMetadata,
  normalizeFiveM1EWorkflowStage,
} from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.utils.js';
import {
  FIVE_M1E_WORKFLOW_ACTION,
  FIVE_M1E_WORKFLOW_STAGE,
} from '../../src/modules/fiveM1E/workflow/fiveM1E-workflow.constants.js';

describe('5M1E workflow utils', () => {
  it('maps submitted approval sequence 1 to the MPD checker stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'SUBMITTED',
      approval_seq: 1,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER);
  });

  it('maps legacy reviewer sequence 500 to the reviewer stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'FOR APPROVAL',
      approval_seq: 500,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.REVIEWER);
  });

  it('maps evaluation IC sequence 501 to the evaluation IC stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'FOR APPROVAL',
      approval_seq: 501,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC);
  });

  it('maps approved-with-condition aliases to the approved with condition stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'APRDWCOND',
      approval_seq: 14,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION);
  });

  it('maps for-release sequence 8 to the release gate', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'FOR RELEASE',
      approval_seq: 8,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE);
  });

  it('builds design approver actions for the assigned actor', () => {
    const metadata = buildFiveM1EWorkflowMetadata(
      {
        approval_status: 'FOR APPROVAL',
        approval_seq: 10,
        design_approver_id: 'design-1',
        design_approver_id_name: 'Design One',
      },
      { actorUserId: 'design-1' },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER,
      workflowStageCode: '10',
      availableActions: [
        FIVE_M1E_WORKFLOW_ACTION.APPROVE,
        FIVE_M1E_WORKFLOW_ACTION.REJECT,
      ],
      nextApproverId: 'design-1',
      nextApproverName: 'Design One',
    }));
  });

  it('builds QA checker actions for the assigned actor', () => {
    const metadata = buildFiveM1EWorkflowMetadata(
      {
        approval_status: 'FOR APPROVAL',
        approval_seq: 13,
        qa_checker_id: 'qa-1',
        qa_checker_full_name: 'QA One',
      },
      { actorUserId: 'qa-1' },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER,
      workflowStageCode: '13',
      availableActions: [
        FIVE_M1E_WORKFLOW_ACTION.CHECK,
        FIVE_M1E_WORKFLOW_ACTION.REJECT,
      ],
      nextApproverId: 'qa-1',
      nextApproverName: 'QA One',
    }));
  });

  it('gives the draft creator the submit action', () => {
    const metadata = buildFiveM1EWorkflowMetadata(
      {
        approval_status: 'DRAFT',
        CreatedBy: 'creator-1',
      },
      { actorUserId: 'creator-1' },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.DRAFT,
      workflowStageCode: 'DRAFT',
      availableActions: [FIVE_M1E_WORKFLOW_ACTION.SUBMIT],
    }));
  });
});
