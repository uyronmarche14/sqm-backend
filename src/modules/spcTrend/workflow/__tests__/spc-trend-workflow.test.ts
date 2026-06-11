import { describe, expect, it } from 'vitest';
import {
  buildSpcTrendWorkflowMetadata,
  getSpcTrendCompatibilityStatus,
  normalizeSpcTrendWorkflowStage,
} from '../spc-trend-workflow.js';

describe('spc trend workflow', () => {
  it('maps request statuses into the modern compatibility statuses', () => {
    expect(getSpcTrendCompatibilityStatus('2')).toBe('DRAFT');
    expect(getSpcTrendCompatibilityStatus('3')).toBe('AWAITING_CHECKED');
    expect(getSpcTrendCompatibilityStatus('4')).toBe('AWAITING_APPROVAL');
    expect(getSpcTrendCompatibilityStatus('10')).toBe('APPROVED');
    expect(getSpcTrendCompatibilityStatus('1')).toBe('ISSUED');
  });

  it('treats rejected records with an approver as approver-stage rejections', () => {
    expect(
      normalizeSpcTrendWorkflowStage('REJECTED', {
        approver_id: 'approver-1',
      }),
    ).toBe('REJECT_APPROVER');
  });

  it('gives draft owners save and submit actions', () => {
    const metadata = buildSpcTrendWorkflowMetadata(
      {
        request_status: '2',
        incharge_id: 'issuer-1',
      },
      { userId: 'issuer-1' },
    );

    expect(metadata.availableActions).toEqual(['save', 'submit']);
  });

  it('gives approvers approve and reject actions when the record is awaiting approval', () => {
    const metadata = buildSpcTrendWorkflowMetadata(
      {
        request_status: '4',
        approver_id: 'approver-1',
      },
      { userId: 'approver-1' },
    );

    expect(metadata.availableActions).toEqual(['approve', 'reject']);
  });
});
