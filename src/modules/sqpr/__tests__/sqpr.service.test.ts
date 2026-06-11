import { describe, expect, it } from 'vitest';
import { SqprService } from '../sqpr.service.js';

describe('SqprService reference visibility', () => {
  it('treats both approved and issued tracking stages as reference-visible', () => {
    const service = new SqprService() as any;

    expect(service.isReferenceVisibleStage('ISSUER')).toBe(true);
    expect(service.isReferenceVisibleStage('ACCEPT')).toBe(true);
    expect(service.isReferenceVisibleStage('APPROVER')).toBe(false);
  });

  it('honors explicit reference surfaces when the role has view-list access', () => {
    const service = new SqprService() as any;
    service.getWorkflowStage = () => 'ISSUER';

    expect(
      service.isSurfaceVisible(
        { sqpr_id: 'sqpr-1' },
        { userId: 'user-1', roleName: 'ENGINEER' },
        new Set(['SQPR-03-04']),
        'tracking',
      ),
    ).toBe(true);
  });
});
