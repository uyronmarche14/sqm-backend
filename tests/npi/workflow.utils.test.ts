import { describe, expect, it } from 'vitest';
import { getNpiDbStatusesForFilter } from '../../src/modules/npi/workflow/npi-workflow.utils.js';

describe('NPI queue filter normalization', () => {
  it('maps approval aliases to checker and approver db statuses', () => {
    expect(getNpiDbStatusesForFilter('AAPPROVAL')?.sort()).toEqual(['CK', 'SU']);
    expect(getNpiDbStatusesForFilter('AWAITING_CHECKED,AWAITING_APPROVAL')?.sort()).toEqual(['CK', 'SU']);
  });

  it('maps lot-tracking aliases to accepted and lot-tracking db statuses', () => {
    expect(getNpiDbStatusesForFilter('LOTTRACKING')?.sort()).toEqual(['AP', 'LT']);
    expect(getNpiDbStatusesForFilter('LARMONITORING')?.sort()).toEqual(['AP', 'LT']);
    expect(getNpiDbStatusesForFilter('APPROVED')?.sort()).toEqual(['AP', 'LT']);
  });

  it('treats search as an unfiltered queue', () => {
    expect(getNpiDbStatusesForFilter('SEARCH')).toBeUndefined();
    expect(getNpiDbStatusesForFilter('ALL')).toBeUndefined();
  });
});
