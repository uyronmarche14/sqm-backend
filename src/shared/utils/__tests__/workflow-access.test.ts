import { describe, expect, it, vi } from 'vitest';
import {
  filterWorkflowRecords,
  resolveWorkflowListScope,
  resolveWorkflowListSurface,
} from '../workflow-access.js';

describe('workflow-access utilities', () => {
  it('normalizes explicit workflow surfaces', () => {
    expect(resolveWorkflowListSurface({ surface: ' Search ' })).toBe('search');
    expect(resolveWorkflowListSurface({ surface: '' })).toBeUndefined();
  });

  it('keeps assignedToMe compatibility for scope resolution', () => {
    expect(resolveWorkflowListScope({ assignedToMe: true })).toBe('assigned');
    expect(resolveWorkflowListScope({ scope: 'mine' })).toBe('mine');
  });

  it('prefers explicit surface filtering over scope filtering', () => {
    const isAssigned = vi.fn((record: { id: string }) => record.id === 'assigned');
    const isSurfaceVisible = vi.fn((record: { id: string }, surface: string) =>
      surface === 'search' && record.id === 'reference',
    );

    const result = filterWorkflowRecords(
      [{ id: 'assigned' }, { id: 'reference' }],
      { scope: 'assigned', surface: 'search' },
      {
        isAssigned,
        isSurfaceVisible,
      },
    );

    expect(result).toEqual([{ id: 'reference' }]);
    expect(isAssigned).not.toHaveBeenCalled();
    expect(isSurfaceVisible).toHaveBeenCalledTimes(2);
  });
});
