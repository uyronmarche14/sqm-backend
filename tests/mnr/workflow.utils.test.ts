import { describe, expect, it } from 'vitest';
import {
  buildMnrWorkflowMetadata,
  normalizeMnrWorkflowStage,
} from '../../src/modules/mnr/workflow/mnr-workflow.utils.js';
import {
  MNR_WORKFLOW_ACTION,
  MNR_WORKFLOW_STAGE,
} from '../../src/modules/mnr/workflow/mnr-workflow.constants.js';

describe('MNR workflow utils', () => {
  it('maps current DB issuer code to the legacy issuer stage', () => {
    const stage = normalizeMnrWorkflowStage('AP');
    expect(stage).toBe(MNR_WORKFLOW_STAGE.ISSUER);
  });

  it('builds cycle 1 checker actions for the assigned checker', () => {
    const metadata = buildMnrWorkflowMetadata(
      {
        request_status: 'SU',
        checker_id: 'checker-1',
        checker_name: 'Checker One',
      },
      { actor: { userId: 'checker-1' } },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: MNR_WORKFLOW_STAGE.CHECKER,
      workflowStageCode: '3',
      availableActions: [
        MNR_WORKFLOW_ACTION.CHECK_MAIN,
        MNR_WORKFLOW_ACTION.REJECT_MAIN,
      ],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker One',
    }));
  });

  it('sources cycle 2 checker ownership from the latest response row', () => {
    const metadata = buildMnrWorkflowMetadata(
      {
        request_status: 'RC',
        checker_id: 'cycle1-checker',
      },
      {
        latestResponse: {
          checker_id: 'cycle2-checker',
          checker_name: 'Cycle 2 Checker',
        },
      },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: MNR_WORKFLOW_STAGE.CHECKER_2ND,
      workflowStageCode: '16',
      nextApproverId: 'cycle2-checker',
      nextApproverName: 'Cycle 2 Checker',
    }));
  });

  it('builds cycle 2 checker actions for the assigned cycle 2 checker', () => {
    const metadata = buildMnrWorkflowMetadata(
      {
        request_status: 'RC',
      },
      {
        latestResponse: {
          checker_id: 'cycle2-checker',
          checker_name: 'Cycle 2 Checker',
        },
        actor: { userId: 'cycle2-checker' },
      },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: MNR_WORKFLOW_STAGE.CHECKER_2ND,
      workflowStageCode: '16',
      availableActions: [
        MNR_WORKFLOW_ACTION.CHECK_RESPONSE,
        MNR_WORKFLOW_ACTION.REJECT_RESPONSE,
      ],
    }));
  });

  it('builds final issuer actions at stage 19', () => {
    const metadata = buildMnrWorkflowMetadata(
      {
        request_status: 'RV',
        issuer_id: 'issuer-1',
        issuer_name: 'Issuer One',
      },
      {
        actor: { userId: 'issuer-1' },
      },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: MNR_WORKFLOW_STAGE.ISSUER_3RD,
      workflowStageCode: '19',
      availableActions: [
        MNR_WORKFLOW_ACTION.ACCEPT_RESPONSE,
        MNR_WORKFLOW_ACTION.NOT_ACCEPT_RESPONSE,
      ],
      nextApproverId: 'issuer-1',
      nextApproverName: 'Issuer One',
    }));
  });
});
