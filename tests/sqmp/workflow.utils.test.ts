import { describe, it, expect } from 'vitest';
import { buildSqmpWorkflowMetadata } from '../../src/modules/sqmp/workflow/workflow.utils';
import { SQMP_WORKFLOW_ACTION } from '../../src/modules/sqmp/workflow/workflow.constants';

const baseRecord = {
  sqmp_id: 'sqmp-1',
  request_status: '2',
  supplier_id: 'supplier-1',
  supplier_name: 'Supplier One',
  issuer_id: 'issuer-1',
  issuer_name: 'Issuer One',
  checker_id: 'checker-1',
  checker_name: 'Checker One',
  approver_id: 'approver-1',
  approver_name: 'Approver One',
};

describe('SQMP workflow metadata', () => {
  it('treats stage 21 as issuer-side closure rework', () => {
    const metadata = buildSqmpWorkflowMetadata({
      record: {
        ...baseRecord,
        request_status: '21',
      },
      latestResponse: {
        sqmp_response_id: 'response-1',
        checker_id: 'closure-checker-1',
        checker_name: 'Closure Checker',
        approver_id: 'closure-approver-1',
        approver_name: 'Closure Approver',
      },
      userId: 'issuer-1',
      roleName: 'USER',
      supplierIds: [],
    });

    expect(metadata.workflowStageCode).toBe('21');
    expect(metadata.nextApproverId).toBe('issuer-1');
    expect(metadata.availableActions).toEqual([
      SQMP_WORKFLOW_ACTION.SAVE_CLOSURE,
      SQMP_WORKFLOW_ACTION.SUBMIT_CLOSURE,
    ]);
  });

  it('sources cycle 2 checker and approver from SQMP_RESPONSE', () => {
    const checkerMetadata = buildSqmpWorkflowMetadata({
      record: {
        ...baseRecord,
        request_status: '16',
      },
      latestResponse: {
        checker_id: 'closure-checker-1',
        checker_name: 'Closure Checker',
        approver_id: 'closure-approver-1',
        approver_name: 'Closure Approver',
      },
      userId: 'closure-checker-1',
      roleName: 'USER',
      supplierIds: [],
    });

    const approverMetadata = buildSqmpWorkflowMetadata({
      record: {
        ...baseRecord,
        request_status: '17',
      },
      latestResponse: {
        checker_id: 'closure-checker-1',
        checker_name: 'Closure Checker',
        approver_id: 'closure-approver-1',
        approver_name: 'Closure Approver',
      },
      userId: 'closure-approver-1',
      roleName: 'USER',
      supplierIds: [],
    });

    expect(checkerMetadata.nextApproverId).toBe('closure-checker-1');
    expect(approverMetadata.nextApproverId).toBe('closure-approver-1');
  });

  it('returns supplier as next approver for not-accepted closure re-response', () => {
    const metadata = buildSqmpWorkflowMetadata({
      record: {
        ...baseRecord,
        request_status: '24',
      },
      latestResponse: {
        accept_date: '2026-03-11T00:00:00.000Z',
      },
      userId: 'supplier-user-1',
      roleName: 'SUPPLIER',
      supplierIds: ['supplier-1'],
    });

    expect(metadata.nextApproverId).toBe('supplier-1');
    expect(metadata.nextApproverName).toBe('Supplier One');
    expect(metadata.availableActions).toEqual([
      SQMP_WORKFLOW_ACTION.SAVE_RESPONSE,
      SQMP_WORKFLOW_ACTION.SUBMIT_RESPONSE,
    ]);
  });

  it('allows attention-assigned supplier users to act on legacy supplier response stages', () => {
    const metadata = buildSqmpWorkflowMetadata({
      record: {
        ...baseRecord,
        request_status: '13',
        attention_id: 'attention-user-1',
        attention_name: 'Supplier Contact',
      },
      latestResponse: undefined,
      userId: 'attention-user-1',
      roleName: 'SUPPLIER',
      supplierIds: [],
    });

    expect(metadata.workflowStageCode).toBe('11');
    expect(metadata.nextApproverId).toBe('attention-user-1');
    expect(metadata.nextApproverName).toBe('Supplier Contact');
    expect(metadata.availableActions).toEqual([
      SQMP_WORKFLOW_ACTION.SAVE_RESPONSE,
      SQMP_WORKFLOW_ACTION.SUBMIT_RESPONSE,
    ]);
  });
});
