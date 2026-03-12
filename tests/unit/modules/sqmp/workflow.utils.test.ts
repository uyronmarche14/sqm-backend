import { describe, expect, it } from 'vitest';
import {
  buildSqmpWorkflowMetadata,
  canUserAccessSqmpRecord,
  resolveSqmpStageCode,
} from '../../../../src/modules/sqmp/workflow/workflow.utils.js';
import {
  SQMP_STAGE_CODE,
  SQMP_WORKFLOW_ACTION,
} from '../../../../src/modules/sqmp/workflow/workflow.constants.js';

describe('SQMP workflow utils', () => {
  it('uses SQMP_RESPONSE assignees for cycle 2 checker routing', () => {
    const record = {
      request_status: SQMP_STAGE_CODE.CHECKER_2ND,
      issuer_id: 'issuer-1',
      checker_id: 'main-checker',
      approver_id: 'main-approver',
      supplier_id: 'supplier-1',
    };
    const latestResponse = {
      checker_id: 'response-checker',
      checker_name: 'Cycle 2 Checker',
      approver_id: 'response-approver',
      approver_name: 'Cycle 2 Approver',
    };

    const metadata = buildSqmpWorkflowMetadata({
      record,
      latestResponse,
      userId: 'response-checker',
      roleName: 'TIP USER',
      supplierIds: [],
    });

    expect(metadata.workflowStageCode).toBe(SQMP_STAGE_CODE.CHECKER_2ND);
    expect(metadata.nextApproverId).toBe('response-checker');
    expect(metadata.nextApproverName).toBe('Cycle 2 Checker');
    expect(metadata.availableActions).toEqual([
      SQMP_WORKFLOW_ACTION.CHECK_CLOSURE,
      SQMP_WORKFLOW_ACTION.REJECT_CLOSURE,
    ]);
  });

  it('grants supplier response access only through supplier mapping', () => {
    const record = {
      request_status: SQMP_STAGE_CODE.SUPPLIER,
      supplier_id: 'supplier-42',
      supplier_name: 'Mapped Supplier',
    };

    expect(
      canUserAccessSqmpRecord({
        record,
        userId: 'supplier-user',
        roleName: 'SUPPLIER',
        supplierIds: ['supplier-42'],
      }),
    ).toBe(true);

    expect(
      canUserAccessSqmpRecord({
        record,
        userId: 'supplier-user',
        roleName: 'SUPPLIER',
        supplierIds: [],
      }),
    ).toBe(false);

    const metadata = buildSqmpWorkflowMetadata({
      record,
      userId: 'supplier-user',
      roleName: 'SUPPLIER',
      supplierIds: ['supplier-42'],
    });

    expect(metadata.availableActions).toEqual([
      SQMP_WORKFLOW_ACTION.SAVE_RESPONSE,
      SQMP_WORKFLOW_ACTION.SUBMIT_RESPONSE,
    ]);
  });

  it('distinguishes final issuer not-accept from generic response rejection', () => {
    const stageCode = resolveSqmpStageCode(
      { request_status: 'RJ' },
      { accept_date: new Date().toISOString() },
    );

    expect(stageCode).toBe(SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER);
  });
});
