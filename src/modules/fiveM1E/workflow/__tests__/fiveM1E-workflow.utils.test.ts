import { describe, expect, it } from 'vitest';
import { FIVE_M1E_APPROVAL_SEQ, FIVE_M1E_WORKFLOW_ACTION, FIVE_M1E_WORKFLOW_STAGE } from '../fiveM1E-workflow.constants.js';
import {
  getFiveM1EWorkflowActionForStage,
  getPostDesignApprovalSeq,
  getPostEnviApprovalSeq,
  getPostSqeApprovalSeq,
  normalizeFiveM1EWorkflowStage,
} from '../fiveM1E-workflow.utils.js';

describe('fiveM1E workflow utils', () => {
  it('maps supported legacy approval sequence values to workflow stages', () => {
    expect(
      normalizeFiveM1EWorkflowStage({
        status: 'FOR APPROVAL',
        approval_seq: FIVE_M1E_APPROVAL_SEQ.REVIEWER_LEGACY,
      }),
    ).toBe(FIVE_M1E_WORKFLOW_STAGE.REVIEWER);

    expect(
      normalizeFiveM1EWorkflowStage({
        status: 'FOR APPROVAL',
        approval_seq: FIVE_M1E_APPROVAL_SEQ.EVALUATION_IC,
      }),
    ).toBe(FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC);

    expect(
      normalizeFiveM1EWorkflowStage({
        status: 'FOR APPROVAL',
        approval_seq: FIVE_M1E_APPROVAL_SEQ.ENVI_APPROVER,
      }),
    ).toBe(FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER);

    expect(
      normalizeFiveM1EWorkflowStage({
        status: 'APPROVED',
        approval_seq: FIVE_M1E_APPROVAL_SEQ.RELEASED,
      }),
    ).toBe(FIVE_M1E_WORKFLOW_STAGE.RELEASED);
  });

  it('resolves post-SQE routing with named legacy sequence constants', () => {
    expect(
      getPostSqeApprovalSeq({
        ds_checker_necessary: 'YES',
      }),
    ).toBe(FIVE_M1E_APPROVAL_SEQ.DESIGN_APPROVER);

    expect(
      getPostSqeApprovalSeq({
        envi_checker_necessary: 'YES',
      }),
    ).toBe(FIVE_M1E_APPROVAL_SEQ.ENVI_APPROVER);

    expect(
      getPostSqeApprovalSeq({
        site_id: '9E8EDBF4-A226-48F7-A780-A8B82CD13A50',
        class_id: '10C66925-75F6-41C6-AEBC-8D6DE526800A',
      }),
    ).toBe(FIVE_M1E_APPROVAL_SEQ.FINAL_APPROVER);

    expect(getPostSqeApprovalSeq({})).toBe(FIVE_M1E_APPROVAL_SEQ.QA_CHECKER);
  });

  it('returns the correct workflow action for every known stage', () => {
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.DRAFT)).toBe(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.RAR)).toBe(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE)).toBe(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER)).toBe(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.REVIEWER)).toBe(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC)).toBe(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER)).toBe(FIVE_M1E_WORKFLOW_ACTION.APPROVE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER)).toBe(FIVE_M1E_WORKFLOW_ACTION.CHECK);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER)).toBe(FIVE_M1E_WORKFLOW_ACTION.APPROVE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER)).toBe(FIVE_M1E_WORKFLOW_ACTION.APPROVE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER)).toBe(FIVE_M1E_WORKFLOW_ACTION.APPROVE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER)).toBe(FIVE_M1E_WORKFLOW_ACTION.APPROVE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER)).toBe(FIVE_M1E_WORKFLOW_ACTION.CHECK);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.APPROVED)).toBe(FIVE_M1E_WORKFLOW_ACTION.RELEASE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION)).toBe(FIVE_M1E_WORKFLOW_ACTION.RELEASE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE)).toBe(FIVE_M1E_WORKFLOW_ACTION.RELEASE);
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.UNKNOWN)).toBeNull();
    expect(getFiveM1EWorkflowActionForStage(FIVE_M1E_WORKFLOW_STAGE.REJECTED)).toBeNull();
  });

  it('resolves post-design and post-environment routing with the same canonical constants', () => {
    expect(
      getPostDesignApprovalSeq({
        envi_checker_necessary: 'YES',
      }),
    ).toBe(FIVE_M1E_APPROVAL_SEQ.ENVI_APPROVER);

    expect(
      getPostDesignApprovalSeq({
        site_id: '9E8EDBF4-A226-48F7-A780-A8B82CD13A50',
        class_id: '10C66925-75F6-41C6-AEBC-8D6DE526800A',
      }),
    ).toBe(FIVE_M1E_APPROVAL_SEQ.FINAL_APPROVER);

    expect(getPostDesignApprovalSeq({})).toBe(FIVE_M1E_APPROVAL_SEQ.QA_CHECKER);
    expect(getPostEnviApprovalSeq({})).toBe(FIVE_M1E_APPROVAL_SEQ.QA_CHECKER);
  });
});
