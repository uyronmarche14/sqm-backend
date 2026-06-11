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
  it('maps submitted approval sequence 1 to the submitted MPD stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'SUBMITTED',
      approval_seq: 1,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER);
  });

  it('maps for-approval sequence 4 to the evaluation editor stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'FOR APPROVAL',
      approval_seq: 4,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.REVIEWER);
  });

  it('maps for-approval sequence 5 to the checker stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'FOR APPROVAL',
      approval_seq: 5,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER);
  });

  it('maps approved-with-condition aliases to the approved with condition stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'APRDWCOND',
      approval_seq: 14,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION);
  });

  it('maps approved sequence 7 to the approved release stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'APPROVED',
      approval_seq: 7,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.APPROVED);
  });

  it('maps release sequence 15 into the released stage', () => {
    const stage = normalizeFiveM1EWorkflowStage({
      approval_status: 'RELEASE',
      approval_seq: 15,
    });

    expect(stage).toBe(FIVE_M1E_WORKFLOW_STAGE.RELEASED);
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

  it('gives the assigned MPD actor submit in submitted', () => {
    const metadata = buildFiveM1EWorkflowMetadata(
      {
        approval_status: 'SUBMITTED',
        approval_seq: 1,
        mpd_checker: 'mpd-1',
        mpd_checker_name: 'MPD One',
      },
      { actorUserId: 'mpd-1' },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER,
      workflowStageCode: '1',
      availableActions: [FIVE_M1E_WORKFLOW_ACTION.SUBMIT],
      nextApproverId: 'mpd-1',
      nextApproverName: 'MPD One',
    }));
  });

  it('gives editor-queue submit in for approval when the actor has stage access without explicit owner match', () => {
    const metadata = buildFiveM1EWorkflowMetadata(
      {
        approval_status: 'FOR APPROVAL',
        approval_seq: 4,
        reviewer: 'different-reviewer',
        reviewer_name: 'Different Reviewer',
      },
      {
        actorUserId: 'role-editor-1',
        actorHasStageAccess: true,
      },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.REVIEWER,
      workflowStageCode: '4',
      availableActions: [FIVE_M1E_WORKFLOW_ACTION.SUBMIT],
    }));
  });

  it('gives the assigned checker check and reject in for approval', () => {
    const metadata = buildFiveM1EWorkflowMetadata(
      {
        approval_status: 'FOR APPROVAL',
        approval_seq: 5,
        checker: 'checker-1',
        checker_name: 'Checker One',
      },
      { actorUserId: 'checker-1' },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER,
      workflowStageCode: '5',
      availableActions: [
        FIVE_M1E_WORKFLOW_ACTION.CHECK,
        FIVE_M1E_WORKFLOW_ACTION.REJECT,
      ],
    }));
  });

  it('gives the assigned final owner release on approved records', () => {
    const metadata = buildFiveM1EWorkflowMetadata(
      {
        approval_status: 'APPROVED',
        approval_seq: 7,
        final_approver: 'final-1',
        fa_name: 'Final One',
      },
      { actorUserId: 'final-1' },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: FIVE_M1E_WORKFLOW_STAGE.APPROVED,
      workflowStageCode: '15',
      availableActions: [FIVE_M1E_WORKFLOW_ACTION.RELEASE],
      nextApproverId: 'final-1',
      nextApproverName: 'Final One',
    }));
  });
});
