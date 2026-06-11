import { describe, expect, it } from 'vitest';

import { controlNumberService } from '../../src/shared/services/control-number.service.js';

describe('ControlNumberService SQMP legacy control number formatting', () => {
  it('uses legacy A/B semester tokens for SQMP control numbers', async () => {
    await expect(
      controlNumberService.previewSqmp({
        fiscalYear: 2028,
        siteCode: 'TEST02',
        series: 0,
        semester: '1ST',
      }),
    ).resolves.toBe('SQMP-2028-TEST02-0-A');

    await expect(
      controlNumberService.previewSqmp({
        fiscalYear: 2028,
        siteCode: 'TEST02',
        series: 0,
        semester: '2ND',
      }),
    ).resolves.toBe('SQMP-2028-TEST02-0-B');
  });

  it('rejects SQMP control numbers that exceed the legacy column width', async () => {
    await expect(
      controlNumberService.previewSqmp({
        fiscalYear: 2028,
        siteCode: 'LONGSITECODE',
        series: 0,
        semester: '1ST',
      }),
    ).rejects.toThrow('legacy 20-character limit');
  });
});
