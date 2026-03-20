import { beforeEach, describe, expect, it, vi } from 'vitest';

const workflowServiceMock = vi.hoisted(() => ({
  canUserDeleteRecord: vi.fn(),
}));

vi.mock('../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js', () => ({
  fiveM1EWorkflowService: workflowServiceMock,
}));

import { requireFiveM1EDeleteAccess } from '../../src/modules/fiveM1E/requireFiveM1EDeleteAccess.js';
import { ForbiddenError, UnauthorizedError } from '../../src/shared/errors/AppError.js';

describe('requireFiveM1EDeleteAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the request when the actor can delete the record', async () => {
    workflowServiceMock.canUserDeleteRecord.mockResolvedValue(true);
    const next = vi.fn();

    await requireFiveM1EDeleteAccess(
      { params: { id: '5M-001' }, user: { userId: 'creator-1', roleName: 'USER' } } as any,
      {} as any,
      next,
    );

    expect(workflowServiceMock.canUserDeleteRecord).toHaveBeenCalledWith('5M-001', 'creator-1', 'USER');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects the request when the actor cannot delete the record', async () => {
    workflowServiceMock.canUserDeleteRecord.mockResolvedValue(false);
    const next = vi.fn();

    await requireFiveM1EDeleteAccess(
      { params: { id: '5M-001' }, user: { userId: 'outsider-1', roleName: 'USER' } } as any,
      {} as any,
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('rejects unauthenticated requests', async () => {
    const next = vi.fn();

    await requireFiveM1EDeleteAccess(
      { params: { id: '5M-001' } } as any,
      {} as any,
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });
});
