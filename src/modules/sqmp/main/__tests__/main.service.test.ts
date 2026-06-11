import { describe, expect, it } from 'vitest';
import { MainSqmpService } from '../main.service.js';
import { SQMP_STAGE_CODE } from '../../workflow/workflow.constants.js';

describe('MainSqmpService reference surfaces', () => {
  it('marks non-draft records as eligible for reference surfaces', () => {
    const service = new MainSqmpService() as any;
    service.buildWorkflowMetadata = () => ({ workflowStageCode: SQMP_STAGE_CODE.ISSUER });

    expect(service.isReferenceSurfaceEligibleRecord({ sqmp_id: 'sqmp-1' }, null)).toBe(true);

    service.buildWorkflowMetadata = () => ({ workflowStageCode: SQMP_STAGE_CODE.DRAFT });
    expect(service.isReferenceSurfaceEligibleRecord({ sqmp_id: 'sqmp-1' }, null)).toBe(false);
  });

  it('requires the matching reference-surface form code for surface visibility', () => {
    const service = new MainSqmpService() as any;
    service.buildWorkflowMetadata = () => ({ workflowStageCode: SQMP_STAGE_CODE.ISSUER });

    expect(
      service.isSurfaceVisible(
        { sqmp_id: 'sqmp-1' },
        null,
        'search',
        'user-1',
        'ENGINEER',
        [],
        new Set(['SQMP-09-13']),
      ),
    ).toBe(true);

    expect(
      service.isSurfaceVisible(
        { sqmp_id: 'sqmp-1' },
        null,
        'report',
        'user-1',
        'ENGINEER',
        [],
        new Set(['SQMP-09-13']),
      ),
    ).toBe(false);
  });
});
