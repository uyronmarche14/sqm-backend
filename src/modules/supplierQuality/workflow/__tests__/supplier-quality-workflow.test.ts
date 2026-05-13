import { describe, expect, it } from 'vitest';
import {
  buildSupplierQualityWorkflowMetadata,
  getSupplierQualityCompatibilityStatus,
  normalizeSupplierQualityWorkflowStage,
} from '../supplier-quality-workflow.js';

describe('supplier quality workflow', () => {
  it('maps legacy request statuses into compatibility statuses', () => {
    expect(getSupplierQualityCompatibilityStatus('2')).toBe('DRAFT');
    expect(getSupplierQualityCompatibilityStatus('3')).toBe('AWAITING_CHECKED');
    expect(getSupplierQualityCompatibilityStatus('4')).toBe('AWAITING_APPROVAL');
    expect(getSupplierQualityCompatibilityStatus('10')).toBe('APPROVED');
    expect(getSupplierQualityCompatibilityStatus('1')).toBe('ISSUED');
  });

  it('recognizes approver rejection when rejection comes after approver participation', () => {
    expect(
      normalizeSupplierQualityWorkflowStage('REJECTED', {
        approver_remarks: 'Fix the numbers',
      }),
    ).toBe('REJECT_APPROVER');
  });

  it('exposes issuer actions for rejected records and routes ownership back to the issuer', () => {
    const metadata = buildSupplierQualityWorkflowMetadata(
      {
        request_status: '5',
        incharge_id: 'issuer-1',
        incharge_name: 'Issuer One',
      },
      { userId: 'issuer-1' },
    );

    expect(metadata.availableActions).toEqual(['save', 'resubmit', 'submit']);
    expect(metadata.nextApproverId).toBe('issuer-1');
    expect(metadata.nextApproverName).toBe('Issuer One');
  });

  it('exposes checker actions only to the assigned checker', () => {
    const metadata = buildSupplierQualityWorkflowMetadata(
      {
        request_status: '3',
        checker_id: 'checker-1',
      },
      { userId: 'checker-1' },
    );

    expect(metadata.availableActions).toEqual(['check', 'reject']);
  });
});
