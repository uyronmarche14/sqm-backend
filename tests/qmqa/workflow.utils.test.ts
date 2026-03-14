import { describe, expect, it } from 'vitest';
import {
  buildQmqaWorkflowMetadata,
  getQmqaCompatibilityStatus,
  normalizeQmqaWorkflowStage,
} from '../../src/modules/qmqa/workflow/qmqa-workflow.utils.js';
import {
  QMQA_WORKFLOW_ACTION,
  QMQA_WORKFLOW_STAGE,
} from '../../src/modules/qmqa/workflow/qmqa-workflow.constants.js';

describe('QMQA workflow utils', () => {
  it('normalizes legacy numeric stages and current aliases into canonical workflow stages', () => {
    expect(normalizeQmqaWorkflowStage('2')).toBe(QMQA_WORKFLOW_STAGE.DRAFT);
    expect(normalizeQmqaWorkflowStage('3')).toBe(QMQA_WORKFLOW_STAGE.CHECKER);
    expect(normalizeQmqaWorkflowStage('4')).toBe(QMQA_WORKFLOW_STAGE.APPROVER);
    expect(normalizeQmqaWorkflowStage('10')).toBe(QMQA_WORKFLOW_STAGE.ISSUER);
    expect(normalizeQmqaWorkflowStage('11')).toBe(QMQA_WORKFLOW_STAGE.SUPPLIER);
    expect(normalizeQmqaWorkflowStage('14')).toBe(QMQA_WORKFLOW_STAGE.FINAL_RESPONSE);
    expect(normalizeQmqaWorkflowStage('19')).toBe(QMQA_WORKFLOW_STAGE.ISSUER_3RD);
    expect(normalizeQmqaWorkflowStage('24')).toBe(QMQA_WORKFLOW_STAGE.NOT_ACCEPT);

    expect(normalizeQmqaWorkflowStage('DR')).toBe(QMQA_WORKFLOW_STAGE.DRAFT);
    expect(normalizeQmqaWorkflowStage('AP')).toBe(QMQA_WORKFLOW_STAGE.ISSUER);
    expect(normalizeQmqaWorkflowStage('IS')).toBe(QMQA_WORKFLOW_STAGE.SUPPLIER);
    expect(normalizeQmqaWorkflowStage('WI')).toBe(QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE);
    expect(normalizeQmqaWorkflowStage('WF')).toBe(QMQA_WORKFLOW_STAGE.FINAL_RESPONSE);
    expect(normalizeQmqaWorkflowStage('RA', { checker_id: 'checker-2' })).toBe(QMQA_WORKFLOW_STAGE.CHECKER_2ND);
  });

  it('builds cycle 1 checker actions for the assigned actor', () => {
    const metadata = buildQmqaWorkflowMetadata(
      {
        request_status: '3',
        checker_id: 'checker-1',
        checker_name: 'Checker One',
      },
      { actor: { userId: 'checker-1' } },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: QMQA_WORKFLOW_STAGE.CHECKER,
      workflowStageCode: '3',
      availableActions: [
        QMQA_WORKFLOW_ACTION.CHECK_MAIN,
        QMQA_WORKFLOW_ACTION.REJECT_MAIN,
      ],
      nextApproverId: 'checker-1',
      nextApproverName: 'Checker One',
    }));
  });

  it('sources cycle 2 ownership from the latest QMQA response row', () => {
    const metadata = buildQmqaWorkflowMetadata(
      {
        request_status: '17',
        issuer_id: 'issuer-1',
      },
      {
        latestResponse: {
          checker_id: 'checker-2',
          checker_name: 'Checker Two',
          approver_id: 'approver-2',
          approver_name: 'Approver Two',
        },
        actor: { userId: 'approver-2' },
      },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: QMQA_WORKFLOW_STAGE.APPROVER_2ND,
      workflowStageCode: '17',
      nextApproverId: 'approver-2',
      nextApproverName: 'Approver Two',
      availableActions: [
        QMQA_WORKFLOW_ACTION.APPROVE_RESPONSE,
        QMQA_WORKFLOW_ACTION.REJECT_RESPONSE,
      ],
    }));
  });

  it('grants supplier-stage actions when the actor matches supplier membership', () => {
    const metadata = buildQmqaWorkflowMetadata(
      {
        request_status: '11',
        attention_id: 'attention-1',
        attention_name: 'Supplier Attention',
        supplier_id: 'supplier-1',
      },
      {
        actor: { userId: 'supplier-user', supplierIds: ['supplier-1'] },
      },
    );

    expect(metadata).toEqual(expect.objectContaining({
      workflowStage: QMQA_WORKFLOW_STAGE.SUPPLIER,
      workflowStageCode: '11',
      nextApproverId: 'attention-1',
      nextApproverName: 'Supplier Attention',
      availableActions: [
        QMQA_WORKFLOW_ACTION.SAVE_RESPONSE,
        QMQA_WORKFLOW_ACTION.SUBMIT_INITIAL_RESPONSE,
      ],
    }));
  });

  it('maps final acceptance and supplier rejection stages to compatibility statuses', () => {
    expect(getQmqaCompatibilityStatus(QMQA_WORKFLOW_STAGE.ACCEPT)).toBe('CLOSED');
    expect(getQmqaCompatibilityStatus(QMQA_WORKFLOW_STAGE.NOT_ACCEPT)).toBe('RESPONSE_REJECTED');
    expect(getQmqaCompatibilityStatus(QMQA_WORKFLOW_STAGE.CHECKER_2ND)).toBe('RESPONSE_AWAIT_APPROVAL');
  });
});
